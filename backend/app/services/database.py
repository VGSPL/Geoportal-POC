import sqlite3
import json
import os
from typing import List, Dict, Tuple, Optional

# Database path
DB_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
DB_PATH = os.path.join(DB_DIR, "plots.db")

def get_db_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def _ensure_mobile_number_column(cursor):
    cursor.execute("PRAGMA table_info(plots)")
    columns = {row[1] for row in cursor.fetchall()}
    if "mobile_number" not in columns:
        cursor.execute(
            "ALTER TABLE plots ADD COLUMN mobile_number TEXT NOT NULL DEFAULT ''"
        )

def init_db():
    """Initializes the database schema."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS plots (
            id TEXT PRIMARY KEY,
            farmer_name TEXT NOT NULL,
            field_name TEXT NOT NULL,
            crop TEXT NOT NULL,
            mobile_number TEXT NOT NULL DEFAULT '',
            acreage REAL NOT NULL,
            coordinates TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    _ensure_mobile_number_column(cursor)
    conn.commit()
    conn.close()

def get_all_plots() -> List[Dict]:
    """Retrieves all saved farm plots from the SQLite database."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM plots ORDER BY created_at DESC")
    rows = cursor.fetchall()
    conn.close()
    
    plots = []
    for row in rows:
        mobile = row["mobile_number"]
        plots.append({
            "id": row["id"],
            "farmer_name": row["farmer_name"],
            "field_name": row["field_name"],
            "crop": row["crop"],
            "mobile_number": mobile if mobile else None,
            "acreage": row["acreage"],
            "coordinates": json.loads(row["coordinates"]),
            "created_at": row["created_at"]
        })
    return plots

def save_plot(
    plot_id: str,
    farmer_name: str,
    field_name: str,
    crop: str,
    mobile_number: str,
    acreage: float,
    coordinates: List[List[float]]
) -> Dict:
    """Saves a new farm plot to the SQLite database."""
    conn = get_db_connection()
    cursor = conn.cursor()
    coords_json = json.dumps(coordinates)
    cursor.execute(
        "INSERT INTO plots (id, farmer_name, field_name, crop, mobile_number, acreage, coordinates) "
        "VALUES (?, ?, ?, ?, ?, ?, ?)",
        (plot_id, farmer_name, field_name, crop, mobile_number, acreage, coords_json)
    )
    conn.commit()
    conn.close()
    
    return {
        "id": plot_id,
        "farmer_name": farmer_name,
        "field_name": field_name,
        "crop": crop,
        "mobile_number": mobile_number,
        "acreage": acreage,
        "coordinates": coordinates
    }

def get_farmer_by_mobile(mobile_number: str) -> Optional[Dict]:
    """Fetches farmer details and all plots linked to a mobile number."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(
        "SELECT * FROM plots WHERE mobile_number = ? ORDER BY created_at DESC",
        (mobile_number,)
    )
    rows = cursor.fetchall()
    conn.close()

    if not rows:
        return None

    plots = []
    for row in rows:
        mobile = row["mobile_number"]
        plots.append({
            "id": row["id"],
            "farmer_name": row["farmer_name"],
            "field_name": row["field_name"],
            "crop": row["crop"],
            "mobile_number": mobile if mobile else None,
            "acreage": row["acreage"],
            "coordinates": json.loads(row["coordinates"]),
        })

    return {
        "farmer_name": rows[0]["farmer_name"],
        "mobile_number": mobile_number,
        "plots": plots,
    }

def delete_plot(plot_id: str) -> bool:
    """Deletes a plot by its unique identifier."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM plots WHERE id = ?", (plot_id,))
    deleted = cursor.rowcount > 0
    conn.commit()
    conn.close()
    return deleted
