"use client";

import { useEffect, useRef, useCallback } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// ─── Types ───
export interface ConflictStrike {
  id: string;
  date: string;
  lat: number;
  lng: number;
  attacker: "US" | "ISRAEL" | "IRAN" | "HOUTHI" | "HEZBOLLAH" | "UNKNOWN";
  target: string;
  location: string;
  country: string;
  weaponType?: string | null;
  confidence: string;
  source: string;
  sourceUrl?: string;
  waveId?: string;
  notes?: string | null;
}

export interface MilitaryBase {
  id: string;
  name: string;
  country: string;
  lat: number;
  lng: number;
  type: string;
  assets: string;
  status: string;
  threat: string;
}

export interface NuclearSite {
  id: string;
  name: string;
  lat: number;
  lng: number;
  type: string;
  status: string;
  detail: string;
  enrichment?: string;
  threat: string;
}

export interface ConflictLayer {
  id: string;
  name: string;
  enabled: boolean;
  count?: number;
  color: string;
}

export interface InfrastructureData {
  oilFacilities: { name: string; lat: number; lng: number; country: string; type: string; status: string; notes: string }[];
  pipelines: { name: string; coords: [number, number][]; country: string; type: string; notes: string }[];
  chokepoints: { name: string; coords: [number, number][]; status: string; notes: string }[];
  desalination: { name: string; lat: number; lng: number; country: string; capacity: string; status: string }[];
  airDefense: { name: string; lat: number; lng: number; country: string; type: string; status: string; notes: string }[];
  airspace: { name: string; status: string; country: string }[];
}

// ─── Leadership Types ───
export interface LeadershipLeader {
  name: string;
  role: string;
  status: string;
  date: string | null;
  location: string;
  lat: number;
  lng: number;
  killedBy: string | null;
  details: string;
  successor?: string;
  importance: string;
}

// ─── Multi-Theater Types ───
export interface LebanonTarget {
  name: string;
  lat: number;
  lng: number;
  type: string;
  status: string;
  notes: string;
}

export interface LebanonMilitary {
  name: string;
  lat: number;
  lng: number;
  side: string;
  type: string;
  notes: string;
}

export interface HezbollahStrike {
  date: string;
  attacker: string;
  target: string;
  lat: number;
  lng: number;
  country: string;
  weaponType: string;
  notes: string;
}

export interface HouthiData {
  positions: { name: string; lat: number; lng: number; type: string; notes: string }[];
  shipping_attacks: { date: string; target: string; lat: number; lng: number; type: string; notes: string }[];
  shipping_lanes: { name: string; coordinates: [number, number][] }[];
  chokepoint_status: Record<string, { status: string; notes: string; polygon: [number, number][] }>;
}

export interface IraqData {
  us_bases: { name: string; lat: number; lng: number; side: string; type: string; notes: string }[];
  proxy_attacks: { date: string; attacker: string; target: string; lat: number; lng: number; weaponType: string; notes: string }[];
  kurdish_groups: { name: string; lat: number; lng: number; type: string; notes: string }[];
}

export interface EnergyStrike {
  date: string;
  attacker?: string;
  target: string;
  lat?: number;
  lng?: number;
  type: string;
  damage: string;
  country?: string;
  note?: string;
  event?: string;
}

export interface CumulativeWaveTarget {
  lat: number;
  lng: number;
  name: string;
  attacker: string;
  round: string;
}

export interface NotableIncident {
  date: string;
  event: string;
  killed: string;
  type: string;
  details: string;
  lat: number;
  lng: number;
}

export interface OrefAlert {
  data: string;       // city/area name
  title: string;      // alert type
  desc: string;       // description
  cat?: string;       // category
}

export interface FirmsPoint {
  lat: number;
  lng: number;
  brightness: number;
  confidence: string;
  acq_date: string;
  acq_time: string;
  satellite: string;
  frp: number;
}

export interface AcledEvent {
  event_id_cnty: string;
  event_date: string;
  event_type: string;
  sub_event_type: string;
  actor1: string;
  actor2: string;
  country: string;
  admin1: string;
  location: string;
  lat: number;
  lng: number;
  fatalities: number;
  notes: string;
}

interface ConflictMapProps {
  layers: ConflictLayer[];
  strikes: ConflictStrike[];
  militaryBases: { usa: MilitaryBase[]; idf: MilitaryBase[]; carriers: MilitaryBase[] };
  nuclearSites: { iran: NuclearSite[] };
  countriesGeo: GeoJSON.FeatureCollection | null;
  infrastructure: InfrastructureData | null;
  waveTargets?: { lat: number; lng: number; name: string }[];
  cumulativeWaveTargets?: CumulativeWaveTarget[];
  lebanonTargets?: LebanonTarget[];
  lebanonMilitary?: LebanonMilitary[];
  hezbollahStrikes?: HezbollahStrike[];
  houthiData?: HouthiData | null;
  iraqData?: IraqData | null;
  leadershipLeaders?: LeadershipLeader[];
  energyStrikes?: EnergyStrike[];
  notableIncidents?: NotableIncident[];
  orefAlerts?: OrefAlert[];
  firmsPoints?: FirmsPoint[];
  acledEvents?: AcledEvent[];
  weaponsRangeRings?: { name: string; range_km: number; color: string; deployed_at: { name: string; lat: number; lng: number }[] }[];
}

const ATTACKER_COLORS: Record<string, string> = {
  US: "#388bfd",
  ISRAEL: "#e6edf3",
  IRAN: "#e8364a",
  HOUTHI: "#d4962a",
  HEZBOLLAH: "#c8b832",
  UNKNOWN: "#8b949e",
};

const TILE_URLS: Record<string, string> = {
  dark: "https://tiles.stadiamaps.com/tiles/alidade_smooth_dark/{z}/{x}/{y}{r}.png",
  satellite: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
  topo: "https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png",
};

const OPENSEAMAP_URL = "https://tiles.openseamap.org/seamark/{z}/{x}/{y}.png";

const STATUS_COLORS: Record<string, string> = {
  DESTROYED: "#e8364a",
  DAMAGED: "#d4962a",
  OPERATIONAL: "#00d4aa",
  STRUCK: "#e8364a",
  SHUTDOWN: "#8b949e",
  CLOSED: "#e8364a",
  RESTRICTED: "#d4962a",
};

const CHOKEPOINT_COLORS: Record<string, string> = {
  CLOSED: "rgba(232,54,74,0.15)",
  RESTRICTED: "rgba(212,150,42,0.10)",
  OPERATIONAL: "rgba(0,212,170,0.06)",
};

const CHOKEPOINT_BORDERS: Record<string, string> = {
  CLOSED: "#e8364a",
  RESTRICTED: "#d4962a",
  OPERATIONAL: "#00d4aa",
};

function makeCircleSvg(color: string): string {
  return `<svg width="18" height="18" xmlns="http://www.w3.org/2000/svg"><circle cx="9" cy="9" r="8" fill="${color}" fill-opacity="0.12" stroke="${color}" stroke-width="0.5" stroke-opacity="0.2"/><circle cx="9" cy="9" r="5" fill="${color}" fill-opacity="0.85" stroke="${color}" stroke-width="1.5" stroke-opacity="0.5"/></svg>`;
}

function makeDiamondSvg(color: string): string {
  return `<svg width="20" height="20" xmlns="http://www.w3.org/2000/svg"><circle cx="10" cy="10" r="9" fill="${color}" fill-opacity="0.1" stroke="none"/><rect x="4" y="4" width="10" height="10" rx="1" fill="${color}" fill-opacity="0.85" stroke="${color}" stroke-width="1.5" stroke-opacity="0.5" transform="rotate(45 10 10)"/></svg>`;
}

function makeSquareSvg(color: string): string {
  return `<svg width="18" height="18" xmlns="http://www.w3.org/2000/svg"><circle cx="9" cy="9" r="8" fill="${color}" fill-opacity="0.1" stroke="none"/><rect x="3" y="3" width="12" height="12" rx="1" fill="${color}" fill-opacity="0.85" stroke="${color}" stroke-width="1.5" stroke-opacity="0.5"/></svg>`;
}

function makeTriangleSvg(color: string): string {
  return `<svg width="20" height="20" xmlns="http://www.w3.org/2000/svg"><circle cx="10" cy="10" r="9" fill="${color}" fill-opacity="0.1" stroke="none"/><polygon points="10,2 18,18 2,18" fill="${color}" fill-opacity="0.85" stroke="${color}" stroke-width="1.5" stroke-opacity="0.5"/></svg>`;
}

function makeLabelSvg(label: string, color: string): string {
  const w = 10 + label.length * 8;
  return `<svg width="${w}" height="20" xmlns="http://www.w3.org/2000/svg"><rect x="0" y="0" width="${w}" height="20" rx="2" fill="${color}" fill-opacity="0.3" stroke="${color}" stroke-width="1.5" stroke-opacity="0.7"/><text x="${w / 2}" y="14" text-anchor="middle" font-family="Inconsolata,monospace" font-size="11" fill="${color}" font-weight="700">${label}</text></svg>`;
}

function makeDefenseSvg(status: string): string {
  const color = STATUS_COLORS[status] || "#00d4aa";
  if (status === "DESTROYED") {
    return `<svg width="22" height="22" xmlns="http://www.w3.org/2000/svg"><circle cx="11" cy="11" r="10" fill="${color}" fill-opacity="0.12" stroke="none"/><circle cx="11" cy="11" r="7" fill="${color}" fill-opacity="0.3" stroke="${color}" stroke-width="1.5"/><line x1="6" y1="6" x2="16" y2="16" stroke="${color}" stroke-width="2.5"/><line x1="16" y1="6" x2="6" y2="16" stroke="${color}" stroke-width="2.5"/></svg>`;
  }
  if (status === "DAMAGED") {
    return `<svg width="22" height="22" xmlns="http://www.w3.org/2000/svg"><circle cx="11" cy="11" r="10" fill="${color}" fill-opacity="0.12" stroke="none"/><circle cx="11" cy="11" r="7" fill="${color}" fill-opacity="0.3" stroke="${color}" stroke-width="1.5"/><text x="11" y="15" text-anchor="middle" font-size="14" fill="${color}" font-weight="bold">!</text></svg>`;
  }
  return `<svg width="22" height="22" xmlns="http://www.w3.org/2000/svg"><circle cx="11" cy="11" r="9" fill="none" stroke="${color}" stroke-width="1.5" opacity="0.4"><animate attributeName="r" from="5" to="10" dur="2s" repeatCount="indefinite"/><animate attributeName="opacity" from="0.6" to="0" dur="2s" repeatCount="indefinite"/></circle><circle cx="11" cy="11" r="4" fill="${color}" fill-opacity="0.9"/></svg>`;
}

