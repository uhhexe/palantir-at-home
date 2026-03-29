"use client";

import type { ConflictLayer } from "./ConflictMap";

interface ConflictSidebarProps {
  layers: ConflictLayer[];
  onToggleLayer: (id: string) => void;
  conflictDay: number;
  totalStrikes: number;
}

const LAYER_GROUPS: { label: string; ids: string[] }[] = [
  { label: "STRIKE LAYERS", ids: ["us-strikes", "israel-strikes", "iran-strikes", "houthi-strikes", "hezbollah-strikes"] },
  { label: "MILITARY", ids: ["us-bases", "iran-bases", "nuclear", "air-defense"] },
  { label: "INFRASTRUCTURE", ids: ["pipelines", "oil-facilities", "desalination", "chokepoints"] },
  { label: "MARITIME & AIRSPACE", ids: ["sea-lanes", "airspace"] },
  { label: "LIVE TRACKING", ids: ["live-flights", "mil-only"] },
  { label: "REFERENCE", ids: ["borders"] },
];

export default function ConflictSidebar({ layers, onToggleLayer, conflictDay, totalStrikes }: ConflictSidebarProps) {
  const getLayer = (id: string) => layers.find((l) => l.id === id);

  return (
    <div className="w-[240px] bg-surface border-r border-border flex flex-col overflow-y-auto shrink-0 select-none">
      {/* Header */}
      <div className="px-3 py-2 border-b border-border">
        <div className="font-heading text-[16px] tracking-[2px] text-accent uppercase">
          Conflict Layers
        </div>
      </div>

      {/* Layer groups */}
      <div className="flex-1 overflow-y-auto px-2 py-1.5 space-y-2">
        {LAYER_GROUPS.map((group) => (
          <div key={group.label}>
            <div className="font-heading text-[15px] tracking-[1.5px] text-text-muted uppercase mb-1 flex items-center gap-1">
              <span className="text-accent">◆</span> {group.label}
            </div>
            <div className="space-y-0.5">
              {group.ids.map((id) => {
                const layer = getLayer(id);
                if (!layer) return null;
                return (
                  <button
                    key={id}
                    onClick={() => onToggleLayer(id)}
                    className={`w-full flex items-center gap-1.5 px-1.5 py-1 text-left transition-colors ${
                      layer.enabled
                        ? "bg-accent-glow text-text"
                        : "text-text-dim hover:bg-surface-2"
                    }`}
                  >
                    <div
                      className="w-2 h-2 shrink-0"
                      style={{
                        backgroundColor: layer.enabled ? layer.color : "transparent",
                        border: `1px solid ${layer.color}`,
                        opacity: layer.enabled ? 1 : 0.4,
                      }}
                    />
                    <span className="font-mono text-[15px] tracking-wide flex-1 truncate">
                      {layer.name}
                    </span>
                    {layer.count !== undefined && (
                      <span className="font-mono text-[14px] text-text-muted">
                        {layer.count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Stats panel */}
      <div className="border-t border-border px-3 py-2 space-y-2 shrink-0 overflow-y-auto" style={{ maxHeight: "55%" }}>
        {/* Conflict overview */}
        <div>
          <div className="font-heading text-[15px] tracking-[1.5px] text-accent uppercase flex items-center gap-1">
            <span>◆</span> Conflict Overview
            <span className="ml-auto text-danger font-mono text-[14px]">D+{conflictDay}</span>
          </div>
          <div className="font-mono text-[14px] text-text-dim space-y-0.5 mt-1">
            <div className="flex justify-between">
              <span>Total Strikes:</span>
              <span className="text-white">{totalStrikes}</span>
            </div>
            <div className="flex justify-between">
              <span>US/Coalition:</span>
              <span style={{ color: "#388bfd" }}>{layers.find((l) => l.id === "us-strikes")?.count || 0}</span>
            </div>
            <div className="flex justify-between">
              <span>Israeli:</span>
              <span style={{ color: "#e6edf3" }}>{layers.find((l) => l.id === "israel-strikes")?.count || 0}</span>
            </div>
            <div className="flex justify-between">
              <span>Iranian:</span>
              <span style={{ color: "#e8364a" }}>{layers.find((l) => l.id === "iran-strikes")?.count || 0}</span>
            </div>
          </div>
        </div>

        <div className="h-px bg-border" />

        {/* Air Defense Status */}
        <div>
          <div className="font-heading text-[14px] tracking-[1.5px] text-accent uppercase flex items-center gap-1">
            <span>◆</span> Air Defense
          </div>
          <div className="font-mono text-[14px] text-text-dim space-y-0.5 mt-1">
            <div className="flex justify-between">
              <span>THAAD (UAE)</span>
              <span className="text-danger">1 DEST / 1 DMG</span>
            </div>
            <div className="flex justify-between">
              <span>AN/FPS-132</span>
              <span className="text-warning">DAMAGED</span>
            </div>
            <div className="flex justify-between">
              <span>Patriot Stocks</span>
              <span className="text-warning">LOW</span>
            </div>
          </div>
        </div>

        <div className="h-px bg-border" />

        {/* Maritime Status */}
        <div>
          <div className="font-heading text-[14px] tracking-[1.5px] text-accent uppercase flex items-center gap-1">
            <span>◆</span> Maritime
          </div>
          <div className="font-mono text-[14px] text-text-dim space-y-0.5 mt-1">
            <div className="flex justify-between">
              <span>Hormuz</span>
              <span className="text-danger">CLOSED</span>
            </div>
            <div className="flex justify-between">
              <span>Bab el-Mandeb</span>
              <span className="text-warning">RESTRICTED</span>
            </div>
            <div className="flex justify-between">
              <span>Suez</span>
              <span className="text-accent">OPERATIONAL</span>
            </div>
            <div className="flex justify-between">
              <span>Ships Targeted</span>
              <span className="text-danger">10+</span>
            </div>
            <div className="flex justify-between">
              <span>Tankers Anchored</span>
              <span className="text-warning">~50+</span>
            </div>
            <div className="flex justify-between">
              <span>Oil Price</span>
              <span className="text-warning">$85+/bbl</span>
            </div>
          </div>
        </div>

        <div className="h-px bg-border" />

        {/* Pipelines */}
        <div>
          <div className="font-heading text-[14px] tracking-[1.5px] text-accent uppercase flex items-center gap-1">
            <span>◆</span> Pipelines
          </div>
          <div className="font-mono text-[14px] text-text-dim space-y-0.5 mt-1">
            <div className="flex justify-between">
              <span>Total Segments</span>
              <span className="text-text">{layers.find((l) => l.id === "pipelines")?.count || "..."}</span>
            </div>
            <div className="flex justify-between">
              <span>Source</span>
              <span className="text-text-muted">OSM Overpass</span>
            </div>
          </div>
        </div>

        <div className="h-px bg-border" />

        {/* Airspace */}
        <div>
          <div className="font-heading text-[14px] tracking-[1.5px] text-accent uppercase flex items-center gap-1">
            <span>◆</span> Airspace
          </div>
          <div className="font-mono text-[14px] text-text-dim space-y-0.5 mt-1">
            <div className="flex justify-between">
              <span>Tehran FIR</span>
              <span className="text-danger">CLOSED</span>
            </div>
            <div className="flex justify-between">
              <span>Baghdad FIR</span>
              <span className="text-warning">RESTRICTED</span>
            </div>
            <div className="flex justify-between">
              <span>Beirut FIR</span>
              <span className="text-warning">RESTRICTED</span>
            </div>
            <div className="flex justify-between">
              <span>Yemen FIR</span>
              <span className="text-danger">CLOSED</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
