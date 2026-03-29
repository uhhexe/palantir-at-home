"use client";

import type { UkraineLayer } from "./UkraineMap";

interface EquipmentLosses {
  asOf: string;
  russia: Record<string, number>;
  oryx: Record<string, Record<string, { total: number; destroyed: number; captured: number; abandoned: number; damaged: number }>>;
}

interface DroneStats {
  interceptRate: number;
  dailyProduction: number;
  monthlyRecord: number;
  strikeEffectiveness: number;
  uaStrikePackages: number;
  uaAvgPerNight: string;
}

interface EnergyStats {
  ruOnUaAttacks: number;
  winterStrikes: number;
  gridCapacity: string;
  uaOnRuTargets: number;
}

interface InternetCountryStatus {
  name: string;
  code: string;
  connectivity: number;
  status: string;
  note: string;
  color: string;
}

interface UkraineSidebarProps {
  layers: UkraineLayer[];
  onToggleLayer: (id: string) => void;
  warDay: number;
  losses: EquipmentLosses | null;
  droneStats?: DroneStats | null;
  energyStats?: EnergyStats | null;
  internetStatus?: InternetCountryStatus[];
}

const LAYER_GROUPS: { label: string; ids: string[] }[] = [
  { label: "CONTROL", ids: ["cities", "frontline", "occupied"] },
  { label: "MILITARY", ids: ["ua-bases", "ru-bases"] },
  { label: "DRONE WARFARE", ids: ["drone-launch-sites", "drone-targets-ru", "drone-routes"] },
  { label: "ENERGY WAR", ids: ["energy-ru-on-ua", "energy-ua-on-ru"] },
  { label: "LIVE DATA", ids: ["firms-fires", "acled-events"] },
  { label: "LIVE TRACKING", ids: ["live-flights"] },
];

function formatNum(n: number): string {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + "M";
  if (n >= 1000) return (n / 1000).toFixed(1) + "k";
  return n.toLocaleString();
}

