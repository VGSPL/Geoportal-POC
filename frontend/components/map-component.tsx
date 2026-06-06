"use client";

import React, { useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { useToast } from "@/components/ui/toast";

interface MapComponentProps {
  isDrawing: boolean;
  setIsDrawing: (drawing: boolean) => void;
  showRegistry: boolean;
  showGCP: boolean;
  showYieldOverlay: boolean;
  mapStyle: "dark" | "satellite";
  activeCrop: string;
  onPolygonCreated: (geojson: any) => void;
  ndviOverlayUrl: string | null;
  ndviBbox: number[][] | null;
  refreshKey?: number;
  onSelectPlot?: (geojson: any) => void;
}

export const MapComponent: React.FC<MapComponentProps> = ({
  isDrawing,
  setIsDrawing,
  showRegistry,
  showYieldOverlay,
  mapStyle,
  onPolygonCreated,
  ndviOverlayUrl,
  ndviBbox,
  refreshKey = 0,
  onSelectPlot,
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
  const onSelectPlotRef = useRef(onSelectPlot);

  useEffect(() => {
    isDrawingRef.current = isDrawing;
  }, [isDrawing]);

  useEffect(() => {
    onPolygonCreatedRef.current = onPolygonCreated;
  }, [onPolygonCreated]);

  useEffect(() => {
    onSelectPlotRef.current = onSelectPlot;
  }, [onSelectPlot]);

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
      center: [76.45, 30.28], // Center near Patiala, Punjab
      zoom: 11,
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

      // Initialize saved plots GeoJSON source
      map.addSource("basmatinet-source", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] }
      });
      
      map.addLayer({
        id: "basmatinet-layer",
        type: "fill",
        source: "basmatinet-source",
        layout: { visibility: showRegistry ? "visible" : "none" },
        paint: {
          "fill-color": [
            "match",
            ["get", "crop"],
            "Wheat", "#f59e0b",
            "Rice", "#8b5cf6",
            "Clover", "#10b981",
            "Cotton", "#06b6d4",
            "#3b82f6" // Default blue
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
            ["get", "crop"],
            "Wheat", "#fbbf24",
            "Rice", "#a78bfa",
            "Clover", "#34d399",
            "Cotton", "#22d3ee",
            "#60a5fa"
          ],
          "line-width": 1.5,
        }
      });

      // Setup Plot Click Popups
      map.on("click", "basmatinet-layer", (e) => {
        if (!e.features || e.features.length === 0) return;
        const props = e.features[0].properties;
        const geom = e.features[0].geometry as any;
        const coordinates = e.lngLat;

        const popupHTML = `
          <div class="flex flex-col gap-2 p-1 min-w-[200px] text-zinc-100">
            <div class="flex items-center gap-1.5 border-b border-zinc-800 pb-1.5">
              <span class="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span class="text-[9px] uppercase tracking-wider font-extrabold text-emerald-400">Field Details</span>
            </div>
            
            <div class="flex justify-between items-center mt-1">
              <div class="flex flex-col">
                <span class="text-[8px] text-zinc-500 font-bold uppercase">Field Name</span>
                <span class="text-xs font-mono font-bold text-zinc-200 mt-0.5">${props.field_name || 'Unnamed Field'}</span>
              </div>
              <span class="text-[8px] bg-emerald-950/40 text-emerald-400 border border-emerald-900/40 px-1.5 py-0.5 rounded-full font-bold">
                ${props.crop}
              </span>
            </div>

            <div class="grid grid-cols-2 gap-2 mt-1 border-t border-zinc-900/60 pt-1.5 text-xs">
              <div class="flex flex-col">
                <span class="text-[8px] text-zinc-500 font-extrabold uppercase">Farmer</span>
                <span class="text-[10px] font-bold text-zinc-300 mt-0.5">${props.farmer_name}</span>
              </div>
              <div class="flex flex-col">
                <span class="text-[8px] text-zinc-500 font-extrabold uppercase">Area</span>
                <span class="text-[10px] font-bold text-zinc-300 mt-0.5">${parseFloat(props.acreage).toFixed(2)} Ac</span>
              </div>
            </div>

            <div class="flex flex-col border-t border-zinc-900/60 pt-1 text-[8px] text-zinc-650 font-semibold font-mono">
              ID: ${props.id}
            </div>
          </div>
        `;

        if (activePopup) activePopup.remove();

        const popup = new maplibregl.Popup({ closeButton: false })
          .setLngLat(coordinates)
          .setHTML(popupHTML)
          .addTo(map);

        setActivePopup(popup);

        // Fetch biomass analytics for sidebar report
        if (onSelectPlotRef.current) {
          onSelectPlotRef.current(geom);
        }
      });

      // Cursor styles on plots hover
      map.on("mouseenter", "basmatinet-layer", () => {
        if (!isDrawingRef.current) map.getCanvas().style.cursor = "pointer";
      });
      map.on("mouseleave", "basmatinet-layer", () => {
        if (!isDrawingRef.current) map.getCanvas().style.cursor = "";
      });

      // Load database plots initial dataset
      fetchPlots();
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
      if (activePopup) activePopup.remove();
      toast({
        title: "Drawing Mode Active",
        description: "Click to place corners. Double-click to complete and save.",
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
        
        // Find the first layer in the current style that is NOT background 
        // to place the satellite tiles underneath road grids and text labels
        let beforeId = undefined;
        try {
          const style = map.getStyle();
          if (style && style.layers) {
            for (const layer of style.layers) {
              if (layer.type !== "background") {
                beforeId = layer.id;
                break;
              }
            }
          }
        } catch (e) {
          console.error("Failed to parse map layers", e);
        }

        map.addLayer(
          {
            id: "satellite-layer",
            type: "raster",
            source: "satellite-raster",
            paint: {
              "raster-opacity": 0.9,
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
  }, [mapStyle, mapLoaded]);

  // Handle Plot Registry Visibility
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
  }, [showRegistry, mapLoaded]);

  // Handle NDVI Yield Overlay Visibility
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;

    const layerId = "ndvi-raster-layer";
    if (map.getLayer(layerId)) {
      map.setLayoutProperty(layerId, "visibility", showYieldOverlay ? "visible" : "none");
    }
  }, [showYieldOverlay, mapLoaded]);

  // Triggered when plots are saved to SQLite DB
  useEffect(() => {
    if (mapLoaded) {
      fetchPlots();
    }
  }, [refreshKey, mapLoaded]);

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
  }, [ndviOverlayUrl, ndviBbox, mapLoaded]);

  // Fetch Plots from SQLite Database
  const fetchPlots = async () => {
    const map = mapRef.current;
    if (!map) return;

    try {
      const backendUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const plotsRes = await fetch(`${backendUrl}/api/plots`);
      if (plotsRes.ok) {
        const plotsData = await plotsRes.json();
        const plotFeatures = plotsData.map((plot: any) => ({
          type: "Feature",
          properties: {
            id: plot.id,
            farmer_name: plot.farmer_name,
            field_name: plot.field_name,
            crop: plot.crop,
            acreage: plot.acreage
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
        }
      }
    } catch (err) {
      console.error("Failed to load database plots", err);
    }
  };

  return (
    <div className="absolute inset-0 w-full h-full">
      <div ref={mapContainerRef} className="w-full h-full" />
    </div>
  );
};
