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
import TodayView from "./components/TodayView";
import WavePlayer from "./components/WavePlayer";
import type { WaveEvent, CumulativeWaveTarget } from "./components/WavePlayer";
import type { ConflictStrike, ConflictLayer, InfrastructureData, LebanonTarget, LebanonMilitary, HezbollahStrike, HouthiData, IraqData, LeadershipLeader, EnergyStrike, NotableIncident, OrefAlert, FirmsPoint, AcledEvent } from "./components/ConflictMap";
import LeadershipPanel from "./components/LeadershipPanel";
import type { LeadershipData } from "./components/LeadershipPanel";
import LeadershipDossier from "./components/LeadershipDossier";
import CasualtyPanel from "./components/CasualtyPanel";
import type { CasualtyData } from "./components/CasualtyPanel";
import ClaimsTracker from "./components/ClaimsTracker";
import type { ClaimsData } from "./components/ClaimsTracker";
import WeaponsPanel from "./components/WeaponsPanel";
import type { WeaponsData } from "./components/WeaponsPanel";
import EconomicDashboard from "./components/EconomicDashboard";
import type { EconomicData } from "./components/EconomicDashboard";

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

const LAST_VISIT_KEY = "palantir_last_visit";

function formatTimeAgo(date: Date): string {
  const secs = Math.floor((Date.now() - date.getTime()) / 1000);
  if (secs < 60) return `${secs}s ago`;
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  return `${Math.floor(mins / 60)}h ago`;
}

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
  { id: "range-rings", name: "Defense Range Rings", enabled: false, color: "#22f5b0" },
  // Casualties
  { id: "notable-incidents", name: "Notable Incidents", enabled: true, color: "#d06090" },
  // Live Data Sources
  { id: "oref-alerts", name: "OREF Red Alerts", enabled: true, color: "#ff0000" },
  { id: "firms-fires", name: "FIRMS Thermal", enabled: true, color: "#ff8800" },
  { id: "acled-events", name: "ACLED Events", enabled: false, color: "#388bfd" },
  // Energy War
  { id: "energy-strikes", name: "Energy Strike Events", enabled: true, color: "#d4962a" },
  // Infrastructure
  { id: "pipelines", name: "Oil/Gas Pipelines", enabled: false, color: "#d4962a" },
  { id: "oil-facilities", name: "Oil/Gas Facilities", enabled: true, count: 10, color: "#d4962a" },
  { id: "desalination", name: "Desalination Plants", enabled: false, count: 5, color: "#388bfd" },
  { id: "chokepoints", name: "Chokepoints", enabled: true, count: 3, color: "#e8364a" },
  // Leadership
  { id: "leaders-eliminated", name: "Eliminated Leaders", enabled: true, count: 22, color: "#e8364a" },
  { id: "leaders-surviving", name: "Surviving Leaders", enabled: true, count: 6, color: "#00d4aa" },
  // Multi-Theater
  { id: "lebanon-targets", name: "Lebanon Targets", enabled: true, color: "#c8b832" },
  { id: "lebanon-military", name: "Lebanon Military", enabled: true, color: "#c8b832" },
  { id: "houthi-positions", name: "Houthi Positions", enabled: true, color: "#d4962a" },
  { id: "shipping-attacks", name: "Shipping Attacks", enabled: true, color: "#d4962a" },
  { id: "shipping-lanes-houthi", name: "Red Sea Lanes", enabled: false, color: "#d4962a" },
  { id: "iraq-bases", name: "Iraq US Bases", enabled: true, color: "#388bfd" },
  { id: "iraq-proxy", name: "Iraq Proxy Attacks", enabled: true, color: "#e8364a" },
  // Maritime & Airspace
  { id: "sea-lanes", name: "Sea Lanes / Ports", enabled: false, color: "#388bfd" },
  { id: "airspace", name: "Closed Airspace", enabled: false, count: 5, color: "#e8364a" },
  // Live Tracking
  { id: "live-flights", name: "Live Aircraft", enabled: false, color: "#00d4aa" },
  { id: "mil-only", name: "Military Only", enabled: false, color: "#ff2a6d" },
  // Reference
  { id: "borders", name: "Country Borders", enabled: true, color: "#7d8590" },
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
  const [lebanonTargets, setLebanonTargets] = useState<LebanonTarget[]>([]);
  const [lebanonMilitary, setLebanonMilitary] = useState<LebanonMilitary[]>([]);
  const [hezbollahStrikes, setHezbollahStrikes] = useState<HezbollahStrike[]>([]);
  const [houthiData, setHouthiData] = useState<HouthiData | null>(null);
  const [iraqData, setIraqData] = useState<IraqData | null>(null);
  const [leadershipData, setLeadershipData] = useState<LeadershipData | null>(null);
  const [energyStrikes, setEnergyStrikes] = useState<EnergyStrike[]>([]);
  const [casualtyData, setCasualtyData] = useState<CasualtyData | null>(null);
  const [claimsData, setClaimsData] = useState<ClaimsData | null>(null);
  const [weaponsData, setWeaponsData] = useState<WeaponsData | null>(null);
  const [economicData, setEconomicData] = useState<EconomicData | null>(null);
  const [notableIncidents, setNotableIncidents] = useState<NotableIncident[]>([]);
  const [orefAlerts, setOrefAlerts] = useState<OrefAlert[]>([]);
  const [orefHistory, setOrefHistory] = useState<(OrefAlert & { timestamp?: string; id?: string })[]>([]);
  const [orefAreaCoords, setOrefAreaCoords] = useState<Record<string, [number, number]>>({});
  const [firmsPoints, setFirmsPoints] = useState<FirmsPoint[]>([]);
  const [acledEvents, setAcledEvents] = useState<AcledEvent[]>([]);
  const [internetStatus, setInternetStatus] = useState<{ name: string; code: string; connectivity: number; status: string; note: string; color: string }[]>([]);
  const [time, setTime] = useState({ local: "", utc: "" });
  const [viewMode, setViewMode] = useState<"map" | "table" | "flights" | "maritime" | "globe" | "today" | "leaders" | "casualties" | "claims" | "weapons" | "econ">("map");
  const [dateRange, setDateRange] = useState<{ start: string; end: string } | null>(null);
  const [waves, setWaves] = useState<WaveEvent[]>([]);
  const [selectedWaveId, setSelectedWaveId] = useState<string | null>(null);
  const [selectedWaveTargets, setSelectedWaveTargets] = useState<{ lat: number; lng: number; name: string }[]>([]);
  const [cumulativeWaveTargets, setCumulativeWaveTargets] = useState<CumulativeWaveTarget[]>([]);
  const [timelinePlaying, setTimelinePlaying] = useState(false);
  const [lastStrikeRefresh, setLastStrikeRefresh] = useState<Date>(new Date());
  const [isRefreshingStrikes, setIsRefreshingStrikes] = useState(false);
  const [newEventsCount, setNewEventsCount] = useState(0);
  const [dataSources, setDataSources] = useState<Record<string, { status: string; count?: number }> | null>(null);
  const [dataLastUpdate, setDataLastUpdate] = useState<string | null>(null);

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

  // Strike fetch function (reusable for auto-refresh)
  const fetchStrikes = useCallback(async () => {
    try {
      const r = await fetch("/data/conflict/strikes.json");
      const data = await r.json();
      if (Array.isArray(data)) {
        setStrikes(data);
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
        setLastStrikeRefresh(new Date());
      }
    } catch {}
  }, []);

  const handleManualRefresh = useCallback(async () => {
    setIsRefreshingStrikes(true);
    await fetchStrikes();
    setIsRefreshingStrikes(false);
  }, [fetchStrikes]);

  // New events counter — check localStorage on strikes load
  useEffect(() => {
    if (strikes.length === 0) return;
    try {
      const stored = localStorage.getItem(LAST_VISIT_KEY);
      const last = stored ? new Date(stored) : new Date(Date.now() - 86400000);
      const count = strikes.filter(s => {
        if (!s.date) return false;
        return new Date(s.date) > last;
      }).length;
      setNewEventsCount(count);
      localStorage.setItem(LAST_VISIT_KEY, new Date().toISOString());
    } catch {}
  }, [strikes]);

  // Auto-refresh strikes every 5 minutes
  useEffect(() => {
    const id = setInterval(fetchStrikes, 300000);
    return () => clearInterval(id);
  }, [fetchStrikes]);

  // Check live data sources for freshness metadata
  useEffect(() => {
    fetch("/api/conflict/live-strikes")
      .then((r) => r.json())
      .then((data) => {
        if (data.sources) setDataSources(data.sources);
        if (data.timestamp) setDataLastUpdate(data.timestamp);
      })
      .catch(() => {});
  }, []);

  // Fetch static data
  useEffect(() => {
    // Strikes (initial)
    fetchStrikes();

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

    // Multi-theater data
    fetch("/data/conflict/lebanon-targets.json")
      .then((r) => r.json())
      .then((data) => { if (Array.isArray(data)) setLebanonTargets(data); })
      .catch(() => {});
    fetch("/data/conflict/lebanon-military.json")
      .then((r) => r.json())
      .then((data) => { if (Array.isArray(data)) setLebanonMilitary(data); })
      .catch(() => {});
    fetch("/data/conflict/hezbollah-strikes.json")
      .then((r) => r.json())
      .then((data) => { if (Array.isArray(data)) setHezbollahStrikes(data); })
      .catch(() => {});
    fetch("/data/conflict/houthi-data.json")
      .then((r) => r.json())
      .then((data) => setHouthiData(data))
      .catch(() => {});
    fetch("/data/conflict/iraq-data.json")
      .then((r) => r.json())
      .then((data) => setIraqData(data))
      .catch(() => {});

    // Leadership data
    fetch("/data/conflict/leadership.json")
      .then((r) => r.json())
      .then((data) => setLeadershipData(data))
      .catch(() => {});

    // Energy strikes
    fetch("/data/conflict/energy-strikes.json")
      .then((r) => r.json())
      .then((data) => {
        if (data?.escalationTimeline) {
          setEnergyStrikes(data.escalationTimeline);
          setLayers((prev) =>
            prev.map((l) => l.id === "energy-strikes" ? { ...l, count: data.escalationTimeline.filter((e: EnergyStrike) => e.lat).length } : l)
          );
        }
      })
      .catch(() => {});

    // Casualty data
    fetch("/data/conflict/casualties.json")
      .then((r) => r.json())
      .then((data: CasualtyData) => {
        setCasualtyData(data);
        if (data.notableIncidents) {
          setNotableIncidents(data.notableIncidents);
          setLayers((prev) =>
            prev.map((l) => l.id === "notable-incidents" ? { ...l, count: data.notableIncidents.length } : l)
          );
        }
      })
      .catch(() => {});

    // Claims tracker data
    fetch("/data/conflict/claims-tracker.json")
      .then((r) => r.json())
      .then((data: ClaimsData) => setClaimsData(data))
      .catch(() => {});

    // Weapons data
    fetch("/data/conflict/weapons.json")
      .then((r) => r.json())
      .then((data: WeaponsData) => setWeaponsData(data))
      .catch(() => {});

    // Economic data
    fetch("/data/conflict/economic-impact.json")
      .then((r) => r.json())
      .then((data: EconomicData) => setEconomicData(data))
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

  // OREF Red Alerts — poll every 10s
  useEffect(() => {
    function fetchOref() {
      fetch("/api/conflict/oref-alerts")
        .then((r) => r.json())
        .then((data) => {
          if (data.active) {
            setOrefAlerts(data.active);
            setLayers((prev) =>
              prev.map((l) => l.id === "oref-alerts" ? { ...l, count: data.activeCount || data.active.length } : l)
            );
          }
          if (data.history) setOrefHistory(data.history);
          if (data.areaCoords) setOrefAreaCoords(data.areaCoords);
        })
        .catch(() => {});
    }
    fetchOref();
    const id = setInterval(fetchOref, 10000);
    return () => clearInterval(id);
  }, []);

  // NASA FIRMS — refresh every 15min
  useEffect(() => {
    function fetchFirms() {
      fetch("/api/conflict/firms?theater=iran")
        .then((r) => r.json())
        .then((data) => {
          if (data.fires) {
            setFirmsPoints(data.fires);
            setLayers((prev) =>
              prev.map((l) => l.id === "firms-fires" ? { ...l, count: data.count || data.fires.length } : l)
            );
          }
        })
        .catch(() => {});
    }
    fetchFirms();
    const id = setInterval(fetchFirms, 900000);
    return () => clearInterval(id);
  }, []);

  // ACLED events — refresh every hour
  useEffect(() => {
    function fetchAcled() {
      fetch("/api/conflict/acled?theater=iran")
        .then((r) => r.json())
        .then((data) => {
          if (data.events) {
            setAcledEvents(data.events);
            setLayers((prev) =>
              prev.map((l) => l.id === "acled-events" ? { ...l, count: data.count || data.events.length } : l)
            );
          }
        })
        .catch(() => {});
    }
    fetchAcled();
    const id = setInterval(fetchAcled, 3600000);
    return () => clearInterval(id);
  }, []);

  // Internet status — refresh every 5min
  useEffect(() => {
    function fetchInternet() {
      fetch("/api/conflict/internet-status")
        .then((r) => r.json())
        .then((data) => {
          if (data.countries) {
            // Filter to Iran theater countries
            const iranTheater = ["IR", "IL", "LB", "QA", "AE", "IQ"];
            setInternetStatus(data.countries.filter((c: { code: string }) => iranTheater.includes(c.code)));
          }
        })
        .catch(() => {});
    }
    fetchInternet();
    const id = setInterval(fetchInternet, 300000);
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

  const casualtySummary = useMemo(() => {
    if (!casualtyData) return null;
    const gulf = casualtyData.gulfStateDeaths;
    const gulfKilled = gulf.uae.killed + gulf.saudi.killed + gulf.bahrain.killed + (gulf.qatar.killed || 0);
    return {
      iranRange: "800 \u2014 5,300 killed",
      usTotal: casualtyData.usDeaths.total_including_accidents,
      usKia: casualtyData.usDeaths.killed_by_enemy_fire,
      israelKilled: casualtyData.israelDeaths.killed,
      gulfKilled,
      iraqKilled: casualtyData.bySource.alJazeera.iraq.killed,
    };
  }, [casualtyData]);

  const claimsSummary = useMemo(() => {
    if (!claimsData) return null;
    const c = claimsData.claims;
    const confirmed = c.filter(x => x.verdict === "CONFIRMED").length;
    const partiallyTrue = c.filter(x => x.verdict === "PARTIALLY TRUE").length;
    const misleading = c.filter(x => x.verdict === "MISLEADING").length;
    const exaggerated = c.filter(x => x.verdict === "EXAGGERATED" || x.verdict === "EXAGGERATED BUT SUBSTANTIVE").length;
    const unverified = c.filter(x => x.verdict.includes("UNVERIFIED")).length;
    const falseCount = c.filter(x => x.verdict.includes("FALSE")).length;
    const admissions = c.filter(x => x.verdict === "SIGNIFICANT ADMISSION").length;
    const hypocritical = c.filter(x => x.verdict === "HYPOCRITICAL").length;
    const other = c.length - confirmed - partiallyTrue - misleading - exaggerated - unverified - falseCount - admissions - hypocritical;
    return { total: c.length, confirmed, partiallyTrue, misleading, exaggerated, unverified, falseCount, admissions, hypocritical, other };
  }, [claimsData]);

  const weaponsRangeRings = useMemo(() => {
    if (!weaponsData) return undefined;
    return weaponsData.airDefenseSystems
      .filter(s => s.deployed_at.length > 0 && s.range_km > 0)
      .map(s => ({
        name: s.name,
        range_km: s.range_km,
        color: s.color,
        deployed_at: s.deployed_at,
      }));
  }, [weaponsData]);

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
      {/* New events badge */}
      {newEventsCount > 0 && (
        <div
          onClick={() => setNewEventsCount(0)}
          className="fixed top-[52px] right-4 z-[1000] flex items-center gap-1.5 px-3 py-1.5 bg-danger/12 border border-danger/25 cursor-pointer font-mono animate-[badge-pulse_2s_ease-in-out_3]"
        >
          <span className="flex items-center justify-center w-[18px] h-[18px] bg-danger rounded-full text-[10px] font-bold text-white">
            {newEventsCount > 99 ? "99+" : newEventsCount}
          </span>
          <span className="text-[9px] text-danger tracking-[0.5px]">
            NEW EVENT{newEventsCount !== 1 ? "S" : ""} SINCE LAST VISIT
          </span>
          <span className="text-[8px] text-text-muted ml-1">&#10005;</span>
        </div>
      )}

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
                pathname?.startsWith("/conflict/iran")
                  ? "text-danger border-b border-danger"
                  : "text-text-muted hover:text-text-dim"
              }`}
            >
              Iran / Israel
            </Link>
            <Link
              href="/conflict/ukraine"
              className={`px-2.5 py-0.5 font-heading text-[15px] tracking-[2px] uppercase transition-colors ${
                pathname?.startsWith("/conflict/ukraine")
                  ? "text-[#005BBB] border-b border-[#005BBB]"
                  : "text-text-muted hover:text-text-dim"
              }`}
            >
              Ukraine
            </Link>
          </div>
        </div>

        {/* Center: Stats + View Toggle */}
        <div className="flex items-center gap-3 text-[16px] font-mono text-text-dim">
          <div className="flex gap-0.5 p-1 bg-[#0d1117] rounded-[6px] border border-[rgba(0,210,170,0.08)]">
            {(["today", "map", "globe", "leaders", "casualties", "claims", "weapons", "econ", "table", "flights", "maritime"] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={`px-3 py-1 rounded text-[11px] font-body tracking-[0.5px] uppercase transition-all cursor-pointer border-none ${
                  viewMode === mode
                    ? "bg-[rgba(0,210,170,0.12)] text-accent-bright font-bold shadow-[inset_0_0_0_1px_rgba(0,210,170,0.2)]"
                    : "bg-transparent text-text-dim font-medium hover:bg-[rgba(0,210,170,0.05)] hover:text-white"
                }`}
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

        {/* Right: Refresh + Time */}
        <div className="flex items-center gap-3 text-[16px] font-mono">
          <button
            onClick={handleManualRefresh}
            disabled={isRefreshingStrikes}
            className={`flex items-center gap-1 px-2 py-0.5 border border-border hover:border-border-hover text-[10px] font-heading tracking-[1px] uppercase transition-all ${
              isRefreshingStrikes ? "bg-accent/5 text-accent cursor-wait" : "text-text-muted hover:text-text-dim cursor-pointer"
            }`}
          >
            <span className={`inline-block text-[13px] ${isRefreshingStrikes ? "animate-[refresh-spin_1s_linear_infinite]" : ""}`}>&#8635;</span>
            {isRefreshingStrikes ? "UPDATING" : "REFRESH"}
            <span className="text-text-muted text-[9px] ml-1">{formatTimeAgo(lastStrikeRefresh)}</span>
          </button>
          <span className="text-text-muted">|</span>
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
          casualtySummary={casualtySummary}
          onExpandCasualties={() => setViewMode("casualties")}
          orefAlerts={orefAlerts}
          internetStatus={internetStatus}
          claimsSummary={claimsSummary}
          onExpandClaims={() => setViewMode("claims")}
          weaponsCounts={weaponsData ? {
            iranian: weaponsData.iranianOffensive.length,
            airDefense: weaponsData.airDefenseSystems.length,
            usOffensive: weaponsData.usOffensive.length,
          } : null}
          onExpandWeapons={() => setViewMode("weapons")}
          econSummary={economicData ? {
            oilCurrent: economicData.oilPrices.timeline[economicData.oilPrices.timeline.length - 1].brent,
            oilChange: economicData.oilPrices.changePercent,
            gasCurrent: economicData.gasPrices.us_average.mar_12,
            dailyCostB: "$0.8-1.0B",
          } : null}
          onExpandEcon={() => setViewMode("econ")}
          lastStrikeRefresh={lastStrikeRefresh}
          isRefreshingStrikes={isRefreshingStrikes}
          dataSources={dataSources}
          dataLastUpdate={dataLastUpdate}
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
                lebanonTargets={lebanonTargets}
                lebanonMilitary={lebanonMilitary}
                hezbollahStrikes={hezbollahStrikes}
                houthiData={houthiData}
                iraqData={iraqData}
                leadershipLeaders={leadershipData?.leaders}
                energyStrikes={energyStrikes}
                notableIncidents={notableIncidents}
                orefAlerts={orefAlerts}
                firmsPoints={firmsPoints}
                acledEvents={acledEvents}
                weaponsRangeRings={weaponsRangeRings}
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
            {viewMode === "today" && (
              <TodayView
                strikes={strikes}
                events={events}
                news={news}
                conflictDay={conflictDay}
              />
            )}
            {viewMode === "leaders" && leadershipData && (
              <LeadershipDossier
                leaders={leadershipData.leaders as any}
                onSelectLeader={(leader: any) => {
                  if (leader.lat && leader.lng) {
                    setViewMode("map");
                  }
                }}
              />
            )}
            {viewMode === "casualties" && casualtyData && (
              <CasualtyPanel data={casualtyData} />
            )}
            {viewMode === "claims" && claimsData && (
              <ClaimsTracker
                data={claimsData}
                onViewOnMap={(lat, lng) => {
                  setViewMode("map");
                }}
              />
            )}
            {viewMode === "econ" && economicData && (
              <EconomicDashboard data={economicData} />
            )}
            {viewMode === "weapons" && weaponsData && (
              <WeaponsPanel
                data={weaponsData}
                onShowRangeRings={() => {
                  setLayers(prev => prev.map(l => l.id === "range-rings" ? { ...l, enabled: true } : l));
                  setViewMode("map");
                }}
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

        <ConflictTimeline events={events} news={news} hezbollahStrikes={hezbollahStrikes} houthiData={houthiData} iraqData={iraqData} orefHistory={orefHistory} />
      </div>

      <ConflictNewsBar news={news} conflictDay={conflictDay} />
    </div>
  );
}
