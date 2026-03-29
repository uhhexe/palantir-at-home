"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { usePathname } from "next/navigation";
import ConflictSidebar from "./components/ConflictSidebar";
import ConflictTimeline from "./components/ConflictTimeline";
import ConflictNewsBar from "./components/ConflictNewsBar";
import TimeSlider from "./components/TimeSlider";
import StrikeTable from "./components/StrikeTable";
import FlightsView from "./components/FlightsView";
import MaritimeView from "./components/MaritimeView";
import WavePlayer from "./components/WavePlayer";
import type { WaveEvent, CumulativeWaveTarget } from "./components/WavePlayer";
import type { ConflictStrike, ConflictLayer, InfrastructureData } from "./components/ConflictMap";

const ConflictMap = dynamic(() => import("./components/ConflictMap"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full bg-void flex items-center justify-center">
      <div className="text-text-dim text-[17px] font-heading tracking-[3px] animate-pulse uppercase">
        Initializing Conflict Map...
      </div>
    </div>
  ),
});

const ConflictGlobe = dynamic(() => import("./components/ConflictGlobe"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full bg-void flex items-center justify-center">
      <div className="text-text-dim text-[17px] font-heading tracking-[3px] animate-pulse uppercase">
        Initializing 3D Globe...
      </div>
    </div>
  ),
});

// Conflict start date: Feb 28, 2026
const CONFLICT_START = new Date("2026-02-28T04:00:00Z");

const DEFAULT_LAYERS: ConflictLayer[] = [
  // Strike layers
  { id: "us-strikes", name: "US/Coalition Strikes", enabled: true, color: "#388bfd" },
  { id: "israel-strikes", name: "Israeli Strikes", enabled: true, color: "#e6edf3" },
  { id: "iran-strikes", name: "Iranian Strikes", enabled: true, color: "#e8364a" },
  { id: "houthi-strikes", name: "Houthi Strikes", enabled: true, color: "#d4962a" },
  { id: "hezbollah-strikes", name: "Hezbollah Strikes", enabled: false, color: "#c8b832" },
  // Military
  { id: "us-bases", name: "US/IDF Bases", enabled: true, color: "#388bfd" },
  { id: "iran-bases", name: "Iran/IRGC Bases", enabled: true, color: "#e8364a" },
  { id: "nuclear", name: "Nuclear Facilities", enabled: true, color: "#ffb020" },
  { id: "air-defense", name: "Air Defense Systems", enabled: true, count: 8, color: "#00d4aa" },
  // Infrastructure
  { id: "pipelines", name: "Oil/Gas Pipelines", enabled: false, color: "#d4962a" },
  { id: "oil-facilities", name: "Oil/Gas Facilities", enabled: true, count: 10, color: "#d4962a" },
  { id: "desalination", name: "Desalination Plants", enabled: false, count: 5, color: "#388bfd" },
  { id: "chokepoints", name: "Chokepoints", enabled: true, count: 3, color: "#e8364a" },
  // Maritime & Airspace
  { id: "sea-lanes", name: "Sea Lanes / Ports", enabled: false, color: "#388bfd" },
  { id: "airspace", name: "Closed Airspace", enabled: false, count: 5, color: "#e8364a" },
  // Live Tracking
  { id: "live-flights", name: "Live Aircraft", enabled: false, color: "#00d4aa" },
  { id: "mil-only", name: "Military Only", enabled: false, color: "#ff2a6d" },
  // Reference
  { id: "borders", name: "Country Borders", enabled: true, color: "#344050" },
];

interface ConflictEvent {
  id: number;
  date: string;
  type: string;
  actor: string;
  title: string;
  detail: string;
  severity: string;
}

interface NewsItem {
  title: string;
  link: string;
  date: string;
  description: string;
  source: string;
}

