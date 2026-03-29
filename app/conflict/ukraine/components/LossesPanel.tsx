"use client";

import { useMemo } from "react";

export interface DailyRecord {
  date: string;
  day: number;
  personnel: number;
  aircraft: number;
  helicopter: number;
  tank: number;
  APC: number;
  "field artillery": number;
  MRL: number;
  drone: number;
  "naval ship": number;
  "anti-aircraft warfare": number;
  "cruise missiles": number;
  [key: string]: string | number;
}

interface LossesPanelProps {
  dailyData: DailyRecord[];
}

const KEY_CATEGORIES: { key: string; label: string; color: string }[] = [
  { key: "tank", label: "TANKS", color: "#e6edf3" },
  { key: "APC", label: "APCs", color: "#9aa8b4" },
  { key: "field artillery", label: "ARTILLERY", color: "#d4962a" },
  { key: "aircraft", label: "AIRCRAFT", color: "#388bfd" },
  { key: "helicopter", label: "HELICOPTERS", color: "#388bfd" },
  { key: "drone", label: "DRONES", color: "#ffb020" },
  { key: "cruise missiles", label: "CRUISE MISSILES", color: "#c8b832" },
  { key: "MRL", label: "MLRS", color: "#d4962a" },
  { key: "anti-aircraft warfare", label: "AIR DEFENSE", color: "#00d4aa" },
  { key: "naval ship", label: "SHIPS", color: "#00d4aa" },
  { key: "vehicles and fuel tanks", label: "VEHICLES", color: "#8b949e" },
];

function Sparkline({ data, color, width = 80, height = 20 }: { data: number[]; color: string; width?: number; height?: number }) {
  if (data.length < 2) return null;
  const max = Math.max(...data, 1);
  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - (v / max) * height;
    return `${x},${y}`;
  }).join(" ");

  return (
    <svg width={width} height={height} className="shrink-0">
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth={1}
        opacity={0.6}
      />
    </svg>
  );
}

function formatNum(n: number | undefined): string {
  if (n == null || isNaN(n)) return "0";
  if (n >= 1000000) return (n / 1000000).toFixed(1) + "M";
  if (n >= 1000) return (n / 1000).toFixed(1) + "k";
  return n.toLocaleString();
}

export default function LossesPanel({ dailyData }: LossesPanelProps) {
  const { latest, deltas, sparklines } = useMemo(() => {
    if (dailyData.length === 0) return { latest: null, deltas: {} as Record<string, number>, sparklines: {} as Record<string, number[]> };

    const sorted = [...dailyData].sort((a, b) => a.day - b.day);
    const lat = sorted[sorted.length - 1];
    const prev = sorted.length > 1 ? sorted[sorted.length - 2] : null;

    const d: Record<string, number> = {};
    const sp: Record<string, number[]> = {};

    KEY_CATEGORIES.forEach(({ key }) => {
      d[key] = prev ? (lat[key] as number) - (prev[key] as number) : 0;
      // Last 30 days of daily deltas for sparkline
      const recentSlice = sorted.slice(-31);
      const dailyDeltas: number[] = [];
      for (let i = 1; i < recentSlice.length; i++) {
        const delta = (recentSlice[i][key] as number) - (recentSlice[i - 1][key] as number);
        dailyDeltas.push(Math.max(0, delta));
      }
      sp[key] = dailyDeltas;
    });

    return { latest: lat, deltas: d, sparklines: sp };
  }, [dailyData]);

  if (!latest) {
    return (
      <div className="h-full flex items-center justify-center text-text-dim font-mono text-[14px]">
        Loading loss data...
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto bg-surface border-l border-border">
      {/* Header */}
      <div className="px-3 py-2 border-b border-border sticky top-0 bg-surface z-10">
        <div className="font-heading text-[16px] tracking-[2px] text-accent uppercase">
          Russian Losses
        </div>
        <div className="font-mono text-[11px] text-text-muted">
          Source: UA General Staff — Day {latest.day} ({latest.date})
        </div>
      </div>

      <div className="px-3 py-2 space-y-1.5">
        {KEY_CATEGORIES.map(({ key, label, color }) => {
          const value = latest[key] as number;
          const delta = deltas[key] || 0;
          const spark = sparklines[key] || [];

          return (
            <div key={key} className="flex items-center gap-2 py-0.5">
              <div className="w-[90px] shrink-0">
                <div className="font-mono text-[11px] tracking-[0.5px] text-text-muted uppercase">{label}</div>
                <div className="font-mono text-[16px] font-semibold" style={{ color }}>
                  {formatNum(value)}
                </div>
              </div>
              <Sparkline data={spark} color={color} width={70} height={18} />
              <div className="ml-auto shrink-0">
                {delta > 0 && (
                  <span className="font-mono text-[12px] text-danger">
                    +{formatNum(delta)}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Oryx note */}
      <div className="px-3 py-2 border-t border-border">
        <div className="font-mono text-[10px] text-text-muted leading-relaxed">
          UA GenStaff figures are cumulative claims. Oryx-verified (photo evidence) totals are lower but independently confirmed. See sidebar for Oryx breakdown.
        </div>
      </div>
    </div>
  );
}
