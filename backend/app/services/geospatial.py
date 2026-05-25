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

# Cache for generated dynamic overlays to avoid re-calculation
# key: overlay_id, value: (bytes, content_type)
overlay_cache: Dict[str, Tuple[bytes, str]] = {}

# Unified Simulated Farm Plots (Basmati Rice in India & Madagascar Cloves in Analanjirofo)
SIMULATED_PLOTS: List[Dict] = [
    # --- RICE PLOTS (INDIA) ---
    {
        "id": "APEDA-NET-2026-9812",
        "farmer_name": "Sardar Gurpreet Singh",
        "variety": "Pusa Basmati 1121 (PB1121)",
        "acreage": 12.5,
        "state": "Punjab",
        "district": "Patiala",
        "crop": "basmati",
        "coordinates": [
            [76.4612, 30.2805],
            [76.4654, 30.2808],
            [76.4656, 30.2835],
            [76.4631, 30.2838],
            [76.4630, 30.2852],
            [76.4609, 30.2850],
            [76.4612, 30.2805]
        ]
    },
    {
        "id": "APEDA-NET-2026-4402",
        "farmer_name": "Rajesh Kumar Yadav",
        "variety": "Pusa Basmati 1509 (PB1509)",
        "acreage": 8.2,
        "state": "Haryana",
        "district": "Karnal",
        "crop": "basmati",
        "coordinates": [
            [77.0802, 29.7208],
            [77.0854, 29.7212],
            [77.0851, 29.7252],
            [77.0828, 29.7250],
            [77.0825, 29.7235],
            [77.0800, 29.7232],
            [77.0802, 29.7208]
        ]
    },
    {
        "id": "APEDA-NET-2026-1053",
        "farmer_name": "Chaudhary Devi Lal",
        "variety": "CSR 30 (Traditional)",
        "acreage": 15.0,
        "state": "Haryana",
        "district": "Kurukshetra",
        "crop": "basmati",
        "coordinates": [
            [76.6505, 30.0202],
            [76.6568, 30.0205],
            [76.6572, 30.0258],
            [76.6541, 30.0260],
            [76.6502, 30.0232],
            [76.6505, 30.0202]
        ]
    },
    {
        "id": "APEDA-NET-2026-3029",
        "farmer_name": "Harpreet Singh Sandhu",
        "variety": "Pusa Basmati 1885 (PB1885)",
        "acreage": 20.4,
        "state": "Punjab",
        "district": "Amritsar",
        "crop": "basmati",
        "coordinates": [
            [75.0210, 31.5802],
            [75.0285, 31.5805],
            [75.0288, 31.5882],
            [75.0245, 31.5885],
            [75.0212, 31.5848],
            [75.0210, 31.5802]
        ]
    },
    {
        "id": "APEDA-NET-2026-7751",
        "farmer_name": "Manoj Kumar",
        "variety": "Pusa Basmati 1121 (PB1121)",
        "acreage": 6.8,
        "state": "Haryana",
        "district": "Kaithal",
        "crop": "basmati",
        "coordinates": [
            [76.2502, 29.8205],
            [76.2548, 29.8208],
            [76.2551, 29.8242],
            [76.2522, 29.8245],
            [76.2500, 29.8228],
            [76.2502, 29.8205]
        ]
    },

    # --- CLOVE PLOTS (MADAGASCAR - ANALANJIROFO EAST COAST) ---
    {
        "id": "CLOVE-MG-2026-4012",
        "farmer_name": "Jean-Pierre Ravelo",
        "variety": "Premium Organic Madagascar Clove (A-Grade)",
        "acreage": 9.4,
        "state": "Analanjirofo",
        "district": "Sainte Marie Island",
        "crop": "clove",
        "coordinates": [
            [49.9002, -16.9005],
            [49.9048, -16.9008],
            [49.9051, -16.9042],
            [49.9022, -16.9045],
            [49.9000, -16.9028],
            [49.9002, -16.9005]
        ]
    },
    {
        "id": "CLOVE-MG-2026-5510",
        "farmer_name": "Andry Rakotomalala",
        "variety": "Standard Madagascar Clove",
        "acreage": 14.8,
        "state": "Analanjirofo",
        "district": "Fenerive Est",
        "crop": "clove",
        "coordinates": [
            [49.4002, -17.4008],
            [49.4054, -17.4012],
            [49.4051, -17.4052],
            [49.4028, -17.4050],
            [49.4025, -17.4035],
            [49.4000, -17.4032],
            [49.4002, -17.4008]
        ]
    },
    {
        "id": "CLOVE-MG-2026-1189",
        "farmer_name": "Marie Jeanne",
        "variety": "Premium Organic Madagascar Clove (A-Grade)",
        "acreage": 6.5,
        "state": "Analanjirofo",
        "district": "Soanierana Ivongo",
        "crop": "clove",
        "coordinates": [
            [49.5805, -16.9202],
            [49.5868, -16.9205],
            [49.5872, -16.9258],
            [49.5841, -16.9260],
            [49.5802, -16.9232],
            [49.5805, -16.9202]
        ]
    }
]

