"use client";

import { useEffect, useRef } from "react";
import type { ConflictStrike } from "./ConflictMap";
import type { WaveEvent } from "./WavePlayer";

interface ConflictGlobeProps {
  strikes: ConflictStrike[];
  militaryBases: { lat: number; lng: number; name: string; country: string }[];
  nuclearSites: { lat: number; lng: number; name: string; status: string }[];
  selectedWave: WaveEvent | null;
}

const LAUNCH_ZONES: Record<string, [number, number]> = {
  iran: [33.0, 53.0],
  irgc: [33.0, 53.0],
  "irgc navy": [27.2, 56.3],
  "irgc aerospace": [35.7, 51.4],
  hezbollah: [33.9, 35.5],
  houthi: [15.4, 44.2],
  us: [25.0, 51.0],
  israel: [31.5, 34.8],
};

function getStrikeColor(attacker: string): string {
  const a = (attacker || "").toLowerCase();
  if (a.includes("us") || a.includes("america") || a.includes("centcom") || a.includes("coalition")) return "#388bfd";
  if (a.includes("israel") || a.includes("idf")) return "#e6edf3";
  if (a.includes("iran") || a.includes("irgc")) return "#e8364a";
  if (a.includes("houthi")) return "#d4962a";
  if (a.includes("hezbollah")) return "#c8b832";
  return "#8b949e";
}

