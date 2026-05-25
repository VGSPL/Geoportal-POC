"use client";

import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingUp, Globe2, Layers, ShieldCheck, ArrowUpRight, Anchor } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface ExportDestination {
  country: string;
  volume_mMT: number;
  value_inr_cr: number;
}

interface APEDAStats {
  fiscal_year: string;
  total_volume_mMT: number;
  total_value_inr_cr: number;
  top_destinations: ExportDestination[];
  live_ticker: string[];
  clove_export_tons: number;
  clove_value_usd_m: number;
}

interface ApedaFeedProps {
  activeCrop: "basmati" | "clove";
}

export const ApedaFeed: React.FC<ApedaFeedProps> = ({ activeCrop }) => {
  const [stats, setStats] = useState<APEDAStats | null>(null);
  const [tickerIndex, setTickerIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"exports" | "ticker">("exports");

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/apeda/stats`);
        if (res.ok) {
          const data = await res.json();
          setStats(data);
        }
      } catch (err) {
        console.error("Failed to fetch APEDA stats", err);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  // Update live ticker every 6 seconds
  useEffect(() => {
    if (!stats || stats.live_ticker.length === 0) return;
    
    const interval = setInterval(() => {
      setTickerIndex((prev) => (prev + 1) % stats.live_ticker.length);
    }, 6000);

    return () => clearInterval(interval);
  }, [stats]);

  if (loading) {
    return (
      <div className="w-80 glass-panel rounded-2xl p-4 flex flex-col gap-3 animate-pulse">
        <div className="h-6 w-32 bg-zinc-800 rounded" />
        <div className="h-4 w-48 bg-zinc-800 rounded" />
        <div className="h-20 bg-zinc-800 rounded-xl" />
        <div className="h-32 bg-zinc-800 rounded-xl" />
      </div>
    );
  }

  // Filter ticker events by crop type
  const getFilteredTicker = () => {
    if (!stats) return [];
    if (activeCrop === "clove") {
      return stats.live_ticker.filter(t => t.toLowerCase().includes("clove") || t.toLowerCase().includes("madagascar") || t.toLowerCase().includes("tamatave"));
    } else {
      return stats.live_ticker.filter(t => t.toLowerCase().includes("basmati") || t.toLowerCase().includes("apeda") || t.toLowerCase().includes("iref"));
    }
  };

  const filteredTicker = getFilteredTicker();
  const activeTicker = filteredTicker[tickerIndex % (filteredTicker.length || 1)] || "Fetching live APEDA agricultural trace registries...";

  // Madagascar clove specific export hubs
  const cloveDestinations = [
    { country: "India (Clove Import)", volume_tons: 6800, value_m: 31.2 },
    { country: "Singapore (Spice Hub)", volume_tons: 4800, value_m: 22.4 },
    { country: "European Union", volume_tons: 2200, value_m: 10.5 },
    { country: "United States", volume_tons: 1000, value_m: 4.4 }
  ];

  return (
    <div className="w-80 md:w-88 flex flex-col gap-3 max-h-[85vh] overflow-y-auto pr-1">
      {/* Primary Metrics */}
      <Card className="glass-panel border-zinc-800/80 rounded-2xl shadow-xl overflow-hidden relative">
        <div className="absolute top-0 right-0 p-3 opacity-15">
          {activeCrop === "clove" ? (
            <Anchor className="h-16 w-16 text-emerald-400" />
          ) : (
            <Globe2 className="h-16 w-16 text-emerald-400" />
          )}
        </div>
        <CardHeader className="p-4 pb-2">
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">
              {activeCrop === "clove" ? "Madagascar Clove Board" : "APEDA Trade Registry"}
            </span>
          </div>
          <CardTitle className="text-lg font-bold text-zinc-100 flex items-center justify-between">
            {activeCrop === "clove" ? "Spice Export Registry" : "Basmati Yield Tracker"}
            <span className="text-xs text-zinc-500 font-normal">FY {stats?.fiscal_year}</span>
          </CardTitle>
          <CardDescription className="text-xs text-zinc-400">
            {activeCrop === "clove" 
              ? "Official aggregated Madagascar clove spice shipments data." 
              : "Official aggregated export and variety mapping feed."}
          </CardDescription>
        </CardHeader>

        <CardContent className="p-4 pt-1 flex flex-col gap-3">
          {/* Segmented Control Tabs */}
          <div className="flex bg-zinc-950/80 p-0.5 rounded-lg border border-zinc-850 text-[10px] font-bold">
            <button
              onClick={() => setActiveTab("exports")}
              className={`flex-grow py-1 px-2 rounded-md transition-colors text-center focus:outline-none ${
                activeTab === "exports"
                  ? "bg-zinc-800 text-zinc-50 border border-zinc-700/50"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              Export Analytics
            </button>
            <button
              onClick={() => setActiveTab("ticker")}
              className={`flex-grow py-1 px-2 rounded-md transition-colors text-center focus:outline-none flex items-center justify-center gap-1 ${
                activeTab === "ticker"
                  ? "bg-zinc-800 text-zinc-50 border border-zinc-700/50"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              <span className="flex h-1 w-1 rounded-full bg-blue-400 animate-pulse" />
              Live Registry
            </button>
          </div>

          <AnimatePresence mode="wait">
            {activeTab === "exports" ? (
              <motion.div
                key="exports"
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 8 }}
                transition={{ duration: 0.15 }}
                className="flex flex-col gap-3"
              >
                {/* Main figures */}
                {activeCrop === "clove" ? (
                  <div className="grid grid-cols-2 gap-2 bg-zinc-900/40 p-2.5 rounded-xl border border-zinc-800/50">
                    <div>
                      <p className="text-[9px] text-zinc-500 font-semibold uppercase">Clove Exports</p>
                      <p className="text-base font-extrabold text-zinc-50 flex items-baseline gap-0.5">
                        {stats?.clove_export_tons} <span className="text-xs text-zinc-400 font-medium">Tons</span>
                      </p>
                    </div>
                    <div>
                      <p className="text-[9px] text-zinc-500 font-semibold uppercase">Export Value</p>
                      <p className="text-base font-extrabold text-emerald-400 flex items-baseline gap-0.5">
                        ${stats?.clove_value_usd_m}M <span className="text-xs text-emerald-500/80 font-medium">USD</span>
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2 bg-zinc-900/40 p-2.5 rounded-xl border border-zinc-800/50">
                    <div>
                      <p className="text-[9px] text-zinc-500 font-semibold uppercase">Total Exports</p>
                      <p className="text-base font-extrabold text-zinc-50 flex items-baseline gap-0.5">
                        {stats?.total_volume_mMT} <span className="text-xs text-zinc-400 font-medium">MMT</span>
                      </p>
                    </div>
                    <div>
                      <p className="text-[9px] text-zinc-500 font-semibold uppercase">Export Value</p>
                      <p className="text-base font-extrabold text-emerald-400 flex items-baseline gap-0.5">
                        ₹50.3K <span className="text-xs text-emerald-500/80 font-medium">Cr</span>
                      </p>
                    </div>
                  </div>
                )}

                {/* Export breakdown */}
                <div className="flex flex-col gap-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-semibold text-zinc-400">Primary Export Hubs</span>
                    <span className="text-zinc-500 flex items-center gap-0.5 font-medium">
                      Volume Share <ArrowUpRight className="h-3 w-3" />
                    </span>
                  </div>
                  <div className="flex flex-col gap-2 bg-zinc-900/10 p-2.5 rounded-xl border border-zinc-800/40">
                    {activeCrop === "clove" 
                      ? cloveDestinations.map((dest, i) => (
                          <div key={dest.country} className="flex flex-col gap-1">
                            <div className="flex justify-between text-xs font-medium">
                              <span className="text-zinc-300 flex items-center gap-1.5">
                                <span className="text-[10px] text-zinc-500 font-mono">0{i+1}</span>
                                {dest.country}
                              </span>
                              <span className="text-zinc-200">{dest.volume_tons} Tons</span>
                            </div>
                            <div className="w-full bg-zinc-800/60 h-1 rounded-full overflow-hidden">
                              <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${(dest.volume_tons / 7500) * 100}%` }}
                                transition={{ duration: 0.8, delay: i * 0.1 }}
                                className="bg-emerald-500/80 h-full rounded-full"
                              />
                            </div>
                          </div>
                        ))
                      : stats?.top_destinations.map((dest, i) => (
                          <div key={dest.country} className="flex flex-col gap-1">
                            <div className="flex justify-between text-xs font-medium">
                              <span className="text-zinc-300 flex items-center gap-1.5">
                                <span className="text-[10px] text-zinc-500 font-mono">0{i+1}</span>
                                {dest.country}
                              </span>
                              <span className="text-zinc-200">{dest.volume_mMT} MMT</span>
                            </div>
                            <div className="w-full bg-zinc-800/60 h-1 rounded-full overflow-hidden">
                              <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${(dest.volume_mMT / 1.5) * 100}%` }}
                                transition={{ duration: 0.8, delay: i * 0.1 }}
                                className="bg-emerald-500/80 h-full rounded-full"
                              />
                            </div>
                          </div>
                        ))
                    }
                  </div>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="ticker"
                initial={{ opacity: 0, x: 8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -8 }}
                transition={{ duration: 0.15 }}
                className="flex flex-col gap-3"
              >
                {/* Live scrolling ticker */}
                <div className="bg-zinc-950/60 border border-zinc-900 rounded-xl p-3 relative h-24 overflow-hidden flex items-center">
                  <div className="absolute top-2 left-2 flex items-center gap-1">
                    <ShieldCheck className="h-3.5 w-3.5 text-blue-400" />
                    <span className="text-[9px] uppercase tracking-wider font-bold text-blue-400">
                      {activeCrop === "clove" ? "CloveNET Feed" : "BasmatiNET Feed"}
                    </span>
                  </div>
                  <div className="w-full mt-2.5">
                    <AnimatePresence mode="wait">
                      <motion.p
                        key={tickerIndex}
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -12 }}
                        transition={{ duration: 0.25, ease: "easeOut" }}
                        className="text-[11px] text-zinc-300 font-medium leading-relaxed line-clamp-3"
                      >
                        {activeTicker}
                      </motion.p>
                    </AnimatePresence>
                  </div>
                </div>

                {/* Additional live info */}
                <div className="bg-zinc-900/20 p-2.5 rounded-xl border border-zinc-800/40 text-[10px] leading-relaxed text-zinc-400">
                  <span className="font-bold text-zinc-300 block mb-0.5">
                    {activeCrop === "clove" ? "Tamatave Port Authority" : "BasmatiNET Verification"}
                  </span>
                  Geotagged registries are live-updating based on regional tracing networks in {activeCrop === "clove" ? "Analanjirofo, Madagascar" : "Punjab and Haryana, India"}.
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </CardContent>
      </Card>
    </div>
  );
};
