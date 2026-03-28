"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import dynamic from "next/dynamic";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/ResizablePanels";
import TopBar from "@/components/layout/TopBar";
import Sidebar, {
  DEFAULT_LAYERS,
  type LayerConfig,
} from "@/components/layout/Sidebar";
import ChatPanel from "@/components/chat/ChatPanel";
import CameraPanel from "@/components/map/CameraPanel";
import type { CameraData, CableData } from "@/components/map/MapEngine";

const MapEngine = dynamic(() => import("@/components/map/MapEngine"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full bg-background flex items-center justify-center">
      <div className="text-text-dim text-[11px] tracking-wider animate-pulse">
        INITIALIZING MAP ENGINE...
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
  useEffect(() => {
    const layersToFetch = layers.filter(
      (l) =>
        l.enabled &&
        l.id !== "cameras" &&
        l.id !== "cables" &&
        !layerData[l.id]
    );

    if (layersToFetch.length === 0) return;

    layersToFetch.forEach(async (layer) => {
      setLoadingStatus(`Loading ${layer.name}...`);
      try {
        const isSlowLayer = ["osm-cameras", "alpr"].includes(layer.id);
        const controller = new AbortController();
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
        console.error(`Failed to fetch ${layer.name}:`, err);
      }
      setLoadingStatus("");
    });
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

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <TopBar />

      {loadingStatus && (
        <div className="h-6 bg-surface-2 border-b border-border flex items-center px-4">
          <div className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse mr-2" />
          <span className="text-[10px] text-text-dim tracking-wider">
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
          onQuickNav={handleQuickNav}
        />

        <main className="flex-1 overflow-hidden">
          {activeView === "map" && (
            <ResizablePanelGroup direction="horizontal">
              <ResizablePanel defaultSize={selectedCamera ? 50 : 65} minSize={30}>
                <MapEngine
                  layers={layers}
                  cameras={cameras}
                  cableData={cableData}
                  layerData={layerData}
                  onCameraClick={handleCameraClick}
                  navRef={mapNavRef}
                />
              </ResizablePanel>
              <ResizableHandle />
              <ResizablePanel defaultSize={selectedCamera ? 50 : 35} minSize={20}>
                {selectedCamera ? (
                  <ResizablePanelGroup direction="vertical">
                    <ResizablePanel defaultSize={60} minSize={30}>
                      <CameraPanel
                        camera={selectedCamera}
                        onClose={() => setSelectedCamera(null)}
                      />
                    </ResizablePanel>
                    <ResizableHandle />
                    <ResizablePanel defaultSize={40} minSize={20}>
                      <ChatPanel />
                    </ResizablePanel>
                  </ResizablePanelGroup>
                ) : (
                  <ChatPanel />
                )}
              </ResizablePanel>
            </ResizablePanelGroup>
          )}

          {activeView === "chat" && <ChatPanel />}

          {activeView === "canvas" && (
            <div className="w-full h-full bg-background flex items-center justify-center">
              <div className="text-center">
                <div className="text-text-dim text-[11px] tracking-wider mb-2">
                  CANVAS — VISUAL RESEARCH BOARD
                </div>
                <div className="text-text-dim/50 text-[10px]">
                  Phase 3 — React Flow + Obsidian Import
                </div>
              </div>
            </div>
          )}

          {activeView === "ingest" && (
            <div className="w-full h-full bg-background flex items-center justify-center">
              <div className="text-center">
                <div className="text-text-dim text-[11px] tracking-wider mb-2">
                  INGEST — DOCUMENT PIPELINE
                </div>
                <div className="text-text-dim/50 text-[10px]">
                  Phase 2 — Upload, chunk, embed, store
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
