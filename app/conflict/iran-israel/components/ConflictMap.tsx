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

export interface CumulativeWaveTarget {
  lat: number;
  lng: number;
  name: string;
  attacker: string;
  round: string;
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
}

const ATTACKER_COLORS: Record<string, string> = {
  US: "#388bfd",
  ISRAEL: "#e6edf3",
  IRAN: "#e8364a",
  HOUTHI: "#d4962a",
  HEZBOLLAH: "#c8b832",
  UNKNOWN: "#5c6c78",
};

const TILE_URLS: Record<string, string> = {
  dark: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
  satellite: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
  topo: "https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png",
};

const OPENSEAMAP_URL = "https://tiles.openseamap.org/seamark/{z}/{x}/{y}.png";

const STATUS_COLORS: Record<string, string> = {
  DESTROYED: "#e8364a",
  DAMAGED: "#d4962a",
  OPERATIONAL: "#00d4aa",
  STRUCK: "#e8364a",
  SHUTDOWN: "#5c6c78",
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
  return `<svg width="12" height="12" xmlns="http://www.w3.org/2000/svg"><circle cx="6" cy="6" r="5" fill="${color}" fill-opacity="0.8" stroke="${color}" stroke-width="1" stroke-opacity="0.4"/></svg>`;
}

function makeDiamondSvg(color: string): string {
  return `<svg width="14" height="14" xmlns="http://www.w3.org/2000/svg"><rect x="3" y="3" width="8" height="8" rx="1" fill="${color}" fill-opacity="0.8" stroke="${color}" stroke-width="1" stroke-opacity="0.4" transform="rotate(45 7 7)"/></svg>`;
}

function makeSquareSvg(color: string): string {
  return `<svg width="12" height="12" xmlns="http://www.w3.org/2000/svg"><rect x="1" y="1" width="10" height="10" rx="1" fill="${color}" fill-opacity="0.8" stroke="${color}" stroke-width="1" stroke-opacity="0.4"/></svg>`;
}

function makeTriangleSvg(color: string): string {
  return `<svg width="14" height="14" xmlns="http://www.w3.org/2000/svg"><polygon points="7,1 13,13 1,13" fill="${color}" fill-opacity="0.8" stroke="${color}" stroke-width="1" stroke-opacity="0.4"/></svg>`;
}

function makeLabelSvg(label: string, color: string): string {
  const w = 8 + label.length * 7;
  return `<svg width="${w}" height="16" xmlns="http://www.w3.org/2000/svg"><rect x="0" y="0" width="${w}" height="16" rx="2" fill="${color}" fill-opacity="0.25" stroke="${color}" stroke-width="1" stroke-opacity="0.6"/><text x="${w / 2}" y="12" text-anchor="middle" font-family="Inconsolata,monospace" font-size="10" fill="${color}" font-weight="600">${label}</text></svg>`;
}

function makeDefenseSvg(status: string): string {
  const color = STATUS_COLORS[status] || "#00d4aa";
  if (status === "DESTROYED") {
    return `<svg width="16" height="16" xmlns="http://www.w3.org/2000/svg"><circle cx="8" cy="8" r="6" fill="${color}" fill-opacity="0.3" stroke="${color}" stroke-width="1.5"/><line x1="4" y1="4" x2="12" y2="12" stroke="${color}" stroke-width="2"/><line x1="12" y1="4" x2="4" y2="12" stroke="${color}" stroke-width="2"/></svg>`;
  }
  if (status === "DAMAGED") {
    return `<svg width="16" height="16" xmlns="http://www.w3.org/2000/svg"><circle cx="8" cy="8" r="6" fill="${color}" fill-opacity="0.3" stroke="${color}" stroke-width="1.5"/><text x="8" y="12" text-anchor="middle" font-size="11" fill="${color}" font-weight="bold">!</text></svg>`;
  }
  return `<svg width="16" height="16" xmlns="http://www.w3.org/2000/svg"><circle cx="8" cy="8" r="6" fill="none" stroke="${color}" stroke-width="1.5" opacity="0.5"><animate attributeName="r" from="4" to="7" dur="2s" repeatCount="indefinite"/><animate attributeName="opacity" from="0.6" to="0" dur="2s" repeatCount="indefinite"/></circle><circle cx="8" cy="8" r="3" fill="${color}" fill-opacity="0.8"/></svg>`;
}

function makeWaterSvg(): string {
  return `<svg width="14" height="14" xmlns="http://www.w3.org/2000/svg"><circle cx="7" cy="7" r="6" fill="#388bfd" fill-opacity="0.3" stroke="#388bfd" stroke-width="1"/><text x="7" y="11" text-anchor="middle" font-family="Inconsolata,monospace" font-size="8" fill="#388bfd" font-weight="bold">H₂O</text></svg>`;
}

