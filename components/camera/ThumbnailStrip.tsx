"use client";

import { useRef, useState, useMemo } from "react";
import type { CameraData } from "@/components/map/MapEngine";

interface ThumbnailStripProps {
  cameras: CameraData[];
  selectedId?: string | null;
  onSelect: (camera: CameraData) => void;
}

// State abbreviation labels for display
const STATE_LABELS: Record<string, string> = {
  CA: "CALIFORNIA",
  NJ: "NEW JERSEY",
  NY: "NEW YORK",
  WA: "WASHINGTON",
  FL: "FLORIDA",
  GA: "GEORGIA",
  PA: "PENNSYLVANIA",
  MA: "MASSACHUSETTS",
  NV: "NEVADA",
};

export default function ThumbnailStrip({ cameras, selectedId, onSelect }: ThumbnailStripProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [activeTab, setActiveTab] = useState<string>("ALL");

  // Only cameras with image URLs
  const feedCameras = useMemo(() => cameras.filter((c) => c.imageUrl), [cameras]);

  // Build state tabs from actual data
  const stateTabs = useMemo(() => {
    const counts: Record<string, number> = {};
    feedCameras.forEach((c) => {
      const st = c.state || "OTHER";
      counts[st] = (counts[st] || 0) + 1;
    });
    // Sort by count descending
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .map(([state, count]) => ({ state, count }));
  }, [feedCameras]);

  // Filter cameras by selected tab
  const filteredCameras = useMemo(() => {
    if (activeTab === "ALL") return feedCameras;
    return feedCameras.filter((c) => (c.state || "OTHER") === activeTab);
  }, [feedCameras, activeTab]);

  // Scroll to start when tab changes
  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    scrollRef.current?.scrollTo({ left: 0, behavior: "smooth" });
  };

  if (feedCameras.length === 0) return null;

  return (
    <div className="bg-surface border-t border-border shrink-0 flex flex-col overflow-hidden">
      {/* Tab bar */}
      <div className="h-[28px] flex items-center border-b border-border overflow-x-auto" style={{ scrollbarWidth: "none" }}>
        <div className="px-2 shrink-0">
          <span className="font-heading text-[11px] tracking-[1.5px] text-text-muted uppercase">
            FEEDS
          </span>
        </div>
        <button
          onClick={() => handleTabChange("ALL")}
          className={`shrink-0 px-2.5 h-full text-[11px] font-mono tracking-wide transition-colors border-b-2 ${
            activeTab === "ALL"
              ? "text-accent border-accent bg-accent-glow"
              : "text-text-dim border-transparent hover:text-text hover:bg-surface-2"
          }`}
        >
          ALL <span className="text-text-muted ml-0.5">{feedCameras.length.toLocaleString()}</span>
        </button>
        {stateTabs.map(({ state, count }) => (
          <button
            key={state}
            onClick={() => handleTabChange(state)}
            className={`shrink-0 px-2.5 h-full text-[11px] font-mono tracking-wide transition-colors border-b-2 ${
              activeTab === state
                ? "text-accent border-accent bg-accent-glow"
                : "text-text-dim border-transparent hover:text-text hover:bg-surface-2"
            }`}
          >
            {state} <span className="text-text-muted ml-0.5">{count.toLocaleString()}</span>
          </button>
        ))}
      </div>

      {/* Thumbnails */}
      <div className="h-[60px] flex items-center overflow-hidden">
        {/* Active tab label */}
        <div className="px-2 shrink-0 w-[70px]">
          <div className="font-heading text-[10px] tracking-[1px] text-accent uppercase truncate">
            {activeTab === "ALL" ? "ALL" : (STATE_LABELS[activeTab] || activeTab)}
          </div>
          <div className="font-mono text-[12px] text-text-dim">
            {filteredCameras.length.toLocaleString()}
          </div>
        </div>

        {/* Scrolling thumbnails */}
        <div
          ref={scrollRef}
          className="flex-1 flex items-center gap-1 overflow-x-auto px-1"
          style={{ scrollbarWidth: "none" }}
        >
          {filteredCameras.slice(0, 200).map((camera) => {
            const isSelected = camera.id === selectedId;
            const proxyUrl = `/api/camera-image?url=${encodeURIComponent(camera.imageUrl!)}`;
            return (
              <button
                key={camera.id}
                onClick={() => onSelect(camera)}
                className={`relative shrink-0 w-[88px] h-[50px] overflow-hidden transition-all ${
                  isSelected
                    ? "border border-accent shadow-[0_0_8px_rgba(0,212,170,0.2)]"
                    : "border border-border hover:border-border-hover"
                }`}
              >
                <img
                  src={proxyUrl}
                  alt={camera.name}
                  className="w-full h-full object-cover camera-filter"
                  loading="lazy"
                />
                {/* Name overlay */}
                <div className="absolute bottom-0 left-0 right-0 bg-void/70 px-1 py-0.5">
                  <div className="font-mono text-[9px] text-text-dim truncate">
                    {camera.name}
                  </div>
                </div>
                {/* Stream indicator */}
                {camera.streamUrl && (
                  <div className="absolute top-0.5 left-0.5 px-1 bg-accent/80 text-void text-[8px] font-mono font-bold">
                    HLS
                  </div>
                )}
                {/* LIVE dot */}
                {camera.inService && (
                  <div className="absolute top-1 right-1 w-1 h-1 bg-danger" />
                )}
              </button>
            );
          })}
          {filteredCameras.length > 200 && (
            <div className="shrink-0 px-3 text-[11px] font-mono text-text-muted">
              +{(filteredCameras.length - 200).toLocaleString()} more
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
