"use client";

import { useState, useEffect } from "react";
import type { ConflictLayer } from "./ConflictMap";

interface CasualtySummary {
  iranRange: string;
  usTotal: number;
  usKia: number;
  israelKilled: number;
  gulfKilled: number;
  iraqKilled: number;
}

interface OrefAlert {
  data: string;
  title: string;
  desc: string;
}

interface InternetCountryStatus {
  name: string;
  code: string;
  connectivity: number;
  status: string;
  note: string;
  color: string;
}

interface ClaimsSummary {
  total: number;
  confirmed: number;
  partiallyTrue: number;
  misleading: number;
  exaggerated: number;
  unverified: number;
  falseCount: number;
  admissions: number;
  hypocritical: number;
  other: number;
}

interface ConflictSidebarProps {
  layers: ConflictLayer[];
  onToggleLayer: (id: string) => void;
  conflictDay: number;
  totalStrikes: number;
  casualtySummary?: CasualtySummary | null;
  onExpandCasualties?: () => void;
  orefAlerts?: OrefAlert[];
  internetStatus?: InternetCountryStatus[];
  claimsSummary?: ClaimsSummary | null;
  onExpandClaims?: () => void;
  weaponsCounts?: { iranian: number; airDefense: number; usOffensive: number } | null;
  onExpandWeapons?: () => void;
  econSummary?: { oilCurrent: number; oilChange: number; gasCurrent: number; dailyCostB: string } | null;
  onExpandEcon?: () => void;
  lastStrikeRefresh?: Date;
  isRefreshingStrikes?: boolean;
}

const LAYER_GROUPS: { label: string; ids: string[] }[] = [
  { label: "STRIKE LAYERS", ids: ["us-strikes", "israel-strikes", "iran-strikes", "houthi-strikes", "hezbollah-strikes"] },
  { label: "LIVE DATA", ids: ["oref-alerts", "firms-fires", "acled-events"] },
  { label: "CASUALTIES", ids: ["notable-incidents"] },
  { label: "LEADERSHIP", ids: ["leaders-eliminated", "leaders-surviving"] },
  { label: "MILITARY", ids: ["us-bases", "iran-bases", "nuclear", "air-defense", "range-rings"] },
  { label: "LEBANON FRONT", ids: ["lebanon-targets", "lebanon-military"] },
  { label: "HOUTHI / RED SEA", ids: ["houthi-positions", "shipping-attacks", "shipping-lanes-houthi"] },
  { label: "IRAQ THEATER", ids: ["iraq-bases", "iraq-proxy"] },
  { label: "ENERGY WAR", ids: ["energy-strikes"] },
  { label: "INFRASTRUCTURE", ids: ["pipelines", "oil-facilities", "desalination", "chokepoints"] },
  { label: "MARITIME & AIRSPACE", ids: ["sea-lanes", "airspace"] },
  { label: "LIVE TRACKING", ids: ["live-flights", "mil-only"] },
  { label: "REFERENCE", ids: ["borders"] },
];

