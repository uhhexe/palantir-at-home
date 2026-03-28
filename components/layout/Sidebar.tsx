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
  cameras: <Camera className="w-3 h-3" />,
  "osm-cameras": <Eye className="w-3 h-3" />,
  alpr: <ScanLine className="w-3 h-3" />,
  cables: <Cable className="w-3 h-3" />,
  "power-plants": <Zap className="w-3 h-3" />,
  "nuclear-plants": <AlertTriangle className="w-3 h-3" />,
  "oil-refineries": <Flame className="w-3 h-3" />,
  "gas-pipelines": <Flame className="w-3 h-3" />,
  "transmission-lines": <Zap className="w-3 h-3" />,
  hospitals: <Activity className="w-3 h-3" />,
  "fire-stations": <Flame className="w-3 h-3" />,
  "ems-stations": <Activity className="w-3 h-3" />,
  "cell-towers": <Radio className="w-3 h-3" />,
  "microwave-towers": <Radio className="w-3 h-3" />,
  dams: <Waves className="w-3 h-3" />,
  earthquakes: <Activity className="w-3 h-3" />,
  wildfires: <Flame className="w-3 h-3" />,
  "weather-alerts": <Cloud className="w-3 h-3" />,
  flights: <Plane className="w-3 h-3" />,
  shipping: <Ship className="w-3 h-3" />,
  airports: <Plane className="w-3 h-3" />,
  ports: <Ship className="w-3 h-3" />,
  bridges: <Building2 className="w-3 h-3" />,
  "eff-alpr": <Scan className="w-3 h-3" />,
  "eff-shotspotter": <Crosshair className="w-3 h-3" />,
  "eff-drones": <Plane className="w-3 h-3" />,
  "eff-face-rec": <UserSearch className="w-3 h-3" />,
  "eff-cell-sim": <Wifi className="w-3 h-3" />,
  "eff-rtcc": <Shield className="w-3 h-3" />,
  "eff-bodycam": <Video className="w-3 h-3" />,
  "eff-camera-reg": <MapPin className="w-3 h-3" />,
  "deflock-alpr": <Scan className="w-3 h-3" />,
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
  police: "POLICE SURV",
  infrastructure: "INFRA",
  energy: "ENERGY",
  emergency: "EMERGENCY",
  telecom: "TELECOM",
  hazards: "HAZARDS",
  weather: "WEATHER",
  tracking: "TRACKING",
};

const GROUP_COLORS: Record<string, string> = {
  surveillance: "#00d4aa",
  police: "#ff6b35",
  infrastructure: "#00b4ff",
  energy: "#d4962a",
  emergency: "#e8364a",
  telecom: "#8b5cf6",
  hazards: "#e8364a",
  weather: "#00b4ff",
  tracking: "#8b5cf6",
};