function makeWaterSvg(): string {
  return `<svg width="20" height="20" xmlns="http://www.w3.org/2000/svg"><circle cx="10" cy="10" r="9" fill="#388bfd" fill-opacity="0.1" stroke="none"/><circle cx="10" cy="10" r="7" fill="#388bfd" fill-opacity="0.3" stroke="#388bfd" stroke-width="1.5"/><text x="10" y="14" text-anchor="middle" font-family="Inconsolata,monospace" font-size="9" fill="#60a5ff" font-weight="bold">H₂O</text></svg>`;
}

function makeNuclearSvg(): string {
  return `<svg width="24" height="24" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="12" r="11" fill="#ffb020" fill-opacity="0.08" stroke="none"/><circle cx="12" cy="12" r="9" fill="none" stroke="#ffb020" stroke-width="1.5" opacity="0.5"><animate attributeName="r" from="6" to="11" dur="1.5s" repeatCount="indefinite"/><animate attributeName="opacity" from="0.7" to="0" dur="1.5s" repeatCount="indefinite"/></circle><circle cx="12" cy="12" r="5" fill="#ffb020" fill-opacity="0.9"/></svg>`;
}

function svgIcon(svg: string, size: [number, number] = [18, 18]): L.DivIcon {
  return L.divIcon({
    html: svg,
    className: "",
    iconSize: size,
    iconAnchor: [size[0] / 2, size[1] / 2],
  });
}

// ─── Live Awareness: Recency helpers ───
function getRecencyIntensity(strikeDate: string): number {
  const now = Date.now();
  const strikeTime = new Date(strikeDate).getTime();
  const ageMs = now - strikeTime;
  const ageHours = ageMs / (1000 * 60 * 60);
  if (ageHours > 24) return 0;
  if (ageHours < 0) return 0;
  return 1 - (ageHours / 24);
}

function getPulseSpeed(intensity: number): number {
  if (intensity <= 0) return 0;
  return 1 + (1 - intensity) * 3;
}

function makePulseIcon(color: string, shape: "circle" | "diamond" | "triangle", pulseSpeed: number, intensity: number): L.DivIcon {
  const opacity = (intensity * 0.4).toFixed(2);
  let shapeSvg: string;
  if (shape === "diamond") shapeSvg = `<rect x="4" y="4" width="10" height="10" rx="1" fill="${color}" fill-opacity="0.85" stroke="${color}" stroke-width="1.5" stroke-opacity="0.5" transform="rotate(45 10 10)"/>`;
  else if (shape === "triangle") shapeSvg = `<polygon points="10,2 18,18 2,18" fill="${color}" fill-opacity="0.85" stroke="${color}" stroke-width="1.5" stroke-opacity="0.5"/>`;
  else shapeSvg = `<circle cx="10" cy="10" r="5" fill="${color}" fill-opacity="0.85" stroke="${color}" stroke-width="1.5" stroke-opacity="0.5"/>`;

  const html = `<div class="strike-pulse-container" style="--pulse-speed:${pulseSpeed}s;--pulse-opacity:${opacity};--dot-color:${color}">
    <svg width="20" height="20" xmlns="http://www.w3.org/2000/svg" style="position:absolute;top:0;left:0">${shapeSvg}</svg>
    <div class="strike-pulse-ring" style="border-color:${color}"></div>
    <div class="strike-pulse-ring strike-pulse-ring-2" style="border-color:${color}"></div>
  </div>`;
  return L.divIcon({ html, className: "", iconSize: [20, 20], iconAnchor: [10, 10] });
}

function getFlightColor(ac: { isMilitary: boolean; country: string }): string {
  const country = ac.country.toLowerCase();
  if (ac.isMilitary) {
    if (country.includes("united states") || country.includes("america")) return "#388bfd";
    if (country.includes("israel")) return "#e6edf3";
    if (country.includes("iran")) return "#e8364a";
    if (country.includes("united kingdom") || country.includes("britain")) return "#6ac0ff";
    if (country.includes("france")) return "#6ac0ff";
    return "#ff2a6d";
  }
  if (country.includes("iran")) return "#e8364a50";
  if (country.includes("israel")) return "#e6edf350";
  if (country.includes("united states")) return "#388bfd30";
  if (country.includes("qatar") || country.includes("emirates") || country.includes("saudi") || country.includes("kuwait")) return "#d4962a30";
  return "#8b949e20";
}

function makeSkullSvg(): string {
  return `<svg width="22" height="22" xmlns="http://www.w3.org/2000/svg"><circle cx="11" cy="11" r="10" fill="#e8364a" fill-opacity="0.12" stroke="none"/><circle cx="11" cy="11" r="8" fill="#e8364a" fill-opacity="0.3" stroke="#e8364a" stroke-width="1.5"/><text x="11" y="15" text-anchor="middle" font-size="14" fill="#e8364a">&#10006;</text></svg>`;
}

function makeShieldSvg(): string {
  return `<svg width="22" height="22" xmlns="http://www.w3.org/2000/svg"><circle cx="11" cy="11" r="10" fill="#00d4aa" fill-opacity="0.08" stroke="none"/><path d="M11 2 L19 6 L19 12 Q19 18 11 20 Q3 18 3 12 L3 6 Z" fill="#00d4aa" fill-opacity="0.3" stroke="#00d4aa" stroke-width="1.5"/><circle cx="11" cy="11" r="3" fill="#00d4aa" fill-opacity="0.9"/></svg>`;
}

function makeXSvg(color: string): string {
  return `<svg width="18" height="18" xmlns="http://www.w3.org/2000/svg"><circle cx="9" cy="9" r="8" fill="${color}" fill-opacity="0.1" stroke="none"/><line x1="4" y1="4" x2="14" y2="14" stroke="${color}" stroke-width="2.5" opacity="0.9"/><line x1="14" y1="4" x2="4" y2="14" stroke="${color}" stroke-width="2.5" opacity="0.9"/></svg>`;
}

function makePulseDotSvg(color: string): string {
  return `<svg width="22" height="22" xmlns="http://www.w3.org/2000/svg"><circle cx="11" cy="11" r="9" fill="none" stroke="${color}" stroke-width="1.5" opacity="0.4"><animate attributeName="r" from="5" to="11" dur="2s" repeatCount="indefinite"/><animate attributeName="opacity" from="0.6" to="0" dur="2s" repeatCount="indefinite"/></circle><circle cx="11" cy="11" r="4" fill="${color}" fill-opacity="0.9"/></svg>`;
}

function getAttackerColor(attacker: string): string {
  const a = attacker.toLowerCase();
  if (a.includes("us") || a.includes("america") || a.includes("centcom") || a.includes("coalition")) return "#388bfd";
  if (a.includes("israel") || a.includes("idf")) return "#e6edf3";
  if (a.includes("iran") || a.includes("irgc")) return "#e8364a";
  if (a.includes("houthi")) return "#d4962a";
  if (a.includes("hezbollah")) return "#c8b832";
  return "#8b949e";
}