function SidebarCostTicker() {
  const [cost, setCost] = useState(0);
  useEffect(() => {
    const warStart = new Date("2026-02-28T06:00:00Z");
    const firstSixDayCost = 11300000000;
    const dailyRate = 1000000000;
    const update = () => {
      const now = new Date();
      const days = (now.getTime() - warStart.getTime()) / 1000 / 86400;
      setCost(days <= 6 ? (days / 6) * firstSixDayCost : firstSixDayCost + (days - 6) * dailyRate);
    };
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, []);
  return (
    <div className="font-mono text-[16px] font-bold text-[#ff3b5c] mt-1" style={{ textShadow: "0 0 8px rgba(255,59,92,0.2)" }}>
      {new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(cost)}
      <div className="text-[9px] text-text-muted font-normal tracking-[1px] uppercase">Est. taxpayer cost</div>
    </div>
  );
}

export default function ConflictSidebar({ layers, onToggleLayer, conflictDay, totalStrikes, casualtySummary, onExpandCasualties, orefAlerts, internetStatus, claimsSummary, onExpandClaims, weaponsCounts, onExpandWeapons, econSummary, onExpandEcon, lastStrikeRefresh, isRefreshingStrikes }: ConflictSidebarProps) {
  const getLayer = (id: string) => layers.find((l) => l.id === id);
  const [oilPrice, setOilPrice] = useState<{ brent: number | null; wti: number | null; change: number | null; changePercent: number | null } | null>(null);

  useEffect(() => {
    function fetchOil() {
      fetch("/api/conflict/oil-price")
        .then((r) => r.json())
        .then((data) => setOilPrice(data))
        .catch(() => {});
    }
    fetchOil();
    const id = setInterval(fetchOil, 60000); // refresh every minute
    return () => clearInterval(id);
  }, []);

  return (
    <div className="w-[240px] bg-surface border-r border-border flex flex-col overflow-y-auto shrink-0 select-none">
      {/* Header */}
      <div className="px-3 py-2 border-b border-border">
        <div className="font-heading text-[16px] tracking-[2px] text-accent uppercase">
          Conflict Layers
        </div>
        {lastStrikeRefresh && (
          <div className="font-mono text-[9px] text-text-muted tracking-[1px] mt-0.5 uppercase">
            Last refresh: {lastStrikeRefresh.toLocaleTimeString()}
            {isRefreshingStrikes && " \u00b7 UPDATING..."}
            {" \u00b7 "}Auto: 5 min
          </div>
        )}
      </div>

      {/* Layer groups */}
      <div className="flex-1 overflow-y-auto px-2 py-1.5 space-y-3">
        {LAYER_GROUPS.map((group) => (
          <div key={group.label}>
            <div className="font-heading text-[12px] tracking-[1.5px] text-accent uppercase mb-1.5 flex items-center gap-1.5 pl-2 border-l-2 border-accent bg-accent/[0.03] py-0.5">
              {group.label}
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
      <div className="border-t border-border px-3 py-2 space-y-2 shrink-0 overflow-y-auto" style={{ maxHeight: "55%" }}>
        {/* Conflict overview */}
        <div>
          <div className="font-heading text-[12px] tracking-[1.5px] text-accent uppercase flex items-center gap-1.5 pl-2 border-l-2 border-accent bg-accent/[0.03] py-0.5">
            Conflict Overview
            <span className="ml-auto text-danger font-mono text-[12px]">D+{conflictDay}</span>
          </div>
          <div className="font-mono text-[14px] text-text-dim space-y-0.5 mt-1">
            <div className="flex justify-between">
              <span>Total Strikes:</span>
              <span className="text-white">{totalStrikes}</span>
            </div>
            <div className="flex justify-between">
              <span>US/Coalition:</span>
              <span style={{ color: "#388bfd" }}>{layers.find((l) => l.id === "us-strikes")?.count || 0}</span>
            </div>
            <div className="flex justify-between">
              <span>Israeli:</span>
              <span style={{ color: "#e6edf3" }}>{layers.find((l) => l.id === "israel-strikes")?.count || 0}</span>
            </div>
            <div className="flex justify-between">
              <span>Iranian:</span>
              <span style={{ color: "#e8364a" }}>{layers.find((l) => l.id === "iran-strikes")?.count || 0}</span>
            </div>
          </div>
        </div>

        <div className="h-px bg-border" />

        {/* OREF Red Alerts Feed */}
        {orefAlerts && orefAlerts.length > 0 && (
          <>
            <div>
              <div className="font-heading text-[12px] tracking-[1.5px] text-[#ff0000] uppercase flex items-center gap-1.5 pl-2 border-l-2 border-[#ff0000] bg-[#ff0000]/[0.03] py-0.5">
                <span className="animate-pulse">⚠</span> Active Red Alerts
                <span className="ml-auto font-mono text-[14px]">{orefAlerts.length}</span>
              </div>
              <div className="font-mono text-[14px] text-text-dim space-y-0.5 mt-1 max-h-[100px] overflow-y-auto">
                {orefAlerts.slice(0, 8).map((alert, i) => (
                  <div key={i} className="flex justify-between">
                    <span className="truncate">{alert.data}</span>
                    <span className="text-[#ff0000] shrink-0 ml-1">{alert.title}</span>
                  </div>
                ))}
                {orefAlerts.length > 8 && (
                  <div className="text-[10px] text-text-muted">+{orefAlerts.length - 8} more</div>
                )}
              </div>
            </div>
            <div className="h-px bg-border" />
          </>
        )}

        {/* Internet / Connectivity Status */}
        {internetStatus && internetStatus.length > 0 && (
          <>
            <div>
              <div className="font-heading text-[12px] tracking-[1.5px] text-accent uppercase flex items-center gap-1.5 pl-2 border-l-2 border-accent bg-accent/[0.03] py-0.5"> Internet Status
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

        {/* Decapitation Status */}
        <div>
          <div className="font-heading text-[12px] tracking-[1.5px] text-danger uppercase flex items-center gap-1.5 pl-2 border-l-2 border-danger bg-danger/[0.03] py-0.5">
            <span>&#9830;</span> Decapitation Status
          </div>
          <div className="font-mono text-[14px] text-text-dim space-y-0.5 mt-1">
            <div className="flex justify-between">
              <span>Supreme Leader</span>
              <span className="text-danger">ELIM &#8594; REPLACED</span>
            </div>
            <div className="flex justify-between">
              <span>IRGC Commander</span>
              <span className="text-danger">ELIMINATED</span>
            </div>
            <div className="flex justify-between">
              <span>Defense Minister</span>
              <span className="text-danger">ELIMINATED</span>
            </div>
            <div className="flex justify-between">
              <span>Armed Forces CoS</span>
              <span className="text-danger">ELIMINATED</span>
            </div>
            <div className="flex justify-between">
              <span>Intel Minister</span>
              <span className="text-danger">ELIMINATED</span>
            </div>
            <div className="flex justify-between">
              <span>Lebanon Corps Cmd</span>
              <span className="text-danger">ELIM (Beirut)</span>
            </div>
            <div className="h-px bg-border my-1" />
            <div className="flex justify-between">
              <span>Total Killed</span>
              <span className="text-danger font-bold">22+</span>
            </div>
            <div className="flex justify-between">
              <span>New Leader</span>
              <span className="text-accent">Mojtaba K.</span>
            </div>
            <div className="flex justify-between">
              <span>Status</span>
              <span className="text-warning">SURVIVED STRIKE</span>
            </div>
          </div>
        </div>

        <div className="h-px bg-border" />

        {/* Casualties (Contested) */}
        {casualtySummary && (
          <>
            <div>
              <div className="font-heading text-[12px] tracking-[1.5px] text-danger uppercase flex items-center gap-1.5 pl-2 border-l-2 border-danger bg-danger/[0.03] py-0.5">
                <span>&#9830;</span> Casualties (Contested)
                {onExpandCasualties && (
                  <button
                    onClick={onExpandCasualties}
                    className="ml-auto text-[10px] text-accent hover:text-accent-bright transition-colors uppercase tracking-wider"
                  >
                    EXPAND
                  </button>
                )}
              </div>
              <div className="font-mono text-[14px] text-text-dim space-y-0.5 mt-1">
                <div className="flex justify-between">
                  <span>Iran</span>
                  <span className="text-danger">{casualtySummary.iranRange}</span>
                </div>
                <div className="flex justify-between">
                  <span>US</span>
                  <span style={{ color: "#388bfd" }}>{casualtySummary.usTotal} ({casualtySummary.usKia} KIA + {casualtySummary.usTotal - casualtySummary.usKia} other)</span>
                </div>
                <div className="flex justify-between">
                  <span>Israel</span>
                  <span className="text-white">{casualtySummary.israelKilled}</span>
                </div>
                <div className="flex justify-between">
                  <span>Gulf</span>
                  <span className="text-warning">{casualtySummary.gulfKilled}+</span>
                </div>
                <div className="flex justify-between">
                  <span>Iraq</span>
                  <span className="text-danger">{casualtySummary.iraqKilled}</span>
                </div>
                <div className="h-px bg-border my-0.5" />
                <div className="flex justify-between font-bold">
                  <span>TOTAL</span>
                  <span className="text-danger">est. 2,000 — 5,500+</span>
                </div>
              </div>
            </div>

            <div className="h-px bg-border" />
          </>
        )}

        {/* Propaganda Check */}
        {claimsSummary && (
          <>
            <div>
              <div className="font-heading text-[12px] tracking-[1.5px] text-[#c84bc8] uppercase flex items-center gap-1.5 pl-2 border-l-2 border-[#c84bc8] bg-[#c84bc8]/[0.03] py-0.5">
                <span>&#9830;</span> Propaganda Check
                {onExpandClaims && (
                  <button
                    onClick={onExpandClaims}
                    className="ml-auto text-[10px] text-accent hover:text-accent-bright transition-colors uppercase tracking-wider"
                  >
                    EXPAND
                  </button>
                )}
              </div>
              <div className="font-mono text-[14px] text-text-dim space-y-0.5 mt-1">
                <div className="flex justify-between">
                  <span>Claims tracked</span>
                  <span className="text-white">{claimsSummary.total}</span>
                </div>
                <div className="h-px bg-border my-0.5" />
                <div className="flex justify-between">
                  <span className="text-[#22f5b0]">&#10003; Confirmed</span>
                  <span className="text-[#22f5b0]">{claimsSummary.confirmed}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#ffb830]">&#9680; Partially true</span>
                  <span className="text-[#ffb830]">{claimsSummary.partiallyTrue}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#ff8c42]">&#9888; Misleading</span>
                  <span className="text-[#ff8c42]">{claimsSummary.misleading}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#ff8c42]">&#8593; Exaggerated</span>
                  <span className="text-[#ff8c42]">{claimsSummary.exaggerated}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#9ca3af]">? Unverified</span>
                  <span className="text-[#9ca3af]">{claimsSummary.unverified}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#ff3b5c]">&#10005; False</span>
                  <span className="text-[#ff3b5c]">{claimsSummary.falseCount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#388bfd]">! Admissions</span>
                  <span className="text-[#388bfd]">{claimsSummary.admissions}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#c84bc8]">&#8634; Hypocritical</span>
                  <span className="text-[#c84bc8]">{claimsSummary.hypocritical}</span>
                </div>
                {claimsSummary.other > 0 && (
                  <div className="flex justify-between">
                    <span>Other</span>
                    <span className="text-text-muted">{claimsSummary.other}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="h-px bg-border" />
          </>
        )}

        {/* Weapons Encyclopedia */}
        {weaponsCounts && (
          <>
            <div>
              <div className="font-heading text-[12px] tracking-[1.5px] text-[#ff8c42] uppercase flex items-center gap-1.5 pl-2 border-l-2 border-[#ff8c42] bg-[#ff8c42]/[0.03] py-0.5">
                <span>&#9670;</span> Weapons Intel
                {onExpandWeapons && (
                  <button
                    onClick={onExpandWeapons}
                    className="ml-auto text-[10px] text-accent hover:text-accent-bright transition-colors uppercase tracking-wider"
                  >
                    EXPAND
                  </button>
                )}
              </div>
              <div className="font-mono text-[14px] text-text-dim space-y-0.5 mt-1">
                <div className="flex justify-between">
                  <span>Total systems</span>
                  <span className="text-white">{weaponsCounts.iranian + weaponsCounts.airDefense + weaponsCounts.usOffensive}</span>
                </div>
                <div className="h-px bg-border my-0.5" />
                <div className="flex justify-between">
                  <span className="text-[#e8364a]">&#x1F3AF; Iranian offensive</span>
                  <span className="text-[#e8364a]">{weaponsCounts.iranian}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#22f5b0]">&#x1F6E1; Air defense</span>
                  <span className="text-[#22f5b0]">{weaponsCounts.airDefense}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#388bfd]">&#x1F680; US offensive</span>
                  <span className="text-[#388bfd]">{weaponsCounts.usOffensive}</span>
                </div>
              </div>
            </div>

            <div className="h-px bg-border" />
          </>
        )}

        {/* War Cost */}
        {econSummary && (
          <>
            <div>
              <div className="font-heading text-[12px] tracking-[1.5px] text-[#ff3b5c] uppercase flex items-center gap-1.5 pl-2 border-l-2 border-[#ff3b5c] bg-[#ff3b5c]/[0.03] py-0.5">
                <span>&#9670;</span> War Cost
                {onExpandEcon && (
                  <button
                    onClick={onExpandEcon}
                    className="ml-auto text-[10px] text-accent hover:text-accent-bright transition-colors uppercase tracking-wider"
                  >
                    EXPAND
                  </button>
                )}
              </div>
              <SidebarCostTicker />
              <div className="font-mono text-[14px] text-text-dim space-y-0.5 mt-1">
                <div className="flex justify-between">
                  <span>Oil</span>
                  <span className="text-[#ff3b5c]">${econSummary.oilCurrent}/bbl (+{econSummary.oilChange}%)</span>
                </div>
                <div className="flex justify-between">
                  <span>Gas</span>
                  <span className="text-[#ff8c42]">${econSummary.gasCurrent}/gal</span>
                </div>
                <div className="flex justify-between">
                  <span>Daily rate</span>
                  <span className="text-[#ff3b5c]">{econSummary.dailyCostB}/day</span>
                </div>
              </div>
            </div>

            <div className="h-px bg-border" />
          </>
        )}

        {/* Air Defense Status */}
        <div>
          <div className="font-heading text-[12px] tracking-[1.5px] text-accent uppercase flex items-center gap-1.5 pl-2 border-l-2 border-accent bg-accent/[0.03] py-0.5"> Air Defense
          </div>
          <div className="font-mono text-[14px] text-text-dim space-y-0.5 mt-1">
            <div className="flex justify-between">
              <span>THAAD (UAE)</span>
              <span className="text-danger">1 DEST / 1 DMG</span>
            </div>
            <div className="flex justify-between">
              <span>AN/FPS-132</span>
              <span className="text-warning">DAMAGED</span>
            </div>
            <div className="flex justify-between">
              <span>Patriot Stocks</span>
              <span className="text-warning">LOW</span>
            </div>
          </div>
        </div>

        <div className="h-px bg-border" />

        {/* Maritime Status */}
        <div>
          <div className="font-heading text-[12px] tracking-[1.5px] text-accent uppercase flex items-center gap-1.5 pl-2 border-l-2 border-accent bg-accent/[0.03] py-0.5"> Maritime
          </div>
          <div className="font-mono text-[14px] text-text-dim space-y-0.5 mt-1">
            <div className="flex justify-between">
              <span>Hormuz</span>
              <span className="text-danger">CLOSED</span>
            </div>
            <div className="flex justify-between">
              <span>Bab el-Mandeb</span>
              <span className="text-warning">RESTRICTED</span>
            </div>
            <div className="flex justify-between">
              <span>Suez</span>
              <span className="text-accent">OPERATIONAL</span>
            </div>
            <div className="flex justify-between">
              <span>Ships Targeted</span>
              <span className="text-danger">10+</span>
            </div>
            <div className="flex justify-between">
              <span>Tankers Anchored</span>
              <span className="text-warning">~50+</span>
            </div>
            <div className="flex justify-between">
              <span>Brent Crude</span>
              <span className={oilPrice?.brent ? (oilPrice.change && oilPrice.change > 0 ? "text-danger" : "text-accent") : "text-warning"}>
                {oilPrice?.brent ? `$${oilPrice.brent.toFixed(2)}` : "..."}
              </span>
            </div>
            {oilPrice?.wti && (
              <div className="flex justify-between">
                <span>WTI Crude</span>
                <span className={oilPrice.change && oilPrice.change > 0 ? "text-danger" : "text-accent"}>
                  ${oilPrice.wti.toFixed(2)}
                </span>
              </div>
            )}
            {oilPrice?.changePercent != null && (
              <div className="flex justify-between">
                <span>Daily Change</span>
                <span className={oilPrice.changePercent > 0 ? "text-danger" : "text-accent"}>
                  {oilPrice.changePercent > 0 ? "+" : ""}{oilPrice.changePercent.toFixed(2)}%
                </span>
              </div>
            )}
          </div>
        </div>

        <div className="h-px bg-border" />

        {/* Pipelines */}
        <div>
          <div className="font-heading text-[12px] tracking-[1.5px] text-accent uppercase flex items-center gap-1.5 pl-2 border-l-2 border-accent bg-accent/[0.03] py-0.5"> Pipelines
          </div>
          <div className="font-mono text-[14px] text-text-dim space-y-0.5 mt-1">
            <div className="flex justify-between">
              <span>Total Segments</span>
              <span className="text-text">{layers.find((l) => l.id === "pipelines")?.count || "..."}</span>
            </div>
            <div className="flex justify-between">
              <span>Source</span>
              <span className="text-text-muted">OSM Overpass</span>
            </div>
          </div>
        </div>

        <div className="h-px bg-border" />

        {/* Airspace */}
        <div>
          <div className="font-heading text-[12px] tracking-[1.5px] text-accent uppercase flex items-center gap-1.5 pl-2 border-l-2 border-accent bg-accent/[0.03] py-0.5"> Airspace
          </div>
          <div className="font-mono text-[14px] text-text-dim space-y-0.5 mt-1">
            <div className="flex justify-between">
              <span>Tehran FIR</span>
              <span className="text-danger">CLOSED</span>
            </div>
            <div className="flex justify-between">
              <span>Baghdad FIR</span>
              <span className="text-warning">RESTRICTED</span>
            </div>
            <div className="flex justify-between">
              <span>Beirut FIR</span>
              <span className="text-warning">RESTRICTED</span>
            </div>
            <div className="flex justify-between">
              <span>Yemen FIR</span>
              <span className="text-danger">CLOSED</span>
            </div>
          </div>
        </div>

        <div className="h-px bg-border" />

        {/* Lebanon Front */}
        <div>
          <div className="font-heading text-[12px] tracking-[1.5px] text-[#c8b832] uppercase flex items-center gap-1.5 pl-2 border-l-2 border-[#c8b832] bg-[#c8b832]/[0.03] py-0.5">
            Lebanon Front
          </div>
          <div className="font-mono text-[14px] text-text-dim space-y-0.5 mt-1">
            <div className="flex justify-between">
              <span>Hezbollah</span>
              <span className="text-danger">FULL RE-ENTRY</span>
            </div>
            <div className="flex justify-between">
              <span>IDF Ground Ops</span>
              <span className="text-warning">ACTIVE</span>
            </div>
            <div className="flex justify-between">
              <span>UNIFIL</span>
              <span className="text-warning">SHELTERING</span>
            </div>
            <div className="flex justify-between">
              <span>Beirut Strikes</span>
              <span className="text-danger">ONGOING</span>
            </div>
          </div>
        </div>

        <div className="h-px bg-border" />

        {/* Houthi / Red Sea */}
        <div>
          <div className="font-heading text-[12px] tracking-[1.5px] text-[#d4962a] uppercase flex items-center gap-1.5 pl-2 border-l-2 border-[#d4962a] bg-[#d4962a]/[0.03] py-0.5">
            Houthi / Red Sea
          </div>
          <div className="font-mono text-[14px] text-text-dim space-y-0.5 mt-1">
            <div className="flex justify-between">
              <span>Ships Attacked</span>
              <span className="text-danger">3+ this week</span>
            </div>
            <div className="flex justify-between">
              <span>Bab el-Mandeb</span>
              <span className="text-warning">RESTRICTED</span>
            </div>
            <div className="flex justify-between">
              <span>Traffic Impact</span>
              <span className="text-danger">-30%</span>
            </div>
            <div className="flex justify-between">
              <span>Insurance</span>
              <span className="text-danger">10x PREMIUM</span>
            </div>
          </div>
        </div>

        <div className="h-px bg-border" />

        {/* Iraq Proxy */}
        <div>
          <div className="font-heading text-[12px] tracking-[1.5px] text-[#e8364a] uppercase flex items-center gap-1.5 pl-2 border-l-2 border-[#e8364a] bg-[#e8364a]/[0.03] py-0.5">
            Iraq Theater
          </div>
          <div className="font-mono text-[14px] text-text-dim space-y-0.5 mt-1">
            <div className="flex justify-between">
              <span>US Bases Targeted</span>
              <span className="text-danger">6</span>
            </div>
            <div className="flex justify-between">
              <span>Proxy Ops (Mar)</span>
              <span className="text-danger">27+ in 1 day</span>
            </div>
            <div className="flex justify-between">
              <span>Iran X-Border</span>
              <span className="text-danger">ACTIVE</span>
            </div>
            <div className="flex justify-between">
              <span>Kurdish Groups</span>
              <span className="text-warning">TARGETED</span>
            </div>
          </div>
        </div>

        <div className="h-px bg-border" />

        {/* Energy War Timeline */}
        <div>
          <div className="font-heading text-[12px] tracking-[1.5px] text-[#d4962a] uppercase flex items-center gap-1.5 pl-2 border-l-2 border-[#d4962a] bg-[#d4962a]/[0.03] py-0.5">
            Energy War
          </div>
          <div className="font-mono text-[14px] text-text-dim space-y-0.5 mt-1">
            <div className="flex justify-between">
              <span>Brent Crude</span>
              <span className="text-danger">$119/bbl (+63%)</span>
            </div>
            <div className="flex justify-between">
              <span>Gas (TTF)</span>
              <span className="text-danger">+24% in 1 day</span>
            </div>
            <div className="flex justify-between">
              <span>Qatar LNG</span>
              <span className="text-danger">17% OFFLINE</span>
            </div>
            <div className="flex justify-between">
              <span>Repair Timeline</span>
              <span className="text-warning">3-5 YEARS</span>
            </div>
          </div>
          <div className="mt-1.5 space-y-0.5 font-mono text-[10px] text-text-muted max-h-[120px] overflow-y-auto">
            <div><span className="text-white">MAR 18</span> Israel strikes South Pars</div>
            <div className="text-[9px] text-text-dim pl-[52px]">(world{"'"}s largest gas field)</div>
            <div><span className="text-white">MAR 18</span> Iran hits Ras Laffan, Qatar</div>
            <div className="text-[9px] text-text-dim pl-[52px]">(17% global LNG wiped)</div>
            <div><span className="text-white">MAR 19</span> Iran hits Kuwait refineries x2</div>
            <div><span className="text-white">MAR 19</span> Iran hits Saudi Yanbu refinery</div>
            <div className="text-[9px] text-text-dim pl-[52px]">(Hormuz bypass targeted)</div>
            <div><span className="text-white">MAR 19</span> Iran hits UAE gas fields x3</div>
            <div><span className="text-white">MAR 20</span> Iran hits ADNOC Ruwais</div>
            <div className="text-[9px] text-text-dim pl-[52px]">(922K bpd shutdown)</div>
          </div>
        </div>
      </div>
    </div>
  );
}
