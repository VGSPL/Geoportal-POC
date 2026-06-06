"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Trash2, ShieldCheck, Map, Eye, EyeOff, Leaf } from "lucide-react";

interface ToolbarProps {
  isDrawing: boolean;
  hasPolygon: boolean;
  showRegistry: boolean;
  showYieldOverlay: boolean;
  mapStyle: "dark" | "satellite";
  onStartDraw: () => void;
  onClear: () => void;
  onToggleRegistry: () => void;
  onToggleYieldOverlay: () => void;
  onSelectAll: (visible: boolean) => void;
  onChangeStyle: (style: "dark" | "satellite") => void;
}

export const Toolbar: React.FC<ToolbarProps> = ({
  isDrawing,
  hasPolygon,
  showRegistry,
  showYieldOverlay,
  mapStyle,
  onStartDraw,
  onClear,
  onToggleRegistry,
  onToggleYieldOverlay,
  onSelectAll,
  onChangeStyle,
}) => {
  // Check if all layers are active to toggle "Select All"
  const allActive = showRegistry && showYieldOverlay;

  const handleSelectAllToggle = () => {
    onSelectAll(!allActive);
  };

  return (
    <div className="glass-panel flex flex-wrap items-center gap-1.5 p-1.5 rounded-2xl shadow-xl border-zinc-800/80 bg-zinc-950/85 max-w-[95vw]">
      
      {/* 1. Drawing Action Controls */}
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

      {/* 2. Layer Toggle Controllers */}
      
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
        <span>Saved Fields</span>
        {showRegistry ? <Eye className="h-3 w-3 ml-0.5" /> : <EyeOff className="h-3 w-3 ml-0.5" />}
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
        <span>Biomass Overlay</span>
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

      {/* 3. Map Style Swap */}
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
