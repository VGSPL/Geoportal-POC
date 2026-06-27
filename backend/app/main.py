from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException, status, Form, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
import os
import json
from typing import List
from pydantic import ValidationError

from app.models import (
    FarmerRegistrationRequest,
    FarmerRegistrationResponse,
    CropTypeEnum,
    CropResponse,
    FarmerDetailsResponse,
)
from app.services.database import (
    init_db,
    save_or_update_farmer,
    get_db_connection,
    generate_unique_farmer_id,
    get_all_crops,
    get_farmer_by_mobile,
)
from app.s3_storage import upload_selfie, delete_selfie


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize PostgreSQL schema + seed crops on startup
    init_db()
    yield


app = FastAPI(
    title="Farmer Registration API",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],          # open for EC2 — restrict to your domain in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Health check ──────────────────────────────────────────────────────────────

@app.get("/")
def health_check():
    return {
        "status": "healthy",
        "message": "Farmer Registration API running",
    }


# ── Register / update a farmer ────────────────────────────────────────────────

@app.post(
    "/api/farmers/register",
    response_model=FarmerRegistrationResponse,
    status_code=status.HTTP_200_OK,
)
async def register_farmer(
    farmer_name: str = Form(..., description="Name of the farmer"),
    mobile_number: str = Form(..., description="10-digit farmer mobile number"),
    crop_type: CropTypeEnum = Form(..., description="Crop season type"),
    crop_ids: List[str] = Form(..., description="List of selected crop IDs (1 to 4)"),
    latitude: float = Form(..., description="Farmer location latitude"),
    longitude: float = Form(..., description="Farmer location longitude"),
    selfie: UploadFile = File(..., description="Selfie image file from camera"),
):
    # ── 1. Parse crop_ids (comma-separated, JSON array, or individual values) ──
    parsed_crop_ids = []
    try:
        for x in crop_ids:
            if "," in x:
                parsed_crop_ids.extend(
                    [int(item.strip()) for item in x.split(",") if item.strip()]
                )
            elif x.startswith("[") and x.endswith("]"):
                items = json.loads(x)
                if isinstance(items, list):
                    parsed_crop_ids.extend([int(item) for item in items])
                else:
                    parsed_crop_ids.append(int(items))
            else:
                x_clean = x.strip()
                if x_clean:
                    parsed_crop_ids.append(int(x_clean))
    except (ValueError, json.JSONDecodeError):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=[{
                "loc": ["body", "crop_ids"],
                "msg": "crop_ids must be a list of integers",
                "type": "type_error",
            }],
        )

    # ── 2. Validate with Pydantic (placeholder selfie_path — real URL comes after upload) ──
    try:
        FarmerRegistrationRequest(
            farmer_name=farmer_name,
            mobile_number=mobile_number,
            crop_type=crop_type,
            crop_ids=parsed_crop_ids,
            selfie_path="placeholder",
            latitude=latitude,
            longitude=longitude,
        )
    except ValidationError as e:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=e.errors(),
        )

    # ── 3. Validate selfie file extension & size ──────────────────────────────
    ext = os.path.splitext(selfie.filename)[1].lower()
    if ext not in [".jpg", ".jpeg", ".png"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Unsupported file extension. Only JPG, JPEG, and PNG are allowed.",
        )

    try:
        selfie.file.seek(0, 2)
        size = selfie.file.tell()
        selfie.file.seek(0)

        MAX_SIZE = 5 * 1024 * 1024  # 5 MB
        if size > MAX_SIZE:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="File size exceeds limit of 5MB.",
            )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to check file size: {str(e)}",
        )

    ALLOWED_MIME_TYPES = {
        "image/jpeg",
        "image/jpg",
        "image/png",
        "image/pjpeg",
        "application/octet-stream",
    }
    if selfie.content_type not in ALLOWED_MIME_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported media type '{selfie.content_type}'. Must be JPEG or PNG.",
        )

    # ── 4. Look up existing farmer (to get ID & old selfie path for cleanup) ──
    farmer_id = None
    old_selfie_path = None
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        cursor.execute(
            "SELECT id, selfie_path FROM farmers WHERE mobile_number = %s",
            (mobile_number,),
        )
        row = cursor.fetchone()
        if row:
            farmer_id = row[0]
            old_selfie_path = row[1]
        else:
            farmer_id = generate_unique_farmer_id(cursor)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database check error: {str(e)}",
        )
    finally:
        conn.close()

    # ── 5. Upload selfie to S3 ────────────────────────────────────────────────
    filename = f"{farmer_id}{ext}"
    try:
        s3_url = await upload_selfie(selfie, filename)   # returns full https://... URL
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to upload selfie to S3: {str(e)}",
        )

    # Delete old selfie from S3 if the farmer re-registers with a new photo
    if old_selfie_path and old_selfie_path != s3_url:
        old_filename = old_selfie_path.rstrip("/").split("/")[-1]
        delete_selfie(old_filename)   # silent — will not crash if already gone

    # ── 6. Save / update farmer record in PostgreSQL ──────────────────────────
    try:
        request_payload = FarmerRegistrationRequest(
            farmer_name=farmer_name,
            mobile_number=mobile_number,
            crop_type=crop_type,
            crop_ids=parsed_crop_ids,
            selfie_path=s3_url,          # store the full S3 URL
            latitude=latitude,
            longitude=longitude,
        )
        saved_id = save_or_update_farmer(request_payload, farmer_id=farmer_id)
        return FarmerRegistrationResponse(
            message="Farmer registration successful",
            farmer_id=saved_id,
            mobile_number=mobile_number,
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database error: {str(e)}",
        )


# ── Fetch all crops ───────────────────────────────────────────────────────────

@app.get(
    "/api/crops",
    response_model=List[CropResponse],
    status_code=status.HTTP_200_OK,
)
def fetch_crops():
    try:
        return get_all_crops()
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database error: {str(e)}",
        )


# ── Get farmer by mobile number ───────────────────────────────────────────────

@app.get(
    "/api/farmers/mobile/{mobile_number}",
    response_model=FarmerDetailsResponse,
    status_code=status.HTTP_200_OK,
    summary="Get farmer details by mobile number",
    description=(
        "Fetches a farmer full profile including their assigned crops "
        "using their 10-digit mobile number. Returns 404 if no farmer is found."
    ),
    responses={
        200: {"description": "Farmer found - returns full profile with nested crops"},
        404: {"description": "No farmer registered with the given mobile number"},
        422: {"description": "Validation error - mobile number must be exactly 10 digits"},
    },
)
def get_farmer_by_mobile_number(mobile_number: str):
    if not mobile_number.isdigit() or len(mobile_number) != 10:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="mobile_number must be a 10-digit numeric string.",
        )

    try:
        farmer = get_farmer_by_mobile(mobile_number)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database error: {str(e)}",
        )

    if farmer is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No farmer found with mobile number {mobile_number}.",
        )

    return farmer
