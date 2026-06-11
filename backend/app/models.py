from pydantic import BaseModel, Field, field_validator
from enum import Enum
from typing import List


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
    id: int
    crop_name: str