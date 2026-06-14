from pydantic import BaseModel, Field, field_validator
from enum import Enum
from typing import List, Optional


class CropTypeEnum(str, Enum):
    RABI = "Rabi"
    KHARIF = "Kharif"
    ZAID = "Zaid"


class FarmerRegistrationRequest(BaseModel):
    farmer_name: str = Field(
        ...,
        min_length=2,
        description="Name of the farmer"
    )

    mobile_number: str = Field(
        ...,
        pattern=r"^\d{10}$",
        description="10-digit farmer mobile number"
    )

    crop_type: CropTypeEnum = Field(
        ...,
        description="Crop season type"
    )

    crop_ids: List[int] = Field(
        ...,
        min_items=1,
        max_items=4,
        description="List of selected crop IDs (1 to 4)"
    )

    selfie_path: str = Field(
        ...,
        description="Path or URL of farmer selfie image"
    )

    latitude: float = Field(
        ...,
        ge=-90.0,
        le=90.0,
        description="Farmer location latitude"
    )

    longitude: float = Field(
        ...,
        ge=-180.0,
        le=180.0,
        description="Farmer location longitude"
    )

    @field_validator("crop_ids")
    @classmethod
    def check_duplicate_crop_ids(cls, v: List[int]) -> List[int]:
        if len(v) != len(set(v)):
            raise ValueError("crop_ids must contain unique values")
        return v


class FarmerRegistrationResponse(BaseModel):
    message: str
    farmer_id: str
    mobile_number: str


class CropResponse(BaseModel):
    """A single crop entry returned in farmer details."""

    id: int = Field(..., description="Unique crop ID from crops_master")
    crop_name: str = Field(..., description="Name of the crop")


class FarmerDetailsResponse(BaseModel):
    """Full farmer profile returned when fetching by mobile number."""

    farmer_id: str = Field(
        ...,
        description="Unique farmer identifier, e.g. FARMER-XXXXXX",
        examples=["FARMER-A1B2C3"],
    )
    farmer_name: str = Field(..., description="Full name of the farmer")
    mobile_number: str = Field(
        ...,
        pattern=r"^\d{10}$",
        description="10-digit farmer mobile number",
    )
    crop_type: CropTypeEnum = Field(..., description="Crop season type (Rabi / Kharif / Zaid)")
    latitude: float = Field(..., ge=-90.0, le=90.0, description="Farmer location latitude")
    longitude: float = Field(..., ge=-180.0, le=180.0, description="Farmer location longitude")
    selfie_url: Optional[str] = Field(
        None,
        description="Relative URL path to the farmer selfie image",
        examples=["/uploads/selfies/FARMER-A1B2C3.jpg"],
    )
    crops: List[CropResponse] = Field(
        default_factory=list,
        description="List of crops assigned to the farmer",
    )