export default function ConflictGlobe({ strikes, militaryBases, nuclearSites, selectedWave }: ConflictGlobeProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const globeRef = useRef<any>(null);
  const globeInitialized = useRef(false);
  const prevStrikesRef = useRef<string>("");
  const prevBasesRef = useRef<string>("");
  const prevNukesRef = useRef<string>("");
  const prevWaveIdRef = useRef<string>("");
  const resumeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // FIX 4: Initialize globe ONCE on mount
  useEffect(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;
    let destroyed = false;

    container.innerHTML = "";

    import("globe.gl").then((mod) => {
      const Globe = mod.default as any; // eslint-disable-line @typescript-eslint/no-explicit-any
      if (destroyed) return;

      const globe = Globe()
        .globeImageUrl("//unpkg.com/three-globe/example/img/earth-night.jpg")
        .bumpImageUrl("//unpkg.com/three-globe/example/img/earth-topology.png")
        .backgroundImageUrl("//unpkg.com/three-globe/example/img/night-sky.png")
        .showAtmosphere(true)
        .atmosphereColor("#00d4aa")
        .atmosphereAltitude(0.15)
        .pointOfView({ lat: 30, lng: 50, altitude: 1.8 })
        // FIX 1: Disable all transition animations — prevents flash loop
        .pointsMerge(true)
        .pointsTransitionDuration(0)
        .arcsTransitionDuration(0)
        .labelsTransitionDuration(0)(container);

      globeRef.current = globe;
      globeInitialized.current = true;

      // FIX 3: Auto-rotate with interaction stop/resume
      globe.controls().autoRotate = true;
      globe.controls().autoRotateSpeed = 0.15;
      globe.controls().enableZoom = true;
      globe.controls().minDistance = 150;
      globe.controls().maxDistance = 600;

      // Stop auto-rotate when user interacts
      globe.controls().addEventListener("start", () => {
        globe.controls().autoRotate = false;
        if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current);
      });

      // Resume auto-rotate after 10 seconds of no interaction
      globe.controls().addEventListener("end", () => {
        if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current);
        resumeTimerRef.current = setTimeout(() => {
          if (globeRef.current) {
            globeRef.current.controls().autoRotate = true;
          }
        }, 10000);
      });

      // Handle resize
      const handleResize = () => {
        if (container.isConnected && globeRef.current) {
          globeRef.current.width(container.clientWidth);
          globeRef.current.height(container.clientHeight);
        }
      };
      window.addEventListener("resize", handleResize);
      handleResize();

      (container as any)._resizeCleanup = () => {
        window.removeEventListener("resize", handleResize);
      };
    });

    // FIX 5: Cleanup on unmount
    return () => {
      destroyed = true;
      if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current);
      if (globeRef.current) {
        try {
          globeRef.current.controls().autoRotate = false;
          globeRef.current.pointsData([]);
          globeRef.current.arcsData([]);
          globeRef.current.ringsData([]);
          globeRef.current.labelsData([]);
        } catch (_) { /* globe may already be disposed */ }
      }
      if ((container as any)?._resizeCleanup) {
        (container as any)._resizeCleanup();
      }
      container.innerHTML = "";
      globeRef.current = null;
      globeInitialized.current = false;
      prevStrikesRef.current = "";
      prevBasesRef.current = "";
      prevNukesRef.current = "";
      prevWaveIdRef.current = "";
    };
  }, []);

  // FIX 1: Update strike points ONLY when data actually changes
  useEffect(() => {
    if (!globeRef.current) return;

    const strikesHash = JSON.stringify(strikes.map((s) => `${s.lat},${s.lng}`));
    if (strikesHash === prevStrikesRef.current) return;
    prevStrikesRef.current = strikesHash;

    const strikePoints = strikes
      .filter((s) => s.lat && s.lng)
      .map((s) => ({
        lat: s.lat,
        lng: s.lng,
        size: 0.06,
        color: getStrikeColor(s.attacker || ""),
        name: s.target || s.location || "Strike",
        attacker: s.attacker || "Unknown",
        date: s.date || "",
      }));

    globeRef.current
      .pointsData(strikePoints)
      .pointLat("lat")
      .pointLng("lng")
      .pointAltitude("size")
      .pointRadius(0.06)
      .pointColor("color")
      .pointLabel(
        (d: any) => `
        <div style="font-family:Rajdhani,sans-serif;font-size:13px;font-weight:600;color:#e6edf3;text-shadow:0 0 4px rgba(0,0,0,0.8)">
          ${d.name}
        </div>
        <div style="font-family:'Inconsolata',monospace;font-size:10px;color:${d.color}">
          ${d.attacker}${d.date ? " — " + new Date(d.date).toLocaleDateString() : ""}
        </div>
      `
      )
      .onPointClick((d: any) => {
        globeRef.current.pointOfView({ lat: d.lat, lng: d.lng, altitude: 0.5 }, 1000);
      });
  }, [strikes]);

  // Update military bases ONLY when data changes
  useEffect(() => {
    if (!globeRef.current) return;

    const basesHash = JSON.stringify(militaryBases.map((b) => `${b.lat},${b.lng}`));
    if (basesHash === prevBasesRef.current) return;
    prevBasesRef.current = basesHash;

    const bases = militaryBases
      .filter((b) => b.lat && b.lng)
      .map((b) => {
        const side = (b.country || "").toLowerCase();
        let color: string;
        if (side.includes("us") || side.includes("america") || side.includes("coalition") || side.includes("navy")) color = "rgba(56,139,253,0.4)";
        else if (side.includes("israel") || side.includes("idf")) color = "rgba(230,237,243,0.4)";
        else if (side.includes("iran") || side.includes("irgc")) color = "rgba(232,54,74,0.4)";
        else color = "rgba(92,108,120,0.3)";
        return {
          lat: b.lat,
          lng: b.lng,
          maxR: 0.8,
          propagationSpeed: 0.4,
          repeatPeriod: 3000,
          color: () => color,
          name: b.name,
        };
      });

    globeRef.current
      .ringsData(bases)
      .ringLat("lat")
      .ringLng("lng")
      .ringMaxRadius("maxR")
      .ringPropagationSpeed("propagationSpeed")
      .ringRepeatPeriod("repeatPeriod")
      .ringColor("color");
  }, [militaryBases]);

  // Update nuclear labels ONLY when data changes
  useEffect(() => {
    if (!globeRef.current) return;

    const nukesHash = JSON.stringify(nuclearSites.map((n) => `${n.lat},${n.lng}`));
    if (nukesHash === prevNukesRef.current) return;
    prevNukesRef.current = nukesHash;

    const nukes = nuclearSites
      .filter((n) => n.lat && n.lng)
      .map((n) => ({
        lat: n.lat,
        lng: n.lng,
        text: "\u2622",
        size: 1.0,
        color: "#ffb020",
        name: n.name || "Nuclear Site",
        status: n.status || "",
      }));

    globeRef.current
      .labelsData(nukes)
      .labelLat("lat")
      .labelLng("lng")
      .labelText("text")
      .labelSize("size")
      .labelColor("color")
      .labelDotRadius(0.2)
      .labelAltitude(0.01)
      .labelLabel(
        (d: any) => `
        <div style="font-family:Rajdhani,sans-serif;font-size:13px;font-weight:600;color:#ffb020">${d.name}</div>
        <div style="font-family:'Inconsolata',monospace;font-size:10px;color:#d4962a">${d.status}</div>
      `
      );
  }, [nuclearSites]);

  // FIX 2: Stabilize missile arcs — only update when wave ID changes
  useEffect(() => {
    if (!globeRef.current) return;

    if (!selectedWave || !selectedWave.targets?.length) {
      if (prevWaveIdRef.current !== "") {
        globeRef.current.arcsData([]);
        prevWaveIdRef.current = "";
      }
      return;
    }

    // Only update arcs if a DIFFERENT wave is selected
    const waveId = selectedWave.id || JSON.stringify(selectedWave.targets.map((t) => `${t.lat},${t.lng}`));
    if (waveId === prevWaveIdRef.current) return;
    prevWaveIdRef.current = waveId;

    // FIX 3: Stop auto-rotate when examining a wave
    globeRef.current.controls().autoRotate = false;
    if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current);

    const attackerKey = (selectedWave.attacker || "").toLowerCase();
    const launchEntry = Object.entries(LAUNCH_ZONES).find(([key]) => attackerKey.includes(key));
    const launchPoint = launchEntry ? launchEntry[1] : [33.0, 53.0];

    const arcs = selectedWave.targets
      .filter((t) => t.lat && t.lng)
      .map((t, idx) => ({
        startLat: launchPoint[0],
        startLng: launchPoint[1],
        endLat: t.lat,
        endLng: t.lng,
        color: [getStrikeColor(selectedWave.attacker || ""), getStrikeColor(selectedWave.attacker || "")],
        name: t.name || `Target ${idx + 1}`,
      }));

    globeRef.current
      .arcsData(arcs)
      .arcStartLat("startLat")
      .arcStartLng("startLng")
      .arcEndLat("endLat")
      .arcEndLng("endLng")
      .arcColor("color")
      .arcDashLength(0.4)
      .arcDashGap(0.2)
      .arcDashAnimateTime(2500)
      .arcStroke(0.3)
      .arcTransitionDuration(300)
      .arcLabel(
        (d: any) => `
        <div style="font-family:'Inconsolata',monospace;font-size:10px;color:#e6edf3">${d.name}</div>
      `
      );

    // Fly to target area
    const validTargets = selectedWave.targets.filter((t) => t.lat && t.lng);
    if (validTargets.length > 0) {
      const avgLat = validTargets.reduce((s, t) => s + t.lat, 0) / validTargets.length;
      const avgLng = validTargets.reduce((s, t) => s + t.lng, 0) / validTargets.length;
      globeRef.current.pointOfView({ lat: avgLat, lng: avgLng, altitude: 1.2 }, 1200);
    }
  }, [selectedWave]);

  return (
    <div className="w-full h-full relative" style={{ background: "#020408" }}>
      <div ref={containerRef} className="w-full h-full" />

      {/* HUD overlay */}
      <div
        className="absolute top-2 left-2 z-10 pointer-events-none"
        style={{
          padding: "4px 10px",
          background: "rgba(10,13,16,0.85)",
          border: "1px solid rgba(0,210,170,0.1)",
          fontFamily: "'Inconsolata', monospace",
          fontSize: "9px",
          color: "#8b949e",
          letterSpacing: "0.5px",
        }}
      >
        3D GLOBE — MIDDLE EAST THEATER
      </div>

      {/* Strike count badge */}
      <div className="absolute top-2 right-2 z-10 flex gap-1">
        <div
          style={{
            padding: "4px 10px",
            background: "rgba(232,54,74,0.06)",
            border: "1px solid rgba(232,54,74,0.12)",
            fontFamily: "'Inconsolata', monospace",
            fontSize: "9px",
            color: "#e8364a",
            letterSpacing: "0.5px",
            display: "flex",
            alignItems: "center",
            gap: 4,
          }}
        >
          <span style={{ width: 4, height: 4, borderRadius: "50%", background: "#e8364a" }} />
          {strikes.length} STRIKES
        </div>
        <div
          style={{
            padding: "4px 10px",
            background: "rgba(56,139,253,0.06)",
            border: "1px solid rgba(56,139,253,0.12)",
            fontFamily: "'Inconsolata', monospace",
            fontSize: "9px",
            color: "#388bfd",
            letterSpacing: "0.5px",
          }}
        >
          {militaryBases.length} BASES
        </div>
      </div>

      {/* Ambient glow */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-0"
        style={{
          width: 600,
          height: 600,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(0,210,170,0.02) 0%, transparent 70%)",
        }}
      />

      {/* Instructions */}
      <div
        className="absolute bottom-2 left-2 z-10 pointer-events-none"
        style={{
          fontFamily: "'Inconsolata', monospace",
          fontSize: "9px",
          color: "#7d8590",
          letterSpacing: "0.5px",
        }}
      >
        DRAG TO ROTATE — SCROLL TO ZOOM — CLICK STRIKE TO FOCUS
      </div>
    </div>
  );
}
