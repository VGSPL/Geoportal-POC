import os
import secrets
import string
import uuid
from typing import List, Optional, Dict, Any

import psycopg2
import psycopg2.extras
from dotenv import load_dotenv

from app.models import FarmerRegistrationRequest

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    raise RuntimeError("DATABASE_URL environment variable is not set!")


# ── Connection (mirrors your get_db_connection) ───────────────────────────────
def get_db_connection():
    conn = psycopg2.connect(DATABASE_URL)
    conn.autocommit = False
    return conn


# ── Schema init (mirrors your init_db exactly) ────────────────────────────────
def init_db():
    conn = get_db_connection()
    try:
        cursor = conn.cursor()

        # Farmers table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS farmers (
                id            TEXT PRIMARY KEY,
                farmer_name   TEXT NOT NULL,
                mobile_number TEXT UNIQUE NOT NULL,
                crop_type     TEXT NOT NULL,
                selfie_path   TEXT,
                latitude      REAL NOT NULL,
                longitude     REAL NOT NULL,
                created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)

        # Farmer ↔ Crops relation table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS farmer_crops (
                id        TEXT PRIMARY KEY,
                farmer_id TEXT NOT NULL,
                crop_id   INTEGER NOT NULL,
                FOREIGN KEY (farmer_id) REFERENCES farmers(id)
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

        # Crops master table  (SERIAL replaces AUTOINCREMENT)
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS crops_master (
                id           SERIAL PRIMARY KEY,
                crop_name    TEXT UNIQUE NOT NULL,
                crop_name_en TEXT,
                crop_name_hi TEXT,
                crop_name_mr TEXT,
                created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)

        # Add columns if missing (safe to run multiple times)
        for col in ("crop_name_en", "crop_name_hi", "crop_name_mr"):
            cursor.execute(f"""
                DO $$
                BEGIN
                    IF NOT EXISTS (
                        SELECT 1 FROM information_schema.columns
                        WHERE table_name = 'crops_master' AND column_name = '{col}'
                    ) THEN
                        ALTER TABLE crops_master ADD COLUMN {col} TEXT;
                    END IF;
                END$$;
            """)

        # Seed default crops  (? → %s in psycopg2)
        default_crops = [
            ("Cotton",    "कपास",    "कापूस"),
            ("Rice",      "चावल",    "तांदूळ"),
            ("Wheat",     "गेहूं",   "गहू"),
            ("Carrot",    "गाजर",    "गाजर"),
            ("Onion",     "प्याज",   "कांदा"),
            ("Soybean",   "सोयाबीन", "सोयाबीन"),
            ("Sugarcane", "गन्ना",   "ऊस"),
            ("Maize",     "मक्का",   "मका"),
            ("Tomato",    "टमाटर",   "टोमॅटो"),
            ("Potato",    "आलू",     "बटाटा"),
        ]

        # INSERT OR IGNORE → INSERT … ON CONFLICT DO NOTHING
        psycopg2.extras.execute_batch(cursor, """
            INSERT INTO crops_master (crop_name, crop_name_en, crop_name_hi, crop_name_mr)
            VALUES (%s, %s, %s, %s)
            ON CONFLICT (crop_name) DO NOTHING
        """, [(en, en, hi, mr) for en, hi, mr in default_crops])

        psycopg2.extras.execute_batch(cursor, """
            UPDATE crops_master
            SET crop_name_en = %s,
                crop_name_hi = %s,
                crop_name_mr = %s
            WHERE crop_name = %s OR crop_name_en = %s
        """, [(en, hi, mr, en, en) for en, hi, mr in default_crops])

        conn.commit()
    except Exception as e:
        conn.rollback()
        raise e
    finally:
        conn.close()


# ── Helpers ───────────────────────────────────────────────────────────────────
def generate_unique_farmer_id(cursor) -> str:
    """Same logic as SQLite version – generates FARMER-XXXXXX."""
    while True:
        suffix = "".join(
            secrets.choice(string.ascii_uppercase + string.digits)
            for _ in range(6)
        )
        farmer_id = f"FARMER-{suffix}"
        cursor.execute("SELECT 1 FROM farmers WHERE id = %s", (farmer_id,))
        if not cursor.fetchone():
            return farmer_id


def save_farmer_crops(cursor, farmer_id: str, crop_ids: List[int]) -> None:
    """Replaces crop mappings for a farmer – identical logic to SQLite version."""
    cursor.execute("DELETE FROM farmer_crops WHERE farmer_id = %s", (farmer_id,))
    for crop_id in crop_ids:
        mapping_id = str(uuid.uuid4())
        cursor.execute(
            "INSERT INTO farmer_crops (id, farmer_id, crop_id) VALUES (%s, %s, %s)",
            (mapping_id, farmer_id, crop_id)
        )


