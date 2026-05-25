"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Trash2, ShieldCheck, Map, Eye, EyeOff, Radio, Leaf, Compass } from "lucide-react";

interface ToolbarProps {
  isDrawing: boolean;
  hasPolygon: boolean;
  showRegistry: boolean;
  showGCP: boolean;
  showYieldOverlay: boolean;
  mapStyle: "dark" | "satellite";
  activeCrop: "basmati" | "clove";
  onStartDraw: () => void;
  onClear: () => void;
  onToggleRegistry: () => void;
  onToggleGCP: () => void;
  onToggleYieldOverlay: () => void;
  onSelectAll: (visible: boolean) => void;
  onChangeStyle: (style: "dark" | "satellite") => void;
  onChangeCrop: (crop: "basmati" | "clove") => void;
}

export const Toolbar: React.FC<ToolbarProps> = ({
  isDrawing,
  hasPolygon,
  showRegistry,
  showGCP,
  showYieldOverlay,
  mapStyle,
  activeCrop,
  onStartDraw,
  onClear,
  onToggleRegistry,
  onToggleGCP,
  onToggleYieldOverlay,
  onSelectAll,
  onChangeStyle,
  onChangeCrop,
}) => {
  // Check if all layers are active to toggle "Select All"
  const allActive = showRegistry && showGCP && showYieldOverlay;

  const handleSelectAllToggle = () => {
    onSelectAll(!allActive);
  };

  return (
    <div className="glass-panel flex flex-wrap items-center gap-1.5 p-1.5 rounded-2xl shadow-xl border-zinc-800/80 bg-zinc-950/85 max-w-[95vw]">
      {/* 1. Global Study Area Selector (Regional Shift) */}
      <div className="flex bg-zinc-900/60 p-0.5 rounded-xl border border-zinc-800/40 text-[10px] font-bold">
        <button
          onClick={() => onChangeCrop("basmati")}
          className={`py-1 px-2.5 rounded-lg transition-colors text-center focus:outline-none flex items-center gap-1 ${
            activeCrop === "basmati"
              ? "bg-zinc-850 text-emerald-400 border border-zinc-700/50 shadow-md"
              : "text-zinc-400 hover:text-zinc-200"
          }`}
        >
          <Compass className="h-3 w-3" />
          <span>India Rice</span>
        </button>
        <button
          onClick={() => onChangeCrop("clove")}
          className={`py-1 px-2.5 rounded-lg transition-colors text-center focus:outline-none flex items-center gap-1 ${
            activeCrop === "clove"
              ? "bg-zinc-850 text-cyan-400 border border-zinc-700/50 shadow-md"
              : "text-zinc-400 hover:text-zinc-200"
          }`}
        >
          <Compass className="h-3 w-3" />
          <span>Madagascar Clove</span>
        </button>
      </div>

      <div className="w-[1px] bg-zinc-800 h-5 mx-0.5" />

      {/* 2. Drawing Action Controls */}
      <Button
        variant={isDrawing ? "default" : "glass"}
        size="sm"
        onClick={onStartDraw}
        className={`h-8 rounded-xl gap-1.5 text-xs font-semibold px-3 transition-all duration-200 ${
          isDrawing 
            ? "bg-emerald-600 hover:bg-emerald-500 text-zinc-50 border border-emerald-500/30" 
            : "hover:bg-zinc-800/60"
        }`}
      >
        <span className={`h-1.5 w-1.5 rounded-full ${isDrawing ? "bg-zinc-50 animate-ping" : "bg-emerald-400"}`} />
        {isDrawing ? "Drawing active..." : "Draw Area"}
      </Button>

      {hasPolygon && (
        <Button
          variant="glass"
          size="sm"
          onClick={onClear}
          className="h-8 w-8 p-0 rounded-xl hover:bg-red-950/40 hover:text-red-400 hover:border-red-900/60 transition-colors"
          title="Clear Polygon"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      )}

      <div className="w-[1px] bg-zinc-800 h-5 mx-0.5" />

      {/* 3. Layer Toggle Controllers */}
      
      {/* Farm Plots Toggle */}
      <Button
        variant={showRegistry ? "default" : "glass"}
        size="sm"
        onClick={onToggleRegistry}
        className={`h-8 rounded-xl gap-1 text-[11px] font-bold px-2.5 transition-all duration-200 ${
          showRegistry 
            ? "bg-blue-650/80 text-blue-200 border border-blue-500/30" 
            : "text-zinc-400 hover:bg-zinc-800/60"
        }`}
      >
        <ShieldCheck className="h-3.5 w-3.5 text-blue-400" />
        <span>Farm Plots</span>
        {showRegistry ? <Eye className="h-3 w-3 ml-0.5" /> : <EyeOff className="h-3 w-3 ml-0.5" />}
      </Button>

      {/* GCP Points Toggle */}
      <Button
        variant={showGCP ? "default" : "glass"}
        size="sm"
        onClick={onToggleGCP}
        className={`h-8 rounded-xl gap-1 text-[11px] font-bold px-2.5 transition-all duration-200 ${
          showGCP 
            ? "bg-orange-650/80 text-orange-200 border border-orange-500/30" 
            : "text-zinc-400 hover:bg-zinc-800/60"
        }`}
      >
        <Radio className="h-3.5 w-3.5 text-orange-400 animate-pulse" />
        <span>GCP Stations</span>
        {showGCP ? <Eye className="h-3 w-3 ml-0.5" /> : <EyeOff className="h-3 w-3 ml-0.5" />}
      </Button>

      {/* Yield Estimation Overlay Toggle */}
      <Button
        variant={showYieldOverlay ? "default" : "glass"}
        size="sm"
        onClick={onToggleYieldOverlay}
        className={`h-8 rounded-xl gap-1 text-[11px] font-bold px-2.5 transition-all duration-200 ${
          showYieldOverlay 
            ? "bg-emerald-650/80 text-emerald-200 border border-emerald-500/30" 
            : "text-zinc-400 hover:bg-zinc-800/60"
        }`}
      >
        <Leaf className="h-3.5 w-3.5 text-emerald-400" />
        <span>Yield Overlay</span>
        {showYieldOverlay ? <Eye className="h-3 w-3 ml-0.5" /> : <EyeOff className="h-3 w-3 ml-0.5" />}
      </Button>

      {/* SELECT ALL TOGGLE */}
      <Button
        variant="glass"
        size="sm"
        onClick={handleSelectAllToggle}
        className={`h-8 rounded-xl text-[11px] font-bold px-2.5 transition-all ${
          allActive 
            ? "text-emerald-400 border-emerald-900/50 hover:bg-emerald-950/20" 
            : "text-zinc-400 hover:bg-zinc-800/60"
        }`}
      >
        {allActive ? "Hide All Layers" : "Select All Layers"}
      </Button>

      <div className="w-[1px] bg-zinc-800 h-5 mx-0.5" />

      {/* 4. Map Style Swap */}
      <Button
        variant="glass"
        size="sm"
        onClick={() => onChangeStyle(mapStyle === "dark" ? "satellite" : "dark")}
        className="h-8 w-8 p-0 rounded-xl hover:bg-zinc-800/60"
        title="Swap Basemap style"
      >
        <Map className="h-3.5 w-3.5 text-amber-400" />
      </Button>
    </div>
  );
};
