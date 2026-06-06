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
            acreage REAL NOT NULL,
            coordinates TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
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
        plots.append({
            "id": row["id"],
            "farmer_name": row["farmer_name"],
            "field_name": row["field_name"],
            "crop": row["crop"],
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
    acreage: float,
    coordinates: List[List[float]]
) -> Dict:
    """Saves a new farm plot to the SQLite database."""
    conn = get_db_connection()
    cursor = conn.cursor()
    coords_json = json.dumps(coordinates)
    cursor.execute(
        "INSERT INTO plots (id, farmer_name, field_name, crop, acreage, coordinates) VALUES (?, ?, ?, ?, ?, ?)",
        (plot_id, farmer_name, field_name, crop, acreage, coords_json)
    )
    conn.commit()
    conn.close()
    
    return {
        "id": plot_id,
        "farmer_name": farmer_name,
        "field_name": field_name,
        "crop": crop,
        "acreage": acreage,
        "coordinates": coordinates
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
