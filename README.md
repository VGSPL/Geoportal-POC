# 🌾 Basmati Rice Yield Mapping Geoportal PoC

A high-performance, modular, and visually stunning Full-Stack Geoportal for mapping and estimating Basmati rice crop yields across Haryana and Punjab, India. Integrated with simulated **APEDA BasmatiNET Traceability Registries** and dynamic Sentinel-2 satellite crop health (NDVI) overlays.

---

## 🌟 Key Features

1. **APEDA BasmatiNET Live Plot Layer**: Plots verified farm clusters (e.g. Sardar Gurpreet Singh, Patiala; Manoj Kumar, Kaithal) color-coded by specific Basmati cultivars (PB1121, PB1509, CSR30, PB1885).
2. **Interactive Hand-Drawn Agricultural Analysis**: Allows users to sketch polygons directly over the map canvas using our custom, high-speed vector sketch engine (no complex external plugin overhead).
3. **Advanced Local Geospatial Simulator**: Calculates exact geodesic acreage utilizing local UTM projections (Zone 43N - EPSG:32643) and simulates multi-layered spatial crop covers.
4. **Variety-Specific Crop Yield Formulations**: Adjusts biomass regression formulas to the unique genetics of each cultivar:
   * **Pusa Basmati 1121 (`PB1121`)**: `Yield = (Max_NDVI * 2.8) - 0.4`
   * **Pusa Basmati 1509 (`PB1509`)**: `Yield = (Max_NDVI * 2.6) - 0.3`
   * **CSR 30 (`CSR30`)**: `Yield = (Max_NDVI * 2.0) - 0.6`
   * **Standard / Other**: `Yield = (Max_NDVI * 2.5) - 0.5`
5. **Dynamic Raster Image Overlay Service**: Stream-serves high-resolution colormapped PNG overlays generated directly on the FastAPI backend using `matplotlib`'s professional `'RdYlGn'` lookup colormaps.
6. **Sleek SaaS Layout**: Dark mode slate theme, modern Inter typography, glassmorphism panels, and elegant Framer Motion transitions.

---

## 🏗️ Folder Structure

```
basmati-yield-geoportal/
├── backend/                  # FastAPI Geospatial API
│   ├── app/
│   │   ├── main.py           # API Routes (CORS, POST /api/analyze-yield, GET /api/basmatinet/plots)
│   │   ├── models.py         # Pydantic Typed Models
│   │   └── services/
│   │       └── geospatial.py # Area calculation, APEDA registries, & raster generation
│   ├── requirements.txt      # Python Dependencies (shapely, pyproj, numpy, matplotlib)
│   └── .env                  # Port & Host configuration
└── frontend/                 # Next.js 15 App Router Frontend
    ├── app/                  # Globals, layout, and home page
    ├── components/           # Custom map, toolbar, apeda feed, and analytics views
    ├── lib/                  # Shadcn utilities
    └── package.json          # Node dependencies
```

---

## 🚀 Running the Project Locally

### 1. Prerequisite
Ensure you have `uv` (for lightning-fast Python env management) and `npm` installed.

### 2. Start Backend Server (FastAPI)
Open a new terminal tab and run:
```bash
cd backend
# 1. Activate the pre-created virtual environment
source .venv/bin/activate
# 2. Run the server using uvicorn
uvicorn app.main:app --port 8000 --reload
```
The API is now running locally at `http://localhost:8000`. You can inspect documentation at `http://localhost:8000/docs`.

### 3. Start Frontend Server (Next.js)
Open a second terminal tab and run:
```bash
cd frontend
# Run the Next.js development server
npm run dev
```
The geoportal is now active at `http://localhost:3000`. Open your browser and navigate to `http://localhost:3000` to begin mapping!

---

## 🌾 Cultivation Varieties Reference
* **Violet**: Pusa Basmati 1121 (`PB1121`) - Premium export grade with extra-long slender grains.
* **Emerald**: Pusa Basmati 1509 (`PB1509`) - High-density, early maturing, efficient crop.
* **Amber**: CSR 30 (`CSR30`) - Traditional tall cultivar, lower yields but matchless aroma.
* **Rose**: Pusa Basmati 1885 (`PB1885`) - Blight-resistant upgraded clone.