export default function IranIsraelConflict() {
  const pathname = usePathname();
  const [layers, setLayers] = useState<ConflictLayer[]>(DEFAULT_LAYERS);
  const [strikes, setStrikes] = useState<ConflictStrike[]>([]);
  const [militaryBases, setMilitaryBases] = useState<{ usa: never[]; idf: never[]; carriers: never[] }>({ usa: [], idf: [], carriers: [] });
  const [nuclearSites, setNuclearSites] = useState<{ iran: never[] }>({ iran: [] });
  const [countriesGeo, setCountriesGeo] = useState<GeoJSON.FeatureCollection | null>(null);
  const [events, setEvents] = useState<ConflictEvent[]>([]);
  const [news, setNews] = useState<NewsItem[]>([]);
  const [infrastructure, setInfrastructure] = useState<InfrastructureData | null>(null);
  const [time, setTime] = useState({ local: "", utc: "" });
  const [viewMode, setViewMode] = useState<"map" | "table" | "flights" | "maritime" | "globe">("map");
  const [dateRange, setDateRange] = useState<{ start: string; end: string } | null>(null);
  const [waves, setWaves] = useState<WaveEvent[]>([]);
  const [selectedWaveId, setSelectedWaveId] = useState<string | null>(null);
  const [selectedWaveTargets, setSelectedWaveTargets] = useState<{ lat: number; lng: number; name: string }[]>([]);
  const [cumulativeWaveTargets, setCumulativeWaveTargets] = useState<CumulativeWaveTarget[]>([]);
  const [timelinePlaying, setTimelinePlaying] = useState(false);

  // Time
  useEffect(() => {
    function tick() {
      const now = new Date();
      setTime({
        local: now.toLocaleTimeString("en-US", { hour12: false }),
        utc: now.toUTCString().split(" ")[4],
      });
    }
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  const conflictDay = useMemo(() => {
    const now = new Date();
    return Math.floor((now.getTime() - CONFLICT_START.getTime()) / 86400000);
  }, []);

  const toggleLayer = useCallback((id: string) => {
    setLayers((prev) =>
      prev.map((l) => (l.id === id ? { ...l, enabled: !l.enabled } : l))
    );
  }, []);

  // Fetch static data
  useEffect(() => {
    // Strikes
    fetch("/api/conflict/strikes")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setStrikes(data);
          // Update layer counts
          const counts: Record<string, number> = {};
          data.forEach((s: ConflictStrike) => {
            const layerMap: Record<string, string> = {
              US: "us-strikes", ISRAEL: "israel-strikes", IRAN: "iran-strikes",
              HOUTHI: "houthi-strikes", HEZBOLLAH: "hezbollah-strikes",
            };
            const lid = layerMap[s.attacker];
            if (lid) counts[lid] = (counts[lid] || 0) + 1;
          });
          setLayers((prev) =>
            prev.map((l) => (counts[l.id] !== undefined ? { ...l, count: counts[l.id] } : l))
          );
        }
      })
      .catch(() => {});

    // Military bases
    fetch("/data/conflict/military-bases.json")
      .then((r) => r.json())
      .then((data) => setMilitaryBases(data))
      .catch(() => {});

    // Nuclear sites
    fetch("/data/conflict/nuclear-sites.json")
      .then((r) => r.json())
      .then((data) => setNuclearSites(data))
      .catch(() => {});

    // Country borders
    fetch("/data/conflict/countries.geojson")
      .then((r) => r.json())
      .then((data) => setCountriesGeo(data))
      .catch(() => {});

    // Conflict events
    fetch("/data/conflict/conflict-events.json")
      .then((r) => r.json())
      .then((data) => { if (Array.isArray(data)) setEvents(data); })
      .catch(() => {});

    // Infrastructure data
    fetch("/data/conflict/infrastructure.json")
      .then((r) => r.json())
      .then((data) => setInfrastructure(data))
      .catch(() => {});

    // Wave data
    fetch("/data/conflict/waves.json")
      .then((r) => r.json())
      .then((data) => { if (Array.isArray(data)) setWaves(data); })
      .catch(() => {});
  }, []);

  // Fetch live data (news) + auto-refresh every 5 minutes
  useEffect(() => {
    function fetchNews() {
      fetch("/api/conflict/news")
        .then((r) => r.json())
        .then((data) => { if (Array.isArray(data)) setNews(data); })
        .catch(() => {});
    }
    fetchNews();
    const id = setInterval(fetchNews, 300000);
    return () => clearInterval(id);
  }, []);

  const totalStrikes = strikes.length;

  // Date bounds for time slider
  const dateBounds = useMemo(() => {
    if (strikes.length === 0) return { min: "2024-01-01", max: "2026-03-28" };
    const dates = strikes.map((s) => s.date?.slice(0, 10) || "").filter(Boolean).sort();
    return { min: dates[0] || "2024-01-01", max: dates[dates.length - 1] || "2026-03-28" };
  }, [strikes]);

  // Strike counts per day and per attacker per day (for TimeSlider bar chart)
  const { strikeCounts, attackerCounts } = useMemo(() => {
    const sc: Record<string, number> = {};
    const ac: Record<string, Record<string, number>> = {};
    strikes.forEach((s) => {
      const day = s.date?.slice(0, 10);
      if (!day) return;
      sc[day] = (sc[day] || 0) + 1;
      if (!ac[day]) ac[day] = {};
      ac[day][s.attacker] = (ac[day][s.attacker] || 0) + 1;
    });
    return { strikeCounts: sc, attackerCounts: ac };
  }, [strikes]);

  // Filter strikes by date range
  const filteredStrikes = useMemo(() => {
    if (!dateRange) return strikes;
    return strikes.filter((s) => {
      const d = s.date?.slice(0, 10);
      if (!d) return true;
      return d >= dateRange.start && d <= dateRange.end;
    });
  }, [strikes, dateRange]);

  const handleRangeChange = useCallback((start: string, end: string) => {
    setDateRange({ start, end });
  }, []);

  const handleWaveSelect = useCallback((wave: WaveEvent | null) => {
    if (wave) {
      setSelectedWaveId(wave.id);
      setSelectedWaveTargets(wave.targets.map((t) => ({ lat: t.lat, lng: t.lng, name: t.name })));
    } else {
      setSelectedWaveId(null);
      setSelectedWaveTargets([]);
    }
  }, []);

  const handleCumulativeChange = useCallback((targets: CumulativeWaveTarget[]) => {
    setCumulativeWaveTargets(targets);
  }, []);

  // Memoize globe props so they don't change every render (clock ticks every 1s)
  const globeBases = useMemo(() => [
    ...(militaryBases.usa || []).map((b: any) => ({ lat: b.lat, lng: b.lng, name: b.name, country: "US" })),
    ...(militaryBases.idf || []).map((b: any) => ({ lat: b.lat, lng: b.lng, name: b.name, country: "Israel" })),
    ...(militaryBases.carriers || []).map((b: any) => ({ lat: b.lat, lng: b.lng, name: b.name, country: "US Navy" })),
  ], [militaryBases]);

  const globeNuclearSites = useMemo(() =>
    (nuclearSites.iran || []).map((n: any) => ({ lat: n.lat, lng: n.lng, name: n.name, status: n.status || "" })),
  [nuclearSites]);

  const selectedWaveObj = useMemo(() =>
    waves.find((w) => w.id === selectedWaveId) || null,
  [waves, selectedWaveId]);

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-void">
      {/* Top bar */}
      <div className="h-[42px] bg-surface border-b border-border flex items-center justify-between px-4 shrink-0 select-none relative">
        <div
          className="absolute top-0 left-0 right-0 h-px"
          style={{ background: "linear-gradient(to right, transparent 50%, rgba(232,54,74,0.3) 100%)" }}
        />

        {/* Left: Brand + workspace tabs */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 bg-accent" />
            <span className="font-[family-name:var(--font-handwritten)] text-[26px] font-bold text-accent leading-none -mb-0.5">
              palantir at home
            </span>
          </div>
          <div className="flex items-center gap-0.5 ml-2">
            <Link
              href="/"
              className={`px-2.5 py-0.5 font-heading text-[15px] tracking-[2px] uppercase transition-colors ${
                pathname === "/"
                  ? "text-accent border-b border-accent"
                  : "text-text-muted hover:text-text-dim"
              }`}
            >
              Mainland
            </Link>
            <Link
              href="/conflict/iran-israel"
              className={`px-2.5 py-0.5 font-heading text-[15px] tracking-[2px] uppercase transition-colors ${
                pathname?.startsWith("/conflict")
                  ? "text-danger border-b border-danger"
                  : "text-text-muted hover:text-text-dim"
              }`}
            >
              Iran / Israel
            </Link>
          </div>
        </div>

        {/* Center: Stats + View Toggle */}
        <div className="flex items-center gap-3 text-[16px] font-mono text-text-dim">
          <div className="flex items-center border border-border">
            {(["map", "globe", "table", "flights", "maritime"] as const).map((mode, i, arr) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={`px-2 py-0.5 text-[14px] font-heading tracking-[1.5px] uppercase transition-colors ${
                  viewMode === mode
                    ? "bg-danger/20 text-danger"
                    : "text-text-muted hover:text-text-dim"
                } ${i < arr.length - 1 ? "border-r border-border" : ""}`}
              >
                {mode}
              </button>
            ))}
          </div>
          <span className="text-text-muted">|</span>
          <span>
            <span className="text-white">{filteredStrikes.length}</span>{filteredStrikes.length !== totalStrikes ? `/${totalStrikes}` : ""} STRIKES
          </span>
          <span className="text-text-muted">|</span>
          <span>
            D+<span className="text-danger">{conflictDay}</span>
          </span>
          <span className="text-text-muted">|</span>
          <span className="text-danger">ACTIVE CONFLICT</span>
        </div>

        {/* Right: Time */}
        <div className="flex items-center gap-3 text-[16px] font-mono">
          <div className="flex items-center gap-1.5">
            <div className="w-1 h-1 bg-danger animate-pulse" />
            <span className="text-text-dim">LIVE</span>
          </div>
          <span className="text-text-muted">|</span>
          <span className="text-text-dim">{time.local}</span>
          <span className="text-danger">{time.utc} UTC</span>
        </div>
      </div>

      {/* Main content */}
      <div className="flex flex-1 overflow-hidden">
        <ConflictSidebar
          layers={layers}
          onToggleLayer={toggleLayer}
          conflictDay={conflictDay}
          totalStrikes={totalStrikes}
        />

        <div className="flex-1 flex flex-col overflow-hidden">
          <main className="flex-1 overflow-hidden">
            {viewMode === "map" && (
              <ConflictMap
                layers={layers}
                strikes={filteredStrikes}
                militaryBases={militaryBases}
                nuclearSites={nuclearSites}
                countriesGeo={countriesGeo}
                infrastructure={infrastructure}
                waveTargets={selectedWaveTargets}
                cumulativeWaveTargets={cumulativeWaveTargets}
              />
            )}
            {viewMode === "globe" && (
              <ConflictGlobe
                strikes={filteredStrikes}
                militaryBases={globeBases}
                nuclearSites={globeNuclearSites}
                selectedWave={selectedWaveObj}
              />
            )}
            {viewMode === "table" && <StrikeTable strikes={filteredStrikes} />}
            {viewMode === "flights" && <FlightsView />}
            {viewMode === "maritime" && <MaritimeView />}
          </main>

          {/* Wave player — for map and globe modes */}
          {(viewMode === "map" || viewMode === "globe") && waves.length > 0 && (
            <WavePlayer
              waves={waves}
              onWaveSelect={handleWaveSelect}
              onCumulativeChange={handleCumulativeChange}
              selectedWaveId={selectedWaveId}
            />
          )}

          {/* Time slider — only show for map/table modes */}
          {(viewMode === "map" || viewMode === "table") && strikes.length > 0 && (
            <TimeSlider
              minDate={dateBounds.min}
              maxDate={dateBounds.max}
              onRangeChange={handleRangeChange}
              strikeCounts={strikeCounts}
              attackerCounts={attackerCounts}
              playing={timelinePlaying}
              onPlayingChange={setTimelinePlaying}
            />
          )}
        </div>

        <ConflictTimeline events={events} news={news} />
      </div>

      <ConflictNewsBar news={news} conflictDay={conflictDay} />
    </div>
  );
}