export default function Sidebar({
  layers,
  onToggleLayer,
  activeView,
  onChangeView,
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
        collapsed ? "w-[36px]" : "w-[200px]"
      }`}
    >
      {/* Nav */}
      <div className="flex flex-col gap-px p-1.5 border-b border-border">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const active = activeView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onChangeView(item.id)}
              className={`flex items-center gap-2 px-2 py-1.5 text-[7px] font-heading tracking-[1.5px] uppercase transition-colors ${
                active
                  ? "bg-accent-glow text-accent"
                  : "text-text-dim hover:text-text hover:bg-surface-2"
              }`}
            >
              <Icon className="w-3 h-3 shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </button>
          );
        })}
      </div>

      {/* Layer groups */}
      {!collapsed && activeView === "map" && (
        <div className="flex-1 overflow-y-auto">
          {/* Active layers summary */}
          <div className="px-2 py-1.5 border-b border-border flex items-center justify-between">
            <span className="text-[7px] font-heading tracking-[1.5px] text-text-muted uppercase">
              Data Layers
            </span>
            <span className="text-[7px] font-mono text-accent">
              {enabledCount}
            </span>
          </div>

          {Object.entries(groupedLayers).map(([group, groupLayers]) => {
            const isExpanded = expandedGroups.has(group);
            const activeInGroup = groupLayers.filter((l) => l.enabled).length;
            const groupColor = GROUP_COLORS[group] || "#5c6c78";

            return (
              <div key={group} className="border-b border-border">
                {/* Group header */}
                <button
                  onClick={() => toggleGroup(group)}
                  className="w-full flex items-center gap-1.5 px-2 py-1.5 hover:bg-surface-2 transition-colors"
                >
                  <div
                    className="w-1 h-1 shrink-0"
                    style={{ backgroundColor: groupColor }}
                  />
                  <span
                    className="text-[7px] font-heading tracking-[1.5px] flex-1 text-left uppercase"
                    style={{ color: groupColor }}
                  >
                    {GROUP_LABELS[group] || group.toUpperCase()}
                  </span>
                  {activeInGroup > 0 && (
                    <span className="text-[7px] font-mono text-text-dim">
                      {activeInGroup}
                    </span>
                  )}
                  {isExpanded ? (
                    <ChevronUp className="w-2.5 h-2.5 text-text-muted" />
                  ) : (
                    <ChevronDown className="w-2.5 h-2.5 text-text-muted" />
                  )}
                </button>

                {/* Layer items */}
                {isExpanded && (
                  <div className="pb-0.5">
                    {groupLayers.map((layer) => (
                      <button
                        key={layer.id}
                        onClick={() => onToggleLayer(layer.id)}
                        className="w-full flex items-center gap-1.5 px-2 py-1 hover:bg-surface-2 transition-colors group"
                      >
                        {/* Square indicator */}
                        <div
                          className={`w-[5px] h-[5px] shrink-0 transition-colors ${
                            layer.enabled ? "" : "opacity-20"
                          }`}
                          style={{
                            backgroundColor: layer.enabled ? layer.color : "transparent",
                            border: layer.enabled ? "none" : `1px solid ${layer.color}`,
                          }}
                        />
                        {/* Icon */}
                        <div
                          className={`shrink-0 transition-opacity ${
                            layer.enabled ? "opacity-80" : "opacity-30"
                          }`}
                          style={{ color: layer.color }}
                        >
                          {LAYER_ICONS[layer.id] || <div className="w-3 h-3" />}
                        </div>
                        {/* Name */}
                        <span
                          className={`flex-1 text-left text-[9px] font-body transition-colors truncate ${
                            layer.enabled ? "text-white" : "text-text-dim"
                          }`}
                        >
                          {layer.name}
                        </span>
                        {/* Count */}
                        {layer.count !== undefined && layer.count > 0 && (
                          <span className="text-[7px] font-mono text-text-dim tabular-nums">
                            {layer.count.toLocaleString()}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Collapse toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="p-2 border-t border-border text-text-muted hover:text-accent transition-colors"
      >
        {collapsed ? (
          <ChevronRight className="w-3 h-3" />
        ) : (
          <ChevronLeft className="w-3 h-3" />
        )}
      </button>
    </div>
  );
}

export const DEFAULT_LAYERS: LayerConfig[] = [
  // SURVEILLANCE
  { id: "cameras", name: "Live Highway Cams", group: "surveillance", enabled: true, color: "#e8364a" },
  { id: "osm-cameras", name: "Street & Municipal Cameras", group: "surveillance", enabled: false, color: "#5c6c78" },
  { id: "alpr", name: "ALPR / Plate Readers", group: "surveillance", enabled: false, color: "#00b4ff" },
  { id: "deflock-alpr", name: "DeFlock ALPR Map (OSM)", group: "surveillance", enabled: false, color: "#ff6b35" },
  // POLICE SURVEILLANCE (EFF Atlas)
  { id: "eff-alpr", name: "Flock / ALPR Deployments", group: "police", enabled: false, color: "#ff6b35" },
  { id: "eff-shotspotter", name: "ShotSpotter / Gunshot", group: "police", enabled: false, color: "#e8364a" },
  { id: "eff-drones", name: "Police Drones / UAVs", group: "police", enabled: false, color: "#8b5cf6" },
  { id: "eff-face-rec", name: "Facial Recognition", group: "police", enabled: false, color: "#d4962a" },
  { id: "eff-cell-sim", name: "Cell-Site Simulators", group: "police", enabled: false, color: "#e8364a" },
  { id: "eff-rtcc", name: "Real-Time Crime Centers", group: "police", enabled: false, color: "#00b4ff" },
  { id: "eff-bodycam", name: "Body-Worn Cameras", group: "police", enabled: false, color: "#34d399" },
  { id: "eff-camera-reg", name: "Camera Registries", group: "police", enabled: false, color: "#5c6c78" },
  // INFRASTRUCTURE
  { id: "cables", name: "Submarine Cables", group: "infrastructure", enabled: true, color: "#00b4ff" },
  { id: "gas-pipelines", name: "Natural Gas Pipelines", group: "infrastructure", enabled: false, color: "#d4962a" },
  { id: "transmission-lines", name: "Electric Transmission", group: "infrastructure", enabled: false, color: "#d4962a" },
  { id: "bridges", name: "Bridges", group: "infrastructure", enabled: false, color: "#00b4ff" },
  { id: "dams", name: "Dams", group: "infrastructure", enabled: false, color: "#00b4ff" },
  // ENERGY
  { id: "power-plants", name: "Power Plants", group: "energy", enabled: false, color: "#d4962a" },
  { id: "nuclear-plants", name: "Nuclear Facilities", group: "energy", enabled: false, color: "#e8364a" },
  { id: "oil-refineries", name: "Oil Refineries", group: "energy", enabled: false, color: "#d4962a" },
  // EMERGENCY
  { id: "hospitals", name: "Hospitals", group: "emergency", enabled: false, color: "#e8364a" },
  { id: "fire-stations", name: "Fire Stations", group: "emergency", enabled: false, color: "#e8364a" },
  { id: "ems-stations", name: "EMS Stations", group: "emergency", enabled: false, color: "#e8364a" },
  // TELECOM
  { id: "cell-towers", name: "Cellular Towers", group: "telecom", enabled: false, color: "#8b5cf6" },
  // HAZARDS
  { id: "earthquakes", name: "Recent Earthquakes", group: "hazards", enabled: false, color: "#e8364a" },
  { id: "wildfires", name: "Active Wildfires", group: "hazards", enabled: false, color: "#d4962a" },
  { id: "weather-alerts", name: "NOAA Weather Alerts", group: "hazards", enabled: false, color: "#00b4ff" },
];