export default function ConflictMap({ layers, strikes, militaryBases, nuclearSites, countriesGeo, infrastructure, waveTargets, cumulativeWaveTargets, lebanonTargets, lebanonMilitary, hezbollahStrikes, houthiData, iraqData, leadershipLeaders, energyStrikes, notableIncidents, orefAlerts, firmsPoints, acledEvents, weaponsRangeRings }: ConflictMapProps) {
  const mapRef = useRef<L.Map | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const layerGroupsRef = useRef<Record<string, L.LayerGroup>>({});
  const tileRef = useRef<L.TileLayer | null>(null);
  const bordersRef = useRef<L.GeoJSON | null>(null);
  const seaMapRef = useRef<L.TileLayer | null>(null);

  // Init map
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: [32.0, 48.0],
      zoom: 5,
      zoomControl: false,
      attributionControl: false,
    });

    L.control.zoom({ position: "topright" }).addTo(map);
    L.control.attribution({ position: "bottomright", prefix: false }).addTo(map)
      .addAttribution('© <a href="https://osm.org">OSM</a> © <a href="https://carto.com">CARTO</a>');

    const tile = L.tileLayer(TILE_URLS.dark, { maxZoom: 18 });
    tile.addTo(map);
    tileRef.current = tile;

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Country borders
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !countriesGeo) return;

    if (bordersRef.current) {
      map.removeLayer(bordersRef.current);
    }

    const bordersLayer = layers.find((l) => l.id === "borders");
    if (!bordersLayer?.enabled) return;

    bordersRef.current = L.geoJSON(countriesGeo, {
      style: {
        color: "#7d8590",
        weight: 1,
        fillOpacity: 0,
        opacity: 0.5,
      },
    }).addTo(map);
  }, [countriesGeo, layers]);

  // Strike & base layers
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Clear old layer groups
    Object.values(layerGroupsRef.current).forEach((lg) => map.removeLayer(lg));
    layerGroupsRef.current = {};

    const isEnabled = (id: string) => layers.find((l) => l.id === id)?.enabled;

    // ── Strike layers ──
    const strikeLayerMap: Record<string, string> = {
      US: "us-strikes",
      ISRAEL: "israel-strikes",
      IRAN: "iran-strikes",
      HOUTHI: "houthi-strikes",
      HEZBOLLAH: "hezbollah-strikes",
    };

    const strikeGroups: Record<string, L.Marker[]> = {};

    for (const strike of strikes) {
      const layerId = strikeLayerMap[strike.attacker] || "us-strikes";
      if (!isEnabled(layerId)) continue;

      if (!strikeGroups[layerId]) strikeGroups[layerId] = [];

      const color = ATTACKER_COLORS[strike.attacker] || "#8b949e";
      const intensity = strike.date ? getRecencyIntensity(strike.date) : 0;
      const isRecent = intensity > 0;
      let icon: L.DivIcon;

      if (isRecent) {
        const pulseSpeed = getPulseSpeed(intensity);
        const shape = strike.attacker === "ISRAEL" ? "diamond" : (strike.attacker === "HOUTHI" || strike.attacker === "HEZBOLLAH") ? "triangle" : "circle";
        icon = makePulseIcon(color, shape, pulseSpeed, intensity);
      } else if (strike.attacker === "ISRAEL") {
        icon = svgIcon(makeDiamondSvg(color), [20, 20]);
      } else if (strike.attacker === "HOUTHI" || strike.attacker === "HEZBOLLAH") {
        icon = svgIcon(makeTriangleSvg(color), [20, 20]);
      } else {
        icon = svgIcon(makeCircleSvg(color));
      }

      const marker = L.marker([strike.lat, strike.lng], { icon });
      marker.bindPopup(`
        <div style="font-family:Inconsolata,monospace;font-size:12px;color:#9aa8b4;min-width:200px">
          <div style="color:${color};font-weight:700;font-size:14px;margin-bottom:4px">${strike.attacker} STRIKE</div>
          <div style="color:#8b949e;font-size:11px;margin-bottom:4px">${strike.date || "Date unknown"}</div>
          <div style="margin-bottom:4px">${strike.target || strike.location || "Unknown target"}</div>
          ${strike.weaponType ? `<div style="color:#d4962a;font-size:11px">WEAPON: ${strike.weaponType}</div>` : ""}
          ${strike.country ? `<div style="font-size:11px">${strike.country}</div>` : ""}
          <div style="color:#7d8590;font-size:10px;margin-top:4px;border-top:1px solid rgba(0,212,170,0.1);padding-top:4px">
            ${strike.confidence} — ${strike.source || "Unknown"}
          </div>
        </div>
      `, { className: "war-room-popup" });

      strikeGroups[layerId] = strikeGroups[layerId] || [];
      strikeGroups[layerId].push(marker);
    }

    for (const [layerId, markers] of Object.entries(strikeGroups)) {
      const lg = L.layerGroup(markers).addTo(map);
      layerGroupsRef.current[layerId] = lg;
    }

    // ── Military bases ──
    if (isEnabled("us-bases")) {
      const markers: L.Marker[] = [];
      const allUsIdf = [...(militaryBases.usa || []), ...(militaryBases.carriers || [])];
      for (const base of allUsIdf) {
        const m = L.marker([base.lat, base.lng], { icon: svgIcon(makeSquareSvg("#388bfd")) });
        m.bindPopup(`
          <div style="font-family:Inconsolata,monospace;font-size:12px;color:#9aa8b4;min-width:200px">
            <div style="color:#388bfd;font-weight:700;font-size:14px">${base.name}</div>
            <div style="color:#8b949e;font-size:11px">${base.type} — ${base.country}</div>
            <div style="margin:4px 0;font-size:11px">${base.assets}</div>
            <div style="color:${base.threat === "HIGH" ? "#e8364a" : "#d4962a"};font-size:11px">
              THREAT: ${base.threat} — STATUS: ${base.status}
            </div>
          </div>
        `, { className: "war-room-popup" });
        markers.push(m);
      }
      layerGroupsRef.current["us-bases"] = L.layerGroup(markers).addTo(map);
    }

    if (isEnabled("iran-bases")) {
      const markers: L.Marker[] = [];
      const idf = militaryBases.idf || [];
      // IDF bases in blue (they're US-allied)
      for (const base of idf) {
        const m = L.marker([base.lat, base.lng], { icon: svgIcon(makeSquareSvg("#388bfd")) });
        m.bindPopup(`
          <div style="font-family:Inconsolata,monospace;font-size:12px;color:#9aa8b4;min-width:200px">
            <div style="color:#388bfd;font-weight:700;font-size:14px">${base.name}</div>
            <div style="color:#8b949e;font-size:11px">${base.type} — Israel</div>
            <div style="margin:4px 0;font-size:11px">${base.assets}</div>
          </div>
        `, { className: "war-room-popup" });
        markers.push(m);
      }
      layerGroupsRef.current["iran-bases"] = L.layerGroup(markers).addTo(map);
    }

    // ── Nuclear facilities ──
    if (isEnabled("nuclear")) {
      const markers: L.Marker[] = [];
      for (const site of nuclearSites.iran || []) {
        const m = L.marker([site.lat, site.lng], { icon: svgIcon(makeNuclearSvg(), [24, 24]) });
        m.bindPopup(`
          <div style="font-family:Inconsolata,monospace;font-size:12px;color:#9aa8b4;min-width:220px">
            <div style="color:#ffb020;font-weight:700;font-size:14px">${site.name}</div>
            <div style="color:#8b949e;font-size:11px">${site.type}${site.enrichment ? ` — ${site.enrichment} enrichment` : ""}</div>
            <div style="margin:4px 0">${site.detail}</div>
            <div style="color:${site.status === "INTACT" ? "#00d4aa" : "#e8364a"};font-size:11px">
              STATUS: ${site.status} — THREAT: ${site.threat}
            </div>
          </div>
        `, { className: "war-room-popup" });
        markers.push(m);
      }
      layerGroupsRef.current["nuclear"] = L.layerGroup(markers).addTo(map);
    }

    // ── Infrastructure: Oil/Gas Facilities ──
    if (isEnabled("oil-facilities") && infrastructure?.oilFacilities) {
      const markers: L.Marker[] = [];
      for (const f of infrastructure.oilFacilities) {
        const color = f.status === "STRUCK" || f.status === "DAMAGED" ? "#e8364a" : f.status === "SHUTDOWN" ? "#8b949e" : "#d4962a";
        const m = L.marker([f.lat, f.lng], { icon: svgIcon(makeLabelSvg(f.type, color), [10 + f.type.length * 8, 20]) });
        m.bindPopup(`
          <div style="font-family:Inconsolata,monospace;font-size:12px;color:#9aa8b4;min-width:200px">
            <div style="color:#d4962a;font-weight:700;font-size:14px">${f.name}</div>
            <div style="color:#8b949e;font-size:11px">${f.type} — ${f.country}</div>
            <div style="margin:4px 0;font-size:11px">${f.notes}</div>
            <div style="color:${STATUS_COLORS[f.status] || "#00d4aa"};font-size:11px">STATUS: ${f.status}</div>
          </div>
        `, { className: "war-room-popup" });
        markers.push(m);
      }
      layerGroupsRef.current["oil-facilities"] = L.layerGroup(markers).addTo(map);
    }

    // ── Pipelines placeholder — rendered by separate useEffect from Overpass API ──

    // ── Infrastructure: Chokepoints ──
    if (isEnabled("chokepoints") && infrastructure?.chokepoints) {
      const polys: L.Layer[] = [];
      for (const cp of infrastructure.chokepoints) {
        const poly = L.polygon(cp.coords.map(c => [c[0], c[1]] as L.LatLngTuple), {
          color: CHOKEPOINT_BORDERS[cp.status] || "#d4962a",
          weight: 2,
          fillColor: CHOKEPOINT_COLORS[cp.status] || "rgba(212,150,42,0.10)",
          fillOpacity: 1,
          opacity: 0.8,
        });
        poly.bindPopup(`
          <div style="font-family:Inconsolata,monospace;font-size:12px;color:#9aa8b4;min-width:200px">
            <div style="color:${CHOKEPOINT_BORDERS[cp.status]};font-weight:700;font-size:14px">${cp.name}</div>
            <div style="color:${CHOKEPOINT_BORDERS[cp.status]};font-size:12px;margin:4px 0">STATUS: ${cp.status}</div>
            <div style="font-size:11px">${cp.notes}</div>
          </div>
        `, { className: "war-room-popup" });
        polys.push(poly);
      }
      layerGroupsRef.current["chokepoints"] = L.layerGroup(polys).addTo(map);
    }

    // ── Infrastructure: Desalination Plants ──
    if (isEnabled("desalination") && infrastructure?.desalination) {
      const markers: L.Marker[] = [];
      for (const d of infrastructure.desalination) {
        const m = L.marker([d.lat, d.lng], { icon: svgIcon(makeWaterSvg(), [20, 20]) });
        m.bindPopup(`
          <div style="font-family:Inconsolata,monospace;font-size:12px;color:#9aa8b4;min-width:180px">
            <div style="color:#388bfd;font-weight:700;font-size:14px">${d.name}</div>
            <div style="color:#8b949e;font-size:11px">${d.country} — ${d.capacity}</div>
            <div style="color:${STATUS_COLORS[d.status] || "#00d4aa"};font-size:11px;margin-top:4px">STATUS: ${d.status}</div>
          </div>
        `, { className: "war-room-popup" });
        markers.push(m);
      }
      layerGroupsRef.current["desalination"] = L.layerGroup(markers).addTo(map);
    }

    // ── Air Defense Systems ──
    if (isEnabled("air-defense") && infrastructure?.airDefense) {
      const markers: L.Marker[] = [];
      for (const ad of infrastructure.airDefense) {
        const m = L.marker([ad.lat, ad.lng], { icon: svgIcon(makeDefenseSvg(ad.status), [22, 22]) });
        m.bindPopup(`
          <div style="font-family:Inconsolata,monospace;font-size:12px;color:#9aa8b4;min-width:220px">
            <div style="color:${STATUS_COLORS[ad.status] || "#00d4aa"};font-weight:700;font-size:14px">${ad.name}</div>
            <div style="color:#8b949e;font-size:11px">${ad.type} — ${ad.country}</div>
            <div style="margin:4px 0;font-size:11px">${ad.notes}</div>
            <div style="color:${STATUS_COLORS[ad.status] || "#00d4aa"};font-size:11px">STATUS: ${ad.status}</div>
          </div>
        `, { className: "war-room-popup" });
        markers.push(m);
      }
      layerGroupsRef.current["air-defense"] = L.layerGroup(markers).addTo(map);
    }

    // ── Defense Range Rings ──
    if (isEnabled("range-rings") && weaponsRangeRings && weaponsRangeRings.length > 0) {
      const rings: L.Layer[] = [];
      for (const system of weaponsRangeRings) {
        for (const loc of system.deployed_at) {
          const circle = L.circle([loc.lat, loc.lng], {
            radius: system.range_km * 1000,
            color: system.color,
            weight: 1,
            opacity: 0.5,
            fillColor: system.color,
            fillOpacity: 0.04,
            dashArray: "6 4",
          });
          circle.bindPopup(`
            <div style="font-family:Inconsolata,monospace;font-size:12px;color:#9aa8b4;min-width:180px">
              <div style="color:${system.color};font-weight:700;font-size:14px">${system.name}</div>
              <div style="color:#8b949e;font-size:11px">${loc.name}</div>
              <div style="color:${system.color};font-size:12px;margin-top:4px">RANGE: ${system.range_km.toLocaleString()} km</div>
            </div>
          `, { className: "war-room-popup" });
          rings.push(circle);
        }
      }
      layerGroupsRef.current["range-rings"] = L.layerGroup(rings).addTo(map);
    }

    // ── Airspace / NOTAMs ──
    if (isEnabled("airspace") && infrastructure?.airspace && countriesGeo) {
      const polys: L.Layer[] = [];
      for (const as_ of infrastructure.airspace) {
        const feature = countriesGeo.features.find((f) => {
          const name = (f.properties?.ADMIN || f.properties?.name || "").toLowerCase();
          return name === as_.country.toLowerCase();
        });
        if (feature) {
          const color = as_.status === "CLOSED" ? "rgba(232,54,74,0.08)" : "rgba(212,150,42,0.05)";
          const border = as_.status === "CLOSED" ? "#e8364a" : "#d4962a";
          const layer = L.geoJSON(feature as GeoJSON.Feature, {
            style: { color: border, weight: 1.5, fillColor: color, fillOpacity: 1, opacity: 0.5 },
          });
          layer.bindPopup(`
            <div style="font-family:Inconsolata,monospace;font-size:12px;color:#9aa8b4">
              <div style="color:${border};font-weight:700;font-size:14px">${as_.name}</div>
              <div style="color:${border};font-size:12px">AIRSPACE: ${as_.status}</div>
            </div>
          `, { className: "war-room-popup" });
          polys.push(layer);
        }
      }
      if (polys.length > 0) {
        layerGroupsRef.current["airspace"] = L.layerGroup(polys).addTo(map);
      }
    }

    // ── Leadership: Eliminated Leaders ──
    if (isEnabled("leaders-eliminated") && leadershipLeaders) {
      const markers: L.Marker[] = [];
      for (const leader of leadershipLeaders) {
        if (leader.status !== "ELIMINATED") continue;
        const m = L.marker([leader.lat, leader.lng], { icon: svgIcon(makeSkullSvg(), [22, 22]) });
        const dateStr = leader.date ? new Date(leader.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "Unknown";
        m.bindPopup(`
          <div style="font-family:Inconsolata,monospace;font-size:10px;color:#9aa8b4;min-width:200px">
            <div style="font-size:14px;font-weight:600;color:#e8364a">ELIMINATED</div>
            <div style="font-family:Rajdhani,sans-serif;font-size:15px;font-weight:700;color:#e6edf3;margin:4px 0">${leader.name}</div>
            <div style="color:#8b949e;font-size:9px">${leader.role}</div>
            <div style="margin-top:6px">
              <div style="display:flex;justify-content:space-between"><span style="color:#7d8590">DATE</span><span>${dateStr}</span></div>
              <div style="display:flex;justify-content:space-between"><span style="color:#7d8590">LOCATION</span><span>${leader.location}</span></div>
              <div style="display:flex;justify-content:space-between"><span style="color:#7d8590">STRIKE</span><span>${leader.killedBy || "Unknown"}</span></div>
              ${leader.successor ? `<div style="display:flex;justify-content:space-between"><span style="color:#7d8590">SUCCESSOR</span><span style="color:#00d4aa">${leader.successor}</span></div>` : ""}
            </div>
            <div style="margin-top:6px;color:#8b949e;font-size:9px">${leader.details}</div>
          </div>
        `, { className: "war-room-popup" });
        markers.push(m);
      }
      layerGroupsRef.current["leaders-eliminated"] = L.layerGroup(markers).addTo(map);
    }

    // ── Leadership: Surviving Leaders ──
    if (isEnabled("leaders-surviving") && leadershipLeaders) {
      const markers: L.Marker[] = [];
      for (const leader of leadershipLeaders) {
        if (leader.status === "ELIMINATED") continue;
        const color = leader.status === "SURVIVED" || leader.status === "ALIVE" ? "#00d4aa" : "#d4962a";
        const icon = leader.status === "SURVIVED" || leader.status === "ALIVE"
          ? svgIcon(makeShieldSvg(), [22, 22])
          : svgIcon(makePulseDotSvg(color), [22, 22]);
        const m = L.marker([leader.lat, leader.lng], { icon });
        m.bindPopup(`
          <div style="font-family:Inconsolata,monospace;font-size:10px;color:#9aa8b4;min-width:200px">
            <div style="font-size:14px;font-weight:600;color:${color}">${leader.status}</div>
            <div style="font-family:Rajdhani,sans-serif;font-size:15px;font-weight:700;color:#e6edf3;margin:4px 0">${leader.name}</div>
            <div style="color:#8b949e;font-size:9px">${leader.role}</div>
            <div style="margin-top:6px;color:#8b949e;font-size:9px">${leader.details}</div>
          </div>
        `, { className: "war-room-popup" });
        markers.push(m);
      }
      layerGroupsRef.current["leaders-surviving"] = L.layerGroup(markers).addTo(map);
    }

    // ── Multi-Theater: Lebanon Targets ──
    if (isEnabled("lebanon-targets") && lebanonTargets && lebanonTargets.length > 0) {
      const markers: L.Marker[] = [];
      for (const t of lebanonTargets) {
        const statusColor = STATUS_COLORS[t.status] || "#c8b832";
        const icon = t.status === "STRUCK" ? svgIcon(makeXSvg(statusColor), [18, 18])
          : t.status === "GROUND OPS" ? svgIcon(makePulseDotSvg("#e8364a"), [22, 22])
          : svgIcon(makeTriangleSvg(statusColor), [20, 20]);
        const m = L.marker([t.lat, t.lng], { icon });
        m.bindPopup(`
          <div style="font-family:Inconsolata,monospace;font-size:12px;color:#9aa8b4;min-width:200px">
            <div style="color:${statusColor};font-weight:700;font-size:14px">${t.name}</div>
            <div style="color:#8b949e;font-size:11px">${t.type.toUpperCase()} — LEBANON</div>
            <div style="margin:4px 0;font-size:11px">${t.notes}</div>
            <div style="color:${statusColor};font-size:11px">STATUS: ${t.status}</div>
          </div>
        `, { className: "war-room-popup" });
        markers.push(m);
      }
      layerGroupsRef.current["lebanon-targets"] = L.layerGroup(markers).addTo(map);
    }

    // ── Multi-Theater: Lebanon Military Positions ──
    if (isEnabled("lebanon-military") && lebanonMilitary && lebanonMilitary.length > 0) {
      const markers: L.Marker[] = [];
      for (const pos of lebanonMilitary) {
        const color = pos.side === "Hezbollah" ? "#c8b832" : pos.side === "Israel" ? "#388bfd" : "#00d4aa";
        const m = L.marker([pos.lat, pos.lng], { icon: svgIcon(makeSquareSvg(color)) });
        m.bindPopup(`
          <div style="font-family:Inconsolata,monospace;font-size:12px;color:#9aa8b4;min-width:200px">
            <div style="color:${color};font-weight:700;font-size:14px">${pos.name}</div>
            <div style="color:#8b949e;font-size:11px">${pos.type} — ${pos.side}</div>
            <div style="margin:4px 0;font-size:11px">${pos.notes}</div>
          </div>
        `, { className: "war-room-popup" });
        markers.push(m);
      }
      layerGroupsRef.current["lebanon-military"] = L.layerGroup(markers).addTo(map);
    }

    // ── Multi-Theater: Houthi/Yemen Positions ──
    if (isEnabled("houthi-positions") && houthiData?.positions) {
      const markers: L.Marker[] = [];
      for (const pos of houthiData.positions) {
        const color = pos.type === "contested" ? "#d4962a" : pos.type === "port" ? "#388bfd" : "#e8364a";
        const m = L.marker([pos.lat, pos.lng], { icon: svgIcon(makePulseDotSvg(color), [22, 22]) });
        m.bindPopup(`
          <div style="font-family:Inconsolata,monospace;font-size:12px;color:#9aa8b4;min-width:200px">
            <div style="color:${color};font-weight:700;font-size:14px">${pos.name}</div>
            <div style="color:#8b949e;font-size:11px">${pos.type.toUpperCase()} — YEMEN</div>
            <div style="margin:4px 0;font-size:11px">${pos.notes}</div>
          </div>
        `, { className: "war-room-popup" });
        markers.push(m);
      }
      layerGroupsRef.current["houthi-positions"] = L.layerGroup(markers).addTo(map);
    }

    // ── Multi-Theater: Shipping Attacks ──
    if (isEnabled("shipping-attacks") && houthiData?.shipping_attacks) {
      const markers: L.Marker[] = [];
      for (const atk of houthiData.shipping_attacks) {
        const m = L.marker([atk.lat, atk.lng], { icon: svgIcon(makeXSvg("#d4962a"), [18, 18]) });
        m.bindPopup(`
          <div style="font-family:Inconsolata,monospace;font-size:12px;color:#9aa8b4;min-width:200px">
            <div style="color:#d4962a;font-weight:700;font-size:14px">SHIPPING ATTACK</div>
            <div style="color:#8b949e;font-size:11px">${atk.date} — ${atk.type.toUpperCase()}</div>
            <div style="margin:4px 0;font-size:11px">${atk.target}</div>
            <div style="font-size:11px">${atk.notes}</div>
          </div>
        `, { className: "war-room-popup" });
        markers.push(m);
      }
      layerGroupsRef.current["shipping-attacks"] = L.layerGroup(markers).addTo(map);
    }

    // ── Multi-Theater: Red Sea Shipping Lanes (Houthi) ──
    if (isEnabled("shipping-lanes-houthi") && houthiData?.shipping_lanes) {
      const lanes: L.Layer[] = [];
      for (const lane of houthiData.shipping_lanes) {
        const latLngs = lane.coordinates.map((c) => [c[0], c[1]] as L.LatLngTuple);
        const line = L.polyline(latLngs, { color: "#d4962a", weight: 1.5, opacity: 0.35, dashArray: "6 6" });
        line.bindPopup(`<div style="font-family:Inconsolata,monospace;font-size:12px;color:#d4962a;font-weight:600">${lane.name}</div>`, { className: "war-room-popup" });
        lanes.push(line);
      }
      // Bab el-Mandeb chokepoint
      if (houthiData.chokepoint_status?.bab_el_mandeb) {
        const cp = houthiData.chokepoint_status.bab_el_mandeb;
        const poly = L.polygon(cp.polygon.map((c) => [c[0], c[1]] as L.LatLngTuple), {
          color: CHOKEPOINT_BORDERS[cp.status] || "#d4962a",
          weight: 2,
          fillColor: CHOKEPOINT_COLORS[cp.status] || "rgba(212,150,42,0.10)",
          fillOpacity: 1,
          opacity: 0.8,
        });
        poly.bindPopup(`
          <div style="font-family:Inconsolata,monospace;font-size:12px;color:#9aa8b4;min-width:200px">
            <div style="color:#d4962a;font-weight:700;font-size:14px">Bab el-Mandeb Strait</div>
            <div style="color:${CHOKEPOINT_BORDERS[cp.status]};font-size:12px;margin:4px 0">STATUS: ${cp.status}</div>
            <div style="font-size:11px">${cp.notes}</div>
          </div>
        `, { className: "war-room-popup" });
        lanes.push(poly);
      }
      layerGroupsRef.current["shipping-lanes-houthi"] = L.layerGroup(lanes).addTo(map);
    }

    // ── Multi-Theater: Iraq US Bases ──
    if (isEnabled("iraq-bases") && iraqData?.us_bases) {
      const markers: L.Marker[] = [];
      for (const base of iraqData.us_bases) {
        const color = base.side === "US" ? "#388bfd" : "#6ac0ff";
        const m = L.marker([base.lat, base.lng], { icon: svgIcon(makeSquareSvg(color)) });
        m.bindPopup(`
          <div style="font-family:Inconsolata,monospace;font-size:12px;color:#9aa8b4;min-width:200px">
            <div style="color:${color};font-weight:700;font-size:14px">${base.name}</div>
            <div style="color:#8b949e;font-size:11px">${base.type} — ${base.side}</div>
            <div style="margin:4px 0;font-size:11px">${base.notes}</div>
          </div>
        `, { className: "war-room-popup" });
        markers.push(m);
      }
      layerGroupsRef.current["iraq-bases"] = L.layerGroup(markers).addTo(map);
    }

    // ── Multi-Theater: Iraq Proxy Attacks ──
    if (isEnabled("iraq-proxy") && iraqData?.proxy_attacks) {
      const markers: L.Marker[] = [];
      for (const atk of iraqData.proxy_attacks) {
        const m = L.marker([atk.lat, atk.lng], { icon: svgIcon(makeTriangleSvg("#e8364a"), [20, 20]) });
        m.bindPopup(`
          <div style="font-family:Inconsolata,monospace;font-size:12px;color:#9aa8b4;min-width:200px">
            <div style="color:#e8364a;font-weight:700;font-size:14px">PROXY ATTACK</div>
            <div style="color:#8b949e;font-size:11px">${atk.date} — ${atk.weaponType}</div>
            <div style="margin:4px 0;font-size:11px"><b>${atk.attacker}</b></div>
            <div style="font-size:11px">${atk.target}</div>
            <div style="font-size:11px;color:#8b949e">${atk.notes}</div>
          </div>
        `, { className: "war-room-popup" });
        markers.push(m);
      }
      layerGroupsRef.current["iraq-proxy"] = L.layerGroup(markers).addTo(map);
    }

    // ── OpenSeaMap maritime overlay + shipping lanes + ports ──
    if (isEnabled("sea-lanes")) {
      if (!seaMapRef.current) {
        seaMapRef.current = L.tileLayer(OPENSEAMAP_URL, { maxZoom: 18, opacity: 0.7 });
      }
      seaMapRef.current.addTo(map);

      const maritimeLayers: L.Layer[] = [];

      // Shipping lanes
      const SHIPPING_LANES = [
        { name: "Hormuz Inbound Lane", coords: [[25.5, 56.8], [26.2, 56.5], [26.5, 56.3], [26.8, 56.2], [27.1, 56.3]], type: "lane" },
        { name: "Hormuz Outbound Lane", coords: [[27.0, 56.1], [26.7, 56.0], [26.4, 56.1], [26.1, 56.3], [25.6, 56.5]], type: "lane" },
        { name: "Gulf Route (Qatar-Hormuz)", coords: [[25.3, 51.6], [25.8, 52.5], [26.0, 53.5], [26.2, 54.5], [26.3, 55.5], [26.5, 56.3]], type: "route" },
        { name: "Gulf Route (Kuwait-Hormuz)", coords: [[29.3, 48.2], [28.5, 49.0], [27.8, 50.0], [27.2, 51.5], [26.8, 53.0], [26.5, 54.5], [26.5, 56.3]], type: "route" },
        { name: "Red Sea Route (Bab el-Mandeb to Suez)", coords: [[12.5, 43.3], [13.5, 43.0], [15.0, 42.0], [18.0, 39.5], [22.0, 37.0], [26.0, 35.0], [29.6, 32.6]], type: "route" },
        { name: "Fujairah Bypass Route", coords: [[25.1, 56.4], [24.5, 57.0], [24.0, 58.0], [23.5, 59.0]], type: "route" },
      ];

      for (const lane of SHIPPING_LANES) {
        const color = lane.type === "lane" ? "#388bfd" : "#8b949e";
        const weight = lane.type === "lane" ? 2 : 1;
        const line = L.polyline(lane.coords as L.LatLngTuple[], { color, weight, opacity: 0.3, dashArray: "8 6" });
        line.bindPopup(`<div style="font-family:Inconsolata,monospace;font-size:12px;color:#9aa8b4"><div style="color:${color};font-weight:600">${lane.name}</div><div style="color:#8b949e;font-size:11px">${lane.type.toUpperCase()}</div></div>`, { className: "war-room-popup" });
        maritimeLayers.push(line);
      }

      // Anchorage zones
      const ANCHORAGE_ZONES = [
        { name: "Hormuz Anchorage", lat: 25.3, lng: 57.0, count: "~50+ tankers", status: "CONGESTED" },
        { name: "Fujairah Anchorage", lat: 25.2, lng: 56.5, count: "~30+ vessels", status: "CONGESTED" },
        { name: "Khorfakkan Anchorage", lat: 25.35, lng: 56.35, count: "~15 vessels", status: "WAITING" },
      ];

      for (const zone of ANCHORAGE_ZONES) {
        const circle = L.circle([zone.lat, zone.lng], { radius: 15000, color: "#d4962a", fillColor: "#d4962a", fillOpacity: 0.08, weight: 1, opacity: 0.3, dashArray: "4 4" });
        circle.bindPopup(`<div style="font-family:Inconsolata,monospace;font-size:12px;color:#9aa8b4;min-width:180px"><div style="color:#d4962a;font-weight:700;font-size:14px">${zone.name}</div><div style="margin:4px 0">${zone.count}</div><div style="color:#e8364a">STATUS: ${zone.status}</div></div>`, { className: "war-room-popup" });
        maritimeLayers.push(circle);
      }

      // Ports & terminals
      const PORTS = [
        { name: "Fujairah Port", lat: 25.12, lng: 56.36, type: "oil_terminal", status: "STRUCK", color: "#e8364a" },
        { name: "Ras Tanura", lat: 26.64, lng: 50.16, type: "oil_terminal", status: "AT RISK", color: "#d4962a" },
        { name: "Kharg Island", lat: 29.23, lng: 50.32, type: "oil_terminal", status: "IRAN — ACTIVE", color: "#e8364a" },
        { name: "Bandar Abbas", lat: 27.18, lng: 56.27, type: "naval_port", status: "IRAN — ACTIVE", color: "#e8364a" },
        { name: "Jebel Ali Port", lat: 25.01, lng: 55.06, type: "commercial", status: "AT RISK", color: "#d4962a" },
        { name: "Mina Salman (Bahrain)", lat: 26.2, lng: 50.6, type: "naval_port", status: "US 5TH FLEET", color: "#388bfd" },
        { name: "Duqm Port (Oman)", lat: 19.67, lng: 57.7, type: "commercial", status: "BYPASS OPTION", color: "#00d4aa" },
        { name: "Yanbu Terminal", lat: 24.09, lng: 38.06, type: "oil_terminal", status: "ACTIVE — BYPASS", color: "#00d4aa" },
        { name: "Ain Sukhna (SUMED)", lat: 29.6, lng: 32.34, type: "oil_terminal", status: "OPERATIONAL", color: "#00d4aa" },
        { name: "Hodeidah Port", lat: 14.8, lng: 42.95, type: "contested", status: "HOUTHI — CONTESTED", color: "#d4962a" },
      ];

      for (const port of PORTS) {
        const m = L.circleMarker([port.lat, port.lng], { radius: 6, color: port.color, fillColor: port.color, fillOpacity: 0.85, weight: 1.5 });
        m.bindPopup(`<div style="font-family:Inconsolata,monospace;font-size:12px;color:#9aa8b4;min-width:180px"><div style="color:${port.color};font-weight:700;font-size:14px">${port.name}</div><div style="color:#8b949e;font-size:11px">${port.type.toUpperCase()}</div><div style="color:${port.color};margin-top:4px">${port.status}</div></div>`, { className: "war-room-popup" });
        maritimeLayers.push(m);
      }

      layerGroupsRef.current["sea-lanes"] = L.layerGroup(maritimeLayers).addTo(map);
    } else {
      if (seaMapRef.current && map.hasLayer(seaMapRef.current)) {
        map.removeLayer(seaMapRef.current);
      }
    }
    // ── Energy Strike Events ──
    if (layerGroupsRef.current["energy-strikes"]) {
      layerGroupsRef.current["energy-strikes"].remove();
    }
    if (isEnabled("energy-strikes") && energyStrikes?.length) {
      const markers: L.Layer[] = [];
      for (const es of energyStrikes) {
        if (!es.lat || !es.lng) continue;
        const isGas = es.type.includes("gas") || es.type.includes("lng") || es.type === "gas_field";
        const fillColor = isGas ? "#00b4d8" : "#d4962a";
        const borderColor = es.attacker === "Israel" ? "#e6edf3" : "#e8364a";
        const isField = es.type.includes("field");
        const radius = isField ? 11 : 8;

        // Outer glow halo
        const halo = L.circleMarker([es.lat, es.lng], {
          radius: radius + 5,
          fillColor,
          color: "transparent",
          weight: 0,
          fillOpacity: 0.12,
        });
        markers.push(halo);

        const circle = L.circleMarker([es.lat, es.lng], {
          radius,
          fillColor,
          color: borderColor,
          weight: 2,
          opacity: 0.9,
          fillOpacity: 0.55,
        });

        const label = isGas ? (es.type === "lng" ? "LNG" : "GAS") : "OIL";
        circle.bindPopup(`
          <div style="font-family:Inconsolata,monospace;font-size:12px;color:#9aa8b4;min-width:220px">
            <div style="color:${fillColor};font-weight:700;font-size:14px">${es.target}</div>
            <div style="color:#8b949e;font-size:11px;margin:2px 0">${es.date} — ${es.attacker || "Unknown"} ${label}</div>
            <div style="color:${borderColor};font-size:11px">${es.damage}</div>
            ${es.country ? `<div style="color:#7d8590;font-size:10px;margin-top:2px">${es.country}</div>` : ""}
            ${es.note ? `<div style="color:#d4962a;font-size:10px;margin-top:2px;font-style:italic">${es.note}</div>` : ""}
          </div>
        `, { className: "war-room-popup" });
        markers.push(circle);

        // Pulsing ring for gas fields (strategic targets)
        if (isField) {
          const pulse = L.marker([es.lat, es.lng], {
            icon: L.divIcon({
              className: "",
              html: `<svg width="32" height="32" xmlns="http://www.w3.org/2000/svg"><circle cx="16" cy="16" r="14" fill="none" stroke="${fillColor}" stroke-width="1.5" opacity="0.5"><animate attributeName="r" from="8" to="16" dur="2s" repeatCount="indefinite"/><animate attributeName="opacity" from="0.7" to="0" dur="2s" repeatCount="indefinite"/></circle></svg>`,
              iconSize: [32, 32],
              iconAnchor: [16, 16],
            }),
          });
          markers.push(pulse);
        }
      }
      layerGroupsRef.current["energy-strikes"] = L.layerGroup(markers).addTo(map);
    }

    // ── Notable Incidents (Casualty Tracker) ──
    if (layerGroupsRef.current["notable-incidents"]) {
      layerGroupsRef.current["notable-incidents"].remove();
    }
    if (isEnabled("notable-incidents") && notableIncidents?.length) {
      const incMarkers: L.Layer[] = [];
      for (const inc of notableIncidents) {
        if (!inc.lat || !inc.lng) continue;
        const typeColor =
          inc.type === "civilian" ? "#d06090" :
          inc.type === "us_military" ? "#388bfd" :
          inc.type === "leadership" ? "#e8364a" :
          "#e6edf3";
        const icon = inc.type === "civilian"
          ? `<svg width="24" height="24" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="12" r="11" fill="${typeColor}" fill-opacity="0.15" stroke="none"/><circle cx="12" cy="12" r="8" fill="${typeColor}" fill-opacity="0.3" stroke="${typeColor}" stroke-width="2"/><line x1="6" y1="6" x2="18" y2="18" stroke="${typeColor}" stroke-width="2.5"/><line x1="18" y1="6" x2="6" y2="18" stroke="${typeColor}" stroke-width="2.5"/></svg>`
          : inc.type === "us_military"
          ? `<svg width="24" height="24" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="12" r="11" fill="${typeColor}" fill-opacity="0.12" stroke="none"/><circle cx="12" cy="12" r="8" fill="${typeColor}" fill-opacity="0.3" stroke="${typeColor}" stroke-width="2"/><text x="12" y="16" text-anchor="middle" font-size="12" fill="${typeColor}" font-weight="bold">&#9733;</text></svg>`
          : `<svg width="24" height="24" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="12" r="11" fill="${typeColor}" fill-opacity="0.12" stroke="none"/><circle cx="12" cy="12" r="8" fill="${typeColor}" fill-opacity="0.3" stroke="${typeColor}" stroke-width="2"/><text x="12" y="16" text-anchor="middle" font-size="14" fill="${typeColor}">&#10006;</text></svg>`;

        const m = L.marker([inc.lat, inc.lng], {
          icon: L.divIcon({ className: "", html: icon, iconSize: [24, 24], iconAnchor: [12, 12] }),
        });
        m.bindPopup(`
          <div style="font-family:Inconsolata,monospace;font-size:12px;color:#c0cad4;min-width:240px">
            <div style="color:${typeColor};font-weight:700;font-size:14px">${inc.event}</div>
            <div style="color:#7a8a96;font-size:11px;margin:2px 0">${inc.date} — ${inc.type.replace("_", " ").toUpperCase()}</div>
            <div style="color:#e6edf3;font-size:14px;font-weight:700;margin:4px 0">${inc.killed} killed</div>
            <div style="color:#7a8a96;font-size:11px">${inc.details}</div>
          </div>
        `, { className: "war-room-popup" });
        incMarkers.push(m);

        // Pulse ring for major incidents
        const pulse = L.marker([inc.lat, inc.lng], {
          icon: L.divIcon({
            className: "",
            html: `<svg width="36" height="36" xmlns="http://www.w3.org/2000/svg"><circle cx="18" cy="18" r="14" fill="none" stroke="${typeColor}" stroke-width="1.5" opacity="0.4"><animate attributeName="r" from="8" to="18" dur="2.5s" repeatCount="indefinite"/><animate attributeName="opacity" from="0.5" to="0" dur="2.5s" repeatCount="indefinite"/></circle></svg>`,
            iconSize: [36, 36],
            iconAnchor: [18, 18],
          }),
        });
        incMarkers.push(pulse);
      }
      layerGroupsRef.current["notable-incidents"] = L.layerGroup(incMarkers).addTo(map);
    }

    // ── OREF Red Alerts (Israel) ──
    if (layerGroupsRef.current["oref-alerts"]) {
      layerGroupsRef.current["oref-alerts"].remove();
    }
    if (isEnabled("oref-alerts") && orefAlerts?.length) {
      const alertMarkers: L.Layer[] = [];
      // OREF alerts don't have lat/lng — they have city names
      // We use approximate coordinates for known Israeli cities
      const cityCoords: Record<string, [number, number]> = {
        "תל אביב": [32.08, 34.78], "חיפה": [32.79, 34.99], "באר שבע": [31.25, 34.79],
        "ירושלים": [31.77, 35.23], "אשדוד": [31.80, 34.65], "אשקלון": [31.67, 34.57],
        "נתניה": [32.33, 34.86], "רמת גן": [32.08, 34.81], "פתח תקווה": [32.09, 34.88],
        "הרצליה": [32.16, 34.84], "כפר סבא": [32.18, 34.91], "רעננה": [32.18, 34.87],
        "רחובות": [31.90, 34.81], "לוד": [31.95, 34.90], "רמלה": [31.93, 34.87],
        "עכו": [32.93, 35.08], "צפת": [32.97, 35.50], "טבריה": [32.79, 35.53],
        "אילת": [29.56, 34.95], "דימונה": [31.07, 35.03], "ערד": [31.26, 35.21],
      };
      for (const alert of orefAlerts) {
        const coords = cityCoords[alert.data];
        if (!coords) continue;
        const m = L.circleMarker(coords, {
          radius: 10,
          fillColor: "#ff0000",
          fillOpacity: 0.5,
          color: "#ff0000",
          weight: 2,
          opacity: 0.9,
        });
        m.bindPopup(`
          <div style="font-family:Inconsolata,monospace;font-size:12px;color:#c0cad4;min-width:180px">
            <div style="color:#ff0000;font-weight:700;font-size:14px">⚠ RED ALERT</div>
            <div style="color:#e6edf3;font-size:13px;margin:2px 0">${alert.data}</div>
            <div style="color:#7a8a96;font-size:11px">${alert.title}</div>
            <div style="color:#7a8a96;font-size:10px">${alert.desc}</div>
          </div>
        `, { className: "war-room-popup" });
        alertMarkers.push(m);

        // Red pulsing ring
        const pulse = L.marker(coords, {
          icon: L.divIcon({
            className: "",
            html: `<svg width="40" height="40" xmlns="http://www.w3.org/2000/svg"><circle cx="20" cy="20" r="16" fill="none" stroke="#ff0000" stroke-width="2" opacity="0.6"><animate attributeName="r" from="8" to="20" dur="1.5s" repeatCount="indefinite"/><animate attributeName="opacity" from="0.8" to="0" dur="1.5s" repeatCount="indefinite"/></circle></svg>`,
            iconSize: [40, 40],
            iconAnchor: [20, 20],
          }),
        });
        alertMarkers.push(pulse);
      }
      layerGroupsRef.current["oref-alerts"] = L.layerGroup(alertMarkers).addTo(map);
    }

    // ── NASA FIRMS Fire/Thermal Anomalies ──
    if (layerGroupsRef.current["firms-fires"]) {
      layerGroupsRef.current["firms-fires"].remove();
    }
    if (isEnabled("firms-fires") && firmsPoints?.length) {
      const fireMarkers: L.Layer[] = [];
      for (const pt of firmsPoints) {
        if (!pt.lat || !pt.lng) continue;
        const intensity = Math.min(1, pt.frp / 100);
        const radius = Math.max(4, Math.min(12, 4 + intensity * 8));
        const color = intensity > 0.6 ? "#ff4400" : intensity > 0.3 ? "#ff8800" : "#ffaa44";
        const m = L.circleMarker([pt.lat, pt.lng], {
          radius,
          fillColor: color,
          fillOpacity: 0.5 + intensity * 0.3,
          color,
          weight: 1,
          opacity: 0.7,
        });
        m.bindPopup(`
          <div style="font-family:Inconsolata,monospace;font-size:12px;color:#c0cad4;min-width:180px">
            <div style="color:${color};font-weight:700;font-size:14px">🔥 THERMAL ANOMALY</div>
            <div style="color:#e6edf3;font-size:12px;margin:2px 0">FRP: ${pt.frp.toFixed(1)} MW</div>
            <div style="color:#7a8a96;font-size:11px">Brightness: ${pt.brightness.toFixed(1)}K</div>
            <div style="color:#7a8a96;font-size:11px">Confidence: ${pt.confidence}</div>
            <div style="color:#7a8a96;font-size:10px">${pt.acq_date} ${pt.acq_time} — ${pt.satellite}</div>
          </div>
        `, { className: "war-room-popup" });
        fireMarkers.push(m);
      }
      layerGroupsRef.current["firms-fires"] = L.layerGroup(fireMarkers).addTo(map);
    }

    // ── ACLED Armed Conflict Events ──
    if (layerGroupsRef.current["acled-events"]) {
      layerGroupsRef.current["acled-events"].remove();
    }
    if (isEnabled("acled-events") && acledEvents?.length) {
      const eventMarkers: L.Layer[] = [];
      const acledTypeColors: Record<string, string> = {
        "Battles": "#388bfd",
        "Violence against civilians": "#d06090",
        "Explosions/Remote violence": "#e8364a",
        "Riots": "#d4962a",
        "Protests": "#c8b832",
        "Strategic developments": "#00d4aa",
      };
      for (const ev of acledEvents) {
        if (!ev.lat || !ev.lng) continue;
        const color = acledTypeColors[ev.event_type] || "#8b949e";
        const hasDeaths = ev.fatalities > 0;
        const radius = hasDeaths ? Math.max(5, Math.min(12, 5 + ev.fatalities / 5)) : 4;
        const m = L.circleMarker([ev.lat, ev.lng], {
          radius,
          fillColor: color,
          fillOpacity: 0.45,
          color,
          weight: 1.5,
          opacity: 0.8,
        });
        m.bindPopup(`
          <div style="font-family:Inconsolata,monospace;font-size:12px;color:#c0cad4;min-width:220px">
            <div style="color:${color};font-weight:700;font-size:13px">${ev.event_type}</div>
            <div style="color:#e6edf3;font-size:12px;margin:2px 0">${ev.sub_event_type}</div>
            <div style="color:#7a8a96;font-size:11px">${ev.event_date} — ${ev.location}, ${ev.admin1}</div>
            ${hasDeaths ? `<div style="color:#e8364a;font-weight:700;font-size:13px;margin:3px 0">${ev.fatalities} fatalities</div>` : ""}
            <div style="color:#7a8a96;font-size:11px">${ev.actor1}${ev.actor2 ? ` vs ${ev.actor2}` : ""}</div>
            <div style="color:#8b949e;font-size:10px;margin-top:3px;max-width:250px;word-break:break-word">${ev.notes.slice(0, 200)}${ev.notes.length > 200 ? "..." : ""}</div>
          </div>
        `, { className: "war-room-popup" });
        eventMarkers.push(m);
      }
      layerGroupsRef.current["acled-events"] = L.layerGroup(eventMarkers).addTo(map);
    }

  }, [layers, strikes, militaryBases, nuclearSites, infrastructure, countriesGeo, lebanonTargets, lebanonMilitary, hezbollahStrikes, houthiData, iraqData, leadershipLeaders, energyStrikes, notableIncidents, orefAlerts, firmsPoints, acledEvents, weaponsRangeRings]);

  // ── Live aircraft tracking layer ──
  const flightLayerRef = useRef<L.LayerGroup | null>(null);
  const flightIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const flightsEnabled = layers.find((l) => l.id === "live-flights")?.enabled;
    const milOnly = layers.find((l) => l.id === "mil-only")?.enabled;

    // Clean up if disabled
    if (!flightsEnabled) {
      if (flightLayerRef.current) {
        map.removeLayer(flightLayerRef.current);
        flightLayerRef.current = null;
      }
      if (flightIntervalRef.current) {
        clearInterval(flightIntervalRef.current);
        flightIntervalRef.current = null;
      }
      return;
    }

    async function fetchAndRender() {
      try {
        const res = await fetch("/api/conflict/flights");
        const data = await res.json();
        if (!data.aircraft || !Array.isArray(data.aircraft)) return;

        // Clear old markers
        if (flightLayerRef.current) {
          map!.removeLayer(flightLayerRef.current);
        }

        const group = L.layerGroup();
        const zoomLevel = map!.getZoom();
        let rendered = 0;

        for (const ac of data.aircraft) {
          if (!ac.lat || !ac.lng) continue;
          if (milOnly && !ac.isMilitary) continue;
          // At very low zoom, only show military to avoid clutter
          if (zoomLevel < 4 && !ac.isMilitary) continue;

          const color = getFlightColor(ac);
          const size = ac.isMilitary ? 10 : 6;
          const opacity = ac.isMilitary ? 1.0 : 0.5;
          const heading = ac.heading || 0;

          const icon = L.divIcon({
            className: "",
            html: `<div style="width:${size}px;height:${size * 1.5}px;transform:rotate(${heading}deg);transform-origin:center center"><svg viewBox="0 0 10 15" width="${size}" height="${size * 1.5}"><polygon points="5,0 10,15 5,11 0,15" fill="${color}" opacity="${opacity}"/></svg></div>`,
            iconSize: [size, size * 1.5],
            iconAnchor: [size / 2, (size * 1.5) / 2],
          });

          const marker = L.marker([ac.lat, ac.lng], { icon });

          const altFt = ac.altitude ? Math.round(ac.altitude * 3.281) : "—";
          const speedKts = ac.velocity ? Math.round(ac.velocity * 1.944) : "—";
          const vr = ac.verticalRate ? (ac.verticalRate > 0 ? "\u2191" : ac.verticalRate < 0 ? "\u2193" : "\u2192") : "";
          const vrFpm = ac.verticalRate ? Math.round(Math.abs(ac.verticalRate) * 196.85) : "";

          marker.bindPopup(`
            <div style="font-family:Inconsolata,monospace;font-size:10px;color:#9aa8b4;min-width:180px">
              <div style="font-family:Rajdhani;font-size:13px;font-weight:600;color:${ac.isMilitary ? "#ff2a6d" : "#00d4aa"}">
                ${ac.callsign || ac.icao}
                ${ac.isMilitary ? ' <span style="color:#ff2a6d;font-size:9px">\u2605 MIL</span>' : ""}
              </div>
              <div style="color:#8b949e;font-size:9px;margin-bottom:6px">${ac.country}</div>
              <div style="display:flex;justify-content:space-between"><span style="color:#7d8590">ALT</span><span>${altFt} ft</span></div>
              <div style="display:flex;justify-content:space-between"><span style="color:#7d8590">SPD</span><span>${speedKts} kts</span></div>
              <div style="display:flex;justify-content:space-between"><span style="color:#7d8590">HDG</span><span>${Math.round(heading)}\u00b0</span></div>
              ${vrFpm ? `<div style="display:flex;justify-content:space-between"><span style="color:#7d8590">V/S</span><span>${vr} ${vrFpm} fpm</span></div>` : ""}
              <div style="display:flex;justify-content:space-between"><span style="color:#7d8590">ICAO</span><span>${ac.icao}</span></div>
              ${ac.squawk ? `<div style="display:flex;justify-content:space-between"><span style="color:#7d8590">SQK</span><span>${ac.squawk}</span></div>` : ""}
            </div>
          `, { className: "war-room-popup" });

          marker.addTo(group);
          rendered++;
        }

        group.addTo(map!);
        flightLayerRef.current = group;

        // Update layer count
        const flightLayer = layers.find((l) => l.id === "live-flights");
        if (flightLayer) flightLayer.count = data.count || rendered;
        const milLayer = layers.find((l) => l.id === "mil-only");
        if (milLayer) milLayer.count = data.milCount || 0;
      } catch {
        // Keep last known positions on error
      }
    }

    fetchAndRender();
    flightIntervalRef.current = setInterval(fetchAndRender, 30000);

    // Re-render on zoom change for density filtering
    const onZoom = () => fetchAndRender();
    map.on("zoomend", onZoom);

    return () => {
      if (flightIntervalRef.current) {
        clearInterval(flightIntervalRef.current);
        flightIntervalRef.current = null;
      }
      map.off("zoomend", onZoom);
    };
  }, [layers]);

  // ── OSM Pipeline layer (fetched from Overpass API) ──
  const pipelineLayerRef = useRef<L.LayerGroup | null>(null);
  const pipelineDataRef = useRef<unknown>(null);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const pipelinesEnabled = layers.find((l) => l.id === "pipelines")?.enabled;

    // Remove if disabled
    if (!pipelinesEnabled) {
      if (pipelineLayerRef.current) {
        map.removeLayer(pipelineLayerRef.current);
        pipelineLayerRef.current = null;
      }
      return;
    }

    // If we already have data, just re-render
    if (pipelineDataRef.current) {
      renderPipelines(map, pipelineDataRef.current as GeoJSON.FeatureCollection);
      return;
    }

    // Fetch from API
    fetch("/api/conflict/pipelines")
      .then((r) => r.json())
      .then((data) => {
        if (!data.features) return;
        pipelineDataRef.current = data;
        const oilGasCount = (data.stats?.oil || 0) + (data.stats?.gas || 0) + (data.stats?.petrochemical || 0);
        console.log(`Loaded ${data.stats?.total || data.features.length} pipeline segments (${oilGasCount} oil/gas)`);
        // Update layer count
        const pipeLayer = layers.find((l) => l.id === "pipelines");
        if (pipeLayer) pipeLayer.count = oilGasCount;
        if (layers.find((l) => l.id === "pipelines")?.enabled) {
          renderPipelines(map, data);
        }
      })
      .catch((err) => console.error("Pipeline load error:", err));

    function renderPipelines(m: L.Map, data: GeoJSON.FeatureCollection) {
      if (pipelineLayerRef.current) {
        m.removeLayer(pipelineLayerRef.current);
      }

      const group = L.layerGroup();

      const getPipelineColor = (type: string) => {
        switch (type) {
          case "oil": return "#d4962a";
          case "gas": return "#00d4aa";
          case "water": return "#388bfd";
          case "petrochemical": return "#c8b832";
          default: return "#8b949e";
        }
      };
      const getPipelineWeight = (type: string) => {
        switch (type) {
          case "oil": return 2;
          case "gas": return 2;
          case "water": return 1;
          case "petrochemical": return 1.5;
          default: return 1;
        }
      };
      const getPipelineOpacity = (type: string) => {
        switch (type) {
          case "oil": return 0.7;
          case "gas": return 0.6;
          case "water": return 0.3;
          case "petrochemical": return 0.5;
          default: return 0.25;
        }
      };
      const getPipelineDash = (type: string) => {
        switch (type) {
          case "oil": return "8 4";
          case "gas": return "4 4";
          case "water": return "";
          case "petrochemical": return "2 4";
          default: return "2 6";
        }
      };

      for (const feature of data.features) {
        if (!feature.geometry || feature.geometry.type !== "LineString") continue;
        const coords = (feature.geometry as GeoJSON.LineString).coordinates;
        if (coords.length < 2) continue;

        const props = feature.properties || {};
        const type = props.pipelineType || "unknown";
        // Skip water and unknown pipelines — they're not conflict-relevant and there are thousands
        if (type === "water" || type === "unknown") continue;
        const color = getPipelineColor(type);
        const weight = getPipelineWeight(type);
        const opacity = getPipelineOpacity(type);
        const dashArray = getPipelineDash(type);

        // Simplify long segments — keep every Nth point to reduce rendering load
        let simplified = coords;
        if (coords.length > 20) {
          const step = Math.ceil(coords.length / 20);
          simplified = coords.filter((_: number[], i: number) => i === 0 || i === coords.length - 1 || i % step === 0);
        }
        const latLngs = simplified.map((c: number[]) => [c[1], c[0]] as L.LatLngTuple);
        const line = L.polyline(latLngs, { color, weight, opacity, dashArray, interactive: true });

        const name = props.name || "Unnamed Pipeline";
        const substance = props.substance || "unknown";
        const operator = props.operator || "";
        const typeLabel = type.charAt(0).toUpperCase() + type.slice(1);

        line.bindPopup(`
          <div style="font-family:Inconsolata,monospace;font-size:10px;color:#9aa8b4;min-width:200px">
            <div style="font-family:Rajdhani,sans-serif;font-size:13px;font-weight:600;color:${color}">${name}</div>
            <div style="display:flex;justify-content:space-between;margin-bottom:6px">
              <span style="font-size:8px;padding:1px 5px;background:${color}15;color:${color};border:1px solid ${color}30">${typeLabel.toUpperCase()}</span>
            </div>
            ${substance !== "unknown" ? `<div style="display:flex;justify-content:space-between"><span style="color:#7d8590">Substance</span><span>${substance}</span></div>` : ""}
            ${operator ? `<div style="display:flex;justify-content:space-between"><span style="color:#7d8590">Operator</span><span>${operator}</span></div>` : ""}
            ${props.diameter ? `<div style="display:flex;justify-content:space-between"><span style="color:#7d8590">Diameter</span><span>${props.diameter}</span></div>` : ""}
            ${props.location ? `<div style="display:flex;justify-content:space-between"><span style="color:#7d8590">Location</span><span>${props.location}</span></div>` : ""}
          </div>
        `, { className: "war-room-popup" });

        // Hover highlight
        line.on("mouseover", () => {
          line.setStyle({ weight: 4, opacity: 1 });
        });
        line.on("mouseout", () => {
          line.setStyle({ weight, opacity });
        });

        line.addTo(group);
      }

      group.addTo(m);
      pipelineLayerRef.current = group;
    }
  }, [layers]);

  // Cumulative wave markers (static dots showing war footprint buildup)
  const cumulativeLayerRef = useRef<L.LayerGroup | null>(null);
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (cumulativeLayerRef.current) {
      map.removeLayer(cumulativeLayerRef.current);
      cumulativeLayerRef.current = null;
    }

    if (!cumulativeWaveTargets || cumulativeWaveTargets.length === 0) return;

    const group = L.layerGroup();
    cumulativeWaveTargets.forEach((t) => {
      if (!t.lat || !t.lng) return;
      const color = getAttackerColor(t.attacker);
      const icon = L.divIcon({
        className: "",
        html: `<div style="width:6px;height:6px;border-radius:50%;background:${color};opacity:0.6;box-shadow:0 0 3px ${color}"></div>`,
        iconSize: [6, 6],
        iconAnchor: [3, 3],
      });
      L.marker([t.lat, t.lng], { icon, interactive: false }).addTo(group);
    });
    group.addTo(map);
    cumulativeLayerRef.current = group;
  }, [cumulativeWaveTargets]);

  // Wave target pulsing markers (current wave only)
  const waveLayerRef = useRef<L.LayerGroup | null>(null);
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Clear previous wave markers
    if (waveLayerRef.current) {
      map.removeLayer(waveLayerRef.current);
      waveLayerRef.current = null;
    }

    if (!waveTargets || waveTargets.length === 0) return;

    const group = L.layerGroup();
    waveTargets.forEach((t) => {
      if (!t.lat || !t.lng) return;
      const pulseIcon = L.divIcon({
        className: "",
        html: `<div style="position:relative;width:28px;height:28px">
          <div style="position:absolute;inset:0;border:2px solid #e8364a;border-radius:50%;animation:wave-pulse 1.5s ease-out infinite;opacity:0"></div>
          <div style="position:absolute;inset:4px;border:2px solid #e8364a;border-radius:50%;animation:wave-pulse 1.5s ease-out 0.3s infinite;opacity:0"></div>
          <div style="position:absolute;inset:10px;background:#e8364a;border-radius:50%"></div>
        </div>
        <style>@keyframes wave-pulse{0%{transform:scale(1);opacity:0.8}100%{transform:scale(2.5);opacity:0}}</style>`,
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      });
      L.marker([t.lat, t.lng], { icon: pulseIcon })
        .bindPopup(`<b style="color:#e8364a">WAVE TARGET</b><br/>${t.name}`)
        .addTo(group);
    });
    group.addTo(map);
    waveLayerRef.current = group;

    // Smart fly: only fly if targets are outside current view
    const validTargets = waveTargets.filter((t) => t.lat && t.lng);
    if (validTargets.length > 0) {
      const currentBounds = map.getBounds();
      const anyOutside = validTargets.some((t) => !currentBounds.contains([t.lat, t.lng]));
      if (anyOutside) {
        const bounds = L.latLngBounds(validTargets.map((t) => [t.lat, t.lng] as [number, number]));
        map.flyToBounds(bounds.pad(0.3), { duration: 0.5, maxZoom: 8 });
      }
    }
  }, [waveTargets]);

  const handleTileChange = useCallback((style: string) => {
    const map = mapRef.current;
    if (!map || !tileRef.current) return;
    map.removeLayer(tileRef.current);
    const tile = L.tileLayer(TILE_URLS[style] || TILE_URLS.dark, { maxZoom: 18 });
    tile.addTo(map);
    tileRef.current = tile;
  }, []);

  return (
    <div className="relative w-full h-full">
      <div ref={containerRef} className="w-full h-full" />
      {/* Tile switcher */}
      <div className="absolute top-3 right-14 z-[1000] flex gap-1">
        {(["dark", "satellite", "topo"] as const).map((s) => (
          <button
            key={s}
            onClick={() => handleTileChange(s)}
            className="px-2 py-0.5 text-[12px] font-mono tracking-wide bg-surface-2/90 border border-border text-text-dim hover:text-accent hover:border-accent/30 transition-colors uppercase"
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}
