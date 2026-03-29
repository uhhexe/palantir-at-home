"use client";

import { useState, useMemo } from "react";

export interface IranianWeapon {
  name: string;
  type: string;
  class: string;
  fuel: string;
  range_km: number;
  warhead_kg: number;
  accuracy_cep_m: number;
  speed: string;
  status: string;
  used_in_war: boolean;
  cost_est: string;
  notes: string;
  color: string;
}

export interface AirDefenseSystem {
  name: string;
  operator: string;
  type: string;
  class: string;
  range_km: number;
  altitude_km: number | null;
  interceptor: string | null;
  interceptor_cost: string | null;
  targets: string;
  intercept_rate: string | null;
  status: string;
  notes: string;
  color: string;
  deployed_at: { name: string; lat: number; lng: number }[];
}

export interface USOffensiveWeapon {
  name: string;
  type: string;
  class: string;
  range_km: number;
  payload_kg?: number;
  warhead_kg?: number;
  speed: string;
  weapons?: string;
  status: string;
  notes: string;
  color: string;
}

export interface CostEntry {
  weapon: string;
  cost: number;
  side: string;
  note: string;
}

export interface WeaponsData {
  asOf: string;
  source: string;
  iranianOffensive: IranianWeapon[];
  airDefenseSystems: AirDefenseSystem[];
  usOffensive: USOffensiveWeapon[];
  costComparison: {
    title: string;
    data: CostEntry[];
  };
}

interface WeaponsPanelProps {
  data: WeaponsData;
  onShowRangeRings?: () => void;
}

type TabKey = "iran" | "defense" | "us" | "cost";

const TYPE_ICONS: Record<string, string> = {
  MRBM: "\u{1F3AF}",
  "Hypersonic MRBM": "\u26A1",
  OWA: "\u{1F6E9}",
  LACM: "\u{1F4A8}",
  SHORAD: "\u{1F6E1}",
  MRAD: "\u{1F6E1}",
  ABM: "\u{1F6E1}",
  "ABM (naval)": "\u{2693}",
  EWR: "\u{1F4E1}",
  Bomber: "\u2708",
  SRBM: "\u{1F680}",
  "SAM/ABM": "\u{1F6E1}",
};

function formatCost(cost: number): string {
  if (cost >= 1_000_000_000) return `$${(cost / 1_000_000_000).toFixed(1)}B`;
  if (cost >= 1_000_000) return `$${(cost / 1_000_000).toFixed(0)}M`;
  if (cost >= 1_000) return `$${(cost / 1_000).toFixed(0)}K`;
  return `$${cost}`;
}

function RangeBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = Math.min((value / max) * 100, 100);
  return (
    <div className="h-[6px] w-full bg-surface-2/50 relative overflow-hidden" style={{ border: `1px solid ${color}20` }}>
      <div
        className="h-full transition-all duration-300"
        style={{ width: `${pct}%`, background: `linear-gradient(to right, ${color}40, ${color})` }}
      />
    </div>
  );
}

function StatBox({ label, value, color }: { label: string; value: string | number; color?: string }) {
  return (
    <div className="flex flex-col">
      <span className="font-mono text-[9px] text-text-muted tracking-[1px] uppercase">{label}</span>
      <span className="font-mono text-[12px] font-bold" style={{ color: color || "#e6edf3" }}>{value}</span>
    </div>
  );
}