function makeNuclearSvg(): string {
  return `<svg width="18" height="18" xmlns="http://www.w3.org/2000/svg"><circle cx="9" cy="9" r="8" fill="none" stroke="#ffb020" stroke-width="1.5" opacity="0.5"><animate attributeName="r" from="5" to="9" dur="1.5s" repeatCount="indefinite"/><animate attributeName="opacity" from="0.7" to="0" dur="1.5s" repeatCount="indefinite"/></circle><circle cx="9" cy="9" r="4" fill="#ffb020" fill-opacity="0.9"/></svg>`;
}

function svgIcon(svg: string, size: [number, number] = [12, 12]): L.DivIcon {
  return L.divIcon({
    html: svg,
    className: "",
    iconSize: size,
    iconAnchor: [size[0] / 2, size[1] / 2],
  });
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
  return "#5c6c7820";
}

function getAttackerColor(attacker: string): string {
  const a = attacker.toLowerCase();
  if (a.includes("us") || a.includes("america") || a.includes("centcom") || a.includes("coalition")) return "#388bfd";
  if (a.includes("israel") || a.includes("idf")) return "#e6edf3";
  if (a.includes("iran") || a.includes("irgc")) return "#e8364a";
  if (a.includes("houthi")) return "#d4962a";
  if (a.includes("hezbollah")) return "#c8b832";
  return "#5c6c78";
}

