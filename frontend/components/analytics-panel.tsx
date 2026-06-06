"use client";

import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ShieldCheck, User, Leaf, Target, Sparkles, Scale, Percent, Sprout, CheckCircle2, ChevronRight, MapPin, Database } from "lucide-react";
import { motion } from "framer-motion";

export interface YieldData {
  total_acres: number;
  average_ndvi: number;
  peak_ndvi: number;
  farmer_name?: string;
  field_name?: string;
  crop?: string;
  is_registered: boolean;
  registry_id?: string;
  overlay_url: string;
  bbox: number[][];
  crop_stage: string;
  crop_stage_description: string;
  harvest_readiness_score: number;
}

interface AnalyticsPanelProps {
  data: YieldData | null;
  loading: boolean;
  activeCrop: string;
  onClose?: () => void;
  onSelectPlot?: (geojson: any) => void;
  refreshKey?: number;
}

export const AnalyticsPanel: React.FC<AnalyticsPanelProps> = ({ 
  data, 
  loading, 
  onClose, 
  onSelectPlot,
  refreshKey = 0
}) => {
  const [plots, setPlots] = useState<any[]>([]);
  const [plotsLoading, setPlotsLoading] = useState(false);

  // Fetch verified plots for selector when no data is displayed
  useEffect(() => {
    if (data === null && !loading) {
      setPlotsLoading(true);
      fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/plots`)
        .then((res) => {
          if (res.ok) return res.json();
          throw new Error("Failed to fetch plots");
        })
        .then((plotsData) => {
          setPlots(plotsData);
        })
        .catch((err) => console.error("Error fetching plots list", err))
        .finally(() => setPlotsLoading(false));
    }
  }, [data, loading, refreshKey]);

  if (loading) {
    return (
      <div className="h-screen w-full md:w-98 glass-panel border-l border-zinc-800/80 p-6 flex flex-col gap-6 shadow-2xl overflow-y-auto bg-zinc-950/90">
        <div className="flex justify-between items-center border-b border-zinc-800 pb-4">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-8 w-8 rounded-full" />
        </div>
        <Skeleton className="h-28 w-full rounded-2xl" />
        <Skeleton className="h-24 w-full rounded-2xl" />
        <div className="grid grid-cols-2 gap-4">
          <Skeleton className="h-16 rounded-xl" />
          <Skeleton className="h-16 rounded-xl" />
          <Skeleton className="h-16 rounded-xl" />
          <Skeleton className="h-16 rounded-xl" />
        </div>
        <Skeleton className="h-32 w-full rounded-2xl" />
      </div>
    );
  }

  // RENDER SELECTOR SIDEBAR STATE (If no plot data is loaded yet)
  if (!data) {
    return (
      <motion.div
        initial={{ opacity: 0, x: 50 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ type: "spring", damping: 25, stiffness: 200 }}
        className="h-screen w-full md:w-[420px] glass-panel border-l border-zinc-800/80 shadow-2xl flex flex-col overflow-hidden bg-zinc-950/90"
      >
        <div className="h-1 w-full bg-emerald-500" />
        
        {/* Sidebar Header */}
        <div className="p-5 border-b border-zinc-850 bg-zinc-900/10 flex flex-col gap-1">
          <span className="text-[9px] uppercase tracking-wider font-extrabold text-emerald-450 flex items-center gap-1">
            <Database className="h-3.5 w-3.5" />
            SQLite Database Explorer
          </span>
          <h2 className="text-base font-black text-zinc-50 flex items-center gap-1.5 mt-0.5">
            <ShieldCheck className="h-4.5 w-4.5 text-emerald-400" />
            Saved Farm Fields
          </h2>
          <p className="text-[10px] text-zinc-400 leading-normal mt-0.5 font-medium">
            Select a database field plot below to load its geographic boundaries, estimated yields, and growth stage analysis.
          </p>
        </div>

        {/* Plots List Content */}
        <div className="flex-grow overflow-y-auto p-5 flex flex-col gap-3.5 scrollbar-thin">
          {plotsLoading ? (
            <div className="flex flex-col gap-3">
              {[1, 2, 3, 4].map((n) => (
                <Skeleton key={n} className="h-20 w-full rounded-xl" />
              ))}
            </div>
          ) : plots.length === 0 ? (
            <div className="text-center p-8 bg-zinc-900/10 border border-zinc-800/40 rounded-2xl flex flex-col items-center justify-center gap-2 mt-4">
              <Sprout className="h-8 w-8 text-zinc-650 animate-pulse" />
              <span className="text-xs font-semibold text-zinc-500">No fields saved yet.</span>
              <span className="text-[10px] text-zinc-600 max-w-[200px]">Use the draw controls on the toolbar to sketch your first field boundary.</span>
            </div>
          ) : (
            plots.map((plot) => {
              // Color themes matching crop type
              let badgeColor = "bg-zinc-900/80 text-zinc-300 border-zinc-800";
              let hoverColor = "hover:border-zinc-700/80 hover:bg-zinc-900/20";
              let glowColor = "bg-zinc-700/40";
              
              const cropLower = plot.crop.toLowerCase();
              if (cropLower.includes("rice")) {
                badgeColor = "bg-violet-950/40 text-violet-300 border-violet-800/40";
                hoverColor = "hover:border-violet-750 hover:bg-violet-950/5";
                glowColor = "bg-violet-500";
              } else if (cropLower.includes("clove")) {
                badgeColor = "bg-emerald-950/40 text-emerald-300 border-emerald-800/40";
                hoverColor = "hover:border-emerald-750 hover:bg-emerald-950/5";
                glowColor = "bg-emerald-500";
              } else if (cropLower.includes("wheat")) {
                badgeColor = "bg-amber-950/40 text-amber-300 border-amber-800/40";
                hoverColor = "hover:border-amber-750 hover:bg-amber-950/5";
                glowColor = "bg-amber-500";
              } else if (cropLower.includes("cotton")) {
                badgeColor = "bg-cyan-950/40 text-cyan-300 border-cyan-800/40";
                hoverColor = "hover:border-cyan-750 hover:bg-cyan-950/5";
                glowColor = "bg-cyan-500";
              } else {
                badgeColor = "bg-blue-950/40 text-blue-300 border-blue-800/40";
                hoverColor = "hover:border-blue-750 hover:bg-blue-950/5";
                glowColor = "bg-blue-500";
              }

              return (
                <motion.div
                  key={plot.id}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  onClick={() => {
                    if (onSelectPlot) {
                      onSelectPlot({
                        type: "Polygon",
                        coordinates: [plot.coordinates]
                      });
                    }
                  }}
                  className={`glass-card p-3.5 rounded-xl border border-zinc-800/60 cursor-pointer flex flex-col gap-2 transition-all relative overflow-hidden ${hoverColor}`}
                >
                  {/* Glowing left highlight */}
                  <div className={`absolute top-0 bottom-0 left-0 w-1 ${glowColor}`} />
                  
                  <div className="flex justify-between items-start pl-1">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-xs font-bold text-zinc-150 flex items-center gap-1.5">
                        <User className="h-3.5 w-3.5 text-zinc-400" />
                        {plot.farmer_name}
                      </span>
                      <span className="text-[10px] text-zinc-400 font-bold mt-0.5">
                        {plot.field_name || "Unnamed Field"}
                      </span>
                    </div>
                    <ChevronRight className="h-4 w-4 text-zinc-500 mt-0.5" />
                  </div>

                  <div className="flex flex-wrap gap-1.5 items-center pl-1 border-t border-zinc-900/60 pt-2.5 mt-0.5">
                    {/* Crop Type Badge */}
                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${badgeColor}`}>
                      {plot.crop}
                    </span>
                    
                    {/* Area tag */}
                    <span className="text-[9px] font-bold text-zinc-300 ml-auto bg-zinc-900 px-2 py-0.5 rounded-md border border-zinc-800/40">
                      {plot.acreage} Acres
                    </span>
                  </div>
                </motion.div>
              );
            })
          )}
        </div>
        
        {/* Draw help notification in footer */}
        <div className="p-4 border-t border-zinc-850 text-center bg-zinc-900/5">
          <span className="text-[10px] text-zinc-500 font-bold uppercase block tracking-wider">
            OR Draw custom field
          </span>
          <p className="text-[10px] text-zinc-400 leading-normal mt-0.5">
            Click <strong>Draw Area</strong> at the top to sketch custom crop boundaries.
          </p>
        </div>
      </motion.div>
    );
  }

  // Set crop-specific colors
  let varietyGlow = "bg-zinc-850";
  let varietyBadge = "bg-zinc-800/60 text-zinc-300 border-zinc-700/60";
  let varietyText = "text-zinc-200";

  const cropLower = (data.crop || "").toLowerCase();
  if (cropLower.includes("rice")) {
    varietyGlow = "bg-violet-500";
    varietyBadge = "bg-violet-950/40 text-violet-300 border-violet-850";
    varietyText = "text-violet-300";
  } else if (cropLower.includes("clove")) {
    varietyGlow = "bg-emerald-500";
    varietyBadge = "bg-emerald-950/40 text-emerald-300 border-emerald-850";
    varietyText = "text-emerald-300";
  } else if (cropLower.includes("wheat")) {
    varietyGlow = "bg-amber-500";
    varietyBadge = "bg-amber-950/40 text-amber-300 border-amber-850";
    varietyText = "text-amber-300";
  } else if (cropLower.includes("cotton")) {
    varietyGlow = "bg-cyan-500";
    varietyBadge = "bg-cyan-950/40 text-cyan-300 border-cyan-850";
    varietyText = "text-cyan-300";
  }

  // Growth Stage Timeline Nodes
  const isTree = ["clove", "tree", "forest", "orchard", "fruit"].some(k => cropLower.includes(k));
  
  const stages = isTree ? [
    { name: "Dormant", minNdvi: 0.0 },
    { name: "Flushing", minNdvi: 0.60 },
    { name: "Budding", minNdvi: 0.70 },
    { name: "Harvest", minNdvi: 0.80 }
  ] : [
    { name: "Seedling", minNdvi: 0.0 },
    { name: "Vegetative", minNdvi: 0.60 },
    { name: "Flowering", minNdvi: 0.70 },
    { name: "Maturity", minNdvi: 0.80 }
  ];

  const getActiveStageIndex = () => {
    if (data.crop_stage.includes("Maturity") || data.crop_stage.includes("Harvest")) return 3;
    if (data.crop_stage.includes("Growth") || data.crop_stage.includes("Bud") || data.crop_stage.includes("Flowering")) return 2;
    if (data.crop_stage.includes("Flushing") || data.crop_stage.includes("Vegetative")) return 1;
    return 0; // Early Seedling / Dormant
  };

  const activeIndex = getActiveStageIndex();

  return (
    <motion.div
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 50 }}
      transition={{ type: "spring", damping: 25, stiffness: 200 }}
      className="h-screen w-full md:w-[420px] glass-panel border-l border-zinc-800/80 shadow-2xl flex flex-col overflow-hidden bg-zinc-950/90"
    >
      {/* Glow highlight top line */}
      <div className={`h-1 w-full ${varietyGlow}`} />

      {/* Header */}
      <div className="p-5 border-b border-zinc-850 flex justify-between items-center bg-zinc-900/10">
        <div>
          <span className="text-[9px] uppercase tracking-wider font-extrabold text-zinc-500">Biomass Telemetry</span>
          <h2 className="text-base font-black text-zinc-50 flex items-center gap-1.5 mt-0.5">
            <Leaf className="h-4.5 w-4.5 text-emerald-400" />
            Field Analysis
          </h2>
        </div>
        <button
          onClick={onClose}
          className="text-zinc-500 hover:text-zinc-300 p-1.5 rounded-xl border border-zinc-905 hover:border-zinc-800 transition-all text-xs font-semibold focus:outline-none"
        >
          Reset View
        </button>
      </div>

      {/* Scrollable Content */}
      <div className="flex-grow overflow-y-auto p-5 flex flex-col gap-4.5 scrollbar-thin">
        


        {/* Dynamic Crop Growth Stage & Readiness Score */}
        <div className="bg-zinc-900/30 p-4.5 rounded-2xl border border-zinc-800/40 flex flex-col gap-3">
          <div className="flex justify-between items-start">
            <div className="flex flex-col">
              <span className="text-[9px] uppercase tracking-wider font-extrabold text-zinc-500">Growth Telemetry</span>
              <span className="text-sm font-black text-zinc-100 mt-1 flex items-center gap-1.5">
                <Sprout className="h-4 w-4 text-emerald-400" />
                {data.crop_stage}
              </span>
            </div>
            
            {/* Harvest Readiness Percentage */}
            <div className="flex flex-col items-end">
              <span className="text-[9px] uppercase tracking-wider font-extrabold text-zinc-500">Maturity Score</span>
              <span className={`text-sm font-extrabold mt-1 ${data.harvest_readiness_score > 60 ? "text-emerald-400" : "text-yellow-400"}`}>
                {data.harvest_readiness_score}%
              </span>
            </div>
          </div>

          {/* Harvest progress bar */}
          <div className="w-full bg-zinc-800/40 h-2 rounded-full overflow-hidden border border-zinc-900 shadow-inner">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${data.harvest_readiness_score}%` }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className={`h-full rounded-full ${
                data.harvest_readiness_score >= 90 ? "bg-emerald-500 shadow-[0_0_8px_#10b981]" :
                data.harvest_readiness_score >= 60 ? "bg-yellow-500 shadow-[0_0_8px_#eab308]" : "bg-blue-500"
              }`}
            />
          </div>

          {/* Growth Timeline Visualizer */}
          <div className="flex justify-between items-center mt-2 px-1 relative">
            <div className="absolute left-6 right-6 top-2 h-0.5 bg-zinc-800 z-0" />
            <div 
              className="absolute left-6 top-2 h-0.5 bg-emerald-500 z-0 transition-all duration-500" 
              style={{ width: `${(activeIndex / (stages.length - 1)) * 88}%` }}
            />

            {stages.map((st, i) => {
              const isActive = i === activeIndex;
              const isPast = i < activeIndex;
              
              return (
                <div key={st.name} className="flex flex-col items-center gap-1 z-10">
                  <div 
                    className={`h-4 w-4 rounded-full border flex items-center justify-center transition-all duration-300 ${
                      isActive ? "bg-emerald-950 border-emerald-400 scale-125 shadow-[0_0_6px_#10b981]" :
                      isPast ? "bg-emerald-500 border-emerald-400" : "bg-zinc-950 border-zinc-800"
                    }`}
                  >
                    {isPast && <CheckCircle2 className="h-2.5 w-2.5 text-zinc-950 stroke-[3]" />}
                    {isActive && <div className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping" />}
                  </div>
                  <span className={`text-[8px] font-bold tracking-tight mt-0.5 uppercase ${isActive ? "text-emerald-400" : isPast ? "text-zinc-300" : "text-zinc-500"}`}>
                    {st.name}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Growth Details */}
          <p className="text-[11px] leading-relaxed text-zinc-400 font-medium border-t border-zinc-800/60 pt-2.5 mt-1 bg-zinc-900/10 p-2 rounded-xl">
            {data.crop_stage_description}
          </p>
        </div>

        {/* Detailed spatial calculations Grid */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-zinc-900/20 p-3.5 rounded-2xl border border-zinc-800/40 flex flex-col col-span-2 shadow-sm">
            <span className="text-[9px] font-bold uppercase text-zinc-500 flex items-center gap-1">
              <Target className="h-3.5 w-3.5 text-blue-400" /> Land Coverage
            </span>
            <span className="text-lg font-black text-zinc-100 mt-1">
              {data.total_acres} <span className="text-[11px] text-zinc-450 font-semibold font-sans">Acres</span>
            </span>
          </div>

          <div className="bg-zinc-900/20 p-3 rounded-2xl border border-zinc-800/40 flex flex-col shadow-sm">
            <span className="text-[9px] font-bold uppercase text-zinc-500 flex items-center gap-1">
              <Leaf className="h-3.5 w-3.5 text-emerald-400" /> Avg Health
            </span>
            <span className="text-base font-black text-zinc-100 mt-1 font-mono">
              {data.average_ndvi} <span className="text-[10px] text-zinc-500 font-bold font-sans">NDVI</span>
            </span>
          </div>

          <div className="bg-zinc-900/20 p-3 rounded-2xl border border-zinc-800/40 flex flex-col shadow-sm">
            <span className="text-[9px] font-bold uppercase text-zinc-500 flex items-center gap-1">
              <Percent className="h-3.5 w-3.5 text-amber-400" /> Peak Health
            </span>
            <span className="text-base font-black text-zinc-100 mt-1 font-mono">
              {data.peak_ndvi} <span className="text-[10px] text-zinc-500 font-bold font-sans">NDVI</span>
            </span>
          </div>
        </div>

        {/* Database Persistence Telemetry Card */}
        {data.is_registered ? (
          <div className="bg-emerald-950/20 border border-emerald-900/30 rounded-2xl p-4 flex gap-3 items-start shadow-md relative overflow-hidden">
            <div className="absolute top-0 right-0 p-2 opacity-10">
              <ShieldCheck className="h-16 w-16 text-emerald-400" />
            </div>
            <ShieldCheck className="h-5 w-5 text-emerald-400 flex-shrink-0 mt-0.5 animate-pulse" />
            <div className="flex flex-col text-zinc-100">
              <span className="text-[10px] font-extrabold text-emerald-400 uppercase tracking-wider flex items-center gap-1">
                Database Plot Persistent
              </span>
              <span className="text-[11px] text-zinc-300 font-bold mt-1.5">
                Farmer: <span className="font-mono text-zinc-200">{data.farmer_name}</span>
              </span>
              <span className="text-[11px] text-zinc-300 font-bold mt-1">
                Field: <span className="font-mono text-zinc-200">{data.field_name}</span>
              </span>
              <span className="text-[11px] text-zinc-300 font-bold mt-1 flex items-center gap-1.5">
                Crop: <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border font-sans ${varietyBadge}`}>{data.crop}</span>
              </span>
              <span className="text-[9px] text-zinc-500 font-semibold font-mono mt-2">
                SQLite ID: {data.registry_id}
              </span>
            </div>
          </div>
        ) : (
          <div className="bg-zinc-950/60 border border-zinc-900 rounded-2xl p-3 text-center shadow-inner">
            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">
              Ad-Hoc Drawn Field
            </span>
            <span className="text-[8px] text-zinc-650 font-bold block mt-0.5">
              Not currently persisted in SQLite DB
            </span>
          </div>
        )}

      </div>
    </motion.div>
  );
};
