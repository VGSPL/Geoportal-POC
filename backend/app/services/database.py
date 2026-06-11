import sqlite3
import os
import secrets
import string
import uuid
from typing import List
from app.models import FarmerRegistrationRequest


DB_DIR = os.path.dirname(
    os.path.dirname(
        os.path.dirname(os.path.abspath(__file__))
    )
)

DB_PATH = os.path.join(DB_DIR, "farmers.db")


def get_db_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    conn = get_db_connection()
    cursor = conn.cursor()

    # Farmers table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS farmers (
            id TEXT PRIMARY KEY,
            farmer_name TEXT NOT NULL,
            mobile_number TEXT UNIQUE NOT NULL,
            crop_type TEXT NOT NULL,
            selfie_path TEXT,
            latitude REAL NOT NULL,
            longitude REAL NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)

    # Farmer ↔ Crops relation table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS farmer_crops (
            id TEXT PRIMARY KEY,
            farmer_id TEXT NOT NULL,
            crop_id INTEGER NOT NULL,

            FOREIGN KEY (farmer_id)
            REFERENCES farmers(id)
        )
    """)

    # Performance indexes
    cursor.execute("""
        CREATE INDEX IF NOT EXISTS idx_farmer_mobile
        ON farmers(mobile_number)
    """)

    cursor.execute("""
        CREATE INDEX IF NOT EXISTS idx_farmer_crop
        ON farmer_crops(farmer_id)
    """)

    conn.commit()
    conn.close()


def generate_unique_farmer_id(cursor: sqlite3.Cursor) -> str:
    """
    Generates a unique farmer ID of the form FARMER-XXXXXX,
    where XXXXXX is a 6-character random uppercase alphanumeric string.
    """
    while True:
        suffix = "".join(secrets.choice(string.ascii_uppercase + string.digits) for _ in range(6))
        farmer_id = f"FARMER-{suffix}"
        cursor.execute("SELECT 1 FROM farmers WHERE id = ?", (farmer_id,))
        if not cursor.fetchone():
            return farmer_id


def save_farmer_crops(cursor: sqlite3.Cursor, farmer_id: str, crop_ids: List[int]) -> None:
    """
    Saves/replaces crop mappings for the given farmer.
    """
    # Delete old crop mappings
    cursor.execute("DELETE FROM farmer_crops WHERE farmer_id = ?", (farmer_id,))
    
    # Insert new crop mappings
    for crop_id in crop_ids:
        mapping_id = str(uuid.uuid4())
        cursor.execute(
            "INSERT INTO farmer_crops (id, farmer_id, crop_id) VALUES (?, ?, ?)",
            (mapping_id, farmer_id, crop_id)
        )


def save_or_update_farmer(request: FarmerRegistrationRequest, farmer_id: str = None) -> str:
    """
    Saves a new farmer or updates an existing one if the mobile number already exists,
    performing the operations inside a database transaction.
    """
    conn = get_db_connection()
    try:
        with conn:
            cursor = conn.cursor()
            
            # Check if farmer with mobile_number exists
            cursor.execute(
                "SELECT id FROM farmers WHERE mobile_number = ?",
                (request.mobile_number,)
            )
            row = cursor.fetchone()
            
            if row:
                db_farmer_id = row["id"]
                # Use the existing ID from DB, or passed ID if any
                final_id = farmer_id if farmer_id else db_farmer_id
                
                # Update existing farmer details
                cursor.execute(
                    """
                    UPDATE farmers
                    SET farmer_name = ?,
                        crop_type = ?,
                        selfie_path = ?,
                        latitude = ?,
                        longitude = ?,
                        updated_at = CURRENT_TIMESTAMP
                    WHERE id = ?
                    """,
                    (
                        request.farmer_name,
                        request.crop_type.value,
                        request.selfie_path,
                        request.latitude,
                        request.longitude,
                        final_id
                    )
                )
            else:
                # Create new farmer
                final_id = farmer_id if farmer_id else generate_unique_farmer_id(cursor)
                cursor.execute(
                    """
                    INSERT INTO farmers (
                        id, farmer_name, mobile_number, crop_type,
                        selfie_path, latitude, longitude
                    ) VALUES (?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        final_id,
                        request.farmer_name,
                        request.mobile_number,
                        request.crop_type.value,
                        request.selfie_path,
                        request.latitude,
                        request.longitude
                    )
                )
            
            # Save crop mapping
            save_farmer_crops(cursor, final_id, request.crop_ids)
            
            return final_id
    except sqlite3.Error as e:
        # Re-raise so the caller can handle the DB error
        raise e
    finally:
        conn.close()