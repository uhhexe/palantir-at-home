"use client";

import { useRef } from "react";
import type { CameraData } from "@/components/map/MapEngine";

interface ThumbnailStripProps {
  cameras: CameraData[];
  selectedId?: string | null;
  onSelect: (camera: CameraData) => void;
}

export default function ThumbnailStrip({ cameras, selectedId, onSelect }: ThumbnailStripProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Only show cameras that have image URLs
  const feedCameras = cameras.filter((c) => c.imageUrl);

  if (feedCameras.length === 0) return null;

  return (
    <div className="h-[72px] bg-surface border-t border-border shrink-0 flex items-center overflow-hidden">
      {/* Label */}
      <div className="px-2 shrink-0">
        <div className="font-heading text-[7px] tracking-[1.5px] text-text-muted uppercase">
          FEEDS
        </div>
        <div className="font-mono text-[8px] text-text-dim">
          {feedCameras.length}
        </div>
      </div>

      {/* Scrolling thumbnails */}
      <div
        ref={scrollRef}
        className="flex-1 flex items-center gap-1 overflow-x-auto px-1"
        style={{ scrollbarWidth: "none" }}
      >
        {feedCameras.slice(0, 100).map((camera) => {
          const isSelected = camera.id === selectedId;
          const proxyUrl = `/api/camera-image?url=${encodeURIComponent(camera.imageUrl!)}`;
          return (
            <button
              key={camera.id}
              onClick={() => onSelect(camera)}
              className={`relative shrink-0 w-[96px] h-[56px] overflow-hidden transition-all ${
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
                <div className="font-mono text-[6px] text-text-dim truncate">
                  {camera.name}
                </div>
              </div>
              {/* LIVE dot */}
              {camera.inService && (
                <div className="absolute top-1 right-1 w-1 h-1 bg-danger" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