export default function WeaponsPanel({ data, onShowRangeRings }: WeaponsPanelProps) {
  const [tab, setTab] = useState<TabKey>("iran");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const maxRange = useMemo(() => {
    const allRanges = [
      ...data.iranianOffensive.map(w => w.range_km),
      ...data.airDefenseSystems.map(w => w.range_km),
      ...data.usOffensive.map(w => w.range_km),
    ];
    return Math.max(...allRanges);
  }, [data]);

  const tabs: { key: TabKey; label: string; count: number; color: string }[] = [
    { key: "iran", label: "IRANIAN OFFENSIVE", count: data.iranianOffensive.length, color: "#e8364a" },
    { key: "defense", label: "AIR DEFENSE", count: data.airDefenseSystems.length, color: "#22f5b0" },
    { key: "us", label: "US OFFENSIVE", count: data.usOffensive.length, color: "#388bfd" },
    { key: "cost", label: "COST ASYMMETRY", count: data.costComparison.data.length, color: "#ffb830" },
  ];

  return (
    <div className="h-full overflow-y-auto bg-void">
      {/* Classification header */}
      <div className="bg-[#1a0a0a] border-b border-danger/30 px-4 py-1.5 flex items-center justify-between">
        <span className="font-mono text-[10px] text-danger/70 tracking-[2px]">
          TOP SECRET // NOFORN // WEAPONS INTELLIGENCE
        </span>
        <span className="font-mono text-[10px] text-text-muted">
          {data.iranianOffensive.length + data.airDefenseSystems.length + data.usOffensive.length} SYSTEMS CATALOGUED
        </span>
      </div>

      {/* Title */}
      <div className="px-4 py-3 border-b border-border">
        <div className="font-heading text-[18px] tracking-[2px] text-danger uppercase">
          Weapons Encyclopedia
        </div>
        <div className="font-mono text-[10px] text-text-muted mt-1 leading-relaxed">
          Comprehensive catalog of weapons systems deployed in Operation Epic Fury. Range, accuracy, cost, and deployment data from OSINT sources.
        </div>
        <div className="flex items-center gap-3 mt-1">
          <span className="font-mono text-[10px] text-text-muted">
            Sources: {data.source}
          </span>
          <span className="font-mono text-[10px] text-text-muted">
            As of {data.asOf}
          </span>
        </div>
      </div>

      {/* Tab bar */}
      <div className="px-4 py-2 border-b border-border flex flex-wrap gap-0.5 p-1 bg-[#0d1117] rounded-[6px] border border-[rgba(0,210,170,0.08)] mx-4 my-2">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => { setTab(t.key); setExpandedId(null); }}
            className="transition-all cursor-pointer"
            style={{
              padding: "4px 10px",
              borderRadius: "4px",
              fontFamily: "var(--font-body), 'Rajdhani', sans-serif",
              fontSize: "11px",
              fontWeight: tab === t.key ? 700 : 500,
              letterSpacing: "0.5px",
              textTransform: "uppercase" as const,
              border: "none",
              background: tab === t.key ? `${t.color}1a` : "transparent",
              color: tab === t.key ? t.color : "#8b949e",
              boxShadow: tab === t.key ? `inset 0 0 0 1px ${t.color}33` : "none",
            }}
          >
            {t.label} <span style={{ opacity: 0.7 }}>({t.count})</span>
          </button>
        ))}
        {onShowRangeRings && (
          <button
            onClick={onShowRangeRings}
            className="ml-auto transition-colors"
            style={{
              padding: "2px 8px",
              fontFamily: "var(--font-mono), 'Inconsolata', monospace",
              fontSize: "10px",
              fontWeight: 700,
              letterSpacing: "0.5px",
              border: "1px solid rgba(34,245,176,0.4)",
              background: "rgba(34,245,176,0.08)",
              color: "#22f5b0",
            }}
          >
            &#x1F4CD; SHOW RANGE RINGS ON MAP
          </button>
        )}
      </div>

      {/* Content */}
      <div className="divide-y divide-border/40">
        {tab === "iran" && data.iranianOffensive.map(weapon => {
          const isExpanded = expandedId === weapon.name;
          return (
            <div
              key={weapon.name}
              className="px-4 py-3 transition-colors hover:bg-surface-2/30 cursor-pointer"
              onClick={() => setExpandedId(isExpanded ? null : weapon.name)}
              style={{ borderLeft: `3px solid ${weapon.color}` }}
            >
              {/* Header row */}
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <span className="text-[14px]">{TYPE_ICONS[weapon.type] || "\u{1F680}"}</span>
                  <span className="font-heading text-[14px] text-white font-semibold tracking-wide uppercase">
                    {weapon.name}
                  </span>
                  <span
                    className="font-mono text-[9px] tracking-wider px-1.5 py-px"
                    style={{
                      color: weapon.color,
                      border: `1px solid ${weapon.color}30`,
                      background: `${weapon.color}10`,
                    }}
                  >
                    {weapon.type}
                  </span>
                  {weapon.used_in_war && (
                    <span className="font-mono text-[9px] tracking-wider px-1.5 py-px text-danger border border-danger/30 bg-danger/10">
                      COMBAT DEPLOYED
                    </span>
                  )}
                </div>
                <span className="font-mono text-[11px] text-text-muted">{weapon.cost_est}</span>
              </div>

              {/* Class */}
              <div className="font-mono text-[10px] text-text-muted mb-2">{weapon.class}</div>

              {/* Stats row */}
              <div className="flex items-center gap-4 mb-2">
                <StatBox label="Range" value={`${weapon.range_km.toLocaleString()} km`} color={weapon.color} />
                <StatBox label="Warhead" value={`${weapon.warhead_kg} kg`} />
                <StatBox label="CEP" value={`${weapon.accuracy_cep_m.toLocaleString()} m`} />
                <StatBox label="Speed" value={weapon.speed} />
                <StatBox label="Fuel" value={weapon.fuel} />
              </div>

              {/* Range bar */}
              <div className="mb-1">
                <RangeBar value={weapon.range_km} max={2500} color={weapon.color} />
                <div className="flex justify-between mt-0.5">
                  <span className="font-mono text-[9px] text-text-muted">0 km</span>
                  <span className="font-mono text-[9px] text-text-muted">2,500 km</span>
                </div>
              </div>

              {/* Expanded details */}
              {isExpanded && (
                <div className="mt-2 space-y-1.5">
                  <div className="font-mono text-[10px] text-accent tracking-[1px] uppercase">Status</div>
                  <div className="font-mono text-[11px] text-text-dim">{weapon.status}</div>
                  <div className="font-mono text-[10px] text-accent tracking-[1px] uppercase mt-2">Intel Notes</div>
                  <div className="font-mono text-[11px] text-text-dim leading-relaxed">{weapon.notes}</div>
                </div>
              )}
            </div>
          );
        })}

        {tab === "defense" && data.airDefenseSystems.map(system => {
          const isExpanded = expandedId === system.name;
          const isDegraded = system.status.includes("DEGRADED") || system.status.includes("DAMAGED");
          return (
            <div
              key={system.name}
              className="px-4 py-3 transition-colors hover:bg-surface-2/30 cursor-pointer"
              onClick={() => setExpandedId(isExpanded ? null : system.name)}
              style={{ borderLeft: `3px solid ${isDegraded ? "#ff3b5c" : system.color}` }}
            >
              {/* Header row */}
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <span className="text-[14px]">{TYPE_ICONS[system.type] || "\u{1F6E1}"}</span>
                  <span className="font-heading text-[14px] text-white font-semibold tracking-wide uppercase">
                    {system.name}
                  </span>
                  <span
                    className="font-mono text-[9px] tracking-wider px-1.5 py-px"
                    style={{
                      color: system.color,
                      border: `1px solid ${system.color}30`,
                      background: `${system.color}10`,
                    }}
                  >
                    {system.type}
                  </span>
                  {isDegraded && (
                    <span className="font-mono text-[9px] tracking-wider px-1.5 py-px text-danger border border-danger/30 bg-danger/10 animate-pulse">
                      DEGRADED
                    </span>
                  )}
                </div>
                <span className="font-mono text-[10px] px-1.5 py-px border border-border/50 text-text-muted">
                  {system.operator}
                </span>
              </div>

              {/* Class */}
              <div className="font-mono text-[10px] text-text-muted mb-2">{system.class}</div>

              {/* Stats row */}
              <div className="flex items-center gap-4 mb-2">
                <StatBox label="Range" value={`${system.range_km.toLocaleString()} km`} color={system.color} />
                {system.altitude_km !== null && <StatBox label="Alt Ceiling" value={`${system.altitude_km} km`} />}
                {system.interceptor_cost && <StatBox label="Per Shot" value={system.interceptor_cost} color="#ffb830" />}
                {system.interceptor && <StatBox label="Interceptor" value={system.interceptor} />}
              </div>

              {/* Range bar */}
              <div className="mb-1">
                <RangeBar value={system.range_km} max={2500} color={system.color} />
              </div>

              {/* Targets */}
              <div className="font-mono text-[10px] text-text-dim mt-1">{system.targets}</div>

              {/* Expanded details */}
              {isExpanded && (
                <div className="mt-2 space-y-1.5">
                  {system.intercept_rate && (
                    <>
                      <div className="font-mono text-[10px] text-accent tracking-[1px] uppercase">Intercept Rate</div>
                      <div className="font-mono text-[11px] text-text-dim">{system.intercept_rate}</div>
                    </>
                  )}
                  <div className="font-mono text-[10px] text-accent tracking-[1px] uppercase mt-2">Status</div>
                  <div className="font-mono text-[11px] text-text-dim" style={{ color: isDegraded ? "#ff3b5c" : undefined }}>
                    {system.status}
                  </div>
                  <div className="font-mono text-[10px] text-accent tracking-[1px] uppercase mt-2">Deployed At</div>
                  <div className="flex flex-wrap gap-1.5 mt-0.5">
                    {system.deployed_at.map(loc => (
                      <span
                        key={loc.name}
                        className="font-mono text-[9px] px-1.5 py-px border"
                        style={{
                          color: isDegraded && loc.name.includes("DEGRADED") || loc.name.includes("DAMAGED") ? "#ff3b5c" : system.color,
                          borderColor: `${system.color}30`,
                          background: `${system.color}08`,
                        }}
                      >
                        &#x1F4CD; {loc.name}
                      </span>
                    ))}
                  </div>
                  <div className="font-mono text-[10px] text-accent tracking-[1px] uppercase mt-2">Intel Notes</div>
                  <div className="font-mono text-[11px] text-text-dim leading-relaxed">{system.notes}</div>
                </div>
              )}
            </div>
          );
        })}

        {tab === "us" && data.usOffensive.map(weapon => {
          const isExpanded = expandedId === weapon.name;
          return (
            <div
              key={weapon.name}
              className="px-4 py-3 transition-colors hover:bg-surface-2/30 cursor-pointer"
              onClick={() => setExpandedId(isExpanded ? null : weapon.name)}
              style={{ borderLeft: `3px solid ${weapon.color}` }}
            >
              {/* Header row */}
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <span className="text-[14px]">{TYPE_ICONS[weapon.type] || "\u{1F680}"}</span>
                  <span className="font-heading text-[14px] text-white font-semibold tracking-wide uppercase">
                    {weapon.name}
                  </span>
                  <span
                    className="font-mono text-[9px] tracking-wider px-1.5 py-px"
                    style={{
                      color: weapon.color,
                      border: `1px solid ${weapon.color}30`,
                      background: `${weapon.color}10`,
                    }}
                  >
                    {weapon.type}
                  </span>
                </div>
              </div>

              {/* Class */}
              <div className="font-mono text-[10px] text-text-muted mb-2">{weapon.class}</div>

              {/* Stats row */}
              <div className="flex items-center gap-4 mb-2">
                <StatBox label="Range" value={`${weapon.range_km.toLocaleString()} km`} color={weapon.color} />
                {weapon.payload_kg && <StatBox label="Payload" value={`${weapon.payload_kg.toLocaleString()} kg`} />}
                {weapon.warhead_kg && <StatBox label="Warhead" value={`${weapon.warhead_kg} kg`} />}
                <StatBox label="Speed" value={weapon.speed} />
              </div>

              {/* Range bar */}
              <div className="mb-1">
                <RangeBar value={Math.min(weapon.range_km, 5000)} max={5000} color={weapon.color} />
                <div className="flex justify-between mt-0.5">
                  <span className="font-mono text-[9px] text-text-muted">0 km</span>
                  <span className="font-mono text-[9px] text-text-muted">5,000 km</span>
                </div>
              </div>

              {/* Weapons loadout for bombers */}
              {weapon.weapons && (
                <div className="font-mono text-[10px] text-text-dim mt-1">
                  <span className="text-accent">LOADOUT:</span> {weapon.weapons}
                </div>
              )}

              {/* Expanded details */}
              {isExpanded && (
                <div className="mt-2 space-y-1.5">
                  <div className="font-mono text-[10px] text-accent tracking-[1px] uppercase">Status</div>
                  <div className="font-mono text-[11px] text-text-dim">{weapon.status}</div>
                  <div className="font-mono text-[10px] text-accent tracking-[1px] uppercase mt-2">Intel Notes</div>
                  <div className="font-mono text-[11px] text-text-dim leading-relaxed">{weapon.notes}</div>
                </div>
              )}
            </div>
          );
        })}

        {tab === "cost" && (
          <div className="px-4 py-4">
            <div className="font-heading text-[14px] tracking-[2px] text-[#ffb830] uppercase mb-1">
              {data.costComparison.title}
            </div>
            <div className="font-mono text-[10px] text-text-muted mb-4 leading-relaxed">
              Iran exploits a fundamental cost asymmetry: cheap offensive weapons force the coalition to expend interceptors that cost 10x&ndash;60,000x more. This is economically unsustainable at scale.
            </div>

            {/* Cost bar chart */}
            <div className="space-y-2">
              {data.costComparison.data.map((entry, i) => {
                const maxCost = data.costComparison.data[data.costComparison.data.length - 1].cost;
                const logPct = Math.max((Math.log10(entry.cost) / Math.log10(maxCost)) * 100, 8);
                const sideColor = entry.side === "Iran" ? "#e8364a" : entry.side === "Israel" ? "#388bfd" : "#388bfd";
                return (
                  <div key={i}>
                    <div className="flex items-center justify-between mb-0.5">
                      <div className="flex items-center gap-2">
                        <span
                          className="font-mono text-[9px] px-1 py-px tracking-wider"
                          style={{
                            color: sideColor,
                            border: `1px solid ${sideColor}30`,
                            background: `${sideColor}10`,
                          }}
                        >
                          {entry.side}
                        </span>
                        <span className="font-mono text-[11px] text-white font-bold">{entry.weapon}</span>
                      </div>
                      <span className="font-mono text-[12px] font-bold" style={{ color: sideColor }}>
                        {formatCost(entry.cost)}
                      </span>
                    </div>
                    <div className="h-[10px] w-full bg-surface-2/50 relative overflow-hidden" style={{ border: `1px solid ${sideColor}20` }}>
                      <div
                        className="h-full transition-all duration-500"
                        style={{
                          width: `${logPct}%`,
                          background: `linear-gradient(to right, ${sideColor}40, ${sideColor})`,
                        }}
                      />
                    </div>
                    <div className="font-mono text-[9px] text-text-muted mt-0.5">{entry.note}</div>
                  </div>
                );
              })}
            </div>

            {/* Key insight box */}
            <div
              className="mt-4 px-3 py-2"
              style={{
                background: "rgba(255,184,48,0.06)",
                border: "1px solid rgba(255,184,48,0.2)",
                borderLeft: "3px solid #ffb830",
              }}
            >
              <div className="flex items-center gap-2 mb-1">
                <span style={{ color: "#ffb830", fontSize: "14px", fontWeight: 900 }}>&#x26A0;</span>
                <span className="font-mono text-[11px] font-bold tracking-[1px]" style={{ color: "#ffb830" }}>
                  KEY ASYMMETRY
                </span>
              </div>
              <div className="font-mono text-[10px] text-text-dim leading-relaxed">
                A $10,000 Shahed-136 drone destroyed a $600M AN/TPY-2 THAAD radar &mdash; a 60,000:1 cost ratio in Iran&apos;s favor. Even Iron Dome interceptors at $50K each are being consumed faster than they can be produced against $30K drones. The math favors the attacker.
              </div>
            </div>

            {/* Scale note */}
            <div className="mt-3 font-mono text-[9px] text-text-muted">
              &#x26A0; Bar scale is logarithmic to show both $30K drones and $600M radars on the same chart.
            </div>
          </div>
        )}
      </div>

      {/* Classification footer */}
      <div className="bg-[#1a0a0a] border-t border-danger/30 px-4 py-1.5 text-center">
        <span className="font-mono text-[10px] text-danger/70 tracking-[2px]">
          TOP SECRET // NOFORN // WEAPONS INTELLIGENCE
        </span>
      </div>
    </div>
  );
}
