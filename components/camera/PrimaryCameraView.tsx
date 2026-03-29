"use client";

import { useEffect, useState, useRef } from "react";
import Hls from "hls.js";
import type { CameraData } from "@/components/map/MapEngine";

interface PrimaryCameraViewProps {
  camera: CameraData;
  onClose: () => void;
}

export default function PrimaryCameraView({ camera, onClose }: PrimaryCameraViewProps) {
  const [timestamp, setTimestamp] = useState("");
  const [imageError, setImageError] = useState(false);
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [streamActive, setStreamActive] = useState(false);
  const [streamError, setStreamError] = useState(false);
  const [paused, setPaused] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  // Real-time timestamp
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

  // Reset state when camera changes — destroy old stream first
  useEffect(() => {
    // Kill any existing HLS stream
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.removeAttribute("src");
      videoRef.current.load();
    }

    setImageError(false);
    setStreamError(false);
    setPaused(false);

    // Set initial image
    const src = camera.imageUrl || camera.feedUrl;
    if (src) {
      setImageSrc(`/api/camera-image?url=${encodeURIComponent(src)}&t=${Date.now()}`);
    } else {
      setImageSrc(null);
    }

    // Auto-start stream if available, otherwise show still image
    setStreamActive(!!camera.streamUrl);
  }, [camera.id]);

  // HLS streaming
  useEffect(() => {
    if (!streamActive || !camera.streamUrl) return;

    const video = videoRef.current;
    if (!video) return;

    // Safari supports HLS natively
    if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = camera.streamUrl;
      const onError = () => setStreamError(true);
      video.addEventListener("error", onError);
      video.play().catch(() => {});
      return () => {
        video.removeEventListener("error", onError);
        video.pause();
        video.removeAttribute("src");
        video.load();
      };
    }

    // Use hls.js for other browsers
    if (Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
        maxBufferLength: 10,
        maxMaxBufferLength: 20,
      });
      hlsRef.current = hls;

      hls.loadSource(camera.streamUrl);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        video.play().catch(() => {});
      });

      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (data.fatal) {
          if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
            hls.recoverMediaError();
          } else {
            setStreamError(true);
            setStreamActive(false);
          }
        }
      });

      return () => {
        hls.destroy();
        hlsRef.current = null;
      };
    }
  }, [streamActive, camera.streamUrl]);

  // Auto-refresh still image every 3s using double-buffer (no flash)
  useEffect(() => {
    const src = camera.imageUrl || camera.feedUrl;
    if (streamActive || !src) return;
    const id = setInterval(() => {
      const nextUrl = `/api/camera-image?url=${encodeURIComponent(src)}&t=${Date.now()}`;
      // Preload in background, swap only when loaded
      const preload = new Image();
      preload.onload = () => {
        setImageSrc(nextUrl);
        setImageError(false);
      };
      preload.src = nextUrl;
    }, 3000);
    return () => clearInterval(id);
  }, [streamActive, camera.imageUrl, camera.feedUrl]);

  const lat = camera.lat?.toFixed(3) || "0.000";
  const lng = Math.abs(camera.lng || 0).toFixed(3);
  const lngDir = (camera.lng || 0) < 0 ? "W" : "E";
  const latDir = (camera.lat || 0) >= 0 ? "N" : "S";

  return (
    <div className="relative w-full h-full bg-void overflow-hidden select-none">
      {/* Camera Feed: HLS stream or still image */}
      {streamActive && camera.streamUrl && !streamError ? (
        <video
          ref={videoRef}
          className="w-full h-full object-cover camera-filter"
          autoPlay
          muted
          playsInline
        />
      ) : imageSrc && !imageError ? (
        <img
          ref={imgRef}
          src={imageSrc}
          alt={camera.name}
          className="w-full h-full object-cover camera-filter"
          onError={() => setImageError(true)}
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-void">
          <div className="text-center">
            <div className="font-heading text-[13px] tracking-[2px] text-text-dim uppercase">
              {streamError ? "STREAM UNAVAILABLE" : camera.streamUrl ? "CONNECTING..." : "NO FEED"}
            </div>
            <div className="font-mono text-[13px] text-text-muted mt-1">{camera.id}</div>
            {camera.streamUrl && streamError && (
              <button
                onClick={() => { setStreamError(false); setStreamActive(true); }}
                className="mt-2 font-mono text-[13px] text-accent border border-border px-2 py-0.5 hover:border-border-active transition-colors"
              >
                RETRY
              </button>
            )}
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
      <div className="absolute top-5 left-5 font-mono text-[13px] space-y-0.5 z-10">
        <div className="text-accent opacity-70">
          [SURVEILLANCE] {lat}:{latDir} {lng}:{lngDir}
        </div>
        <div className="text-text-dim">{camera.id}</div>
        <div className="text-text-muted">
          FEED SELECT: {camera.source?.toUpperCase() || "UNKNOWN"}
        </div>
      </div>

      {/* Top-right: LIVE badge + stream indicator */}
      <div className="absolute top-5 right-5 flex items-center gap-2 z-10">
        {streamActive && !streamError && (
          <span className="font-mono text-[13px] tracking-[1px] text-accent-bright border border-accent/30 px-1.5 py-0.5">
            HLS
          </span>
        )}
        <div className="flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 bg-danger animate-pulse" />
          <span className="font-heading text-[13px] tracking-[2px] text-danger font-semibold">
            LIVE
          </span>
        </div>
      </div>

      {/* Bottom-left: Camera name + timestamp */}
      <div className="absolute bottom-5 left-5 font-mono text-[13px] z-10">
        <div className="text-accent opacity-70">
          [CAM] {camera.id} — {camera.name}
        </div>
        {camera.county && (
          <div className="text-text mt-0.5">
            {camera.county}{camera.state ? `, ${camera.state}` : ""}
          </div>
        )}
        <div className="text-text-dim mt-0.5">
          {camera.road && <span>{camera.road} </span>}
          {camera.direction && <span>{camera.direction} </span>}
          {!camera.county && camera.state && <span>/ {camera.state} </span>}
          <span className="text-accent ml-2">{timestamp}</span>
        </div>
      </div>

      {/* Bottom-right: Controls */}
      <div className="absolute bottom-5 right-5 flex items-center gap-2 z-10">
        {/* Play/Pause */}
        {streamActive && !streamError && (
          <button
            onClick={() => {
              const video = videoRef.current;
              if (!video) return;
              if (video.paused) {
                video.play().catch(() => {});
                setPaused(false);
              } else {
                video.pause();
                setPaused(true);
              }
            }}
            className="font-mono text-[13px] tracking-[1px] px-3 py-1 border border-accent/30 text-accent hover:border-accent transition-colors"
          >
            {paused ? "▶ PLAY" : "❚❚ PAUSE"}
          </button>
        )}
        {/* Stream toggle */}
        {camera.streamUrl && (
          <button
            onClick={() => {
              if (streamActive) {
                setStreamActive(false);
                setPaused(false);
                hlsRef.current?.destroy();
                hlsRef.current = null;
              } else {
                setStreamError(false);
                setStreamActive(true);
              }
            }}
            className={`font-mono text-[13px] tracking-[1px] px-3 py-1 border transition-colors ${
              streamActive
                ? "text-danger border-danger/30 hover:border-danger"
                : "text-accent border-border hover:border-accent"
            }`}
          >
            {streamActive ? "STOP" : "STREAM"}
          </button>
        )}
        <button
          onClick={onClose}
          className="font-heading text-[13px] tracking-[2px] text-text-dim hover:text-accent transition-colors px-2 py-1 border border-border hover:border-border-active"
        >
          ✕ CLOSE
        </button>
      </div>

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