# ── Core CRUD ─────────────────────────────────────────────────────────────────
def save_or_update_farmer(request: FarmerRegistrationRequest, farmer_id: str = None) -> str:
    """
    Saves a new farmer or updates an existing one by mobile number.
    Mirrors your SQLite version exactly – same logic, same return value.
    """
    conn = get_db_connection()
    try:
        cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

        cursor.execute(
            "SELECT id FROM farmers WHERE mobile_number = %s",
            (request.mobile_number,)
        )
        row = cursor.fetchone()

        if row:
            db_farmer_id = row["id"]
            final_id = farmer_id if farmer_id else db_farmer_id

            cursor.execute("""
                UPDATE farmers
                SET farmer_name = %s,
                    crop_type   = %s,
                    selfie_path = %s,
                    latitude    = %s,
                    longitude   = %s,
                    updated_at  = CURRENT_TIMESTAMP
                WHERE id = %s
            """, (
                request.farmer_name,
                request.crop_type.value,
                request.selfie_path,
                request.latitude,
                request.longitude,
                final_id,
            ))
        else:
            final_id = farmer_id if farmer_id else generate_unique_farmer_id(cursor)
            cursor.execute("""
                INSERT INTO farmers (
                    id, farmer_name, mobile_number, crop_type,
                    selfie_path, latitude, longitude
                ) VALUES (%s, %s, %s, %s, %s, %s, %s)
            """, (
                final_id,
                request.farmer_name,
                request.mobile_number,
                request.crop_type.value,
                request.selfie_path,
                request.latitude,
                request.longitude,
            ))

        save_farmer_crops(cursor, final_id, request.crop_ids)
        conn.commit()
        return final_id

    except Exception as e:
        conn.rollback()
        raise e
    finally:
        conn.close()


def get_all_crops() -> List[dict]:
    """Fetches all crops – identical output shape to SQLite version."""
    conn = get_db_connection()
    try:
        cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        cursor.execute("""
            SELECT
                id,
                COALESCE(crop_name_en, crop_name) AS crop_name_en,
                COALESCE(crop_name_hi, crop_name) AS crop_name_hi,
                COALESCE(crop_name_mr, crop_name) AS crop_name_mr
            FROM crops_master
            ORDER BY id ASC
        """)
        rows = cursor.fetchall()
        return [
            {
                "id": row["id"],
                "crop_name": {
                    "en": row["crop_name_en"],
                    "hi": row["crop_name_hi"],
                    "mr": row["crop_name_mr"],
                },
            }
            for row in rows
        ]
    except Exception as e:
        raise e
    finally:
        conn.close()


def get_farmer_by_mobile(mobile_number: str) -> Optional[Dict[str, Any]]:
    """
    Fetches full farmer profile with crops via LEFT JOIN.
    Returns identical structure to your SQLite version.
    """
    conn = get_db_connection()
    try:
        cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        cursor.execute("""
            SELECT
                f.id            AS farmer_id,
                f.farmer_name,
                f.mobile_number,
                f.crop_type,
                f.latitude,
                f.longitude,
                f.selfie_path,
                cm.id           AS crop_id,
                COALESCE(cm.crop_name_en, cm.crop_name) AS crop_name_en,
                COALESCE(cm.crop_name_hi, cm.crop_name) AS crop_name_hi,
                COALESCE(cm.crop_name_mr, cm.crop_name) AS crop_name_mr
            FROM farmers f
            LEFT JOIN farmer_crops fc ON fc.farmer_id = f.id
            LEFT JOIN crops_master  cm ON cm.id = fc.crop_id
            WHERE f.mobile_number = %s
            ORDER BY cm.id ASC
        """, (mobile_number,))
        rows = cursor.fetchall()

        if not rows:
            return None

        first = rows[0]
        farmer: Dict[str, Any] = {
            "farmer_id":     first["farmer_id"],
            "farmer_name":   first["farmer_name"],
            "mobile_number": first["mobile_number"],
            "crop_type":     first["crop_type"],
            "latitude":      first["latitude"],
            "longitude":     first["longitude"],
            "selfie_url":    f"/{first['selfie_path']}" if first["selfie_path"] else None,
            "crops":         [],
        }

        for row in rows:
            if row["crop_id"] is not None:
                farmer["crops"].append({
                    "id": row["crop_id"],
                    "crop_name": {
                        "en": row["crop_name_en"],
                        "hi": row["crop_name_hi"],
                        "mr": row["crop_name_mr"],
                    }
                })

        return farmer
    except Exception as e:
        raise e
    finally:
        conn.close()
