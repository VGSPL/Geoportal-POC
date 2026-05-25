"use client";

import React, { useState } from "react";
import { MapComponent } from "@/components/map-component";
import { Toolbar } from "@/components/toolbar";
import { ApedaFeed } from "@/components/apeda-feed";
import { AnalyticsPanel, YieldData } from "@/components/analytics-panel";
import { useToast } from "@/components/ui/toast";
import { ShieldAlert, Info } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function Home() {
  const { toast } = useToast();
  const [isDrawing, setIsDrawing] = useState(false);
  const [showRegistry, setShowRegistry] = useState(true);
  const [showGCP, setShowGCP] = useState(true);
  const [showYieldOverlay, setShowYieldOverlay] = useState(true);
  const [mapStyle, setMapStyle] = useState<"dark" | "satellite">("dark");
  const [activeCrop, setActiveCrop] = useState<"basmati" | "clove">("basmati");
  const [loading, setLoading] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<YieldData | null>(null);

  const handleSelectAll = (visible: boolean) => {
    setShowRegistry(visible);
    setShowGCP(visible);
    setShowYieldOverlay(visible);
    toast({
      title: visible ? "All Layers Active" : "Layers Hidden",
      description: visible ? "Plots, GCP points, and NDVI layers are visible." : "Hidden agricultural overlays.",
      type: "info",
    });
  };

  const handleCropChange = (crop: "basmati" | "clove") => {
    setActiveCrop(crop);
    setAnalysisResult(null);
    setIsDrawing(false);
  };

  // Triggered when the user finishes double-clicking a polygon on the map
  const handlePolygonCreated = async (geojson: any) => {
    setLoading(true);
    setAnalysisResult(null);
    toast({
      title: "Processing Coordinates",
      description: "Querying Sentinel-2 biomass profiles and computing EPSG area metrics...",
      type: "info",
    });

    try {
      const backendUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const response = await fetch(`${backendUrl}/api/analyze-yield`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ geometry: geojson }),
      });

      if (!response.ok) {
        const errDetails = await response.json();
        throw new Error(errDetails.detail || "Spatial processing failed.");
      }

      const data = await response.json();
      setAnalysisResult(data);

      toast({
        title: "Spatial Analysis Complete",
        description: `Successfully analyzed ${data.total_acres} acres. Detected variety: ${data.detected_variety}.`,
        type: "success",
      });
    } catch (err: any) {
      console.error(err);
      toast({
        title: "Analysis Failure",
        description: err.message || "An unexpected error occurred while executing spatial queries.",
        type: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    setAnalysisResult(null);
    setIsDrawing(false);
    toast({
      title: "Workspace Cleared",
      description: "Drawing grids and crop health layers have been reset.",
      type: "info",
    });
  };

  return (
    <main className="relative w-screen h-screen overflow-hidden bg-zinc-950 font-sans">
      {/* 1. Full-screen map in background */}
      <MapComponent
        isDrawing={isDrawing}
        setIsDrawing={setIsDrawing}
        showRegistry={showRegistry}
        showGCP={showGCP}
        showYieldOverlay={showYieldOverlay}
        mapStyle={mapStyle}
        activeCrop={activeCrop}
        onPolygonCreated={handlePolygonCreated}
        ndviOverlayUrl={analysisResult ? analysisResult.overlay_url : null}
        ndviBbox={analysisResult ? analysisResult.bbox : null}
      />

      {/* 2. Brand & Header Overlay (Top Left) */}
      <div className="absolute top-4 left-4 z-10 flex flex-col gap-3 pointer-events-none">
        <div className="glass-panel pointer-events-auto rounded-2xl p-4 shadow-xl border-zinc-800/80 bg-zinc-950/80 flex flex-col gap-1 w-80 md:w-88">
          <div className="flex items-center justify-between">
            <span className={`text-[9px] uppercase tracking-wider font-extrabold flex items-center gap-1 ${activeCrop === "clove" ? "text-cyan-400" : "text-emerald-400"}`}>
              <span className={`h-1.5 w-1.5 rounded-full animate-pulse ${activeCrop === "clove" ? "bg-cyan-400" : "bg-emerald-400"}`} />
              {activeCrop === "clove" ? "Madagascar Clove Geoportal" : "Basmati Rice Yield Geoportal"}
            </span>
            <span className="text-[9px] text-zinc-500 font-bold font-mono">v1.2.0 (PoC)</span>
          </div>
          <h1 className="text-xl font-black tracking-tight text-zinc-50 mt-1">
            {activeCrop === "clove" ? "Analanjirofo Coast" : "Punjab & Haryana Belt"}
          </h1>
          <p className="text-[11px] leading-relaxed text-zinc-400 mt-1 font-medium">
            {activeCrop === "clove" 
              ? "Agri-analytics portal utilizing high-resolution Sentinel-2 canopy scans cross-referenced against Madagascar Clove Board databases."
              : "Agri-analytics portal utilizing high-resolution Sentinel-2 Sentinel data overlays cross-referenced against APEDA BasmatiNET crop traceability databases."}
          </p>
        </div>

        {/* APEDA/Clove Trade Registry Side Panel */}
        <div className="pointer-events-auto hidden md:block">
          <ApedaFeed activeCrop={activeCrop} />
        </div>
      </div>

      {/* 3. Floating Toolbar (Top Center) */}
      <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-10">
        <Toolbar
          isDrawing={isDrawing}
          hasPolygon={analysisResult !== null}
          showRegistry={showRegistry}
          showGCP={showGCP}
          showYieldOverlay={showYieldOverlay}
          mapStyle={mapStyle}
          activeCrop={activeCrop}
          onStartDraw={() => setIsDrawing(true)}
          onClear={handleClear}
          onToggleRegistry={() => setShowRegistry(!showRegistry)}
          onToggleGCP={() => setShowGCP(!showGCP)}
          onToggleYieldOverlay={() => setShowYieldOverlay(!showYieldOverlay)}
          onSelectAll={handleSelectAll}
          onChangeStyle={setMapStyle}
          onChangeCrop={handleCropChange}
        />
      </div>

      {/* 4. Help Notification (Bottom Center) - Only shows when not drawing and no polygon */}
      {!analysisResult && !isDrawing && (
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-10 pointer-events-none">
          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1 }}
            className="glass-panel pointer-events-auto bg-zinc-950/90 text-[10px] text-zinc-300 font-semibold px-4 py-2 rounded-full shadow-lg border-zinc-800 flex items-center gap-1.5"
          >
            <Info className="h-3.5 w-3.5 text-blue-400" />
            <span>
              Click <strong className={activeCrop === "clove" ? "text-cyan-400" : "text-emerald-400"}>Draw Area</strong> and sketch on any agricultural region of {activeCrop === "clove" ? "Analanjirofo Coast" : "Punjab/Haryana"} to map crop health and yields.
            </span>
          </motion.div>
        </div>
      )}

      {/* 5. Full-Height Sidebar Results Panel (Right Side) */}
      <div className="absolute top-0 right-0 bottom-0 z-20 flex flex-col justify-end pointer-events-none">
        <div className="pointer-events-auto h-full">
          <AnalyticsPanel 
            data={analysisResult} 
            loading={loading} 
            activeCrop={activeCrop}
            onClose={handleClear} 
            onSelectPlot={handlePolygonCreated}
          />
        </div>
      </div>
      
      {/* Mobile-only APEDA Stats Toggle Button (for responsive usability) */}
      <div className="absolute bottom-4 left-4 z-10 pointer-events-auto md:hidden">
        <div className="glass-panel p-2 rounded-xl text-center">
          <span className="text-[8px] font-bold text-zinc-500 uppercase">Acreage analysis ready</span>
        </div>
      </div>
    </main>
  );
}
