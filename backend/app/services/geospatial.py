import numpy as np
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import io
import uuid
from typing import Dict, List, Tuple, Optional
from shapely.geometry import shape, Polygon, Point
from shapely.ops import transform
import pyproj
from app.services.database import get_all_plots as get_db_plots

# Cache for generated dynamic overlays to avoid re-calculation
# key: overlay_id, value: (bytes, content_type)
overlay_cache: Dict[str, Tuple[bytes, str]] = {}

def calculate_geodesic_area_acres(polygon: Polygon) -> float:
    """
    Projects the shapely polygon into the local UTM zone to calculate precise geodesic acreage.
    Supports:
        UTM Zone 43N (EPSG:32643) for India (longitude ~ 74 to 78)
        UTM Zone 39S (EPSG:32739) for East Madagascar (longitude ~ 49)
        Fallback Web Mercator (EPSG:3857) otherwise
    """
    centroid_lng = polygon.centroid.x
    
    # Select EPSG projection based on geographic zone
    if 70.0 <= centroid_lng <= 80.0:
        source_crs = "EPSG:4326"
        target_crs = "EPSG:32643" # India UTM Zone 43N
    elif 40.0 <= centroid_lng <= 55.0:
        source_crs = "EPSG:4326"
        target_crs = "EPSG:32739" # Madagascar UTM Zone 39S
    else:
        source_crs = "EPSG:4326"
        target_crs = "EPSG:3857" # Fallback Web Mercator
        
    wgs84 = pyproj.CRS(source_crs)
    utm = pyproj.CRS(target_crs)
    
    project = pyproj.Transformer.from_crs(wgs84, utm, always_xy=True).transform
    projected_poly = transform(project, polygon)
    
    area_sq_meters = projected_poly.area
    # 1 acre = 4046.85642 square meters
    acres = area_sq_meters / 4046.85642
    return round(acres, 2)

def intersect_farm_plots(user_poly: Polygon) -> Tuple[bool, Optional[Dict]]:
    """
    Checks if the drawn polygon intersects with any saved farm plots in the SQLite database.
    """
    plots = get_db_plots()
    for plot_data in plots:
        plot_poly = Polygon(plot_data["coordinates"])
        if user_poly.intersects(plot_poly):
            intersection_area = user_poly.intersection(plot_poly).area
            # Check for centroid contains or high overlap area
            if intersection_area > 0 or user_poly.contains(plot_poly.centroid) or plot_poly.contains(user_poly.centroid):
                return True, plot_data
                
    return False, None

def generate_ndvi_simulated_raster(
    polygon: Polygon,
    bbox: List[List[float]],
    crop_type: str = "wheat",
    resolution: int = 150
) -> Tuple[str, float, float, np.ndarray]:
    """
    Generates a beautiful simulated NDVI grid mapped directly inside the boundary of the drawn polygon.
    Applies custom high-frequency patterns for tree-canopy crops, or homogeneous bands for standard field crops.
    """
    lng_min, lat_min = bbox[0]
    lng_max, lat_max = bbox[1]
    
    lngs = np.linspace(lng_min, lng_max, resolution)
    lats = np.linspace(lat_min, lat_max, resolution)
    
    lng_grid, lat_grid = np.meshgrid(lngs, lats)
    ndvi_values = np.zeros((resolution, resolution))
    
    crop_lower = crop_type.lower()
    is_tree_crop = any(k in crop_lower for k in ("clove", "tree", "forest", "orchard", "fruit", "coconut", "palm"))
    
    # Custom noise/structural calculations based on crop category
    if is_tree_crop:
        # High-frequency trigonometric spikes representing tree crowns
        tree_peaks = (np.sin(lng_grid * 25000) * np.cos(lat_grid * 25000))
        tree_canopy = np.clip(0.55 + 0.30 * tree_peaks, 0.40, 0.86)
        raw_ndvi = np.clip(tree_canopy, 0.35, 0.88)
    else:
        # Homogeneous field crop canopy bands (with slight texture noise)
        x_noise = np.sin(lng_grid * 1000 * 6.0) * 0.12
        y_noise = np.cos(lat_grid * 1000 * 6.0) * 0.12
        
        centroid = polygon.centroid
        dist_grid = np.sqrt((lng_grid - centroid.x)**2 + (lat_grid - centroid.y)**2)
        max_dist = np.max(dist_grid) if np.max(dist_grid) > 0 else 1.0
        crop_density = 0.68 + 0.15 * (1.0 - (dist_grid / max_dist))
        
        raw_ndvi = np.clip(crop_density + x_noise + y_noise, 0.35, 0.88)
    
    points_inside = []
    for i in range(resolution):
        for j in range(resolution):
            p = Point(lng_grid[i, j], lat_grid[i, j])
            if polygon.contains(p):
                ndvi_values[i, j] = raw_ndvi[i, j]
                points_inside.append(raw_ndvi[i, j])
            else:
                ndvi_values[i, j] = 0.0
                
    if not points_inside:
        avg_ndvi = 0.65 if is_tree_crop else 0.68
        max_ndvi = 0.78 if is_tree_crop else 0.79
        ndvi_values[resolution//3 : 2*resolution//3, resolution//3 : 2*resolution//3] = 0.70
    else:
        avg_ndvi = float(np.mean(points_inside))
        max_ndvi = float(np.max(points_inside))
        
    fig, ax = plt.subplots(figsize=(6, 6), dpi=100)
    ax.axis('off')
    fig.patch.set_alpha(0.0)
    
    masked_ndvi = np.ma.masked_where(ndvi_values == 0.0, ndvi_values)
    
    # Yellow-Green representing deep forestry canopy or Red-Yellow-Green for field crops
    cmap_choice = 'YlGn' if is_tree_crop else 'RdYlGn'
    
    ax.imshow(
        masked_ndvi, 
        cmap=cmap_choice, 
        origin='lower', 
        vmin=0.2, 
        vmax=0.9,
        interpolation='nearest' if is_tree_crop else 'bilinear'
    )
    
    plt.subplots_adjust(top=1, bottom=0, right=1, left=0, hspace=0, wspace=0)
    ax.margins(0, 0)
    ax.xaxis.set_major_locator(plt.NullLocator())
    ax.yaxis.set_major_locator(plt.NullLocator())
    
    buf = io.BytesIO()
    plt.savefig(buf, format='png', transparent=True, bbox_inches='tight', pad_inches=0)
    buf.seek(0)
    image_bytes = buf.getvalue()
    
    plt.close(fig)
    
    overlay_id = str(uuid.uuid4())
    overlay_cache[overlay_id] = (image_bytes, "image/png")
    
    return overlay_id, round(avg_ndvi, 3), round(max_ndvi, 3), ndvi_values

def get_cached_overlay(overlay_id: str) -> Optional[Tuple[bytes, str]]:
    """Retrieves image from cache."""
    return overlay_cache.get(overlay_id)
