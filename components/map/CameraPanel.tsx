"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { X, RefreshCw, ExternalLink, Radio, Play, Square } from "lucide-react";
import Hls from "hls.js";
import type { CameraData } from "./MapEngine";

interface CameraPanelProps {
  camera: CameraData;
  onClose: () => void;
}

export default function CameraPanel({ camera, onClose }: CameraPanelProps) {
  const imgSrc = camera.imageUrl || camera.feedUrl;
  const [imageKey, setImageKey] = useState(Date.now());
  const [autoRefresh, setAutoRefresh] = useState(true);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [imageError, setImageError] = useState(false);
  const [showStream, setShowStream] = useState(false);

  useEffect(() => {
    setImageKey(Date.now());
    setImageError(false);
    setShowStream(false);
  }, [camera.id]);

  useEffect(() => {
    if (autoRefresh && imgSrc && !showStream) {
      intervalRef.current = setInterval(() => {
        setImageKey(Date.now());
        setImageError(false);
      }, 10000);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [autoRefresh, imgSrc, showStream]);

  const proxiedUrl = imgSrc
    ? `/api/camera-image?url=${encodeURIComponent(imgSrc)}&t=${imageKey}`
    : null;

  return (
    <div className="h-full flex flex-col bg-background border-l border-border">
      {/* Header */}
      <div className="h-10 bg-surface border-b border-border flex items-center px-3 shrink-0 gap-2">
        <Radio className="w-3.5 h-3.5 text-accent" />
        <span className="text-[11px] tracking-wider text-accent flex-1 truncate">
          CAMERA FEED
        </span>
        <button
          onClick={onClose}
          className="p-1 rounded hover:bg-surface-2 text-text-dim hover:text-text transition-colors"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Feed */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {/* Camera name */}
        <div>
          <h3 className="text-[13px] font-bold text-accent font-heading">
            {camera.name}
          </h3>
          <div className="flex items-center gap-2 mt-1 text-[10px] text-text-dim">
            {camera.road && <span>Route {camera.road}</span>}
            {camera.direction && <span>{camera.direction}</span>}
            {camera.county && <span>{camera.county} Co.</span>}
            {camera.state && (
              <span className="text-accent-blue">{camera.state}</span>
            )}
          </div>
        </div>

        {/* Video stream or still image */}
        {showStream && camera.streamUrl ? (
          <HlsPlayer streamUrl={camera.streamUrl} />
        ) : proxiedUrl && !imageError ? (
          <div className="relative">
            <img
              key={imageKey}
              src={proxiedUrl}
              alt={camera.name}
              className="w-full rounded border border-border bg-surface"
              onError={() => setImageError(true)}
            />
            <div className="absolute top-2 right-2 bg-black/70 rounded px-2 py-0.5 text-[9px] text-accent flex items-center gap-1">
              <div className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
              LIVE
            </div>
          </div>
        ) : (
          <div className="w-full h-48 rounded border border-border bg-surface flex items-center justify-center">
            <span className="text-danger text-[10px]">
              {imageError ? "FEED UNAVAILABLE" : "NO FEED URL"}
            </span>
          </div>
        )}

        {/* Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          {!showStream && (
            <>
              <button
                onClick={() => {
                  setImageKey(Date.now());
                  setImageError(false);
                }}
                className="flex items-center gap-1.5 px-2.5 py-1.5 bg-surface border border-border rounded text-[10px] text-accent hover:bg-surface-2 transition-colors"
              >
                <RefreshCw className="w-3 h-3" />
                REFRESH
              </button>
              <button
                onClick={() => setAutoRefresh(!autoRefresh)}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 border rounded text-[10px] transition-colors ${
                  autoRefresh
                    ? "bg-accent/10 border-accent/30 text-accent"
                    : "bg-surface border-border text-text-dim"
                }`}
              >
                <div
                  className={`w-1.5 h-1.5 rounded-full ${
                    autoRefresh ? "bg-accent animate-pulse" : "bg-text-dim"
                  }`}
                />
                AUTO {autoRefresh ? "ON" : "OFF"}
              </button>
            </>
          )}
          {camera.streamUrl && (
            <button
              onClick={() => setShowStream(!showStream)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 border rounded text-[10px] transition-colors ${
                showStream
                  ? "bg-danger/10 border-danger/30 text-danger"
                  : "bg-accent-blue/10 border-accent-blue/30 text-accent-blue"
              }`}
            >
              {showStream ? (
                <>
                  <Square className="w-3 h-3" />
                  STOP STREAM
                </>
              ) : (
                <>
                  <Play className="w-3 h-3" />
                  LIVE STREAM
                </>
              )}
            </button>
          )}
        </div>

        {/* Metadata */}
        <div className="bg-surface border border-border rounded p-2.5 space-y-1.5">
          <div className="text-[9px] text-text-dim tracking-widest uppercase mb-2">
            Camera Details
          </div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[10px]">
            <span className="text-text-dim">Source</span>
            <span className="text-text">{camera.source || "unknown"}</span>
            <span className="text-text-dim">Coordinates</span>
            <span className="text-text">
              {camera.lat.toFixed(4)}, {camera.lng.toFixed(4)}
            </span>
            {camera.county && (
              <>
                <span className="text-text-dim">County</span>
                <span className="text-text">{camera.county}</span>
              </>
            )}
            <span className="text-text-dim">Status</span>
            <span className={camera.inService !== false ? "text-accent" : "text-danger"}>
              {camera.inService !== false ? "IN SERVICE" : "OFFLINE"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function HlsPlayer({ streamUrl }: { streamUrl: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    setError(null);
    setLoading(true);

    // Safari supports HLS natively
    if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = streamUrl;
      video.addEventListener("loadeddata", () => setLoading(false));
      video.addEventListener("error", () => setError("Stream unavailable"));
      video.play().catch(() => {});
      return;
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

      hls.loadSource(streamUrl);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        setLoading(false);
        video.play().catch(() => {});
      });

      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (data.fatal) {
          if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
            setError("Network error — stream may be offline");
          } else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
            hls.recoverMediaError();
          } else {
            setError("Stream unavailable");
          }
          setLoading(false);
        }
      });

      return () => {
        hls.destroy();
        hlsRef.current = null;
      };
    } else {
      setError("HLS not supported in this browser");
      setLoading(false);
    }
  }, [streamUrl]);

  return (
    <div className="relative rounded border border-border overflow-hidden bg-black">
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-surface z-10">
          <div className="text-[10px] text-text-dim animate-pulse">
            CONNECTING TO STREAM...
          </div>
        </div>
      )}
      {error ? (
        <div className="w-full h-48 flex flex-col items-center justify-center bg-surface gap-2">
          <span className="text-danger text-[10px]">{error}</span>
          <span className="text-text-dim text-[9px]">
            Some Caltrans streams are only active during certain hours
          </span>
        </div>
      ) : (
        <video
          ref={videoRef}
          className="w-full"
          autoPlay
          muted
          playsInline
          controls
          style={{ background: "#000" }}
        />
      )}
      <div className="absolute top-2 right-2 bg-black/70 rounded px-2 py-0.5 text-[9px] text-danger flex items-center gap-1 z-20">
        <div className="w-1.5 h-1.5 rounded-full bg-danger animate-pulse" />
        STREAMING
      </div>
    </div>
  );
}
