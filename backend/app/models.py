from pydantic import BaseModel, Field
from typing import List, Tuple, Optional

class GeoJSONGeometry(BaseModel):
    type: str = Field("Polygon", description="Must be Polygon")
    coordinates: List[List[List[float]]] = Field(
        ...,
        description="List of rings containing coordinate pairs: [longitude, latitude]"
    )

class CreatePlotRequest(BaseModel):
    farmer_name: str = Field(..., description="Name of the farmer owning the field")
    field_name: str = Field(..., description="Name of the agricultural field")
    crop: str = Field(..., description="Crop type grown on the field")
    mobile_number: str = Field(..., description="Farmer's mobile contact number")
    geometry: GeoJSONGeometry

class YieldAnalysisRequest(BaseModel):
    geometry: GeoJSONGeometry

class YieldAnalysisResponse(BaseModel):
    total_acres: float = Field(..., description="Total area in acres")
    average_ndvi: float = Field(..., description="Average health index (NDVI)")
    peak_ndvi: float = Field(..., description="Peak crop health index (NDVI)")
    farmer_name: Optional[str] = Field(None, description="Farmer name if registered")
    field_name: Optional[str] = Field(None, description="Field name if registered")
    crop: Optional[str] = Field(None, description="Crop name if registered")
    is_registered: bool = Field(..., description="Whether this matches a saved plot in DB")
    registry_id: Optional[str] = Field(None, description="Unique database ID if registered")
    overlay_url: str = Field(..., description="URL to fetch the dynamic NDVI overlay image")
    bbox: List[List[float]] = Field(..., description="Bounding box of the polygon [ [lng_min, lat_min], [lng_max, lat_max] ]")
    crop_stage: str = Field(..., description="Estimated growth stage of the crop")
    crop_stage_description: str = Field(..., description="Detailed explanation of the growth stage and maturity metrics")
    harvest_readiness_score: int = Field(..., description="Harvest readiness percentage (0-100%)")

class FarmPlot(BaseModel):
    id: str
    farmer_name: str
    field_name: str
    crop: str
    mobile_number: Optional[str] = Field(
        None,
        description="Farmer's mobile contact number (empty for legacy plots)"
    )
    acreage: float
    coordinates: List[List[float]] = Field(
        ..., 
        description="Outer boundary of the farm cluster: [[lng, lat], ...]"
    )

class FarmerDetails(BaseModel):
    farmer_name: str = Field(..., description="Name of the farmer")
    mobile_number: str = Field(..., description="Farmer's registered mobile number")
    plots: List[FarmPlot] = Field(..., description="All plots registered to this mobile number")
