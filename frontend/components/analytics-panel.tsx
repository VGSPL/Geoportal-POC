"use client";

import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ShieldCheck, User, Leaf, Target, Sparkles, Scale, Percent, Calendar, Sprout, CheckCircle2, ChevronRight, MapPin, Search } from "lucide-react";
import { motion } from "framer-motion";

export interface YieldData {
  estimated_yield_tons: number;
  yield_per_acre: number;
  total_acres: number;
  average_ndvi: number;
  peak_ndvi: number;
  detected_variety: string;
  variety_description: string;
  is_basmatinet_registered: boolean;
  registry_id?: string;
  farmer_name?: string;
  overlay_url: string;
  bbox: number[][];
  crop_stage: string;
  crop_stage_description: string;
  harvest_readiness_score: number;
  crop_type?: "basmati" | "clove";
}

interface AnalyticsPanelProps {
  data: YieldData | null;
  loading: boolean;
  activeCrop: "basmati" | "clove";
  onClose?: () => void;
  onSelectPlot?: (geojson: any) => void;
}

export const AnalyticsPanel: React.FC<AnalyticsPanelProps> = ({ data, loading, activeCrop, onClose, onSelectPlot }) => {
  const [plots, setPlots] = useState<any[]>([]);
  const [plotsLoading, setPlotsLoading] = useState(false);

  // Fetch verified plots for selector when no data is displayed
  useEffect(() => {
    if (data === null && !loading) {
      setPlotsLoading(true);
      fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/plots?crop=${activeCrop}`)
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
  }, [data, loading, activeCrop]);

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
        <div className="h-1 w-full bg-blue-500" />
        
        {/* Sidebar Header */}
        <div className="p-5 border-b border-zinc-850 bg-zinc-900/10 flex flex-col gap-1">
          <span className="text-[9px] uppercase tracking-wider font-extrabold text-blue-400 flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-blue-400 animate-pulse" />
            Verified Traceability Explorer
          </span>
          <h2 className="text-base font-black text-zinc-50 flex items-center gap-1.5 mt-0.5">
            <ShieldCheck className="h-4.5 w-4.5 text-blue-400" />
            {activeCrop === "clove" ? "Registered Clove Farms" : "Registered Basmati Farms"}
          </h2>
          <p className="text-[10px] text-zinc-400 leading-normal mt-0.5 font-medium">
            {activeCrop === "clove" 
              ? "Select a verified Madagascar Clove Board farm plot below to execute canopy biomass and yield analysis."
              : "Select a verified APEDA BasmatiNET farm plot below to execute Sentinel-2 crop yields and growth stage analysis."}
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
            <div className="text-center p-8 bg-zinc-900/10 border border-zinc-800/40 rounded-2xl flex flex-col items-center justify-center gap-2">
              <Sprout className="h-8 w-8 text-zinc-600 animate-pulse" />
              <span className="text-xs font-semibold text-zinc-500">No plots loaded. Verify backend connectivity.</span>
            </div>
          ) : (
            plots.map((plot) => {
              // Color themes matching variety
              let badgeColor = "bg-zinc-900/80 text-zinc-300 border-zinc-800";
              let hoverColor = "hover:border-zinc-700/80 hover:bg-zinc-900/20";
              let glowColor = "bg-zinc-700/40";
              
              if (plot.variety.includes("1121")) {
                badgeColor = "bg-violet-950/40 text-violet-300 border-violet-800/40";
                hoverColor = "hover:border-violet-700/80 hover:bg-violet-950/5";
                glowColor = "bg-violet-500";
              } else if (plot.variety.includes("1509")) {
                badgeColor = "bg-emerald-950/40 text-emerald-300 border-emerald-800/40";
                hoverColor = "hover:border-emerald-700/80 hover:bg-emerald-950/5";
                glowColor = "bg-emerald-500";
              } else if (plot.variety.includes("CSR")) {
                badgeColor = "bg-amber-950/40 text-amber-300 border-amber-800/40";
                hoverColor = "hover:border-amber-700/80 hover:bg-amber-950/5";
                glowColor = "bg-amber-500";
              } else if (plot.variety.includes("1885")) {
                badgeColor = "bg-rose-950/40 text-rose-300 border-rose-800/40";
                hoverColor = "hover:border-rose-700/80 hover:bg-rose-950/5";
                glowColor = "bg-rose-500";
              } else if (plot.variety.includes("Premium Organic")) {
                badgeColor = "bg-cyan-950/40 text-cyan-300 border-cyan-800/40";
                hoverColor = "hover:border-cyan-700/80 hover:bg-cyan-950/5";
                glowColor = "bg-cyan-500";
              } else if (plot.variety.includes("Standard Madagascar")) {
                badgeColor = "bg-emerald-950/40 text-emerald-300 border-emerald-800/40";
                hoverColor = "hover:border-emerald-700/80 hover:bg-emerald-950/5";
                glowColor = "bg-emerald-500";
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
                      <span className="text-xs font-bold text-zinc-100 flex items-center gap-1.5">
                        <User className="h-3.5 w-3.5 text-zinc-400" />
                        {plot.farmer_name}
                      </span>
                      <span className="text-[9px] text-zinc-500 font-bold font-mono">
                        {activeCrop === "clove" ? "Clove Board ID: " : "APEDA Registry ID: "}{plot.id.replace("APEDA-NET-", "").replace("CLOVE-MG-", "")}
                      </span>
                    </div>
                    <ChevronRight className="h-4 w-4 text-zinc-500 mt-0.5" />
                  </div>

                  <div className="flex flex-wrap gap-1.5 items-center pl-1 border-t border-zinc-900/60 pt-2.5 mt-0.5">
                    {/* Cultivar Badge */}
                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${badgeColor}`}>
                      {plot.variety.split(" ")[0]}
                    </span>
                    
                    {/* District location pin */}
                    <span className="text-[9px] font-semibold text-zinc-400 flex items-center gap-0.5">
                      <MapPin className="h-3 w-3 text-zinc-500" />
                      {plot.district}, {plot.state}
                    </span>
                    
                    {/* Area tag */}
                    <span className="text-[9px] font-bold text-zinc-300 ml-auto bg-zinc-900 px-2 py-0.5 rounded-md border border-zinc-800/40">
                      {plot.acreage} Hectares
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

  // Set variety-specific colors
  let varietyGlow = "bg-zinc-800/60";
  let varietyBadge = "bg-zinc-800/60 text-zinc-300 border-zinc-700/60";
  let varietyText = "text-zinc-200";

  if (data.detected_variety.includes("1121")) {
    varietyGlow = "bg-violet-500";
    varietyBadge = "bg-violet-950/40 text-violet-300 border-violet-850";
    varietyText = "text-violet-300";
  } else if (data.detected_variety.includes("1509")) {
    varietyGlow = "bg-emerald-500";
    varietyBadge = "bg-emerald-950/40 text-emerald-300 border-emerald-850";
    varietyText = "text-emerald-300";
  } else if (data.detected_variety.includes("CSR")) {
    varietyGlow = "bg-amber-500";
    varietyBadge = "bg-amber-950/40 text-amber-300 border-amber-850";
    varietyText = "text-amber-300";
  } else if (data.detected_variety.includes("1885")) {
    varietyGlow = "bg-rose-500";
    varietyBadge = "bg-rose-950/40 text-rose-300 border-rose-850";
    varietyText = "text-rose-300";
  } else if (data.detected_variety.includes("Premium Organic")) {
    varietyGlow = "bg-cyan-500";
    varietyBadge = "bg-cyan-950/40 text-cyan-300 border-cyan-850";
    varietyText = "text-cyan-300";
  } else if (data.detected_variety.includes("Standard Madagascar")) {
    varietyGlow = "bg-emerald-500";
    varietyBadge = "bg-emerald-950/40 text-emerald-300 border-emerald-850";
    varietyText = "text-emerald-300";
  }

  const isClove = (data?.crop_type === "clove") || (data === null && activeCrop === "clove");

  // Growth Stage Timeline Nodes
  const stages = isClove ? [
    { name: "Dormant", minNdvi: 0.0 },
    { name: "Flushing", minNdvi: 0.60 },
    { name: "Budding", minNdvi: 0.70 },
    { name: "Harvest", minNdvi: 0.80 }
  ] : [
    { name: "Vegetative", minNdvi: 0.0 },
    { name: "Reproductive", minNdvi: 0.82 },
    { name: "Ripening", minNdvi: 0.60 },
    { name: "Harvest", minNdvi: 0.50 }
  ];

  const getActiveStageIndex = () => {
    if (isClove) {
      if (data.crop_stage.includes("Peak Harvest")) return 3;
      if (data.crop_stage.includes("Late Bud")) return 2;
      if (data.crop_stage.includes("Active Vegetative")) return 1;
      return 0; // Dormant
    } else {
      if (data.crop_stage.includes("Peak Reproductive")) return 1;
      if (data.crop_stage.includes("Late Vegetative")) return 0;
      if (data.crop_stage.includes("Ripening")) return 2;
      return 3; // Harvest
    }
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
          <span className="text-[9px] uppercase tracking-wider font-extrabold text-zinc-500">Traceability Telemetry</span>
          <h2 className="text-base font-black text-zinc-50 flex items-center gap-1.5 mt-0.5">
            <Leaf className="h-4.5 w-4.5 text-emerald-400" />
            Harvest Analysis
          </h2>
        </div>
        <button
          onClick={onClose}
          className="text-zinc-500 hover:text-zinc-300 p-1.5 rounded-xl border border-zinc-900 hover:border-zinc-800 transition-all text-xs font-semibold focus:outline-none"
        >
          Reset Plot
        </button>
      </div>

      {/* Scrollable Content */}
      <div className="flex-grow overflow-y-auto p-5 flex flex-col gap-4.5 scrollbar-thin">
        
        {/* Main estimated yield figures */}
        <div className="bg-zinc-900/40 p-4.5 rounded-2xl border border-zinc-800/60 flex items-center justify-between relative overflow-hidden">
          <div className="absolute -right-6 -bottom-6 opacity-5">
            <Scale className="h-28 w-28 text-emerald-400" />
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] text-zinc-500 font-extrabold uppercase tracking-wide">Total Estimated Yield</span>
            <span className="text-3xl font-black text-zinc-50 flex items-baseline gap-1 mt-1 leading-none">
              {data.estimated_yield_tons}
              <span className="text-sm text-zinc-400 font-bold">TONS</span>
            </span>
          </div>
          <div className="h-12 w-12 rounded-full bg-emerald-950/30 border border-emerald-900/40 flex items-center justify-center shadow-lg">
            <Scale className="h-5 w-5 text-emerald-400" />
          </div>
        </div>

        {/* Dynamic Crop Growth Stage & Readiness Score */}
        <div className="bg-zinc-900/30 p-4.5 rounded-2xl border border-zinc-800/40 flex flex-col gap-3">
          <div className="flex justify-between items-start">
            <div className="flex flex-col">
              <span className="text-[9px] uppercase tracking-wider font-extrabold text-zinc-500">Maturity Telemetry</span>
              <span className="text-sm font-black text-zinc-100 mt-1 flex items-center gap-1.5">
                <Sprout className="h-4 w-4 text-emerald-400" />
                {data.crop_stage}
              </span>
            </div>
            
            {/* Harvest Readiness Percentage */}
            <div className="flex flex-col items-end">
              <span className="text-[9px] uppercase tracking-wider font-extrabold text-zinc-500">Harvest Readiness</span>
              <span className={`text-sm font-extrabold mt-1 ${data.harvest_readiness_score > 70 ? "text-emerald-400" : "text-yellow-400"}`}>
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
                data.harvest_readiness_score >= 70 ? "bg-yellow-500 shadow-[0_0_8px_#eab308]" : "bg-blue-500"
              }`}
            />
          </div>

          {/* Growth Timeline Visualizer */}
          <div className="flex justify-between items-center mt-2 px-1 relative">
            {/* Continuous background connection line */}
            <div className="absolute left-6 right-6 top-2 h-0.5 bg-zinc-800 z-0" />
            
            {/* Active connection line */}
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

          {/* Genetic Growth Stage Details */}
          <p className="text-[11px] leading-relaxed text-zinc-400 font-medium border-t border-zinc-800/60 pt-2.5 mt-1 bg-zinc-900/10 p-2 rounded-xl">
            {data.crop_stage_description}
          </p>
        </div>

        {/* Detailed spatial calculations Grid */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-zinc-900/20 p-3 rounded-2xl border border-zinc-800/40 flex flex-col shadow-sm">
            <span className="text-[9px] font-bold uppercase text-zinc-500 flex items-center gap-1">
              <Target className="h-3.5 w-3.5 text-blue-400" /> Land Coverage
            </span>
            <span className="text-base font-black text-zinc-100 mt-1">
              {data.total_acres} <span className="text-[10px] text-zinc-400 font-medium font-sans">Acres</span>
            </span>
          </div>

          <div className="bg-zinc-900/20 p-3 rounded-2xl border border-zinc-800/40 flex flex-col shadow-sm">
            <span className="text-[9px] font-bold uppercase text-zinc-500 flex items-center gap-1">
              <Sparkles className="h-3.5 w-3.5 text-violet-400" /> Productivity
            </span>
            <span className="text-base font-black text-zinc-100 mt-1">
              {data.yield_per_acre} <span className="text-[10px] text-zinc-400 font-medium font-sans">Tons/Ac</span>
            </span>
          </div>

          <div className="bg-zinc-900/20 p-3 rounded-2xl border border-zinc-800/40 flex flex-col shadow-sm">
            <span className="text-[9px] font-bold uppercase text-zinc-500 flex items-center gap-1">
              <Leaf className="h-3.5 w-3.5 text-emerald-400" /> Avg Biomass
            </span>
            <span className="text-base font-black text-zinc-100 mt-1 font-mono">
              {data.average_ndvi} <span className="text-[10px] text-zinc-500 font-bold font-sans">NDVI</span>
            </span>
          </div>

          <div className="bg-zinc-900/20 p-3 rounded-2xl border border-zinc-800/40 flex flex-col shadow-sm">
            <span className="text-[9px] font-bold uppercase text-zinc-500 flex items-center gap-1">
              <Percent className="h-3.5 w-3.5 text-amber-400" /> Peak Biomass
            </span>
            <span className="text-base font-black text-zinc-100 mt-1 font-mono">
              {data.peak_ndvi} <span className="text-[10px] text-zinc-500 font-bold font-sans">NDVI</span>
            </span>
          </div>
        </div>

        {/* Variety Genetics details */}
        <div className="bg-zinc-900/10 p-4 rounded-2xl border border-zinc-850 flex flex-col gap-2 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-2 opacity-5">
            <Leaf className="h-20 w-20 text-zinc-400" />
          </div>
          <div className="flex items-center gap-2">
            <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border ${varietyBadge}`}>
              {data.detected_variety.split(" ")[0]}
            </span>
            <span className={`text-xs font-bold ${varietyText}`}>
              {data.detected_variety}
            </span>
          </div>
          <p className="text-[11px] leading-relaxed text-zinc-400 font-medium">
            {data.variety_description}
          </p>
        </div>

        {/* APEDA BasmatiNET Traceability Card */}
        {data.is_basmatinet_registered ? (
          <div className="bg-blue-950/20 border border-blue-900/30 rounded-2xl p-4 flex gap-3 items-start shadow-md relative overflow-hidden">
            <div className="absolute top-0 right-0 p-2 opacity-10">
              <ShieldCheck className="h-16 w-16 text-blue-400" />
            </div>
            <ShieldCheck className="h-5 w-5 text-blue-400 flex-shrink-0 mt-0.5 animate-pulse" />
            <div className="flex flex-col">
              <span className="text-[10px] font-extrabold text-blue-400 uppercase tracking-wider">
                {isClove ? "Madagascar Clove Board Verified" : "APEDA BasmatiNET Verified"}
              </span>
              <span className="text-xs text-zinc-300 font-bold font-mono mt-1">
                ID: {data.registry_id}
              </span>
              {data.farmer_name && (
                <span className="text-[11px] text-zinc-400 font-semibold flex items-center gap-1 mt-1 bg-zinc-900/30 py-0.5 px-2 rounded-lg border border-zinc-800/40 w-fit">
                  <User className="h-3 w-3 text-zinc-500" /> Farmer: {data.farmer_name}
                </span>
              )}
            </div>
          </div>
        ) : (
          <div className="bg-zinc-950/60 border border-zinc-900 rounded-2xl p-3 text-center shadow-inner">
            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
              Ad-Hoc Cultivation Polygon (Not Registered)
            </span>
          </div>
        )}

      </div>
    </motion.div>
  );
};