# Ground Control Points (GCP) Database (Calibrated GPS reference stations)
SIMULATED_GCPS: List[Dict] = [
    # India Basmati Rice GCPs
    {"id": "GCP-IN-001", "crop": "basmati", "coordinates": [77.0815, 29.7215], "elevation_m": 240.5, "calibration_date": "2026-05-15"},
    {"id": "GCP-IN-002", "crop": "basmati", "coordinates": [76.4625, 30.2815], "elevation_m": 252.8, "calibration_date": "2026-05-18"},
    {"id": "GCP-IN-003", "crop": "basmati", "coordinates": [76.6515, 30.0225], "elevation_m": 258.1, "calibration_date": "2026-05-20"},
    # Madagascar Clove GCPs
    {"id": "GCP-MG-001", "crop": "clove", "coordinates": [49.9015, -16.9025], "elevation_m": 45.2, "calibration_date": "2026-05-12"},
    {"id": "GCP-MG-002", "crop": "clove", "coordinates": [49.4015, -17.4025], "elevation_m": 82.7, "calibration_date": "2026-05-14"},
    {"id": "GCP-MG-003", "crop": "clove", "coordinates": [49.5815, -16.9225], "elevation_m": 28.4, "calibration_date": "2026-05-16"}
]

VARIETY_INFO = {
    # --- Rice Varieties ---
    "Pusa Basmati 1121 (PB1121)": {
        "desc": "The crown jewel of Indian Basmati exports. Known for its extra-long slender grains (over 8.4mm), strong elongation ratio upon cooking, and superior aroma. Yields are robust under controlled irrigation.",
        "yield_multiplier": 2.8,
        "yield_intercept": -0.4
    },
    "Pusa Basmati 1509 (PB1509)": {
        "desc": "An early-maturing (115-120 days) high-yielding Basmati rice variety. Ideal for crop rotations. Its semi-dwarf nature prevents lodging while peak NDVI registers highly dense, efficient crop covers.",
        "yield_multiplier": 2.6,
        "yield_intercept": -0.3
    },
    "CSR 30 (Traditional)": {
        "desc": "A traditional tall Basmati variety preferred for sodic soil reclamation. Produces exceptionally fine grains with matchless aroma and fluffiness, though average yield per acre is lower due to tall lodging structures.",
        "yield_multiplier": 2.0,
        "yield_intercept": -0.6
    },
    "Pusa Basmati 1885 (PB1885)": {
        "desc": "An upgraded, disease-resistant version of PB1121 with bacterial blight and blast protection genes. Ensures reliable biomass structures and stable yields under extreme climatic variations.",
        "yield_multiplier": 2.7,
        "yield_intercept": -0.4
    },
    "Standard Basmati Variety": {
        "desc": "Generic high-quality Basmati cultivar widely adapted across Northern India. Features standard vegetative health curves and reliable, steady production parameters.",
        "yield_multiplier": 2.5,
        "yield_intercept": -0.5
    },

    # --- Clove Varieties ---
    "Premium Organic Madagascar Clove (A-Grade)": {
        "desc": "Premium hand-picked A-grade clove buds. Grown organically in complex traditional agroforestry systems under vanilla and lychee canopies. Exceptional essential oil concentration (eugenol > 18%) and premium export value.",
        "yield_multiplier": 0.85,
        "yield_intercept": -0.08
    },
    "Standard Madagascar Clove": {
        "desc": "Standard grade clove buds widely cultivated across the east coast Analanjirofo region. Formed in semi-agroforestry and monoculture plantations. Excellent drying quality and spice profile.",
        "yield_multiplier": 0.70,
        "yield_intercept": -0.05
    },
    "Standard Clove Variety": {
        "desc": "Generic high-quality clove cultivar well adapted across coastal Madagascar. Features standard canopy structure and reliable essential oil metrics.",
        "yield_multiplier": 0.65,
        "yield_intercept": -0.06
    }
}

def get_all_plots(crop: Optional[str] = None) -> List[Dict]:
    """Returns farm plots, optionally filtered by crop type ('basmati' or 'clove')."""
    if crop:
        return [p for p in SIMULATED_PLOTS if p["crop"] == crop]
    return SIMULATED_PLOTS