export default function UkraineSidebar({ layers, onToggleLayer, warDay, losses, droneStats, energyStats, internetStatus }: UkraineSidebarProps) {
  const getLayer = (id: string) => layers.find((l) => l.id === id);
  const ru = losses?.russia;

  return (
    <div className="w-[240px] bg-surface border-r border-border flex flex-col overflow-y-auto shrink-0 select-none">
      {/* Header */}
      <div className="px-3 py-2 border-b border-border">
        <div className="font-heading text-[16px] tracking-[2px] text-accent uppercase">
          Conflict Layers
        </div>
      </div>

      {/* Layer groups */}
      <div className="flex-1 overflow-y-auto px-2 py-1.5 space-y-2">
        {LAYER_GROUPS.map((group) => (
          <div key={group.label}>
            <div className="font-heading text-[15px] tracking-[1.5px] text-text-muted uppercase mb-1 flex items-center gap-1">
              <span className="text-accent">{"\u25C6"}</span> {group.label}
            </div>
            <div className="space-y-0.5">
              {group.ids.map((id) => {
                const layer = getLayer(id);
                if (!layer) return null;
                return (
                  <button
                    key={id}
                    onClick={() => onToggleLayer(id)}
                    className={`w-full flex items-center gap-1.5 px-1.5 py-1 text-left transition-colors ${
                      layer.enabled
                        ? "bg-accent-glow text-text"
                        : "text-text-dim hover:bg-surface-2"
                    }`}
                  >
                    <div
                      className="w-2 h-2 shrink-0"
                      style={{
                        backgroundColor: layer.enabled ? layer.color : "transparent",
                        border: `1px solid ${layer.color}`,
                        opacity: layer.enabled ? 1 : 0.4,
                      }}
                    />
                    <span className="font-mono text-[15px] tracking-wide flex-1 truncate">
                      {layer.name}
                    </span>
                    {layer.count !== undefined && (
                      <span className="font-mono text-[14px] text-text-muted">
                        {layer.count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Stats panel */}
      <div className="border-t border-border px-3 py-2 space-y-2 shrink-0 overflow-y-auto" style={{ maxHeight: "60%" }}>
        {/* War overview */}
        <div>
          <div className="font-heading text-[15px] tracking-[1.5px] text-accent uppercase flex items-center gap-1">
            <span>{"\u25C6"}</span> War Overview
            <span className="ml-auto text-danger font-mono text-[14px]">D+{warDay}</span>
          </div>
          <div className="font-mono text-[14px] text-text-dim space-y-0.5 mt-1">
            <div className="flex justify-between">
              <span>Start:</span>
              <span className="text-white">24 FEB 2022</span>
            </div>
            <div className="flex justify-between">
              <span>Data as of:</span>
              <span className="text-white">{losses?.asOf || "..."}</span>
            </div>
          </div>
        </div>

        <div className="h-px bg-border" />

        {/* Russian losses summary */}
        {ru && (
          <div>
            <div className="font-heading text-[14px] tracking-[1.5px] text-accent uppercase flex items-center gap-1">
              <span>{"\u25C6"}</span> RU Losses (UA GenStaff)
            </div>
            <div className="font-mono text-[14px] text-text-dim space-y-0.5 mt-1">
              <div className="flex justify-between">
                <span>Personnel</span>
                <span className="text-danger">{formatNum(ru.personnel)}</span>
              </div>
              <div className="flex justify-between">
                <span>Tanks</span>
                <span className="text-white">{formatNum(ru.tank)}</span>
              </div>
              <div className="flex justify-between">
                <span>APCs</span>
                <span className="text-white">{formatNum(ru.APC)}</span>
              </div>
              <div className="flex justify-between">
                <span>Artillery</span>
                <span className="text-white">{formatNum(ru["field artillery"])}</span>
              </div>
              <div className="flex justify-between">
                <span>Aircraft</span>
                <span className="text-white">{ru.aircraft}</span>
              </div>
              <div className="flex justify-between">
                <span>Helicopters</span>
                <span className="text-white">{ru.helicopter}</span>
              </div>
              <div className="flex justify-between">
                <span>Drones</span>
                <span className="text-warning">{formatNum(ru.drone)}</span>
              </div>
              <div className="flex justify-between">
                <span>Cruise Missiles</span>
                <span className="text-warning">{formatNum(ru["cruise missiles"])}</span>
              </div>
              <div className="flex justify-between">
                <span>Ships</span>
                <span className="text-white">{ru["naval ship"]}</span>
              </div>
              <div className="flex justify-between">
                <span>Vehicles</span>
                <span className="text-white">{formatNum(ru["vehicles and fuel tanks"])}</span>
              </div>
            </div>
          </div>
        )}

        <div className="h-px bg-border" />

        {/* Oryx verified */}
        {losses?.oryx?.Russia && (
          <div>
            <div className="font-heading text-[14px] tracking-[1.5px] text-accent uppercase flex items-center gap-1">
              <span>{"\u25C6"}</span> Oryx Verified (RU)
            </div>
            <div className="font-mono text-[14px] text-text-dim space-y-0.5 mt-1">
              {["Tanks", "Infantry Fighting Vehicles", "Self-Propelled Artillery", "Aircraft", "Helicopters", "Naval Ships"].map((cat) => {
                const d = losses.oryx.Russia[cat];
                if (!d) return null;
                return (
                  <div key={cat} className="flex justify-between">
                    <span className="truncate mr-2">{cat.length > 18 ? cat.slice(0, 18) + "..." : cat}</span>
                    <span className="text-white shrink-0">{d.total} <span className="text-danger text-[12px]">({d.destroyed}d)</span></span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="h-px bg-border" />

        {/* Drone warfare */}
        {droneStats && (
          <>
            <div>
              <div className="font-heading text-[14px] tracking-[1.5px] text-danger uppercase flex items-center gap-1">
                <span>{"\u25C6"}</span> Drone Warfare
              </div>
              <div className="font-mono text-[14px] text-text-dim space-y-0.5 mt-1">
                <div className="flex justify-between">
                  <span>RU Monthly Record</span>
                  <span className="text-danger">{droneStats.monthlyRecord.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>RU Daily Prod</span>
                  <span className="text-danger">{droneStats.dailyProduction}/day</span>
                </div>
                <div className="flex justify-between">
                  <span>Intercept Rate</span>
                  <span className="text-accent">~{Math.round(droneStats.interceptRate * 100)}%</span>
                </div>
                <div className="flex justify-between">
                  <span>Strike Effect.</span>
                  <span className="text-warning">~{Math.round(droneStats.strikeEffectiveness * 100)}%</span>
                </div>
                <div className="flex justify-between">
                  <span>UA Pkgs (Jan-Mar)</span>
                  <span className="text-[#005BBB]">{droneStats.uaStrikePackages}</span>
                </div>
                <div className="flex justify-between">
                  <span>UA Avg/Night</span>
                  <span className="text-[#005BBB]">{droneStats.uaAvgPerNight}</span>
                </div>
              </div>
            </div>

            <div className="h-px bg-border" />
          </>
        )}

        {/* Energy war */}
        {energyStats && (
          <>
            <div>
              <div className="font-heading text-[14px] tracking-[1.5px] text-[#d4962a] uppercase flex items-center gap-1">
                <span>{"\u25C6"}</span> Energy War
              </div>
              <div className="font-mono text-[14px] text-text-dim space-y-0.5 mt-1">
                <div className="flex justify-between">
                  <span>RU on UA Energy</span>
                  <span className="text-danger">{energyStats.ruOnUaAttacks.toLocaleString()}+</span>
                </div>
                <div className="flex justify-between">
                  <span>Winter 25-26</span>
                  <span className="text-danger">{energyStats.winterStrikes.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>UA Grid</span>
                  <span className="text-warning">{energyStats.gridCapacity}</span>
                </div>
                <div className="flex justify-between">
                  <span>UA on RU Energy</span>
                  <span className="text-[#005BBB]">{energyStats.uaOnRuTargets}+ targets</span>
                </div>
              </div>
            </div>

            <div className="h-px bg-border" />
          </>
        )}

        {/* Internet / Connectivity Status */}
        {internetStatus && internetStatus.length > 0 && (
          <>
            <div>
              <div className="font-heading text-[14px] tracking-[1.5px] text-accent uppercase flex items-center gap-1">
                <span>{"\u25C6"}</span> Internet Status
              </div>
              <div className="font-mono text-[11px] text-text-dim space-y-1 mt-1.5">
                {internetStatus.map((c) => (
                  <div key={c.code}>
                    <div className="flex justify-between items-center mb-0.5">
                      <span className="text-[12px]">{c.name}</span>
                      <span className="text-[11px]" style={{ color: c.color }}>{c.connectivity}%</span>
                    </div>
                    <div className="w-full h-1.5 bg-surface-2 overflow-hidden">
                      <div
                        className="h-full transition-all"
                        style={{
                          width: `${c.connectivity}%`,
                          backgroundColor: c.color,
                        }}
                      />
                    </div>
                    <div className="text-[9px] mt-0.5" style={{ color: c.color }}>
                      {c.status}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="h-px bg-border" />
          </>
        )}

        {/* Front status */}
        <div>
          <div className="font-heading text-[14px] tracking-[1.5px] text-accent uppercase flex items-center gap-1">
            <span>{"\u25C6"}</span> Front Status
          </div>
          <div className="font-mono text-[14px] text-text-dim space-y-0.5 mt-1">
            <div className="flex justify-between">
              <span>Donetsk</span>
              <span className="text-danger">ACTIVE</span>
            </div>
            <div className="flex justify-between">
              <span>Zaporizhzhia</span>
              <span className="text-warning">STATIC</span>
            </div>
            <div className="flex justify-between">
              <span>Kherson</span>
              <span className="text-warning">STATIC</span>
            </div>
            <div className="flex justify-between">
              <span>Kharkiv</span>
              <span className="text-danger">ACTIVE</span>
            </div>
            <div className="flex justify-between">
              <span>Kursk (RU)</span>
              <span className="text-accent">UA SALIENT</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
