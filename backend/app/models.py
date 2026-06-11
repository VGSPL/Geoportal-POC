from pydantic import BaseModel

from enum import Enum
from typing import List

from pydantic import BaseModel, Field


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
        min_length=10,
        max_length=10,
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
        description="Farmer location latitude"
    )

    longitude: float = Field(
        ...,
        description="Farmer location longitude"
    )


class FarmerRegistrationResponse(BaseModel):
    message: str
    farmer_id: str
    mobile_number: str