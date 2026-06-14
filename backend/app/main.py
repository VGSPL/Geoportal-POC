from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException, status, Form, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
import sqlite3
import os
import json
from typing import List
from pydantic import ValidationError

from app.models import FarmerRegistrationRequest, FarmerRegistrationResponse, CropTypeEnum, CropResponse, FarmerDetailsResponse
from app.services.database import (
    init_db,
    save_or_update_farmer,
    get_db_connection,
    generate_unique_farmer_id,
    DB_DIR,
    get_all_crops,
    get_farmer_by_mobile
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize DB on startup
    init_db()
    # Also ensure upload directory exists
    upload_dir = os.path.join(DB_DIR, "uploads", "selfies")
    os.makedirs(upload_dir, exist_ok=True)
    yield


app = FastAPI(
    title="Farmer Registration API",
    version="1.0.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def health_check():
    return {
        "status": "healthy",
        "message": "Farmer Registration API running"
    }


@app.post(
    "/api/farmers/register",
    response_model=FarmerRegistrationResponse,
    status_code=status.HTTP_200_OK
)
async def register_farmer(
    farmer_name: str = Form(..., description="Name of the farmer"),
    mobile_number: str = Form(..., description="10-digit farmer mobile number"),
    crop_type: CropTypeEnum = Form(..., description="Crop season type"),
    crop_ids: List[str] = Form(..., description="List of selected crop IDs (1 to 4)"),
    latitude: float = Form(..., description="Farmer location latitude"),
    longitude: float = Form(..., description="Farmer location longitude"),
    selfie: UploadFile = File(..., description="Selfie image file from camera")
):
    # 1. Parse crop_ids (can be list of str/int, comma-separated list, or json list)
    parsed_crop_ids = []
    try:
        for x in crop_ids:
            # check if it is comma-separated
            if "," in x:
                parsed_crop_ids.extend([int(item.strip()) for item in x.split(",") if item.strip()])
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
                "type": "type_error"
            }]
        )

    # 2. Validate input parameters using Pydantic
    try:
        # Validate other inputs using the Pydantic schema first (using placeholder for selfie_path)
        FarmerRegistrationRequest(
            farmer_name=farmer_name,
            mobile_number=mobile_number,
            crop_type=crop_type,
            crop_ids=parsed_crop_ids,
            selfie_path="placeholder",
            latitude=latitude,
            longitude=longitude
        )
    except ValidationError as e:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=e.errors()
        )

    # 3. Validate selfie file type / extension and size limits
    ext = os.path.splitext(selfie.filename)[1].lower()
    if ext not in [".jpg", ".jpeg", ".png"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Unsupported file extension. Only JPG, JPEG, and PNG are allowed."
        )

    # Validate file size (Max 5MB)
    try:
        selfie.file.seek(0, 2)
        size = selfie.file.tell()
        selfie.file.seek(0)
        
        MAX_SIZE = 5 * 1024 * 1024  # 5 MB
        if size > MAX_SIZE:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="File size exceeds limit of 5MB."
            )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to check file size: {str(e)}"
        )

    # Check MIME content type
    if selfie.content_type not in ["image/jpeg", "image/png", "image/jpg"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Unsupported media type. File must be a JPEG or PNG image."
        )

    # 4. Check if the farmer already exists (by mobile_number) to get their ID and old selfie_path
    farmer_id = None
    old_selfie_path = None
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        cursor.execute(
            "SELECT id, selfie_path FROM farmers WHERE mobile_number = ?",
            (mobile_number,)
        )
        row = cursor.fetchone()
        if row:
            farmer_id = row["id"]
            old_selfie_path = row["selfie_path"]
        else:
            # Generate a new unique farmer ID
            farmer_id = generate_unique_farmer_id(cursor)
    except sqlite3.Error as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database check error: {str(e)}"
        )
    finally:
        conn.close()

    # 5. Save the file to local storage
    filename = f"{farmer_id}{ext}"
    relative_path = f"uploads/selfies/{filename}"
    absolute_path = os.path.join(DB_DIR, "uploads", "selfies", filename)

    # Ensure upload directory exists
    os.makedirs(os.path.dirname(absolute_path), exist_ok=True)

    # Delete the old file if it exists and has a different path
    if old_selfie_path:
        old_absolute_path = os.path.join(DB_DIR, old_selfie_path)
        if old_selfie_path != relative_path and os.path.exists(old_absolute_path):
            try:
                os.remove(old_absolute_path)
            except Exception as delete_error:
                # Log warning but do not crash the request
                print(f"Warning: Failed to delete old selfie file: {delete_error}")

    try:
        content = await selfie.read()
        with open(absolute_path, "wb") as f:
            f.write(content)
    except Exception as io_error:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to save selfie file: {str(io_error)}"
        )

    # 6. Database save or update
    try:
        # Re-construct request model with real selfie path
        request_payload = FarmerRegistrationRequest(
            farmer_name=farmer_name,
            mobile_number=mobile_number,
            crop_type=crop_type,
            crop_ids=parsed_crop_ids,
            selfie_path=relative_path,
            latitude=latitude,
            longitude=longitude
        )
        
        # Save or update using transaction in DB service layer
        saved_id = save_or_update_farmer(request_payload, farmer_id=farmer_id)
        
        return FarmerRegistrationResponse(
            message="Farmer registration successful",
            farmer_id=saved_id,
            mobile_number=mobile_number
        )
    except sqlite3.Error as e:
        # Cleanup saved file if database transaction fails for a new registration
        if not old_selfie_path and os.path.exists(absolute_path):
            try:
                os.remove(absolute_path)
            except Exception:
                pass
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database error: {str(e)}"
        )


@app.get(
    "/api/crops",
    response_model=List[CropResponse],
    status_code=status.HTTP_200_OK
)
def fetch_crops():
    try:
        crops = get_all_crops()
        return crops
    except sqlite3.Error as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database error: {str(e)}"
        )


@app.get(
    "/api/farmers/mobile/{mobile_number}",
    response_model=FarmerDetailsResponse,
    status_code=status.HTTP_200_OK,
    summary="Get farmer details by mobile number",
    description=(
        "Fetches a farmer's full profile – including their assigned crops – "
        "using their 10-digit mobile number. Returns 404 if no farmer is found."
    ),
    responses={
        200: {"description": "Farmer found – returns full profile with nested crops"},
        404: {"description": "No farmer registered with the given mobile number"},
        422: {"description": "Validation error – mobile number must be exactly 10 digits"},
    },
)
def get_farmer_by_mobile_number(mobile_number: str):
    # Validate: must be exactly 10 decimal digits
    if not mobile_number.isdigit() or len(mobile_number) != 10:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="mobile_number must be a 10-digit numeric string.",
        )

    try:
        farmer = get_farmer_by_mobile(mobile_number)
    except sqlite3.Error as e:
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