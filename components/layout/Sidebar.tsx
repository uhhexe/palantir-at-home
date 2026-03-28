"use client";

import { useState } from "react";
import {
  Map,
  MessageSquare,
  Network,
  Upload,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Camera,
  Cable,
  Zap,
  Flame,
  Activity,
  Radio,
  Building2,
  Waves,
  AlertTriangle,
  Plane,
  Ship,
  Cloud,
  Eye,
  ScanLine,
  Shield,
  Crosshair,
  Scan,
  UserSearch,
  Wifi,
  Video,
  MapPin,
} from "lucide-react";

export interface LayerConfig {
  id: string;
  name: string;
  group: string;
  enabled: boolean;
  color: string;
  count?: number;
}

interface SidebarProps {
  layers: LayerConfig[];
  onToggleLayer: (id: string) => void;
  activeView: string;
  onChangeView: (view: string) => void;
  onQuickNav?: (lat: number, lng: number, zoom: number) => void;
}

const NAV_ITEMS = [
  { id: "map", label: "MAP", icon: Map },
  { id: "chat", label: "INTEL", icon: MessageSquare },
  { id: "canvas", label: "CANVAS", icon: Network },
  { id: "ingest", label: "INGEST", icon: Upload },
];

const LAYER_ICONS: Record<string, React.ReactNode> = {
  cameras: <Camera className="w-3.5 h-3.5" />,
  "osm-cameras": <Eye className="w-3.5 h-3.5" />,
  alpr: <ScanLine className="w-3.5 h-3.5" />,
  cables: <Cable className="w-3.5 h-3.5" />,
  "power-plants": <Zap className="w-3.5 h-3.5" />,
  "nuclear-plants": <AlertTriangle className="w-3.5 h-3.5" />,
  "oil-refineries": <Flame className="w-3.5 h-3.5" />,
  "gas-pipelines": <Flame className="w-3.5 h-3.5" />,
  "transmission-lines": <Zap className="w-3.5 h-3.5" />,
  hospitals: <Activity className="w-3.5 h-3.5" />,
  "fire-stations": <Flame className="w-3.5 h-3.5" />,
  "ems-stations": <Activity className="w-3.5 h-3.5" />,
  "cell-towers": <Radio className="w-3.5 h-3.5" />,
  "microwave-towers": <Radio className="w-3.5 h-3.5" />,
  dams: <Waves className="w-3.5 h-3.5" />,
  earthquakes: <Activity className="w-3.5 h-3.5" />,
  wildfires: <Flame className="w-3.5 h-3.5" />,
  "weather-alerts": <Cloud className="w-3.5 h-3.5" />,
  flights: <Plane className="w-3.5 h-3.5" />,
  shipping: <Ship className="w-3.5 h-3.5" />,
  airports: <Plane className="w-3.5 h-3.5" />,
  ports: <Ship className="w-3.5 h-3.5" />,
  bridges: <Building2 className="w-3.5 h-3.5" />,
  "eff-alpr": <Scan className="w-3.5 h-3.5" />,
  "eff-shotspotter": <Crosshair className="w-3.5 h-3.5" />,
  "eff-drones": <Plane className="w-3.5 h-3.5" />,
  "eff-face-rec": <UserSearch className="w-3.5 h-3.5" />,
  "eff-cell-sim": <Wifi className="w-3.5 h-3.5" />,
  "eff-rtcc": <Shield className="w-3.5 h-3.5" />,
  "eff-bodycam": <Video className="w-3.5 h-3.5" />,
  "eff-camera-reg": <MapPin className="w-3.5 h-3.5" />,
  "deflock-alpr": <Scan className="w-3.5 h-3.5" />,
};

const GROUP_ORDER = [
  "surveillance",
  "police",
  "infrastructure",
  "energy",
  "emergency",
  "telecom",
  "hazards",
  "weather",
  "tracking",
];

const GROUP_LABELS: Record<string, string> = {
  surveillance: "SURVEILLANCE",
  police: "POLICE SURVEILLANCE",
  infrastructure: "INFRASTRUCTURE",
  energy: "ENERGY",
  emergency: "EMERGENCY",
  telecom: "TELECOM",
  hazards: "HAZARDS",
  weather: "WEATHER",
  tracking: "TRACKING",
};

const GROUP_COLORS: Record<string, string> = {
  surveillance: "#00e87b",
  police: "#ff6b35",
  infrastructure: "#00b4ff",
  energy: "#f5a623",
  emergency: "#ff2b4e",
  telecom: "#8b5cf6",
  hazards: "#ff2b4e",
  weather: "#00b4ff",
  tracking: "#8b5cf6",
};

