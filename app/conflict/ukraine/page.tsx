"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { usePathname } from "next/navigation";
import UkraineSidebar from "./components/UkraineSidebar";
import LossesPanel from "./components/LossesPanel";
import type { DailyRecord } from "./components/LossesPanel";
import UkraineTimeline from "./components/UkraineTimeline";
import UkraineNewsBar from "./components/UkraineNewsBar";
import UkraineChat from "./components/UkraineChat";
import TodayView from "./components/TodayView";
import DronePanel from "./components/DronePanel";
import type { DroneWarfareData } from "./components/DronePanel";
import type { UkraineLayer, CityMarker, BaseMarker, FirmsPoint, AcledEvent } from "./components/UkraineMap";
import MapScreenshotButton from "./components/MapScreenshot";
import ScreenshotButton from "./components/ScreenshotButton";

const UkraineMap = dynamic(() => import("./components/UkraineMap"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full bg-void flex items-center justify-center">
      <div className="text-text-dim text-[17px] font-heading tracking-[3px] animate-pulse uppercase">
        Initializing Theater Map...
      </div>
    </div>
  ),
});

// War start: Feb 24, 2022
const WAR_START = new Date("2022-02-24T04:00:00Z");

const DEFAULT_LAYERS: UkraineLayer[] = [
  { id: "cities", name: "Cities & Control", enabled: true, color: "#005BBB" },
  { id: "frontline", name: "Frontline", enabled: true, color: "#e8364a" },
  { id: "occupied", name: "Occupied Zone", enabled: true, color: "#e8364a" },
  { id: "ua-bases", name: "UA Bases", enabled: true, color: "#005BBB" },
  { id: "ru-bases", name: "RU Bases", enabled: true, color: "#e8364a" },
  { id: "drone-launch-sites", name: "RU Launch Sites", enabled: false, color: "#e8364a" },
  { id: "drone-targets-ru", name: "UA Drone Targets", enabled: false, color: "#005BBB" },
  { id: "drone-routes", name: "Drone Routes", enabled: false, color: "#e8364a" },
  { id: "energy-ru-on-ua", name: "RU on UA Energy", enabled: false, color: "#e8364a" },
  { id: "energy-ua-on-ru", name: "UA on RU Energy", enabled: false, color: "#d4962a" },
  { id: "firms-fires", name: "FIRMS Thermal", enabled: true, color: "#ff8800" },
  { id: "acled-events", name: "ACLED Events", enabled: false, color: "#005BBB" },
  { id: "live-flights", name: "Live Aircraft", enabled: false, color: "#00d4aa" },
];

interface NewsItem {
  title: string;
  link: string;
  date: string;
  description: string;
  source: string;
}

interface EquipmentLosses {
  asOf: string;
  russia: Record<string, number>;
  oryx: Record<string, Record<string, { total: number; destroyed: number; captured: number; abandoned: number; damaged: number }>>;
}

