"use client";

import { useEffect, useState, useRef } from "react";
import type { CameraData } from "@/components/map/MapEngine";

interface PrimaryCameraViewProps {
  camera: CameraData;
  onClose: () => void;
}

export default function PrimaryCameraView({ camera, onClose }: PrimaryCameraViewProps) {
  const [timestamp, setTimestamp] = useState("");
  const [imageError, setImageError] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    function tick() {
      const now = new Date();
      setTimestamp(
        now.toLocaleTimeString("en-US", { hour12: false }) +
        ":" +
        String(now.getMilliseconds()).padStart(3, "0").slice(0, 2)
      );
    }
    tick();
    const id = setInterval(tick, 100);
    return () => clearInterval(id);
  }, []);

  // Auto-refresh image every 10s
  useEffect(() => {
    if (!camera.imageUrl) return;
    const id = setInterval(() => {
      if (imgRef.current) {
        const url = `/api/camera-image?url=${encodeURIComponent(camera.imageUrl!)}`;
        imgRef.current.src = url + `&t=${Date.now()}`;
      }
    }, 10000);
    return () => clearInterval(id);
  }, [camera.imageUrl]);

  const imageUrl = camera.imageUrl
    ? `/api/camera-image?url=${encodeURIComponent(camera.imageUrl)}`
    : null;

  const lat = camera.lat?.toFixed(3) || "0.000";
  const lng = Math.abs(camera.lng || 0).toFixed(3);
  const lngDir = (camera.lng || 0) < 0 ? "W" : "E";
  const latDir = (camera.lat || 0) >= 0 ? "N" : "S";

  return (
    <div className="relative w-full h-full bg-void overflow-hidden select-none">
      {/* Camera Image */}
      {imageUrl && !imageError ? (
        <img
          ref={imgRef}
          src={imageUrl}
          alt={camera.name}
          className="w-full h-full object-cover camera-filter"
          onError={() => setImageError(true)}
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-void">
          <div className="text-center">
            <div className="font-heading text-[10px] tracking-[2px] text-text-dim uppercase">
              {camera.streamUrl ? "HLS STREAM AVAILABLE" : "NO FEED"}
            </div>
            <div className="font-mono text-[9px] text-text-muted mt-1">{camera.id}</div>
          </div>
        </div>
      )}

      {/* Scan line overlay */}
      <div className="scanline-overlay" />

      {/* HUD Corner Brackets */}
      <div className="hud-bracket hud-bracket-tl" />
      <div className="hud-bracket hud-bracket-tr" />
      <div className="hud-bracket hud-bracket-bl" />
      <div className="hud-bracket hud-bracket-br" />

      {/* Crosshair */}
      <div className="hud-crosshair" />

      {/* Top-left: Surveillance info */}
      <div className="absolute top-5 left-5 font-mono text-[9px] space-y-0.5 z-10">
        <div className="text-accent opacity-70">
          [SURVEILLANCE] {lat}:{latDir} {lng}:{lngDir}
        </div>
        <div className="text-text-dim">{camera.id}</div>
        <div className="text-text-muted">
          FEED SELECT: {camera.source?.toUpperCase() || "UNKNOWN"}
        </div>
      </div>

      {/* Top-right: LIVE badge */}
      <div className="absolute top-5 right-5 flex items-center gap-1.5 z-10">
        <div className="w-1.5 h-1.5 bg-danger animate-pulse" />
        <span className="font-heading text-[8px] tracking-[2px] text-danger font-semibold">
          LIVE
        </span>
      </div>

      {/* Bottom-left: Camera name + timestamp */}
      <div className="absolute bottom-5 left-5 font-mono text-[9px] z-10">
        <div className="text-accent opacity-70">
          [CAM] {camera.id} — {camera.name}
        </div>
        <div className="text-text-dim mt-0.5">
          {camera.road && <span>{camera.road} </span>}
          {camera.direction && <span>{camera.direction} </span>}
          {camera.state && <span>/ {camera.state} </span>}
          <span className="text-accent ml-2">{timestamp}</span>
        </div>
      </div>

      {/* Bottom-right: Close button */}
      <button
        onClick={onClose}
        className="absolute bottom-5 right-5 font-heading text-[8px] tracking-[2px] text-text-dim hover:text-accent transition-colors z-10 px-2 py-1 border border-border hover:border-border-active"
      >
        ESC — MAP
      </button>

      {/* Top gradient fade */}
      <div
        className="absolute top-0 left-0 right-0 h-16 pointer-events-none z-[2]"
        style={{ background: "linear-gradient(to bottom, rgba(6,8,9,0.6), transparent)" }}
      />
      {/* Bottom gradient fade */}
      <div
        className="absolute bottom-0 left-0 right-0 h-16 pointer-events-none z-[2]"
        style={{ background: "linear-gradient(to top, rgba(6,8,9,0.6), transparent)" }}
      />
    </div>
  );
}