const QUICK_NAV = [
  { label: "US", lat: 39.5, lng: -98.35, zoom: 5 },
  { label: "NJ", lat: 40.0583, lng: -74.4057, zoom: 8 },
  { label: "NYC", lat: 40.7128, lng: -74.006, zoom: 11 },
  { label: "FREEHOLD", lat: 40.2593, lng: -74.2735, zoom: 13 },
  { label: "NEWARK", lat: 40.7357, lng: -74.1724, zoom: 12 },
  { label: "AC", lat: 39.3643, lng: -74.4229, zoom: 12 },
  { label: "PHL", lat: 39.9526, lng: -75.1652, zoom: 11 },
  { label: "DC", lat: 38.9072, lng: -77.0369, zoom: 11 },
  { label: "ATL", lat: 33.749, lng: -84.388, zoom: 10 },
  { label: "LA", lat: 34.0522, lng: -118.2437, zoom: 10 },
  { label: "GULF", lat: 27.0, lng: -90.0, zoom: 6 },
];

export default function Sidebar({
  layers,
  onToggleLayer,
  activeView,
  onChangeView,
  onQuickNav,
}: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(
    new Set(["surveillance"])
  );

  const toggleGroup = (group: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(group)) next.delete(group);
      else next.add(group);
      return next;
    });
  };

  // Group layers by their group field
  const groupedLayers = GROUP_ORDER.reduce(
    (acc, group) => {
      const groupLayers = layers.filter((l) => l.group === group);
      if (groupLayers.length > 0) acc[group] = groupLayers;
      return acc;
    },
    {} as Record<string, LayerConfig[]>
  );

  const enabledCount = layers.filter((l) => l.enabled).length;

  return (
    <div
      className={`bg-surface border-r border-border flex flex-col shrink-0 transition-all duration-200 ${
        collapsed ? "w-[52px]" : "w-[280px]"
      }`}
    >
      {/* Nav */}
      <div className="flex flex-col gap-0.5 p-2 border-b border-border">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const active = activeView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onChangeView(item.id)}
              className={`flex items-center gap-2.5 px-2.5 py-2 rounded text-[11px] tracking-wider transition-colors ${
                active
                  ? "bg-surface-2 text-accent"
                  : "text-text-dim hover:text-text hover:bg-surface-2/50"
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </button>
          );
        })}
      </div>

      {/* Layer groups */}
      {!collapsed && activeView === "map" && (
        <div className="flex-1 overflow-y-auto">
          {/* Active layers summary */}
          <div className="px-3 py-2 border-b border-border flex items-center justify-between">
            <span className="text-[9px] text-text-dim tracking-widest uppercase">
              Data Layers
            </span>
            <span className="text-[9px] text-accent">
              {enabledCount} ACTIVE
            </span>
          </div>

          {Object.entries(groupedLayers).map(([group, groupLayers]) => {
            const isExpanded = expandedGroups.has(group);
            const activeInGroup = groupLayers.filter((l) => l.enabled).length;
            const groupColor = GROUP_COLORS[group] || "#6a6a7a";

            return (
              <div key={group} className="border-b border-border/50">
                {/* Group header */}
                <button
                  onClick={() => toggleGroup(group)}
                  className="w-full flex items-center gap-2 px-3 py-2 hover:bg-surface-2/30 transition-colors"
                >
                  <div
                    className="w-1.5 h-1.5 rounded-full shrink-0"
                    style={{ backgroundColor: groupColor }}
                  />
                  <span
                    className="text-[10px] tracking-widest flex-1 text-left"
                    style={{ color: groupColor }}
                  >
                    {GROUP_LABELS[group] || group.toUpperCase()}
                  </span>
                  {activeInGroup > 0 && (
                    <span className="text-[9px] text-text-dim">
                      {activeInGroup}
                    </span>
                  )}
                  {isExpanded ? (
                    <ChevronUp className="w-3 h-3 text-text-dim" />
                  ) : (
                    <ChevronDown className="w-3 h-3 text-text-dim" />
                  )}
                </button>

                {/* Layer items */}
                {isExpanded && (
                  <div className="pb-1">
                    {groupLayers.map((layer) => (
                      <button
                        key={layer.id}
                        onClick={() => onToggleLayer(layer.id)}
                        className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-surface-2/20 transition-colors group"
                      >
                        {/* Toggle dot */}
                        <div
                          className={`w-2 h-2 rounded-full shrink-0 transition-colors ${
                            layer.enabled ? "" : "opacity-30"
                          }`}
                          style={{ backgroundColor: layer.color }}
                        />
                        {/* Icon */}
                        <div
                          className={`shrink-0 transition-opacity ${
                            layer.enabled
                              ? "opacity-100"
                              : "opacity-40"
                          }`}
                          style={{ color: layer.color }}
                        >
                          {LAYER_ICONS[layer.id] || (
                            <div className="w-3.5 h-3.5" />
                          )}
                        </div>
                        {/* Name */}
                        <span
                          className={`flex-1 text-left text-[11px] transition-colors ${
                            layer.enabled
                              ? "text-text"
                              : "text-text-dim"
                          }`}
                        >
                          {layer.name}
                        </span>
                        {/* Count */}
                        {layer.count !== undefined && layer.count > 0 && (
                          <span className="text-[9px] text-text-dim tabular-nums">
                            {layer.count.toLocaleString()}
                          </span>
                        )}
                        {/* Toggle switch */}
                        <div
                          className={`w-6 h-3 rounded-full transition-colors relative ${
                            layer.enabled
                              ? "bg-accent/30"
                              : "bg-border"
                          }`}
                        >
                          <div
                            className={`absolute top-0.5 w-2 h-2 rounded-full transition-all ${
                              layer.enabled
                                ? "left-3.5 bg-accent"
                                : "left-0.5 bg-text-dim"
                            }`}
                          />
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}

          {/* Quick Nav */}
          {onQuickNav && (
            <div className="p-3">
              <div className="text-[9px] text-text-dim tracking-widest uppercase mb-2">
                Quick Nav
              </div>
              <div className="flex flex-wrap gap-1">
                {QUICK_NAV.map((nav) => (
                  <button
                    key={nav.label}
                    onClick={() => onQuickNav(nav.lat, nav.lng, nav.zoom)}
                    className="px-2 py-1 rounded text-[9px] tracking-wider bg-surface-2 text-text-dim hover:text-accent hover:bg-surface-2/80 transition-colors"
                  >
                    {nav.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Collapse toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="p-3 border-t border-border text-text-dim hover:text-text transition-colors"
      >
        {collapsed ? (
          <ChevronRight className="w-4 h-4" />
        ) : (
          <ChevronLeft className="w-4 h-4" />
        )}
      </button>
    </div>
  );
}

export const DEFAULT_LAYERS: LayerConfig[] = [
  // SURVEILLANCE
  { id: "cameras", name: "Live Highway Cams", group: "surveillance", enabled: true, color: "#ff3b3b" },
  { id: "osm-cameras", name: "Street & Municipal Cameras", group: "surveillance", enabled: false, color: "#6a6a7a" },
  { id: "alpr", name: "ALPR / Plate Readers", group: "surveillance", enabled: false, color: "#00b4ff" },
  { id: "deflock-alpr", name: "DeFlock ALPR Map (OSM)", group: "surveillance", enabled: false, color: "#ff6b35" },
  // POLICE SURVEILLANCE (EFF Atlas)
  { id: "eff-alpr", name: "Flock / ALPR Deployments", group: "police", enabled: false, color: "#ff6b35" },
  { id: "eff-shotspotter", name: "ShotSpotter / Gunshot", group: "police", enabled: false, color: "#ff2b4e" },
  { id: "eff-drones", name: "Police Drones / UAVs", group: "police", enabled: false, color: "#8b5cf6" },
  { id: "eff-face-rec", name: "Facial Recognition", group: "police", enabled: false, color: "#f5a623" },
  { id: "eff-cell-sim", name: "Cell-Site Simulators", group: "police", enabled: false, color: "#ff2b4e" },
  { id: "eff-rtcc", name: "Real-Time Crime Centers", group: "police", enabled: false, color: "#00b4ff" },
  { id: "eff-bodycam", name: "Body-Worn Cameras", group: "police", enabled: false, color: "#34d399" },
  { id: "eff-camera-reg", name: "Camera Registries", group: "police", enabled: false, color: "#9a9aaa" },
  // INFRASTRUCTURE
  { id: "cables", name: "Submarine Cables", group: "infrastructure", enabled: true, color: "#00b4ff" },
  { id: "gas-pipelines", name: "Natural Gas Pipelines", group: "infrastructure", enabled: false, color: "#f5a623" },
  { id: "transmission-lines", name: "Electric Transmission", group: "infrastructure", enabled: false, color: "#f5a623" },
  { id: "bridges", name: "Bridges", group: "infrastructure", enabled: false, color: "#00b4ff" },
  { id: "dams", name: "Dams", group: "infrastructure", enabled: false, color: "#00b4ff" },
  // ENERGY
  { id: "power-plants", name: "Power Plants", group: "energy", enabled: false, color: "#f5a623" },
  { id: "nuclear-plants", name: "Nuclear Facilities", group: "energy", enabled: false, color: "#ff2b4e" },
  { id: "oil-refineries", name: "Oil Refineries", group: "energy", enabled: false, color: "#f5a623" },
  // EMERGENCY
  { id: "hospitals", name: "Hospitals", group: "emergency", enabled: false, color: "#ff2b4e" },
  { id: "fire-stations", name: "Fire Stations", group: "emergency", enabled: false, color: "#ff2b4e" },
  { id: "ems-stations", name: "EMS Stations", group: "emergency", enabled: false, color: "#ff2b4e" },
  // TELECOM
  { id: "cell-towers", name: "Cellular Towers", group: "telecom", enabled: false, color: "#8b5cf6" },
  // HAZARDS
  { id: "earthquakes", name: "Recent Earthquakes", group: "hazards", enabled: false, color: "#ff2b4e" },
  { id: "wildfires", name: "Active Wildfires", group: "hazards", enabled: false, color: "#f5a623" },
  { id: "weather-alerts", name: "NOAA Weather Alerts", group: "hazards", enabled: false, color: "#00b4ff" },
];