export default function ConflictMap({ layers, strikes, militaryBases, nuclearSites, countriesGeo, infrastructure, waveTargets, cumulativeWaveTargets }: ConflictMapProps) {
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
        color: "#344050",
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

      const color = ATTACKER_COLORS[strike.attacker] || "#5c6c78";
      let icon: L.DivIcon;
      if (strike.attacker === "ISRAEL") icon = svgIcon(makeDiamondSvg(color), [14, 14]);
      else if (strike.attacker === "HOUTHI" || strike.attacker === "HEZBOLLAH") icon = svgIcon(makeTriangleSvg(color), [14, 14]);
      else icon = svgIcon(makeCircleSvg(color));

      const marker = L.marker([strike.lat, strike.lng], { icon });
      marker.bindPopup(`
        <div style="font-family:Inconsolata,monospace;font-size:12px;color:#9aa8b4;min-width:200px">
          <div style="color:${color};font-weight:600;font-size:13px;margin-bottom:4px">${strike.attacker} STRIKE</div>
          <div style="color:#5c6c78;font-size:11px;margin-bottom:4px">${strike.date || "Date unknown"}</div>
          <div style="margin-bottom:4px">${strike.target || strike.location || "Unknown target"}</div>
          ${strike.weaponType ? `<div style="color:#d4962a;font-size:11px">WEAPON: ${strike.weaponType}</div>` : ""}
          ${strike.country ? `<div style="font-size:11px">${strike.country}</div>` : ""}
          <div style="color:#344050;font-size:10px;margin-top:4px;border-top:1px solid rgba(0,212,170,0.1);padding-top:4px">
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
            <div style="color:#388bfd;font-weight:600;font-size:13px">${base.name}</div>
            <div style="color:#5c6c78;font-size:11px">${base.type} — ${base.country}</div>
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
            <div style="color:#388bfd;font-weight:600;font-size:13px">${base.name}</div>
            <div style="color:#5c6c78;font-size:11px">${base.type} — Israel</div>
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
        const m = L.marker([site.lat, site.lng], { icon: svgIcon(makeNuclearSvg(), [18, 18]) });
        m.bindPopup(`
          <div style="font-family:Inconsolata,monospace;font-size:12px;color:#9aa8b4;min-width:220px">
            <div style="color:#ffb020;font-weight:600;font-size:13px">${site.name}</div>
            <div style="color:#5c6c78;font-size:11px">${site.type}${site.enrichment ? ` — ${site.enrichment} enrichment` : ""}</div>
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
        const color = f.status === "STRUCK" || f.status === "DAMAGED" ? "#e8364a" : f.status === "SHUTDOWN" ? "#5c6c78" : "#d4962a";
        const m = L.marker([f.lat, f.lng], { icon: svgIcon(makeLabelSvg(f.type, color), [8 + f.type.length * 7, 16]) });
        m.bindPopup(`
          <div style="font-family:Inconsolata,monospace;font-size:12px;color:#9aa8b4;min-width:200px">
            <div style="color:#d4962a;font-weight:600;font-size:13px">${f.name}</div>
            <div style="color:#5c6c78;font-size:11px">${f.type} — ${f.country}</div>
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
            <div style="color:${CHOKEPOINT_BORDERS[cp.status]};font-weight:600;font-size:13px">${cp.name}</div>
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
        const m = L.marker([d.lat, d.lng], { icon: svgIcon(makeWaterSvg(), [14, 14]) });
        m.bindPopup(`
          <div style="font-family:Inconsolata,monospace;font-size:12px;color:#9aa8b4;min-width:180px">
            <div style="color:#388bfd;font-weight:600;font-size:13px">${d.name}</div>
            <div style="color:#5c6c78;font-size:11px">${d.country} — ${d.capacity}</div>
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
        const m = L.marker([ad.lat, ad.lng], { icon: svgIcon(makeDefenseSvg(ad.status), [16, 16]) });
        m.bindPopup(`
          <div style="font-family:Inconsolata,monospace;font-size:12px;color:#9aa8b4;min-width:220px">
            <div style="color:${STATUS_COLORS[ad.status] || "#00d4aa"};font-weight:600;font-size:13px">${ad.name}</div>
            <div style="color:#5c6c78;font-size:11px">${ad.type} — ${ad.country}</div>
            <div style="margin:4px 0;font-size:11px">${ad.notes}</div>
            <div style="color:${STATUS_COLORS[ad.status] || "#00d4aa"};font-size:11px">STATUS: ${ad.status}</div>
          </div>
        `, { className: "war-room-popup" });
        markers.push(m);
      }
      layerGroupsRef.current["air-defense"] = L.layerGroup(markers).addTo(map);
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
              <div style="color:${border};font-weight:600;font-size:13px">${as_.name}</div>
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
        const color = lane.type === "lane" ? "#388bfd" : "#5c6c78";
        const weight = lane.type === "lane" ? 2 : 1;
        const line = L.polyline(lane.coords as L.LatLngTuple[], { color, weight, opacity: 0.3, dashArray: "8 6" });
        line.bindPopup(`<div style="font-family:Inconsolata,monospace;font-size:12px;color:#9aa8b4"><div style="color:${color};font-weight:600">${lane.name}</div><div style="color:#5c6c78;font-size:11px">${lane.type.toUpperCase()}</div></div>`, { className: "war-room-popup" });
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
        circle.bindPopup(`<div style="font-family:Inconsolata,monospace;font-size:12px;color:#9aa8b4;min-width:180px"><div style="color:#d4962a;font-weight:600;font-size:13px">${zone.name}</div><div style="margin:4px 0">${zone.count}</div><div style="color:#e8364a">STATUS: ${zone.status}</div></div>`, { className: "war-room-popup" });
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
        const m = L.circleMarker([port.lat, port.lng], { radius: 4, color: port.color, fillColor: port.color, fillOpacity: 0.8, weight: 1 });
        m.bindPopup(`<div style="font-family:Inconsolata,monospace;font-size:12px;color:#9aa8b4;min-width:180px"><div style="color:${port.color};font-weight:600;font-size:13px">${port.name}</div><div style="color:#5c6c78;font-size:11px">${port.type.toUpperCase()}</div><div style="color:${port.color};margin-top:4px">${port.status}</div></div>`, { className: "war-room-popup" });
        maritimeLayers.push(m);
      }

      layerGroupsRef.current["sea-lanes"] = L.layerGroup(maritimeLayers).addTo(map);
    } else {
      if (seaMapRef.current && map.hasLayer(seaMapRef.current)) {
        map.removeLayer(seaMapRef.current);
      }
    }
  }, [layers, strikes, militaryBases, nuclearSites, infrastructure, countriesGeo]);

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
              <div style="color:#5c6c78;font-size:9px;margin-bottom:6px">${ac.country}</div>
              <div style="display:flex;justify-content:space-between"><span style="color:#344050">ALT</span><span>${altFt} ft</span></div>
              <div style="display:flex;justify-content:space-between"><span style="color:#344050">SPD</span><span>${speedKts} kts</span></div>
              <div style="display:flex;justify-content:space-between"><span style="color:#344050">HDG</span><span>${Math.round(heading)}\u00b0</span></div>
              ${vrFpm ? `<div style="display:flex;justify-content:space-between"><span style="color:#344050">V/S</span><span>${vr} ${vrFpm} fpm</span></div>` : ""}
              <div style="display:flex;justify-content:space-between"><span style="color:#344050">ICAO</span><span>${ac.icao}</span></div>
              ${ac.squawk ? `<div style="display:flex;justify-content:space-between"><span style="color:#344050">SQK</span><span>${ac.squawk}</span></div>` : ""}
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
          default: return "#5c6c78";
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
            ${substance !== "unknown" ? `<div style="display:flex;justify-content:space-between"><span style="color:#344050">Substance</span><span>${substance}</span></div>` : ""}
            ${operator ? `<div style="display:flex;justify-content:space-between"><span style="color:#344050">Operator</span><span>${operator}</span></div>` : ""}
            ${props.diameter ? `<div style="display:flex;justify-content:space-between"><span style="color:#344050">Diameter</span><span>${props.diameter}</span></div>` : ""}
            ${props.location ? `<div style="display:flex;justify-content:space-between"><span style="color:#344050">Location</span><span>${props.location}</span></div>` : ""}
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
