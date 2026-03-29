"use client";

import { useEffect, useRef, useCallback } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

export interface UkraineLayer {
  id: string;
  name: string;
  enabled: boolean;
  count?: number;
  color: string;
}

export interface CityMarker {
  name: string;
  lat: number;
  lng: number;
  control: "Ukraine" | "Russia";
  status: string;
  pop: number;
}

export interface BaseMarker {
  name: string;
  lat: number;
  lng: number;
  side: string;
  type: string;
  notes: string;
}

export interface DroneLaunchSite {
  name: string;
  lat: number;
  lng: number;
  launches: number;
  note: string;
}

export interface DroneTarget {
  name: string;
  lat: number;
  lng: number;
  type: string;
  hits: string;
}

export interface DroneRoute {
  name: string;
  from: [number, number];
  waypoints: [number, number][];
  to: [number, number];
  color: string;
}

export interface EnergyTarget {
  name: string;
  lat: number;
  lng: number;
  hits: string;
  status: string;
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

interface UkraineMapProps {
  layers: UkraineLayer[];
  cities: CityMarker[];
  bases: BaseMarker[];
  frontlineGeo: GeoJSON.FeatureCollection | null;
  droneLaunchSites?: DroneLaunchSite[];
  droneTargetsUA?: DroneTarget[];
  droneTargetsRU?: DroneTarget[];
  droneRoutes?: DroneRoute[];
  energyTargetsUA?: EnergyTarget[];
  energyTargetsRU?: EnergyTarget[];
  firmsPoints?: FirmsPoint[];
  acledEvents?: AcledEvent[];
}

const UA_BLUE = "#005BBB";
const UA_GOLD = "#FFD500";
const RU_RED = "#e8364a";
const ACCENT = "#00d4aa";

function cityColor(control: string): string {
  return control === "Ukraine" ? UA_BLUE : RU_RED;
}

function baseIcon(side: string, type: string): string {
  if (type.includes("Nuclear")) return "#ffb020";
  if (type.includes("Infrastructure") || type.includes("Refinery") || type.includes("Ammo") || type.includes("Port")) return "#d4962a";
  return side.includes("Ukraine") ? UA_BLUE : RU_RED;
}

export default function UkraineMap({ layers, cities, bases, frontlineGeo, droneLaunchSites, droneTargetsUA, droneTargetsRU, droneRoutes, energyTargetsUA, energyTargetsRU, firmsPoints, acledEvents }: UkraineMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerGroupsRef = useRef<Record<string, L.LayerGroup>>({});

  const isLayerEnabled = useCallback(
    (id: string) => layers.find((l) => l.id === id)?.enabled ?? false,
    [layers]
  );

  // Initialize map once
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: [48.5, 35.5],
      zoom: 6,
      zoomControl: true,
      attributionControl: true,
      maxBounds: [
        [42, 20],
        [56, 46],
      ],
    });

    L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
      attribution: "&copy; OSM &amp; CARTO",
      maxZoom: 18,
    }).addTo(map);

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
      layerGroupsRef.current = {};
    };
  }, []);

  // Render cities layer
  useEffect(() => {
    if (!mapRef.current) return;
    const map = mapRef.current;
    const groupKey = "cities";

    if (layerGroupsRef.current[groupKey]) {
      layerGroupsRef.current[groupKey].remove();
    }

    if (!isLayerEnabled("cities")) return;

    const group = L.layerGroup();
    cities.forEach((c) => {
      const color = cityColor(c.control);
      const radius = Math.max(6, Math.min(14, c.pop / 150000));

      // Outer glow halo
      L.circleMarker([c.lat, c.lng], {
        radius: radius + 4,
        fillColor: color,
        color: "transparent",
        weight: 0,
        fillOpacity: 0.1,
      }).addTo(group);

      L.circleMarker([c.lat, c.lng], {
        radius,
        fillColor: color,
        color: color,
        weight: 2,
        opacity: 0.9,
        fillOpacity: 0.4,
      })
        .bindPopup(
          `<div style="font-family:Rajdhani,sans-serif;font-size:14px">
            <div style="font-weight:600;color:${color};font-size:16px">${c.name}</div>
            <div style="color:#c0cad4;font-family:Inconsolata,monospace;font-size:12px">${c.control.toUpperCase()} CONTROL</div>
            <div style="color:#7a8a96;font-family:Inconsolata,monospace;font-size:11px">${c.status}</div>
            <div style="color:#4a5a68;font-family:Inconsolata,monospace;font-size:11px">Pop: ${(c.pop / 1000).toFixed(0)}k</div>
          </div>`,
          { className: "ukraine-popup" }
        )
        .addTo(group);

      // City label
      L.marker([c.lat, c.lng], {
        icon: L.divIcon({
          className: "city-label",
          html: `<div style="font-family:Inconsolata,monospace;font-size:11px;color:${color};text-shadow:0 0 6px rgba(0,0,0,0.95),0 0 12px rgba(0,0,0,0.7);white-space:nowrap;transform:translate(10px,-7px);opacity:0.9;font-weight:600">${c.name}</div>`,
          iconSize: [0, 0],
        }),
      }).addTo(group);
    });

    group.addTo(map);
    layerGroupsRef.current[groupKey] = group;
  }, [cities, layers, isLayerEnabled]);

  // Render bases layer
  useEffect(() => {
    if (!mapRef.current) return;
    const map = mapRef.current;
    const groupKey = "bases";

    if (layerGroupsRef.current[groupKey]) {
      layerGroupsRef.current[groupKey].remove();
    }

    const uaEnabled = isLayerEnabled("ua-bases");
    const ruEnabled = isLayerEnabled("ru-bases");
    if (!uaEnabled && !ruEnabled) return;

    const group = L.layerGroup();
    bases.forEach((b) => {
      const isUA = b.side.includes("Ukraine");
      if (isUA && !uaEnabled) return;
      if (!isUA && !ruEnabled) return;

      const color = baseIcon(b.side, b.type);
      const icon = b.type.includes("Nuclear") ? "\u2622" : b.type.includes("Air") ? "\u2708" : b.type.includes("Naval") ? "\u2693" : "\u25C6";

      L.marker([b.lat, b.lng], {
        icon: L.divIcon({
          className: "base-icon",
          html: `<div style="font-size:18px;color:${color};text-shadow:0 0 8px ${color}50,0 0 16px ${color}20;text-align:center;line-height:22px">${icon}</div>`,
          iconSize: [22, 22],
          iconAnchor: [11, 11],
        }),
      })
        .bindPopup(
          `<div style="font-family:Rajdhani,sans-serif;font-size:14px">
            <div style="font-weight:600;color:${color};font-size:16px">${b.name}</div>
            <div style="color:#c0cad4;font-family:Inconsolata,monospace;font-size:12px">${b.type} — ${b.side}</div>
            <div style="color:#7a8a96;font-family:Inconsolata,monospace;font-size:11px">${b.notes}</div>
          </div>`
        )
        .addTo(group);
    });

    group.addTo(map);
    layerGroupsRef.current[groupKey] = group;
  }, [bases, layers, isLayerEnabled]);

  // Render frontline
  useEffect(() => {
    if (!mapRef.current || !frontlineGeo) return;
    const map = mapRef.current;
    const groupKey = "frontline";

    if (layerGroupsRef.current[groupKey]) {
      layerGroupsRef.current[groupKey].remove();
    }

    if (!isLayerEnabled("frontline")) return;

    const group = L.layerGroup();
    L.geoJSON(frontlineGeo, {
      style: (feature) => {
        const type = feature?.properties?.type;
        if (type === "admin_border") {
          return { color: "#6c7c88", weight: 1.5, dashArray: "6,4", opacity: 0.6 };
        }
        // frontline
        return { color: RU_RED, weight: 3, dashArray: "8,5", opacity: 0.8 };
      },
      onEachFeature: (feature, layer) => {
        if (feature.properties?.name) {
          layer.bindPopup(
            `<div style="font-family:Inconsolata,monospace;font-size:11px;color:#e6edf3">${feature.properties.name}</div>`
          );
        }
      },
    }).addTo(group);

    group.addTo(map);
    layerGroupsRef.current[groupKey] = group;
  }, [frontlineGeo, layers, isLayerEnabled]);

  // Render occupied zone shading
  useEffect(() => {
    if (!mapRef.current) return;
    const map = mapRef.current;
    const groupKey = "occupied";

    if (layerGroupsRef.current[groupKey]) {
      layerGroupsRef.current[groupKey].remove();
    }

    if (!isLayerEnabled("occupied")) return;

    // Simplified occupied zone polygon (Donbas + Zaporizhzhia + Kherson south + Crimea)
    const occupiedZone: [number, number][] = [
      [49.4, 36.6], [49.2, 37.0], [48.9, 37.3], [48.7, 37.6],
      [48.5, 37.8], [48.3, 38.0], [48.0, 38.1], [47.7, 37.9],
      [47.5, 37.7], [47.3, 37.4], [47.1, 37.0], [47.0, 36.5],
      [46.8, 35.8], [46.7, 35.5], [46.6, 35.2], [46.5, 34.8],
      [46.2, 33.8], [46.1, 33.5],
      // Crimea
      [45.8, 33.5], [45.3, 33.0], [44.4, 33.5], [44.4, 34.5],
      [44.6, 35.5], [45.3, 36.6], [45.6, 36.5],
      // Back up east border
      [46.0, 38.5], [47.0, 39.5], [48.5, 39.8], [49.4, 39.3], [49.4, 36.6],
    ];

    const group = L.layerGroup();
    L.polygon(occupiedZone, {
      fillColor: RU_RED,
      fillOpacity: 0.06,
      color: RU_RED,
      weight: 0,
    }).addTo(group);

    group.addTo(map);
    layerGroupsRef.current[groupKey] = group;
  }, [layers, isLayerEnabled]);

  // Render drone launch sites
  useEffect(() => {
    if (!mapRef.current) return;
    const map = mapRef.current;
    const groupKey = "drone-launch-sites";

    if (layerGroupsRef.current[groupKey]) {
      layerGroupsRef.current[groupKey].remove();
    }

    if (!isLayerEnabled("drone-launch-sites") || !droneLaunchSites?.length) return;

    const group = L.layerGroup();
    droneLaunchSites.forEach((site) => {
      if (site.launches === 0) return; // skip production-only facilities
      const radius = Math.max(7, Math.min(18, site.launches / 100));

      // Outer glow halo
      L.circleMarker([site.lat, site.lng], {
        radius: radius + 5,
        fillColor: RU_RED,
        color: "transparent",
        weight: 0,
        fillOpacity: 0.1,
      }).addTo(group);

      L.circleMarker([site.lat, site.lng], {
        radius,
        fillColor: RU_RED,
        color: RU_RED,
        weight: 2,
        opacity: 0.9,
        fillOpacity: 0.35,
      })
        .bindPopup(
          `<div style="font-family:Rajdhani,sans-serif;font-size:14px">
            <div style="font-weight:600;color:${RU_RED};font-size:16px">${site.name}</div>
            <div style="color:#e6edf3;font-family:Inconsolata,monospace;font-size:12px">${site.launches.toLocaleString()} launches</div>
            <div style="color:#7a8a96;font-family:Inconsolata,monospace;font-size:11px">${site.note}</div>
          </div>`
        )
        .addTo(group);

      // Pulsing ring for major sites
      if (site.launches > 100) {
        L.marker([site.lat, site.lng], {
          icon: L.divIcon({
            className: "drone-launch-pulse",
            html: `<div style="width:28px;height:28px;border:2px solid ${RU_RED};border-radius:50%;opacity:0.4;animation:pulse 2s infinite"></div>`,
            iconSize: [28, 28],
            iconAnchor: [14, 14],
          }),
        }).addTo(group);
      }
    });

    group.addTo(map);
    layerGroupsRef.current[groupKey] = group;
  }, [droneLaunchSites, layers, isLayerEnabled]);

  // Render UA drone targets (Russian targets struck by Ukraine)
  useEffect(() => {
    if (!mapRef.current) return;
    const map = mapRef.current;
    const groupKey = "drone-targets-ru";

    if (layerGroupsRef.current[groupKey]) {
      layerGroupsRef.current[groupKey].remove();
    }

    if (!isLayerEnabled("drone-targets-ru") || !droneTargetsRU?.length) return;

    const group = L.layerGroup();
    droneTargetsRU.forEach((t) => {
      const typeColor = t.type === "Energy" ? "#d4962a" : t.type === "Strategic" ? "#ffb020" : t.type === "Capital" ? UA_GOLD : UA_BLUE;
      L.marker([t.lat, t.lng], {
        icon: L.divIcon({
          className: "drone-target-ru",
          html: `<div style="font-size:16px;color:${typeColor};text-shadow:0 0 8px ${typeColor}60,0 0 16px ${typeColor}30;text-align:center;line-height:20px">\u2716</div>`,
          iconSize: [20, 20],
          iconAnchor: [10, 10],
        }),
      })
        .bindPopup(
          `<div style="font-family:Rajdhani,sans-serif;font-size:14px">
            <div style="font-weight:600;color:${typeColor};font-size:16px">${t.name}</div>
            <div style="color:#c0cad4;font-family:Inconsolata,monospace;font-size:12px">${t.type}</div>
            <div style="color:#7a8a96;font-family:Inconsolata,monospace;font-size:11px">${t.hits}</div>
          </div>`
        )
        .addTo(group);
    });

    group.addTo(map);
    layerGroupsRef.current[groupKey] = group;
  }, [droneTargetsRU, layers, isLayerEnabled]);

  // Render drone routes
  useEffect(() => {
    if (!mapRef.current) return;
    const map = mapRef.current;
    const groupKey = "drone-routes";

    if (layerGroupsRef.current[groupKey]) {
      layerGroupsRef.current[groupKey].remove();
    }

    if (!isLayerEnabled("drone-routes") || !droneRoutes?.length) return;

    const group = L.layerGroup();
    droneRoutes.forEach((route) => {
      const points: [number, number][] = [
        route.from,
        ...route.waypoints,
        route.to,
      ];

      L.polyline(points, {
        color: route.color,
        weight: 2,
        dashArray: "6,8",
        opacity: 0.6,
      })
        .bindPopup(
          `<div style="font-family:Inconsolata,monospace;font-size:11px;color:${route.color}">${route.name}</div>`
        )
        .addTo(group);
    });

    group.addTo(map);
    layerGroupsRef.current[groupKey] = group;
  }, [droneRoutes, layers, isLayerEnabled]);

  // Render RU strikes on UA energy
  useEffect(() => {
    if (!mapRef.current) return;
    const map = mapRef.current;
    const groupKey = "energy-ru-on-ua";

    if (layerGroupsRef.current[groupKey]) {
      layerGroupsRef.current[groupKey].remove();
    }

    if (!isLayerEnabled("energy-ru-on-ua") || !energyTargetsUA?.length) return;

    const group = L.layerGroup();
    energyTargetsUA.forEach((t) => {
      L.marker([t.lat, t.lng], {
        icon: L.divIcon({
          className: "",
          html: `<div style="font-size:18px;color:${RU_RED};text-shadow:0 0 10px ${RU_RED}70,0 0 20px ${RU_RED}30;text-align:center;line-height:20px">\u26A1</div>`,
          iconSize: [20, 20],
          iconAnchor: [10, 10],
        }),
      })
        .bindPopup(
          `<div style="font-family:Rajdhani,sans-serif;font-size:14px">
            <div style="font-weight:600;color:${RU_RED};font-size:16px">${t.name}</div>
            <div style="color:#c0cad4;font-family:Inconsolata,monospace;font-size:12px">Hits: ${t.hits}</div>
            <div style="color:#d4962a;font-family:Inconsolata,monospace;font-size:11px">${t.status}</div>
          </div>`
        )
        .addTo(group);
    });

    group.addTo(map);
    layerGroupsRef.current[groupKey] = group;
  }, [energyTargetsUA, layers, isLayerEnabled]);

  // Render UA strikes on RU energy
  useEffect(() => {
    if (!mapRef.current) return;
    const map = mapRef.current;
    const groupKey = "energy-ua-on-ru";

    if (layerGroupsRef.current[groupKey]) {
      layerGroupsRef.current[groupKey].remove();
    }

    if (!isLayerEnabled("energy-ua-on-ru") || !energyTargetsRU?.length) return;

    const group = L.layerGroup();
    energyTargetsRU.forEach((t) => {
      L.marker([t.lat, t.lng], {
        icon: L.divIcon({
          className: "",
          html: `<div style="font-size:16px;color:#d4962a;text-shadow:0 0 10px #d4962a70,0 0 20px #d4962a30;text-align:center;line-height:20px">\uD83D\uDD25</div>`,
          iconSize: [20, 20],
          iconAnchor: [10, 10],
        }),
      })
        .bindPopup(
          `<div style="font-family:Rajdhani,sans-serif;font-size:14px">
            <div style="font-weight:600;color:${UA_BLUE};font-size:16px">${t.name}</div>
            <div style="color:#c0cad4;font-family:Inconsolata,monospace;font-size:12px">Hits: ${t.hits}</div>
            <div style="color:#d4962a;font-family:Inconsolata,monospace;font-size:11px">${t.status}</div>
          </div>`
        )
        .addTo(group);
    });

    group.addTo(map);
    layerGroupsRef.current[groupKey] = group;
  }, [energyTargetsRU, layers, isLayerEnabled]);

  // ── NASA FIRMS Fire/Thermal Anomalies ──
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const groupKey = "firms-fires";
    if (layerGroupsRef.current[groupKey]) {
      layerGroupsRef.current[groupKey].remove();
    }
    if (!isLayerEnabled("firms-fires") || !firmsPoints?.length) return;

    const group = L.layerGroup();
    firmsPoints.forEach((pt) => {
      if (!pt.lat || !pt.lng) return;
      const intensity = Math.min(1, pt.frp / 100);
      const radius = Math.max(4, Math.min(12, 4 + intensity * 8));
      const color = intensity > 0.6 ? "#ff4400" : intensity > 0.3 ? "#ff8800" : "#ffaa44";
      L.circleMarker([pt.lat, pt.lng], {
        radius,
        fillColor: color,
        fillOpacity: 0.5 + intensity * 0.3,
        color,
        weight: 1,
        opacity: 0.7,
      })
        .bindPopup(
          `<div style="font-family:Inconsolata,monospace;font-size:12px;color:#c0cad4;min-width:180px">
            <div style="color:${color};font-weight:700;font-size:14px">\uD83D\uDD25 THERMAL ANOMALY</div>
            <div style="color:#e6edf3;font-size:12px;margin:2px 0">FRP: ${pt.frp.toFixed(1)} MW</div>
            <div style="color:#7a8a96;font-size:11px">Brightness: ${pt.brightness.toFixed(1)}K</div>
            <div style="color:#7a8a96;font-size:11px">Confidence: ${pt.confidence}</div>
            <div style="color:#7a8a96;font-size:10px">${pt.acq_date} ${pt.acq_time} — ${pt.satellite}</div>
          </div>`,
          { className: "war-room-popup" }
        )
        .addTo(group);
    });
    group.addTo(map);
    layerGroupsRef.current[groupKey] = group;
  }, [firmsPoints, layers, isLayerEnabled]);

  // ── ACLED Armed Conflict Events ──
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const groupKey = "acled-events";
    if (layerGroupsRef.current[groupKey]) {
      layerGroupsRef.current[groupKey].remove();
    }
    if (!isLayerEnabled("acled-events") || !acledEvents?.length) return;

    const acledTypeColors: Record<string, string> = {
      "Battles": UA_BLUE,
      "Violence against civilians": "#d06090",
      "Explosions/Remote violence": RU_RED,
      "Riots": "#d4962a",
      "Protests": UA_GOLD,
      "Strategic developments": ACCENT,
    };

    const group = L.layerGroup();
    acledEvents.forEach((ev) => {
      if (!ev.lat || !ev.lng) return;
      const color = acledTypeColors[ev.event_type] || "#8b949e";
      const hasDeaths = ev.fatalities > 0;
      const radius = hasDeaths ? Math.max(5, Math.min(12, 5 + ev.fatalities / 5)) : 4;
      L.circleMarker([ev.lat, ev.lng], {
        radius,
        fillColor: color,
        fillOpacity: 0.45,
        color,
        weight: 1.5,
        opacity: 0.8,
      })
        .bindPopup(
          `<div style="font-family:Inconsolata,monospace;font-size:12px;color:#c0cad4;min-width:220px">
            <div style="color:${color};font-weight:700;font-size:13px">${ev.event_type}</div>
            <div style="color:#e6edf3;font-size:12px;margin:2px 0">${ev.sub_event_type}</div>
            <div style="color:#7a8a96;font-size:11px">${ev.event_date} — ${ev.location}, ${ev.admin1}</div>
            ${hasDeaths ? `<div style="color:${RU_RED};font-weight:700;font-size:13px;margin:3px 0">${ev.fatalities} fatalities</div>` : ""}
            <div style="color:#7a8a96;font-size:11px">${ev.actor1}${ev.actor2 ? ` vs ${ev.actor2}` : ""}</div>
            <div style="color:#8b949e;font-size:10px;margin-top:3px;max-width:250px;word-break:break-word">${ev.notes.slice(0, 200)}${ev.notes.length > 200 ? "..." : ""}</div>
          </div>`,
          { className: "war-room-popup" }
        )
        .addTo(group);
    });
    group.addTo(map);
    layerGroupsRef.current[groupKey] = group;
  }, [acledEvents, layers, isLayerEnabled]);

  return (
    <div className="w-full h-full relative">
      <div ref={containerRef} className="w-full h-full" />
      {/* HUD overlay */}
      <div
        className="absolute top-2 left-2 z-[1000] pointer-events-none"
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
        THEATER MAP — UKRAINE FRONT
      </div>

      {/* Legend */}
      <div
        className="absolute bottom-2 left-2 z-[1000] pointer-events-none flex gap-3"
        style={{
          padding: "4px 10px",
          background: "rgba(10,13,16,0.85)",
          border: "1px solid rgba(0,210,170,0.06)",
          fontFamily: "'Inconsolata', monospace",
          fontSize: "9px",
          letterSpacing: "0.5px",
        }}
      >
        <span style={{ color: UA_BLUE }}>■ UKRAINE</span>
        <span style={{ color: RU_RED }}>■ RUSSIA</span>
        <span style={{ color: UA_GOLD }}>■ CONTESTED</span>
        <span style={{ color: "#8b949e" }}>--- FRONTLINE</span>
      </div>
    </div>
  );
}
