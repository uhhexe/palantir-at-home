"use client";

import { useMemo } from "react";
import type { DailyRecord } from "./LossesPanel";

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
}

interface TodayViewProps {
  news: NewsItem[];
  losses: EquipmentLosses | null;
  dailyData: DailyRecord[];
  warDay: number;
}

const UA_BLUE = "#005BBB";
const RU_RED = "#e8364a";

function timeAgo(dateStr: string): string {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "";
  const diff = Date.now() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function formatNum(n: number | undefined): string {
  if (n == null || isNaN(n)) return "0";
  if (n >= 1000000) return (n / 1000000).toFixed(1) + "M";
  if (n >= 1000) return (n / 1000).toFixed(1) + "k";
  return n.toLocaleString();
}

const LOSS_KEYS: { key: string; label: string; color: string }[] = [
  { key: "tank", label: "Tanks", color: "#e6edf3" },
  { key: "APC", label: "APCs", color: "#9aa8b4" },
  { key: "field artillery", label: "Artillery", color: "#d4962a" },
  { key: "drone", label: "Drones", color: "#ffb020" },
  { key: "aircraft", label: "Aircraft", color: "#388bfd" },
  { key: "helicopter", label: "Helicopters", color: "#388bfd" },
  { key: "cruise missiles", label: "Cruise Missiles", color: "#c8b832" },
  { key: "vehicles and fuel tanks", label: "Vehicles", color: "#8b949e" },
  { key: "MRL", label: "MLRS", color: "#d4962a" },
  { key: "naval ship", label: "Ships", color: "#00d4aa" },
];

const FRONT_SECTORS = [
  { name: "Donetsk", status: "ACTIVE", detail: "Heaviest fighting — Pokrovsk & Chasiv Yar axes", color: RU_RED },
  { name: "Zaporizhzhia", status: "STATIC", detail: "Positional warfare, drone duels", color: "#d4962a" },
  { name: "Kherson", status: "STATIC", detail: "Cross-river fires, no movement", color: "#d4962a" },
  { name: "Kharkiv", status: "ACTIVE", detail: "Northern pressure, constant strikes", color: RU_RED },
  { name: "Kursk (RU)", status: "UA SALIENT", detail: "Ukrainian forces holding positions", color: UA_BLUE },
];

export default function TodayView({ news, losses, dailyData, warDay }: TodayViewProps) {
  const today = new Date().toISOString().slice(0, 10);

  const { todayDeltas, latestRecord } = useMemo(() => {
    if (dailyData.length < 2) return { todayDeltas: {} as Record<string, number>, latestRecord: null };
    const sorted = [...dailyData].sort((a, b) => a.day - b.day);
    const latest = sorted[sorted.length - 1];
    const prev = sorted[sorted.length - 2];
    const deltas: Record<string, number> = {};
    LOSS_KEYS.forEach(({ key }) => {
      deltas[key] = ((latest[key] as number) || 0) - ((prev[key] as number) || 0);
    });
    return { todayDeltas: deltas, latestRecord: latest };
  }, [dailyData]);

  const totalDailyLosses = useMemo(() => {
    return Object.values(todayDeltas).reduce((sum, v) => sum + Math.max(0, v), 0);
  }, [todayDeltas]);

  return (
    <div className="h-full overflow-y-auto bg-void">
      <div className="max-w-[1200px] mx-auto px-6 py-4 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <div className="font-heading text-[22px] tracking-[3px] text-accent uppercase">
              Current Day Briefing
            </div>
            <div className="font-mono text-[13px] text-text-muted mt-0.5">
              {today} — Day {warDay} of war — Ukraine Theater
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 bg-danger animate-pulse" />
            <span className="font-heading text-[16px] tracking-[2px] text-danger uppercase">Live</span>
          </div>
        </div>

        {/* Quick stats row */}
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
          <div className="bg-surface border border-border px-4 py-3">
            <div className="font-mono text-[13px] text-text-muted tracking-[1px] uppercase">RU Personnel (Total)</div>
            <div className="font-mono text-[34px] text-danger mt-0.5">
              {losses?.russia?.personnel ? formatNum(losses.russia.personnel) : "..."}
            </div>
            <div className="font-mono text-[13px] text-text-dim mt-0.5">Cumulative since Feb 2022</div>
          </div>
          <div className="bg-surface border border-border px-4 py-3">
            <div className="font-mono text-[13px] text-text-muted tracking-[1px] uppercase">Latest Daily Losses</div>
            <div className="font-mono text-[34px] text-white mt-0.5">+{totalDailyLosses}</div>
            <div className="font-mono text-[13px] text-text-dim mt-0.5">Equipment units ({latestRecord?.date || "..."})</div>
          </div>
          <div className="bg-surface border border-border px-4 py-3">
            <div className="font-mono text-[13px] text-text-muted tracking-[1px] uppercase">Live News Items</div>
            <div className="font-mono text-[34px] text-accent mt-0.5">{news.length}</div>
            <div className="font-mono text-[13px] text-text-dim mt-0.5">From intel feeds</div>
          </div>
          <div className="bg-surface border border-border px-4 py-3">
            <div className="font-mono text-[13px] text-text-muted tracking-[1px] uppercase">War Day</div>
            <div className="font-mono text-[34px] text-[#005BBB] mt-0.5">D+{warDay}</div>
            <div className="font-mono text-[13px] text-text-dim mt-0.5">Since 24 FEB 2022</div>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {/* Left: Live Intel + Front Status */}
          <div className="space-y-4">
            {/* Breaking news */}
            <div className="bg-surface border border-border">
              <div className="px-4 py-2 border-b border-border flex items-center gap-2">
                <div className="w-1 h-1 bg-danger animate-pulse" />
                <span className="font-heading text-[17px] tracking-[2px] text-accent uppercase">Live Intel Feed</span>
                <span className="font-mono text-[13px] text-text-muted ml-auto">{news.length} items</span>
              </div>
              <div className="max-h-[420px] overflow-y-auto">
                {news.length === 0 && (
                  <div className="px-4 py-6 text-center font-mono text-[13px] text-text-muted">
                    Fetching intelligence feeds...
                  </div>
                )}
                {news.slice(0, 25).map((item, i) => (
                  <a
                    key={i}
                    href={item.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block px-4 py-2 border-b border-border hover:bg-surface-2 transition-colors group"
                  >
                    <div className="flex items-start gap-2">
                      <div className="shrink-0 mt-1">
                        <div className="w-1 h-1 bg-accent" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-mono text-[15px] text-text leading-snug group-hover:text-accent-bright transition-colors">
                          {item.title}
                        </div>
                        {item.description && (
                          <div className="font-mono text-[13px] text-text-dim mt-0.5 line-clamp-2">
                            {item.description}
                          </div>
                        )}
                        <div className="flex items-center gap-2 mt-1">
                          <span className="font-mono text-[12px] text-warning">{item.source}</span>
                          <span className="font-mono text-[12px] text-text-muted">{timeAgo(item.date)}</span>
                        </div>
                      </div>
                    </div>
                  </a>
                ))}
              </div>
            </div>

            {/* Front status */}
            <div className="bg-surface border border-border">
              <div className="px-4 py-2 border-b border-border flex items-center gap-2">
                <span className="text-accent">{"\u25C6"}</span>
                <span className="font-heading text-[17px] tracking-[2px] text-accent uppercase">Front Status</span>
              </div>
              <div className="divide-y divide-border">
                {FRONT_SECTORS.map((sector, i) => (
                  <div key={i} className="px-4 py-2 flex items-center gap-3">
                    <div className="w-1.5 h-1.5 shrink-0" style={{ backgroundColor: sector.color }} />
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-[15px] text-text">{sector.name}</span>
                        <span className="font-mono text-[13px] font-semibold" style={{ color: sector.color }}>
                          {sector.status}
                        </span>
                      </div>
                      <div className="font-mono text-[12px] text-text-dim mt-0.5">{sector.detail}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right: Daily losses breakdown */}
          <div className="space-y-4">
            <div className="bg-surface border border-border">
              <div className="px-4 py-2 border-b border-border flex items-center gap-2">
                <span className="text-danger">{"\u25C6"}</span>
                <span className="font-heading text-[17px] tracking-[2px] text-accent uppercase">Latest Daily Losses (RU)</span>
                <span className="font-mono text-[13px] text-text-muted ml-auto">{latestRecord?.date || "..."}</span>
              </div>
              <div className="px-4 py-2 space-y-1">
                {LOSS_KEYS.map(({ key, label, color }) => {
                  const delta = todayDeltas[key] || 0;
                  const total = latestRecord ? (latestRecord[key] as number) || 0 : 0;
                  return (
                    <div key={key} className="flex items-center gap-2 py-1">
                      <div className="w-2 h-2 shrink-0" style={{ backgroundColor: color }} />
                      <span className="font-mono text-[15px] text-text flex-1">{label}</span>
                      <span className="font-mono text-[15px] text-text-dim w-[70px] text-right">{formatNum(total)}</span>
                      <span className="font-mono text-[15px] w-[60px] text-right" style={{ color: delta > 0 ? "#e8364a" : "#8b949e" }}>
                        {delta > 0 ? `+${delta}` : delta === 0 ? "—" : String(delta)}
                      </span>
                      {/* Bar */}
                      <div className="w-[80px] h-[6px] bg-surface-3 shrink-0">
                        {delta > 0 && (
                          <div
                            className="h-full"
                            style={{
                              backgroundColor: color,
                              width: `${Math.min(100, (delta / Math.max(...Object.values(todayDeltas).filter(v => v > 0), 1)) * 100)}%`,
                              opacity: 0.7,
                            }}
                          />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Key cumulative milestones */}
            <div className="bg-surface border border-border">
              <div className="px-4 py-2 border-b border-border flex items-center gap-2">
                <span className="text-accent">{"\u25C6"}</span>
                <span className="font-heading text-[17px] tracking-[2px] text-accent uppercase">Cumulative Totals</span>
              </div>
              {losses?.russia && (
                <div className="px-4 py-2 grid grid-cols-2 gap-x-4 gap-y-2">
                  {[
                    { label: "Personnel", value: losses.russia.personnel, color: RU_RED },
                    { label: "Tanks", value: losses.russia.tank, color: "#e6edf3" },
                    { label: "APCs", value: losses.russia.APC, color: "#9aa8b4" },
                    { label: "Artillery", value: losses.russia["field artillery"], color: "#d4962a" },
                    { label: "Drones", value: losses.russia.drone, color: "#ffb020" },
                    { label: "Cruise Missiles", value: losses.russia["cruise missiles"], color: "#c8b832" },
                    { label: "Aircraft", value: losses.russia.aircraft, color: "#388bfd" },
                    { label: "Ships", value: losses.russia["naval ship"], color: "#00d4aa" },
                  ].map((item, i) => (
                    <div key={i} className="flex items-center justify-between py-0.5">
                      <span className="font-mono text-[14px] text-text-dim">{item.label}</span>
                      <span className="font-mono text-[16px] font-semibold" style={{ color: item.color }}>
                        {formatNum(item.value)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Situation assessment */}
            <div className="bg-surface border border-border">
              <div className="px-4 py-2 border-b border-border flex items-center gap-2">
                <span className="text-warning">{"\u25C6"}</span>
                <span className="font-heading text-[17px] tracking-[2px] text-accent uppercase">Situation Assessment</span>
              </div>
              <div className="px-4 py-3 space-y-2">
                <div className="font-mono text-[14px] text-text leading-relaxed">
                  <span className="text-danger font-semibold">HIGH INTENSITY</span> — Donetsk axis remains the most active sector with daily Russian assaults toward Pokrovsk. Drone warfare dominates across all fronts with record UAV deployment.
                </div>
                <div className="font-mono text-[14px] text-text leading-relaxed">
                  <span className="text-warning font-semibold">KEY WATCH</span> — Russian glide bomb usage on Kharkiv infrastructure. Ukrainian deep strike capability expanding with Western-supplied systems targeting Russian logistics.
                </div>
                <div className="font-mono text-[14px] text-text-dim leading-relaxed">
                  <span className="text-[#005BBB] font-semibold">UA SALIENT</span> — Kursk positions holding. Russia attempting to retake lost territory with redeployed forces.
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
