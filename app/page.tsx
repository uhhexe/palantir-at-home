"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import dynamic from "next/dynamic";
import TopBar from "@/components/layout/TopBar";
import BottomBar from "@/components/layout/BottomBar";
import Sidebar, {
  DEFAULT_LAYERS,
  type LayerConfig,
} from "@/components/layout/Sidebar";
import ChatPanel from "@/components/chat/ChatPanel";
import PrimaryCameraView from "@/components/camera/PrimaryCameraView";
import ThumbnailStrip from "@/components/camera/ThumbnailStrip";
import type { CameraData, CableData } from "@/components/map/MapEngine";
import MapScreenshotButton from "@/components/map/MapScreenshot";

const MapEngine = dynamic(() => import("@/components/map/MapEngine"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full bg-void flex items-center justify-center">
      <div className="text-text-dim text-[13px] font-heading tracking-[2px] animate-pulse uppercase">
        Initializing Map Engine...
      </div>
    </div>
  ),
});

export default function Home() {
  const [layers, setLayers] = useState<LayerConfig[]>(DEFAULT_LAYERS);
  const [activeView, setActiveView] = useState("map");
  const [cameras, setCameras] = useState<CameraData[]>([]);
  const [cableData, setCableData] = useState<CableData | null>(null);
  const [layerData, setLayerData] = useState<Record<string, GeoJSON.FeatureCollection>>({});
  const [loadingStatus, setLoadingStatus] = useState<string>("");
  const [selectedCamera, setSelectedCamera] = useState<CameraData | null>(null);
  const mapNavRef = useRef<{ flyTo: (lat: number, lng: number, zoom: number) => void } | null>(null);

  const toggleLayer = useCallback((id: string) => {
    setLayers((prev) =>
      prev.map((l) => (l.id === id ? { ...l, enabled: !l.enabled } : l))
    );
  }, []);

  const handleCameraClick = useCallback((camera: CameraData) => {
    setSelectedCamera(camera);
    // Fly map to the selected camera
    if (camera.lat && camera.lng) {
      mapNavRef.current?.flyTo(camera.lat, camera.lng, 14);
    }
  }, []);

  const handleQuickNav = useCallback((lat: number, lng: number, zoom: number) => {
    mapNavRef.current?.flyTo(lat, lng, zoom);
  }, []);

  // Fetch camera data
  useEffect(() => {
    async function fetchCameras() {
      setLoadingStatus("Fetching camera feeds...");
      try {
        const res = await fetch("/api/cameras");
        const data = await res.json();
        if (data.cameras) {
          setCameras(data.cameras);
          setLayers((prev) =>
            prev.map((l) =>
              l.id === "cameras" ? { ...l, count: data.cameras.length } : l
            )
          );
        }
      } catch (err) {
        console.error("Failed to fetch cameras:", err);
      }
      setLoadingStatus("");
    }
    fetchCameras();
  }, []);

  // Fetch cable data
  useEffect(() => {
    async function fetchCables() {
      try {
        const res = await fetch("/api/layers?layer=cables");
        const data = await res.json();
        if (data.features) {
          setCableData(data);
          setLayers((prev) =>
            prev.map((l) =>
              l.id === "cables" ? { ...l, count: data.features.length } : l
            )
          );
        }
      } catch (err) {
        console.error("Failed to fetch cables:", err);
      }
    }
    fetchCables();
  }, []);

  // Fetch HIFLD / dynamic layers when toggled on
  const fetchingRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    const layersToFetch = layers.filter(
      (l) =>
        l.enabled &&
        l.id !== "cameras" &&
        l.id !== "cables" &&
        !layerData[l.id] &&
        !fetchingRef.current.has(l.id)
    );

    if (layersToFetch.length === 0) return;

    const controller = new AbortController();

    layersToFetch.forEach(async (layer) => {
      fetchingRef.current.add(layer.id);
      setLoadingStatus(`Loading ${layer.name}...`);
      try {
        const isSlowLayer = ["osm-cameras", "alpr", "deflock-alpr"].includes(layer.id);
        const timeout = setTimeout(() => controller.abort(), isSlowLayer ? 300000 : 60000);
        const res = await fetch(`/api/layers?layer=${layer.id}`, { signal: controller.signal });
        clearTimeout(timeout);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (data.features) {
          setLayerData((prev) => ({ ...prev, [layer.id]: data }));
          setLayers((prev) =>
            prev.map((l) =>
              l.id === layer.id ? { ...l, count: data.features.length } : l
            )
          );
        }
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          console.error(`Failed to fetch ${layer.name}:`, err);
        }
      }
      fetchingRef.current.delete(layer.id);
      setLoadingStatus("");
    });

    return () => controller.abort();
  }, [layers, layerData]);

  // Keyboard shortcuts
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === "Escape") setSelectedCamera(null);
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, []);

  const enabledLayers = layers.filter((l) => l.enabled).length;
  const totalPoints = Object.values(layerData).reduce(
    (sum, d) => sum + (d.features?.length || 0),
    0
  );
  const sourceCount = new Set(cameras.map((c) => c.source)).size;

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-void">
      <TopBar
        cameraCount={cameras.length}
        sourceCount={sourceCount}
      />

      {loadingStatus && (
        <div className="h-5 bg-surface-2 border-b border-border flex items-center px-3">
          <div className="w-1 h-1 bg-accent animate-pulse mr-2" />
          <span className="text-[13px] font-mono text-text-dim tracking-wider">
            {loadingStatus}
          </span>
        </div>
      )}

      <div className="flex flex-1 overflow-hidden">
        <Sidebar
          layers={layers}
          onToggleLayer={toggleLayer}
          activeView={activeView}
          onChangeView={setActiveView}
        />

        <main className="flex-1 flex flex-col overflow-hidden">
          {activeView === "map" && (
            <>
              <div className="flex-1 overflow-hidden relative flex">
                {/* Map — always visible */}
                <div className={`h-full transition-all duration-300 relative ${selectedCamera ? "w-[55%]" : "w-full"}`}>
                  <MapEngine
                    layers={layers}
                    cameras={cameras}
                    cableData={cableData}
                    layerData={layerData}
                    onCameraClick={handleCameraClick}
                    navRef={mapNavRef}
                  />
                  <MapScreenshotButton />
                </div>
                {/* Camera panel — slides in from right */}
                {selectedCamera && (
                  <div className="w-[45%] h-full border-l border-border relative">
                    <PrimaryCameraView
                      camera={selectedCamera}
                      onClose={() => setSelectedCamera(null)}
                    />
                  </div>
                )}
              </div>
              <ThumbnailStrip
                cameras={cameras}
                selectedId={selectedCamera?.id}
                onSelect={handleCameraClick}
              />
            </>
          )}

          {activeView === "chat" && <ChatPanel />}

          {activeView === "canvas" && (
            <div className="w-full h-full bg-void flex items-center justify-center">
              <div className="text-center">
                <div className="text-text-dim text-[13px] font-heading tracking-[2px] uppercase mb-1">
                  Canvas — Visual Research Board
                </div>
                <div className="text-text-muted text-[13px] font-mono">
                  React Flow + Obsidian Import
                </div>
              </div>
            </div>
          )}

          {activeView === "ingest" && (
            <div className="w-full h-full bg-void flex items-center justify-center">
              <div className="text-center">
                <div className="text-text-dim text-[13px] font-heading tracking-[2px] uppercase mb-1">
                  Ingest — Document Pipeline
                </div>
                <div className="text-text-muted text-[13px] font-mono">
                  Upload, chunk, embed, store
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      <BottomBar
        enabledLayers={enabledLayers}
        totalPoints={totalPoints}
        onQuickNav={handleQuickNav}
      />
    </div>
  );
}
