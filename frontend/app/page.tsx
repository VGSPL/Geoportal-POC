"use client";

import React, { useState } from "react";
import { MapComponent } from "@/components/map-component";
import { Toolbar } from "@/components/toolbar";
import { AnalyticsPanel, YieldData } from "@/components/analytics-panel";
import { useToast } from "@/components/ui/toast";
import { Info, HelpCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function Home() {
  const { toast } = useToast();
  const [isDrawing, setIsDrawing] = useState(false);
  const [showRegistry, setShowRegistry] = useState(true);
  const [showYieldOverlay, setShowYieldOverlay] = useState(true);
  const [mapStyle, setMapStyle] = useState<"dark" | "satellite">("dark");
  const [loading, setLoading] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<YieldData | null>(null);
  
  // Save Modal States
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [tempGeometry, setTempGeometry] = useState<any>(null);
  const [farmerName, setFarmerName] = useState("");
  const [fieldName, setFieldName] = useState("");
  const [cropType, setCropType] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  const handleSelectAll = (visible: boolean) => {
    setShowRegistry(visible);
    setShowYieldOverlay(visible);
    toast({
      title: visible ? "All Layers Active" : "Layers Hidden",
      description: visible ? "Farm boundaries and biomass overlays are visible." : "Hidden overlays.",
      type: "info",
    });
  };

  // Triggered when the user finishes double-clicking a polygon on the map
  const handlePolygonCreated = (geojson: any) => {
    setTempGeometry(geojson);
    setShowSaveModal(true);
  };

  const handleConfirmSave = async () => {
    if (!tempGeometry) return;
    
    setLoading(true);
    setShowSaveModal(false);
    toast({
      title: "Saving Boundary",
      description: "Persisting field coordinates to SQLite database...",
      type: "info",
    });

    try {
      const backendUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      
      // 1. Save to SQLite
      const saveResponse = await fetch(`${backendUrl}/api/plots`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          farmer_name: farmerName,
          field_name: fieldName,
          crop: cropType,
          geometry: tempGeometry,
        }),
      });

      if (!saveResponse.ok) {
        const errDetails = await saveResponse.json();
        throw new Error(errDetails.detail || "Database write failed.");
      }

      // 2. Perform dynamic Sentinel-2 biomass analysis
      toast({
        title: "Analyzing Crop Biomass",
        description: `Querying Sentinel-2 overlays for ${cropType}...`,
        type: "info",
      });

      const analysisResponse = await fetch(`${backendUrl}/api/analyze-yield`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ geometry: tempGeometry }),
      });

      if (!analysisResponse.ok) {
        throw new Error("Biomass analysis failed.");
      }

      const data = await analysisResponse.json();
      setAnalysisResult(data);

      toast({
        title: "Field Saved",
        description: `Stored '${fieldName}' (${data.total_acres} acres) in SQLite database.`,
        type: "success",
      });

      // Clear inputs
      setFarmerName("");
      setFieldName("");
      setCropType("");
      setTempGeometry(null);
      
      // Trigger side-bar list and map plots refresh
      setRefreshKey(prev => prev + 1);

    } catch (err: any) {
      console.error(err);
      toast({
        title: "Storage Failure",
        description: err.message || "An unexpected error occurred during database persistence.",
        type: "error",
      });
      setTempGeometry(null);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelSave = () => {
    setFarmerName("");
    setFieldName("");
    setCropType("");
    setTempGeometry(null);
    setShowSaveModal(false);
    toast({
      title: "Drawing Reset",
      description: "Field boundary discarded.",
      type: "info",
    });
  };

  const handleSelectPlot = async (geojson: any) => {
    setLoading(true);
    setAnalysisResult(null);
    try {
      const backendUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const response = await fetch(`${backendUrl}/api/analyze-yield`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ geometry: geojson }),
      });

      if (response.ok) {
        const data = await response.json();
        setAnalysisResult(data);
      }
    } catch (err) {
      console.error("Failed to analyze selected plot", err);
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    setAnalysisResult(null);
    setIsDrawing(false);
    toast({
      title: "Workspace Cleared",
      description: "Active boundary drawing grids reset.",
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
        showGCP={false}
        showYieldOverlay={showYieldOverlay}
        mapStyle={mapStyle}
        activeCrop="basmati" // Dummy prop, unused on backend
        onPolygonCreated={handlePolygonCreated}
        ndviOverlayUrl={analysisResult ? analysisResult.overlay_url : null}
        ndviBbox={analysisResult ? analysisResult.bbox : null}
        refreshKey={refreshKey}
        onSelectPlot={handleSelectPlot}
      />

      {/* 2. Brand & Header Overlay (Top Left) */}
      <div className="absolute top-4 left-4 z-10 flex flex-col gap-3 pointer-events-none">
        <div className="glass-panel pointer-events-auto rounded-2xl p-4 shadow-xl border-zinc-800/80 bg-zinc-950/80 flex flex-col gap-1 w-80 md:w-88">
          <div className="flex items-center justify-between">
            <span className="text-[9px] uppercase tracking-wider font-extrabold text-emerald-400 flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Agricultural Geoportal PoC
            </span>
            <span className="text-[9px] text-zinc-500 font-bold font-mono">v2.0.0</span>
          </div>
          <h1 className="text-xl font-black tracking-tight text-zinc-50 mt-1">
            Custom Plot Drawing
          </h1>
          <p className="text-[11px] leading-relaxed text-zinc-400 mt-1 font-medium">
            Draw field boundaries anywhere on the map to persist them directly to SQLite, classify crop growth stages, and view high-resolution NDVI telemetry.
          </p>
        </div>
      </div>

      {/* 3. Floating Toolbar (Top Center) */}
      <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-10">
        <Toolbar
          isDrawing={isDrawing}
          hasPolygon={analysisResult !== null}
          showRegistry={showRegistry}
          showYieldOverlay={showYieldOverlay}
          mapStyle={mapStyle}
          onStartDraw={() => setIsDrawing(true)}
          onClear={handleClear}
          onToggleRegistry={() => setShowRegistry(!showRegistry)}
          onToggleYieldOverlay={() => setShowYieldOverlay(!showYieldOverlay)}
          onSelectAll={handleSelectAll}
          onChangeStyle={setMapStyle}
        />
      </div>

      {/* 4. Help Notification (Bottom Center) */}
      {!analysisResult && !isDrawing && (
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-10 pointer-events-none">
          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="glass-panel pointer-events-auto bg-zinc-950/90 text-[10px] text-zinc-300 font-semibold px-4 py-2 rounded-full shadow-lg border-zinc-800 flex items-center gap-1.5"
          >
            <HelpCircle className="h-3.5 w-3.5 text-emerald-400" />
            <span>Click <strong className="text-emerald-400">Draw Area</strong> and double-click to save field boundaries to the database.</span>
          </motion.div>
        </div>
      )}

      {/* 5. Full-Height Sidebar Results Panel (Right Side) */}
      <div className="absolute top-0 right-0 bottom-0 z-20 flex flex-col justify-end pointer-events-none">
        <div className="pointer-events-auto h-full">
          <AnalyticsPanel 
            data={analysisResult} 
            loading={loading} 
            activeCrop="basmati"
            onClose={handleClear} 
            onSelectPlot={handleSelectPlot}
            refreshKey={refreshKey}
          />
        </div>
      </div>

      {/* 6. Save Dialog Modal popup */}
      <AnimatePresence>
        {showSaveModal && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="glass-panel w-96 p-6 rounded-3xl shadow-2xl border-zinc-800/80 bg-zinc-950/95 flex flex-col gap-4 text-zinc-100"
            >
              <div className="flex flex-col gap-1 border-b border-zinc-900 pb-3">
                <span className="text-[10px] uppercase tracking-wider font-extrabold text-emerald-400">Database Entry</span>
                <h2 className="text-lg font-black text-zinc-50">Save Field Location</h2>
              </div>

              <div className="flex flex-col gap-3.5 my-2">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold uppercase text-zinc-400">Farmer Name</label>
                  <input
                    type="text"
                    value={farmerName}
                    onChange={(e) => setFarmerName(e.target.value)}
                    placeholder="e.g. Sardar Gurpreet Singh"
                    className="bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-100 focus:outline-none focus:border-emerald-500/50 transition-colors"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold uppercase text-zinc-400">Field / Plot Name</label>
                  <input
                    type="text"
                    value={fieldName}
                    onChange={(e) => setFieldName(e.target.value)}
                    placeholder="e.g. North Ridge Wheat"
                    className="bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-100 focus:outline-none focus:border-emerald-500/50 transition-colors"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold uppercase text-zinc-400">Crop Grown</label>
                  <input
                    type="text"
                    value={cropType}
                    onChange={(e) => setCropType(e.target.value)}
                    placeholder="e.g. Wheat, Rice, Clover, Cotton"
                    className="bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-100 focus:outline-none focus:border-emerald-500/50 transition-colors"
                  />
                </div>
              </div>

              <div className="flex gap-2 border-t border-zinc-900 pt-3 mt-1">
                <button
                  onClick={handleCancelSave}
                  className="flex-1 py-2 rounded-xl border border-zinc-800 hover:border-zinc-700 bg-zinc-900/40 hover:bg-zinc-900/80 text-xs font-bold text-zinc-400 transition-colors animate-all"
                >
                  Discard
                </button>
                <button
                  onClick={handleConfirmSave}
                  disabled={!farmerName.trim() || !fieldName.trim() || !cropType.trim()}
                  className="flex-1 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed text-xs font-bold text-zinc-50 border border-emerald-500/30 transition-all shadow-[0_0_12px_rgba(16,185,129,0.2)]"
                >
                  Save Field
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </main>
  );
}
