from fastapi import FastAPI, HTTPException, Response, Query
from fastapi.middleware.cors import CORSMiddleware
from app.models import YieldAnalysisRequest, YieldAnalysisResponse, FarmPlot, CreatePlotRequest
from app.services.database import init_db, get_all_plots, save_plot, delete_plot
from app.services.geospatial import (
    calculate_geodesic_area_acres, 
    intersect_farm_plots,
    generate_ndvi_simulated_raster,
    get_cached_overlay
)
from shapely.geometry import Polygon
from typing import Optional, List
import uuid
import os

app = FastAPI(
    title="Geoportal Custom Drawing & Farm Storage API",
    description="Backend API supporting persistent custom drawing storage in SQLite and dynamic NDVI/yield calculations.",
    version="2.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
def startup_event():
    """Initializes SQLite database tables on startup."""
    init_db()

@app.get("/")
def read_root():
    return {
        "status": "online",
        "service": "Custom Drawing Geoportal API",
        "version": "2.0.0",
        "documentation": "/docs"
    }

@app.get("/api/plots", response_model=List[FarmPlot])
def get_plots():
    """
    Returns all persisted custom farm plots from the SQLite database.
    """
    try:
        plots_data = get_all_plots()
        return [FarmPlot(**p) for p in plots_data]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database query failed: {str(e)}")

@app.post("/api/plots", response_model=FarmPlot)
def create_plot(request: CreatePlotRequest):
    """
    Saves a newly drawn farm plot to the SQLite database.
    """
    try:
        coords = request.geometry.coordinates[0]
        if len(coords) < 3:
            raise HTTPException(status_code=400, detail="Polygon must contain at least 3 unique coordinate pairs.")
        
        poly = Polygon(coords)
        if not poly.is_valid:
            poly = poly.buffer(0)
            if not poly.is_valid:
                raise HTTPException(status_code=400, detail="Invalid GeoJSON geometry provided.")
        
        # Calculate acreage dynamically
        acres = calculate_geodesic_area_acres(poly)
        plot_id = f"PLOT-{str(uuid.uuid4())[:8].upper()}"
        
        # Save to SQLite
        saved = save_plot(
            plot_id=plot_id,
            farmer_name=request.farmer_name,
            field_name=request.field_name,
            crop=request.crop,
            acreage=acres,
            coordinates=coords
        )
        
        return FarmPlot(**saved)
    except HTTPException as he:
        raise he
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save plot: {str(e)}")

@app.delete("/api/plots/{plot_id}")
def remove_plot(plot_id: str):
    """
    Removes a persisted farm plot from the SQLite database.
    """
    deleted = delete_plot(plot_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Plot not found in database.")
    return {"status": "success", "message": f"Plot {plot_id} deleted successfully."}

@app.post("/api/analyze-yield", response_model=YieldAnalysisResponse)
def analyze_yield(request: YieldAnalysisRequest):
    """
    Analyzes drawn polygon acreage, checks SQLite database intersection, 
    simulates NDVI raster, and calculates crop yield telemetry.
    """
    try:
        coords = request.geometry.coordinates[0]
        if len(coords) < 3:
            raise HTTPException(status_code=400, detail="Polygon must contain at least 3 unique coordinate pairs.")
        
        poly = Polygon(coords)
        if not poly.is_valid:
            poly = poly.buffer(0)
            if not poly.is_valid:
                raise HTTPException(status_code=400, detail="Invalid GeoJSON geometry provided.")
        
        # 1. Geodesic area calculation
        acres = calculate_geodesic_area_acres(poly)
        if acres <= 0:
            raise HTTPException(status_code=400, detail="Selected polygon has negligible area.")
            
        # 2. Check if it matches an existing saved plot in SQLite
        is_registered, plot_info = intersect_farm_plots(poly)
        
        if is_registered and plot_info:
            farmer_name = plot_info["farmer_name"]
            field_name = plot_info["field_name"]
            crop_name = plot_info["crop"]
            registry_id = plot_info["id"]
        else:
            farmer_name = None
            field_name = None
            crop_name = "Custom Crop"
            registry_id = None
            
        # 3. Calculate bounding box
        bounds = poly.bounds
        bbox = [
            [bounds[0], bounds[1]],
            [bounds[2], bounds[3]]
        ]
        
        # 4. Run Sentinel-2 NDVI canopy/biomass simulation
        overlay_id, avg_ndvi, peak_ndvi, _ = generate_ndvi_simulated_raster(poly, bbox, crop_name)
        
        # 5. Dynamic crop stage calculation
        if peak_ndvi >= 0.80:
            crop_stage = "Peak Maturity Stage"
            crop_stage_description = f"The {crop_name} crop exhibits maximum vegetative health and canopy density. High chlorophyll levels indicate crop is ready for harvesting."
            harvest_readiness_score = 95
        elif peak_ndvi >= 0.70:
            crop_stage = "Late Vegetative Growth"
            crop_stage_description = f"The {crop_name} crop is in active panicle development or late vegetative shooting. Strong growth and expansion, harvest ready in 2-3 weeks."
            harvest_readiness_score = 65
        elif peak_ndvi >= 0.60:
            crop_stage = "Active Vegetative Flushing"
            crop_stage_description = f"The {crop_name} crop shows early vegetative flushing. Foliage is spreading, requires standard moisture levels and maintenance weeding."
            harvest_readiness_score = 30
        else:
            crop_stage = "Early Seedling / Dormancy"
            crop_stage_description = f"The {crop_name} crop is in early seedling emergence or winter dormancy. Regular soil nutrients and moisture monitoring advised."
            harvest_readiness_score = 10
            
        overlay_url = f"/api/ndvi-overlay/{overlay_id}"
        
        return YieldAnalysisResponse(
            total_acres=acres,
            average_ndvi=avg_ndvi,
            peak_ndvi=peak_ndvi,
            farmer_name=farmer_name,
            field_name=field_name,
            crop=crop_name,
            is_registered=is_registered,
            registry_id=registry_id,
            overlay_url=overlay_url,
            bbox=bbox,
            crop_stage=crop_stage,
            crop_stage_description=crop_stage_description,
            harvest_readiness_score=harvest_readiness_score
        )
        
    except HTTPException as he:
        raise he
    except Exception as e:
        import logging
        logging.error(f"Error during yield analysis: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Internal spatial processing error: {str(e)}")

@app.get("/api/ndvi-overlay/{overlay_id}")
def get_ndvi_overlay(overlay_id: str):
    """
    Serves the cached colormapped NDVI PNG raster layer directly to the map interface.
    """
    cached = get_cached_overlay(overlay_id)
    if not cached:
        raise HTTPException(status_code=404, detail="NDVI overlay layer not found or expired.")
        
    image_bytes, content_type = cached
    return Response(content=image_bytes, media_type=content_type)