export default function UkraineConflict() {
  const pathname = usePathname();
  const [layers, setLayers] = useState<UkraineLayer[]>(DEFAULT_LAYERS);
  const [cities, setCities] = useState<CityMarker[]>([]);
  const [bases, setBases] = useState<BaseMarker[]>([]);
  const [frontlineGeo, setFrontlineGeo] = useState<GeoJSON.FeatureCollection | null>(null);
  const [losses, setLosses] = useState<EquipmentLosses | null>(null);
  const [dailyData, setDailyData] = useState<DailyRecord[]>([]);
  const [news, setNews] = useState<NewsItem[]>([]);
  const [droneData, setDroneData] = useState<DroneWarfareData | null>(null);
  const [energyData, setEnergyData] = useState<{
    russiaOnUkraineEnergy: { totalAttacks: number; winter2025_26: { total: number; note: string }; majorTargets: { name: string; lat: number; lng: number; hits: string; status: string }[] };
    ukraineOnRussiaEnergy: { majorTargets: { name: string; lat: number; lng: number; hits: string; status: string }[] };
  } | null>(null);
  const [firmsPoints, setFirmsPoints] = useState<FirmsPoint[]>([]);
  const [acledEvents, setAcledEvents] = useState<AcledEvent[]>([]);
  const [internetStatus, setInternetStatus] = useState<{ name: string; code: string; connectivity: number; status: string; note: string; color: string }[]>([]);
  const [time, setTime] = useState({ local: "", utc: "" });
  const [viewMode, setViewMode] = useState<"map" | "losses" | "today" | "drones">("map");

  // Clock
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

  const warDay = useMemo(() => {
    return Math.floor((Date.now() - WAR_START.getTime()) / 86400000);
  }, []);

  const toggleLayer = useCallback((id: string) => {
    setLayers((prev) =>
      prev.map((l) => (l.id === id ? { ...l, enabled: !l.enabled } : l))
    );
  }, []);

  // Fetch static data
  useEffect(() => {
    fetch("/data/ukraine/cities.json")
      .then((r) => r.json())
      .then((data) => { if (Array.isArray(data)) setCities(data); })
      .catch(() => {});

    fetch("/data/ukraine/bases.json")
      .then((r) => r.json())
      .then((data) => { if (Array.isArray(data)) setBases(data); })
      .catch(() => {});

    fetch("/data/ukraine/frontline.geojson")
      .then((r) => r.json())
      .then((data) => setFrontlineGeo(data))
      .catch(() => {});

    fetch("/data/ukraine/equipment-losses.json")
      .then((r) => r.json())
      .then((data) => setLosses(data))
      .catch(() => {});

    fetch("/data/ukraine/equipment-by-day.json")
      .then((r) => r.json())
      .then((data) => { if (Array.isArray(data)) setDailyData(data); })
      .catch(() => {});

    fetch("/data/ukraine/drone-warfare.json")
      .then((r) => r.json())
      .then((data) => setDroneData(data))
      .catch(() => {});

    fetch("/data/ukraine/energy-strikes.json")
      .then((r) => r.json())
      .then((data) => setEnergyData(data))
      .catch(() => {});
  }, []);

  // Fetch news + auto-refresh
  useEffect(() => {
    function fetchNews() {
      fetch("/api/conflict/ukraine-news")
        .then((r) => r.json())
        .then((data) => { if (Array.isArray(data)) setNews(data); })
        .catch(() => {});
    }
    fetchNews();
    const id = setInterval(fetchNews, 300000);
    return () => clearInterval(id);
  }, []);

  // NASA FIRMS — refresh every 15min (Ukraine region)
  useEffect(() => {
    function fetchFirms() {
      fetch("/api/conflict/firms?theater=ukraine")
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
      fetch("/api/conflict/acled?theater=ukraine")
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
            const uaTheater = ["UA", "RU"];
            setInternetStatus(data.countries.filter((c: { code: string }) => uaTheater.includes(c.code)));
          }
        })
        .catch(() => {});
    }
    fetchInternet();
    const id = setInterval(fetchInternet, 300000);
    return () => clearInterval(id);
  }, []);

  // Update layer counts
  useEffect(() => {
    setLayers((prev) =>
      prev.map((l) => {
        if (l.id === "cities") return { ...l, count: cities.length };
        if (l.id === "ua-bases") return { ...l, count: bases.filter((b) => b.side.includes("Ukraine")).length };
        if (l.id === "ru-bases") return { ...l, count: bases.filter((b) => !b.side.includes("Ukraine")).length };
        if (l.id === "drone-launch-sites") return { ...l, count: droneData?.russianDronesOnUkraine?.launchSites?.filter((s) => s.launches > 0).length };
        if (l.id === "drone-targets-ru") return { ...l, count: droneData?.ukrainianDronesOnRussia?.majorTargets?.length };
        if (l.id === "drone-routes") return { ...l, count: droneData?.droneRoutes?.length };
        if (l.id === "energy-ru-on-ua") return { ...l, count: energyData?.russiaOnUkraineEnergy?.majorTargets?.length };
        if (l.id === "energy-ua-on-ru") return { ...l, count: energyData?.ukraineOnRussiaEnergy?.majorTargets?.length };
        return l;
      })
    );
  }, [cities, bases, droneData, energyData]);

  const totalPersonnel = losses?.russia?.personnel || 0;

  const energyStats = useMemo(() => {
    if (!energyData) return null;
    return {
      ruOnUaAttacks: energyData.russiaOnUkraineEnergy.totalAttacks,
      winterStrikes: energyData.russiaOnUkraineEnergy.winter2025_26.total,
      gridCapacity: "60% capacity",
      uaOnRuTargets: energyData.ukraineOnRussiaEnergy.majorTargets.length,
    };
  }, [energyData]);

  const droneStats = useMemo(() => {
    if (!droneData) return null;
    const ru = droneData.russianDronesOnUkraine;
    const ua = droneData.ukrainianDronesOnRussia;
    return {
      interceptRate: ru.interceptRate,
      dailyProduction: ru.dailyProduction.current,
      monthlyRecord: ru.monthlyRecord.drones,
      strikeEffectiveness: ru.strikeEffectiveness.jan2026,
      uaStrikePackages: ua.summary.strikePackages_jan_mar_2026,
      uaAvgPerNight: ua.summary.avgDronesPerNight,
    };
  }, [droneData]);

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-void">
      {/* Top bar */}
      <div className="h-[42px] bg-surface border-b border-border flex items-center justify-between px-4 shrink-0 select-none relative">
        <div
          className="absolute top-0 left-0 right-0 h-px"
          style={{ background: "linear-gradient(to right, transparent 50%, rgba(0,91,187,0.3) 100%)" }}
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
              className="px-2.5 py-0.5 font-heading text-[15px] tracking-[2px] uppercase transition-colors text-text-muted hover:text-text-dim"
            >
              Mainland
            </Link>
            <Link
              href="/conflict/iran-israel"
              className="px-2.5 py-0.5 font-heading text-[15px] tracking-[2px] uppercase transition-colors text-text-muted hover:text-text-dim"
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
            {(["today", "map", "drones", "losses"] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={`px-3 py-1 rounded text-[11px] font-body tracking-[0.5px] uppercase transition-all cursor-pointer border-none ${
                  viewMode === mode
                    ? "bg-[rgba(0,100,187,0.15)] text-[#58a6ff] font-bold shadow-[inset_0_0_0_1px_rgba(0,100,187,0.3)]"
                    : "bg-transparent text-text-dim font-medium hover:bg-[rgba(0,100,187,0.05)] hover:text-white"
                }`}
              >
                {mode}
              </button>
            ))}
          </div>
          <span className="text-text-muted">|</span>
          <span>
            D+<span className="text-danger">{warDay}</span>
          </span>
          <span className="text-text-muted">|</span>
          <span>
            <span className="text-danger">{totalPersonnel ? totalPersonnel.toLocaleString() : "..."}</span> RU KIA
          </span>
          <span className="text-text-muted">|</span>
          <span className="text-danger">ACTIVE CONFLICT</span>
        </div>

        {/* Right: Time */}
        <div className="flex items-center gap-3 text-[16px] font-mono">
          <ScreenshotButton targetSelector="main" filename="palantir-at-home-ukraine" variant="icon" />
          <div className="flex items-center gap-1.5">
            <div className="w-1 h-1 bg-danger animate-pulse" />
            <span className="text-text-dim">LIVE</span>
          </div>
          <span className="text-text-muted">|</span>
          <span className="text-text-dim">{time.local}</span>
          <span className="text-[#005BBB]">{time.utc} UTC</span>
        </div>
      </div>

      {/* Main content */}
      <div className="flex flex-1 overflow-hidden">
        <UkraineSidebar
          layers={layers}
          onToggleLayer={toggleLayer}
          warDay={warDay}
          losses={losses}
          droneStats={droneStats}
          energyStats={energyStats}
          internetStatus={internetStatus}
        />

        <div className="flex-1 flex flex-col overflow-hidden">
          <main className="flex-1 overflow-hidden">
            {viewMode === "today" && (
              <TodayView
                news={news}
                losses={losses}
                dailyData={dailyData}
                warDay={warDay}
              />
            )}
            {viewMode === "map" && (
              <div className="relative w-full h-full">
                <UkraineMap
                  layers={layers}
                  cities={cities}
                  bases={bases}
                  frontlineGeo={frontlineGeo}
                  droneLaunchSites={droneData?.russianDronesOnUkraine?.launchSites}
                  droneTargetsRU={droneData?.ukrainianDronesOnRussia?.majorTargets}
                  droneRoutes={droneData?.droneRoutes}
                  energyTargetsUA={energyData?.russiaOnUkraineEnergy?.majorTargets}
                  energyTargetsRU={energyData?.ukraineOnRussiaEnergy?.majorTargets}
                  firmsPoints={firmsPoints}
                  acledEvents={acledEvents}
                />
                <MapScreenshotButton />
              </div>
            )}
            {viewMode === "drones" && droneData && (
              <DronePanel data={droneData} />
            )}
            {viewMode === "losses" && (
              <LossesPanel dailyData={dailyData} />
            )}
          </main>
        </div>

        <UkraineTimeline news={news} />
      </div>

      <UkraineNewsBar news={news} warDay={warDay} />

      {/* AI Chat overlay */}
      <UkraineChat />
    </div>
  );
}
