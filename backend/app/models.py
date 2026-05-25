from pydantic import BaseModel, Field
from typing import List, Tuple, Optional

class GeoJSONGeometry(BaseModel):
    type: str = Field("Polygon", description="Must be Polygon")
    coordinates: List[List[List[float]]] = Field(
        ...,
        description="List of rings containing coordinate pairs: [longitude, latitude]"
    )

class YieldAnalysisRequest(BaseModel):
    geometry: GeoJSONGeometry

class YieldAnalysisResponse(BaseModel):
    estimated_yield_tons: float = Field(..., description="Total estimated yield in tons")
    yield_per_acre: float = Field(..., description="Estimated yield per acre in tons")
    total_acres: float = Field(..., description="Total area in acres")
    average_ndvi: float = Field(..., description="Average health index (NDVI)")
    peak_ndvi: float = Field(..., description="Peak crop health index (NDVI)")
    detected_variety: str = Field(..., description="Detected agricultural variety")
    variety_description: str = Field(..., description="Details regarding genetic attributes of this variety")
    is_basmatinet_registered: bool = Field(..., description="Whether this matches a registered plot")
    registry_id: Optional[str] = Field(None, description="Official agricultural Registry ID if registered")
    farmer_name: Optional[str] = Field(None, description="Registered farmer name")
    overlay_url: str = Field(..., description="URL to fetch the dynamic NDVI overlay image")
    bbox: List[List[float]] = Field(..., description="Bounding box of the polygon [ [lng_min, lat_min], [lng_max, lat_max] ]")
    crop_stage: str = Field(..., description="Estimated growth stage of the crop")
    crop_stage_description: str = Field(..., description="Detailed explanation of the growth stage and maturity metrics")
    harvest_readiness_score: int = Field(..., description="Harvest readiness percentage (0-100%)")
    crop_type: str = Field(..., description="Crop type: 'basmati' or 'clove'")

class FarmPlot(BaseModel):
    id: str
    farmer_name: str
    variety: str
    acreage: float
    state: str
    district: str
    crop: str = Field(..., description="basmati or clove")
    coordinates: List[List[float]] = Field(
        ..., 
        description="Outer boundary of the farm cluster: [[lng, lat], ...]"
    )

class GCPPoint(BaseModel):
    id: str
    crop: str = Field(..., description="basmati or clove")
    coordinates: List[float] = Field(..., description="[longitude, latitude]")
    elevation_m: float
    calibration_date: str
    type: str = "Ground Control Station"

class ExportDestination(BaseModel):
    country: str
    volume_mMT: float
    value_inr_cr: float

class APEDAExportStats(BaseModel):
    fiscal_year: str = "2024-25"
    total_volume_mMT: float = 6.06
    total_value_inr_cr: float = 50312.0
    top_destinations: List[ExportDestination]
    live_ticker: List[str]
    clove_export_tons: float = 14800.0
    clove_value_usd_m: float = 68.5
