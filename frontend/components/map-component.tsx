"use client";

import React, { useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { useToast } from "@/components/ui/toast";
import { ShieldCheck, User, Scale, Radio } from "lucide-react";

interface MapComponentProps {
  isDrawing: boolean;
  setIsDrawing: (drawing: boolean) => void;
  showRegistry: boolean;
  showGCP: boolean;
  showYieldOverlay: boolean;
  mapStyle: "dark" | "satellite";
  activeCrop: "basmati" | "clove";
  onPolygonCreated: (geojson: any) => void;
  ndviOverlayUrl: string | null;
  ndviBbox: number[][] | null;
}

export const MapComponent: React.FC<MapComponentProps> = ({
  isDrawing,
  setIsDrawing,
  showRegistry,
  showGCP,
  showYieldOverlay,
  mapStyle,
  activeCrop,
  onPolygonCreated,
  ndviOverlayUrl,
  ndviBbox,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const { toast } = useToast();

  const [drawCoords, setDrawCoords] = useState<number[][]>([]);
  const [activePopup, setActivePopup] = useState<maplibregl.Popup | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);

  const drawCoordsRef = useRef<number[][]>([]);
  useEffect(() => {
    drawCoordsRef.current = drawCoords;
  }, [drawCoords]);

  const isDrawingRef = useRef(isDrawing);
  const onPolygonCreatedRef = useRef(onPolygonCreated);

  useEffect(() => {
    isDrawingRef.current = isDrawing;
  }, [isDrawing]);

  useEffect(() => {
    onPolygonCreatedRef.current = onPolygonCreated;
  }, [onPolygonCreated]);

  // Basemap URLs
  const darkStyle = "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json";
  const satelliteSource = {
    type: "raster" as const,
    tiles: ["https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"],
    tileSize: 256,
    attribution: "ESRI World Imagery",
  };

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: darkStyle,
      center: [76.08, 29.05], // Center on Haryana, India by default
      zoom: 8.5,
      pitch: 0,
      antialias: true,
    });

    mapRef.current = map;

    map.on("load", () => {
      // 1. Add source for the drawing tool
      map.addSource("draw-source", {
        type: "geojson",
        data: {
          type: "FeatureCollection",
          features: [],
        },
      });

      // Layer 1: Drawn Polygon Fill (semi-transparent green glow)
      map.addLayer({
        id: "draw-fill-layer",
        type: "fill",
        source: "draw-source",
        filter: ["==", "$type", "Polygon"],
        paint: {
          "fill-color": "#10b981",
          "fill-opacity": 0.15,
        },
      });

      // Layer 2: Drawn Polygon Outline (glowing green border)
      map.addLayer({
        id: "draw-line-layer",
        type: "line",
        source: "draw-source",
        paint: {
          "line-color": "#10b981",
          "line-width": 2.5,
          "line-dasharray": [2, 1],
        },
      });

      // Layer 3: Drawing Vertices
      map.addLayer({
        id: "draw-point-layer",
        type: "circle",
        source: "draw-source",
        filter: ["==", "$type", "Point"],
        paint: {
          "circle-radius": 5,
          "circle-color": "#10b981",
          "circle-stroke-width": 2,
          "circle-stroke-color": "#ffffff",
        },
      });

      // 2. Add source for GCP points
      map.addSource("gcp-source", {
        type: "geojson",
        data: {
          type: "FeatureCollection",
          features: [],
        },
      });

      // Layer 4: Pulse ring beneath GCP
      map.addLayer({
        id: "gcp-pulse-layer",
        type: "circle",
        source: "gcp-source",
        paint: {
          "circle-radius": 12,
          "circle-color": "#f97316",
          "circle-opacity": 0.25,
          "circle-stroke-width": 1,
          "circle-stroke-color": "#ea580c",
        },
      });

      // Layer 5: GCP Circle Marker
      map.addLayer({
        id: "gcp-layer",
        type: "circle",
        source: "gcp-source",
        paint: {
          "circle-radius": 6,
          "circle-color": "#f97316",
          "circle-stroke-width": 1.5,
          "circle-stroke-color": "#ffffff",
        },
      });

      // Fetch simulated plots & GCPs for initial active crop
      fetchPlotsAndGCPS(activeCrop);

      // Setup GCP Click Popups
      map.on("click", "gcp-layer", (e) => {
        if (!e.features || e.features.length === 0) return;
        const props = e.features[0].properties;
        const geom = e.features[0].geometry as any;
        const coordinates = geom.coordinates;

        const popupHTML = `
          <div class="flex flex-col gap-2 p-1 min-w-[200px]">
            <div class="flex items-center gap-1.5 border-b border-zinc-800 pb-1.5">
              <span class="flex h-2 w-2 rounded-full bg-orange-500 animate-ping"></span>
              <span class="text-[9px] uppercase tracking-wider font-extrabold text-orange-400">Ground Control Point</span>
            </div>
            
            <div class="flex justify-between items-center mt-1">
              <div class="flex flex-col">
                <span class="text-[8px] text-zinc-500 font-bold uppercase">GCP Station</span>
                <span class="text-xs font-mono font-bold text-zinc-200 mt-0.5">${props.id}</span>
              </div>
              <span class="text-[8px] bg-orange-950/40 text-orange-400 border border-orange-900/40 px-1.5 py-0.5 rounded-full font-bold">
                Calibrated
              </span>
            </div>

            <div class="grid grid-cols-2 gap-2 mt-1 border-t border-zinc-900 pt-1.5 text-xs">
              <div class="flex flex-col">
                <span class="text-[8px] text-zinc-600 font-extrabold uppercase">Elevation</span>
                <span class="text-[10px] font-bold text-zinc-300 mt-0.5">${props.elevation_m} m</span>
              </div>
              <div class="flex flex-col">
                <span class="text-[8px] text-zinc-600 font-extrabold uppercase">Last Sync</span>
                <span class="text-[10px] font-bold text-zinc-300 mt-0.5">${props.calibration_date}</span>
              </div>
            </div>

            <div class="flex flex-col border-t border-zinc-900 pt-1 text-[8px] text-zinc-500 font-semibold font-mono">
              Coordinates: [${coordinates[0].toFixed(5)}, ${coordinates[1].toFixed(5)}]
            </div>
          </div>
        `;

        if (activePopup) activePopup.remove();

        const popup = new maplibregl.Popup()
          .setLngLat(coordinates)
          .setHTML(popupHTML)
          .addTo(map);

        setActivePopup(popup);
      });

      // Cursor styles on GCP hover
      map.on("mouseenter", "gcp-layer", () => {
        if (!isDrawingRef.current) map.getCanvas().style.cursor = "pointer";
      });
      map.on("mouseleave", "gcp-layer", () => {
        if (!isDrawingRef.current) map.getCanvas().style.cursor = "";
      });
      setMapLoaded(true);
    });

    // Handle Map Clicks for drawing
    map.on("click", (e) => {
      if (!isDrawingRef.current) return;

      const newCoord = [e.lngLat.lng, e.lngLat.lat];
      const updatedCoords = [...drawCoordsRef.current, newCoord];
      setDrawCoords(updatedCoords);

      updateDrawLayer(updatedCoords);
    });

    // Handle Map Double Click to finish drawing
    map.on("dblclick", (e) => {
      if (!isDrawingRef.current) return;
      e.preventDefault();

      const current = drawCoordsRef.current;
      if (current.length < 3) {
        toast({
          title: "Geometry Error",
          description: "Please draw at least 3 points before completing.",
          type: "error",
        });
        return;
      }

      const closedCoords = [...current, current[0]];
      setDrawCoords([]);
      setIsDrawing(false);
      
      updateDrawLayer([]);

      const geojsonPolygon = {
        type: "Polygon",
        coordinates: [closedCoords],
      };

      onPolygonCreatedRef.current(geojsonPolygon);
    });

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // Update map drawing layer
  const updateDrawLayer = (coords: number[][]) => {
    const map = mapRef.current;
    if (!map) return;

    const source = map.getSource("draw-source") as maplibregl.GeoJSONSource;
    if (!source) return;

    const features: any[] = [];

    coords.forEach((c) => {
      features.push({
        type: "Feature",
        geometry: {
          type: "Point",
          coordinates: c,
        },
      });
    });

    if (coords.length >= 3) {
      features.push({
        type: "Feature",
        geometry: {
          type: "Polygon",
          coordinates: [[...coords, coords[0]]],
        },
      });
    } else if (coords.length === 2) {
      features.push({
        type: "Feature",
        geometry: {
          type: "LineString",
          coordinates: coords,
        },
      });
    }

    source.setData({
      type: "FeatureCollection",
      features: features,
    });
  };

  // Listen to external isDrawing changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;

    if (isDrawing) {
      map.getCanvas().style.cursor = "crosshair";
      setDrawCoords([]);
      updateDrawLayer([]);
      removeNDVIOverlay();
      toast({
        title: "Drawing Mode Active",
        description: "Click to place vertices. Double-click to complete and analyze.",
        type: "info",
      });
    } else {
      map.getCanvas().style.cursor = "";
    }
  }, [isDrawing]);

  // Handle Basemap Swapping
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;

    if (mapStyle === "satellite") {
      if (!map.getSource("satellite-raster")) {
        map.addSource("satellite-raster", satelliteSource);
        
        let beforeId = undefined;
        if (map.getLayer("draw-fill-layer")) {
          beforeId = "draw-fill-layer";
        } else if (map.getLayer("basmatinet-layer")) {
          beforeId = "basmatinet-layer";
        }

        map.addLayer(
          {
            id: "satellite-layer",
            type: "raster",
            source: "satellite-raster",
            paint: {
              "raster-opacity": 0.85,
            },
          },
          beforeId
        );
      } else {
        map.setLayoutProperty("satellite-layer", "visibility", "visible");
      }
    } else {
      if (map.getLayer("satellite-layer")) {
        map.setLayoutProperty("satellite-layer", "visibility", "none");
      }
    }
  }, [mapStyle]);

  // Handle APEDA Plot Registry Visibility
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;

    const layerId = "basmatinet-layer";
    const outlineId = "basmatinet-outline";
    if (map.getLayer(layerId)) {
      map.setLayoutProperty(layerId, "visibility", showRegistry ? "visible" : "none");
    }
    if (map.getLayer(outlineId)) {
      map.setLayoutProperty(outlineId, "visibility", showRegistry ? "visible" : "none");
    }
  }, [showRegistry]);

  // Handle GCP Point Visibility
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;

    const layerId = "gcp-layer";
    const pulseId = "gcp-pulse-layer";
    if (map.getLayer(layerId)) {
      map.setLayoutProperty(layerId, "visibility", showGCP ? "visible" : "none");
    }
    if (map.getLayer(pulseId)) {
      map.setLayoutProperty(pulseId, "visibility", showGCP ? "visible" : "none");
    }
  }, [showGCP]);

  // Handle NDVI Yield Overlay Visibility
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;

    const layerId = "ndvi-raster-layer";
    if (map.getLayer(layerId)) {
      map.setLayoutProperty(layerId, "visibility", showYieldOverlay ? "visible" : "none");
    }
  }, [showYieldOverlay]);

  // Handle Active Region/Crop Swapping (Sweeps Map Camera from India to Madagascar!)
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;

    // Reset overlay
    removeNDVIOverlay();

    if (activeCrop === "clove") {
      // Sweep Map to Analanjirofo, Madagascar
      map.flyTo({
        center: [49.65, -17.15],
        zoom: 9.2,
        duration: 2500,
        pitch: 15,
      });
      toast({
        title: "Study Area: Madagascar",
        description: "Zooming to clove agroforestry systems in the Analanjirofo coast.",
        type: "info",
      });
    } else {
      // Sweep Map back to Haryana, India
      map.flyTo({
        center: [76.08, 29.05],
        zoom: 8.5,
        duration: 2500,
        pitch: 0,
      });
      toast({
        title: "Study Area: India",
        description: "Zooming back to Basmati rice farming clusters in Haryana & Punjab.",
        type: "info",
      });
    }

    // Refresh plot & GCP sources for this active crop!
    fetchPlotsAndGCPS(activeCrop);
  }, [activeCrop]);

  // Remove active NDVI overlay
  const removeNDVIOverlay = () => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;

    if (map.getLayer("ndvi-raster-layer")) {
      map.removeLayer("ndvi-raster-layer");
    }
    if (map.getSource("ndvi-overlay-source")) {
      map.removeSource("ndvi-overlay-source");
    }
  };

  // Add Dynamic NDVI Overlay and boundary outline
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded || !ndviOverlayUrl || !ndviBbox) {
      removeNDVIOverlay();
      return;
    }

    removeNDVIOverlay();

    const fullUrl = `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}${ndviOverlayUrl}`;

    map.addSource("ndvi-overlay-source", {
      type: "image",
      url: fullUrl,
      coordinates: [
        [ndviBbox[0][0], ndviBbox[1][1]],
        [ndviBbox[1][0], ndviBbox[1][1]],
        [ndviBbox[1][0], ndviBbox[0][1]],
        [ndviBbox[0][0], ndviBbox[0][1]],
      ],
    });

    map.addLayer({
      id: "ndvi-raster-layer",
      type: "raster",
      source: "ndvi-overlay-source",
      layout: {
        visibility: showYieldOverlay ? "visible" : "none",
      },
      paint: {
        "raster-opacity": 0.8,
        "raster-fade-duration": 300,
      },
    });

    map.fitBounds(
      [
        [ndviBbox[0][0], ndviBbox[0][1]],
        [ndviBbox[1][0], ndviBbox[1][1]],
      ],
      { padding: 80, duration: 1500 }
    );
  }, [ndviOverlayUrl, ndviBbox]);

  // Fetch Plots and GCPs dynamically based on selected regional crop
  const fetchPlotsAndGCPS = async (crop: string) => {
    const map = mapRef.current;
    if (!map) return;

    try {
      const backendUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      
      // 1. Fetch plots
      const plotsRes = await fetch(`${backendUrl}/api/plots?crop=${crop}`);
      if (plotsRes.ok) {
        const plotsData = await plotsRes.json();
        const plotFeatures = plotsData.map((plot: any) => ({
          type: "Feature",
          properties: {
            id: plot.id,
            farmer_name: plot.farmer_name,
            variety: plot.variety,
            acreage: plot.acreage,
            state: plot.state,
            district: plot.district,
            crop: plot.crop,
          },
          geometry: {
            type: "Polygon",
            coordinates: [plot.coordinates],
          },
        }));

        const plotsSource = map.getSource("basmatinet-source") as maplibregl.GeoJSONSource;
        if (plotsSource) {
          plotsSource.setData({
            type: "FeatureCollection",
            features: plotFeatures,
          });
        } else {
          // If source not added yet (failsafe)
          map.addSource("basmatinet-source", {
            type: "geojson",
            data: { type: "FeatureCollection", features: plotFeatures }
          });
          
          map.addLayer({
            id: "basmatinet-layer",
            type: "fill",
            source: "basmatinet-source",
            layout: { visibility: showRegistry ? "visible" : "none" },
            paint: {
              "fill-color": [
                "match",
                ["get", "variety"],
                "Pusa Basmati 1121 (PB1121)", "#8b5cf6",
                "Pusa Basmati 1509 (PB1509)", "#10b981",
                "CSR 30 (Traditional)", "#f59e0b",
                "Pusa Basmati 1885 (PB1885)", "#f43f5e",
                "Premium Organic Madagascar Clove (A-Grade)", "#06b6d4",
                "Standard Madagascar Clove", "#10b981",
                "#71717a",
              ],
              "fill-opacity": 0.25,
            }
          });

          map.addLayer({
            id: "basmatinet-outline",
            type: "line",
            source: "basmatinet-source",
            layout: { visibility: showRegistry ? "visible" : "none" },
            paint: {
              "line-color": [
                "match",
                ["get", "variety"],
                "Pusa Basmati 1121 (PB1121)", "#a78bfa",
                "Pusa Basmati 1509 (PB1509)", "#34d399",
                "CSR 30 (Traditional)", "#fbbf24",
                "Pusa Basmati 1885 (PB1885)", "#fb7185",
                "Premium Organic Madagascar Clove (A-Grade)", "#67e8f9",
                "Standard Madagascar Clove", "#34d399",
                "#a1a1aa",
              ],
              "line-width": 1.5,
            }
          });
        }

        // Dynamically adjust color mapping palette inside layer properties if layers exist!
        if (map.getLayer("basmatinet-layer")) {
          map.setPaintProperty("basmatinet-layer", "fill-color", [
            "match",
            ["get", "variety"],
            "Pusa Basmati 1121 (PB1121)", "#8b5cf6",
            "Pusa Basmati 1509 (PB1509)", "#10b981",
            "CSR 30 (Traditional)", "#f59e0b",
            "Pusa Basmati 1885 (PB1885)", "#f43f5e",
            "Premium Organic Madagascar Clove (A-Grade)", "#06b6d4",
            "Standard Madagascar Clove", "#10b981",
            "#71717a",
          ]);
        }
        if (map.getLayer("basmatinet-outline")) {
          map.setPaintProperty("basmatinet-outline", "line-color", [
            "match",
            ["get", "variety"],
            "Pusa Basmati 1121 (PB1121)", "#a78bfa",
            "Pusa Basmati 1509 (PB1509)", "#34d399",
            "CSR 30 (Traditional)", "#fbbf24",
            "Pusa Basmati 1885 (PB1885)", "#fb7185",
            "Premium Organic Madagascar Clove (A-Grade)", "#67e8f9",
            "Standard Madagascar Clove", "#34d399",
            "#a1a1aa",
          ]);
        }
      }

      // 2. Fetch Ground Control Points (GCPs)
      const gcpRes = await fetch(`${backendUrl}/api/gcp-points?crop=${crop}`);
      if (gcpRes.ok) {
        const gcpData = await gcpRes.json();
        const gcpFeatures = gcpData.map((gcp: any) => ({
          type: "Feature",
          properties: {
            id: gcp.id,
            crop: gcp.crop,
            elevation_m: gcp.elevation_m,
            calibration_date: gcp.calibration_date,
            type: gcp.type,
          },
          geometry: {
            type: "Point",
            coordinates: gcp.coordinates,
          },
        }));

        const gcpSource = map.getSource("gcp-source") as maplibregl.GeoJSONSource;
        if (gcpSource) {
          gcpSource.setData({
            type: "FeatureCollection",
            features: gcpFeatures,
          });
        }
      }

      // Remove popup when active crop switches
      if (activePopup) activePopup.remove();

    } catch (err) {
      console.error("Failed to load plots and GCPs dynamically", err);
    }
  };

  return (
    <div className="absolute inset-0 w-full h-full">
      <div ref={mapContainerRef} className="w-full h-full" />
    </div>
  );
};