def get_all_gcps(crop: Optional[str] = None) -> List[Dict]:
    """Returns GCP points, optionally filtered by crop type."""
    if crop:
        return [g for g in SIMULATED_GCPS if g["crop"] == crop]
    return SIMULATED_GCPS

def calculate_geodesic_area_acres(polygon: Polygon) -> float:
    """
    Projects the shapely polygon into the local UTM zone to calculate precise geodesic acreage.
    Supports:
        UTM Zone 43N (EPSG:32643) for India (longitude ~ 74 to 78)
        UTM Zone 39S (EPSG:32739) for East Madagascar (longitude ~ 49)
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

def intersect_farm_plots(user_poly: Polygon, crop: str) -> Tuple[bool, Optional[Dict]]:
    """
    Checks if the drawn polygon intersects with any registered farm plots matching the active crop.
    """
    filtered_plots = [p for p in SIMULATED_PLOTS if p["crop"] == crop]
    for plot_data in filtered_plots:
        plot_poly = Polygon(plot_data["coordinates"])
        if user_poly.intersects(plot_poly):
            intersection_area = user_poly.intersection(plot_poly).area
            if intersection_area > 0 or user_poly.contains(plot_poly.centroid) or plot_poly.contains(user_poly.centroid):
                return True, plot_data
                
    return False, None

def generate_ndvi_simulated_raster(
    polygon: Polygon,
    bbox: List[List[float]],
    crop_type: str = "basmati",
    resolution: int = 150
) -> Tuple[str, float, float, np.ndarray]:
    """
    Generates a beautiful simulated NDVI grid mapped directly inside the boundary of the drawn polygon.
    Applies custom high-frequency patterns for clove tree canopies, or homogeneous bands for rice fields.
    """
    lng_min, lat_min = bbox[0]
    lng_max, lat_max = bbox[1]
    
    lngs = np.linspace(lng_min, lng_max, resolution)
    lats = np.linspace(lat_min, lat_max, resolution)
    
    lng_grid, lat_grid = np.meshgrid(lngs, lats)
    ndvi_values = np.zeros((resolution, resolution))
    
    # Custom noise/structural calculations based on crop type
    if crop_type == "clove":
        # Madagascar cloves grow as discrete trees in complex agroforestry plots (high canopy spikes)
        # We model individual tree crowns using high-frequency trigonometric spikes
        tree_peaks = (np.sin(lng_grid * 25000) * np.cos(lat_grid * 25000))
        # Mask lower spike branches and build healthy forest range
        tree_canopy = np.clip(0.55 + 0.30 * tree_peaks, 0.40, 0.86)
        
        # Add slight structural slopes typical of Malagasy coastal hillsides
        slope_gradient = 0.05 * (lng_grid - lng_min) / (lng_max - lng_min)
        raw_ndvi = np.clip(tree_canopy + slope_gradient, 0.35, 0.88)
    else:
        # Basmati rice: homogeneous, dense vegetative crop sheets
        x_freq, y_freq = 6.0, 6.0
        x_noise = np.sin(lng_grid * 1000 * x_freq) * 0.15
        y_noise = np.cos(lat_grid * 1000 * y_freq) * 0.15
        
        centroid = polygon.centroid
        dist_grid = np.sqrt((lng_grid - centroid.x)**2 + (lat_grid - centroid.y)**2)
        max_dist = np.max(dist_grid) if np.max(dist_grid) > 0 else 1.0
        crop_density = 0.70 + 0.15 * (1.0 - (dist_grid / max_dist))
        
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
        avg_ndvi = 0.65 if crop_type == "clove" else 0.68
        max_ndvi = 0.78 if crop_type == "clove" else 0.79
        ndvi_values[resolution//3 : 2*resolution//3, resolution//3 : 2*resolution//3] = 0.70
    else:
        avg_ndvi = float(np.mean(points_inside))
        max_ndvi = float(np.max(points_inside))
        
    fig, ax = plt.subplots(figsize=(6, 6), dpi=100)
    ax.axis('off')
    fig.patch.set_alpha(0.0)
    
    masked_ndvi = np.ma.masked_where(ndvi_values == 0.0, ndvi_values)
    
    # Render with customized colormap
    # 'YlGn' (Yellow-Green) represents dense tropical agroforestry canopies perfectly for cloves
    cmap_choice = 'YlGn' if crop_type == "clove" else 'RdYlGn'
    
    ax.imshow(
        masked_ndvi, 
        cmap=cmap_choice, 
        origin='lower', 
        vmin=0.2, 
        vmax=0.9,
        interpolation='bilinear' if crop_type == "basmati" else 'nearest' # tree crown grains
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
