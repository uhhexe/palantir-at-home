"use client";

import { useState, useMemo } from "react";

export interface Claim {
  id: string;
  date: string;
  claimant: string;
  side: string;
  claim: string;
  category: string;
  osintReality: string;
  sources: string[];
  verdict: string;
  verdictNote: string;
  relatedLocation?: { lat: number; lng: number; label: string };
}

export interface ClaimsData {
  asOf: string;
  methodology: string;
  claims: Claim[];
  verdictScale: Record<string, string>;
}

interface ClaimsTrackerProps {
  data: ClaimsData;
  onViewOnMap?: (lat: number, lng: number, label: string) => void;
}

const VERDICT_COLORS: Record<string, { bg: string; border: string; text: string; icon: string }> = {
  "CONFIRMED":                         { bg: "rgba(34,245,176,0.06)",  border: "rgba(34,245,176,0.2)",  text: "#22f5b0", icon: "\u2713" },
  "PARTIALLY TRUE":                    { bg: "rgba(255,184,48,0.06)",  border: "rgba(255,184,48,0.2)",  text: "#ffb830", icon: "\u25D0" },
  "MISLEADING":                        { bg: "rgba(255,140,66,0.06)",  border: "rgba(255,140,66,0.2)",  text: "#ff8c42", icon: "\u26A0" },
  "EXAGGERATED":                       { bg: "rgba(255,140,66,0.06)",  border: "rgba(255,140,66,0.2)",  text: "#ff8c42", icon: "\u2191" },
  "UNVERIFIED":                        { bg: "rgba(156,163,175,0.06)", border: "rgba(156,163,175,0.2)", text: "#9ca3af", icon: "?" },
  "FALSE":                             { bg: "rgba(255,59,92,0.06)",   border: "rgba(255,59,92,0.2)",   text: "#ff3b5c", icon: "\u2715" },
  "FALSE (waterways)":                 { bg: "rgba(255,59,92,0.06)",   border: "rgba(255,59,92,0.2)",   text: "#ff3b5c", icon: "\u2715" },
  "SIGNIFICANT ADMISSION":             { bg: "rgba(56,139,253,0.06)",  border: "rgba(56,139,253,0.2)",  text: "#388bfd", icon: "!" },
  "HYPOCRITICAL":                      { bg: "rgba(200,75,200,0.06)",  border: "rgba(200,75,200,0.2)",  text: "#c84bc8", icon: "\u21BA" },
  "UNVERIFIED DENIAL":                 { bg: "rgba(255,59,92,0.06)",   border: "rgba(255,59,92,0.2)",   text: "#ff3b5c", icon: "?" },
  "PLAUSIBLE BUT CONVENIENT":          { bg: "rgba(255,184,48,0.06)",  border: "rgba(255,184,48,0.2)",  text: "#ffb830", icon: "~" },
  "UNDERSTATED (at time of statement)":{ bg: "rgba(255,140,66,0.06)",  border: "rgba(255,140,66,0.2)",  text: "#ff8c42", icon: "\u2193" },
  "EXAGGERATED BUT SUBSTANTIVE":       { bg: "rgba(255,184,48,0.06)",  border: "rgba(255,184,48,0.2)",  text: "#ffb830", icon: "\u2191" },
  "SOME STRIKES ON DECOYS CONFIRMED":  { bg: "rgba(255,140,66,0.06)",  border: "rgba(255,140,66,0.2)",  text: "#ff8c42", icon: "\u25D0" },
};

const SIDE_COLORS: Record<string, string> = {
  US: "#388bfd",
  Israel: "#388bfd",
  "US/Israel": "#388bfd",
  Iran: "#e8364a",
};

const SIDE_FLAGS: Record<string, string> = {
  US: "\uD83C\uDDFA\uD83C\uDDF8",
  Israel: "\uD83C\uDDEE\uD83C\uDDF1",
  "US/Israel": "\uD83C\uDDFA\uD83C\uDDF8\uD83C\uDDEE\uD83C\uDDF1",
  Iran: "\uD83C\uDDEE\uD83C\uDDF7",
};

const CATEGORY_LABELS: Record<string, string> = {
  war_progress: "WAR PROGRESS",
  military_status: "MILITARY STATUS",
  nuclear_threat: "NUCLEAR THREAT",
  leadership: "LEADERSHIP",
  war_justification: "WAR JUSTIFICATION",
  casualties: "CASUALTIES",
  civilian_casualties: "CIVILIAN CASUALTIES",
  coordination: "COORDINATION",
  framing: "FRAMING",
  military_threat: "MILITARY THREAT",
};

function getVerdictColor(verdict: string) {
  return VERDICT_COLORS[verdict] || { bg: "rgba(156,163,175,0.06)", border: "rgba(156,163,175,0.2)", text: "#9ca3af", icon: "?" };
}

function formatDate(dateStr: string): string {
  if (dateStr === "ongoing") return "ONGOING";
  try {
    const d = new Date(dateStr);
    const day = d.getDate().toString().padStart(2, "0");
    const mon = d.toLocaleString("en-US", { month: "short" }).toUpperCase();
    const year = d.getFullYear();
    return `${day} ${mon} ${year}`;
  } catch {
    return dateStr;
  }
}

type FilterKey = "all" | "US" | "Israel" | "Iran" | "false" | "unverified";

export default function ClaimsTracker({ data, onViewOnMap }: ClaimsTrackerProps) {
  const [filter, setFilter] = useState<FilterKey>("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    if (filter === "all") return data.claims;
    if (filter === "US") return data.claims.filter(c => c.side === "US" || c.side === "US/Israel");
    if (filter === "Israel") return data.claims.filter(c => c.side === "Israel" || c.side === "US/Israel");
    if (filter === "Iran") return data.claims.filter(c => c.side === "Iran");
    if (filter === "false") return data.claims.filter(c => c.verdict.includes("FALSE") || c.verdict === "HYPOCRITICAL");
    if (filter === "unverified") return data.claims.filter(c => c.verdict.includes("UNVERIFIED"));
    return data.claims;
  }, [data.claims, filter]);

  const counts = useMemo(() => {
    const c = data.claims;
    return {
      all: c.length,
      us: c.filter(x => x.side === "US" || x.side === "US/Israel").length,
      israel: c.filter(x => x.side === "Israel" || x.side === "US/Israel").length,
      iran: c.filter(x => x.side === "Iran").length,
      false: c.filter(x => x.verdict.includes("FALSE") || x.verdict === "HYPOCRITICAL").length,
      unverified: c.filter(x => x.verdict.includes("UNVERIFIED")).length,
    };
  }, [data.claims]);

  return (
    <div className="h-full overflow-y-auto bg-void">
      {/* Classification header */}
      <div className="bg-[#1a0a0a] border-b border-danger/30 px-4 py-1.5 flex items-center justify-between">
        <span className="font-mono text-[10px] text-danger/70 tracking-[2px]">
          TOP SECRET // NOFORN // PROPAGANDA ANALYSIS
        </span>
        <span className="font-mono text-[10px] text-text-muted">
          {data.claims.length} CLAIMS TRACKED
        </span>
      </div>

      {/* Title + methodology */}
      <div className="px-4 py-3 border-b border-border">
        <div className="font-heading text-[18px] tracking-[2px] text-danger uppercase">
          Propaganda vs Reality Tracker
        </div>
        <div className="font-mono text-[10px] text-text-muted mt-1 leading-relaxed">
          {data.methodology}
        </div>
        <div className="font-mono text-[10px] text-text-muted mt-0.5">
          As of {data.asOf}
        </div>
      </div>

      {/* Filter bar */}
      <div className="px-4 py-2 border-b border-border flex flex-wrap gap-1.5">
        {([
          { key: "all" as FilterKey, label: "ALL", count: counts.all },
          { key: "US" as FilterKey, label: "US", count: counts.us, color: "#388bfd" },
          { key: "Israel" as FilterKey, label: "ISRAEL", count: counts.israel, color: "#388bfd" },
          { key: "Iran" as FilterKey, label: "IRAN", count: counts.iran, color: "#e8364a" },
          { key: "false" as FilterKey, label: "FALSE", count: counts.false, color: "#ff3b5c" },
          { key: "unverified" as FilterKey, label: "UNVERIFIED", count: counts.unverified, color: "#9ca3af" },
        ]).map(f => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className="transition-colors"
            style={{
              padding: "2px 8px",
              fontFamily: "var(--font-mono), 'Inconsolata', monospace",
              fontSize: "10px",
              fontWeight: 700,
              letterSpacing: "0.5px",
              border: `1px solid ${filter === f.key ? (f.color || "#00d4aa") : "rgba(92,108,120,0.3)"}`,
              background: filter === f.key ? `${f.color || "#00d4aa"}15` : "transparent",
              color: filter === f.key ? (f.color || "#00d4aa") : "#8b949e",
            }}
          >
            {f.label} <span style={{ opacity: 0.7 }}>({f.count})</span>
          </button>
        ))}
      </div>

      {/* Claims list */}
      <div className="divide-y divide-border/40">
        {filtered.map(claim => {
          const vc = getVerdictColor(claim.verdict);
          const sideColor = SIDE_COLORS[claim.side] || "#8b949e";
          const flag = SIDE_FLAGS[claim.side] || "";
          const isExpanded = expandedId === claim.id;

          return (
            <div
              key={claim.id}
              className="px-4 py-3 transition-colors hover:bg-surface-2/30 cursor-pointer"
              onClick={() => setExpandedId(isExpanded ? null : claim.id)}
              style={{ borderLeft: `3px solid ${vc.text}` }}
            >
              {/* Header: ID + Date + Category */}
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[10px] text-text-muted tracking-wider">{claim.id}</span>
                  <span
                    className="font-mono text-[9px] tracking-wider px-1.5 py-px"
                    style={{
                      color: sideColor,
                      border: `1px solid ${sideColor}30`,
                      background: `${sideColor}10`,
                    }}
                  >
                    {flag} {claim.side}
                  </span>
                  <span className="font-mono text-[9px] text-text-muted tracking-wider px-1.5 py-px border border-border/50">
                    {CATEGORY_LABELS[claim.category] || claim.category.toUpperCase()}
                  </span>
                </div>
                <span className="font-mono text-[10px] text-text-muted">{formatDate(claim.date)}</span>
              </div>

              {/* Claimant */}
              <div className="font-heading text-[13px] text-white font-semibold tracking-wide uppercase">
                {claim.claimant}
              </div>

              {/* Claim text */}
              <div className="mt-1.5 font-mono text-[12px] text-text-dim leading-relaxed italic">
                &ldquo;{claim.claim}&rdquo;
              </div>

              {/* Separator */}
              <div className="h-px my-2" style={{ background: `linear-gradient(to right, ${vc.text}30, transparent)` }} />

              {/* OSINT Reality */}
              <div className="mb-1">
                <span className="font-mono text-[9px] text-accent tracking-[1.5px] uppercase">OSINT Reality:</span>
              </div>
              <div className="font-mono text-[11px] text-text-dim leading-relaxed">
                {isExpanded ? claim.osintReality : claim.osintReality.substring(0, 180) + (claim.osintReality.length > 180 ? "..." : "")}
              </div>

              {/* Sources */}
              {isExpanded && (
                <div className="mt-1.5">
                  <span className="font-mono text-[9px] text-text-muted tracking-wider">SOURCES: </span>
                  <span className="font-mono text-[9px] text-accent/70">
                    {claim.sources.join(" \u2022 ")}
                  </span>
                </div>
              )}

              {/* Verdict badge */}
              <div
                className="mt-2 px-3 py-2"
                style={{
                  background: vc.bg,
                  border: `1px solid ${vc.border}`,
                  borderLeft: `3px solid ${vc.text}`,
                }}
              >
                <div className="flex items-center gap-2">
                  <span style={{ color: vc.text, fontSize: "14px", fontWeight: 900 }}>{vc.icon}</span>
                  <span
                    className="font-mono text-[11px] font-bold tracking-[1px]"
                    style={{ color: vc.text }}
                  >
                    {claim.verdict}
                  </span>
                </div>
                <div className="font-mono text-[10px] text-text-dim mt-1 leading-relaxed">
                  {claim.verdictNote}
                </div>
              </div>

              {/* View on map button */}
              {isExpanded && claim.relatedLocation && onViewOnMap && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onViewOnMap(claim.relatedLocation!.lat, claim.relatedLocation!.lng, claim.relatedLocation!.label);
                  }}
                  className="mt-2 px-3 py-1 font-mono text-[10px] tracking-[1px] text-accent border border-accent/30 hover:bg-accent/10 transition-colors uppercase"
                >
                  &#x1F4CD; View on Map &mdash; {claim.relatedLocation.label}
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Verdict scale legend */}
      <div className="px-4 py-3 border-t border-border">
        <div className="font-mono text-[9px] text-text-muted tracking-[1.5px] uppercase mb-2">Verdict Scale</div>
        <div className="space-y-0.5">
          {Object.entries(data.verdictScale).map(([key, desc]) => {
            const vc = getVerdictColor(key);
            return (
              <div key={key} className="flex items-start gap-2">
                <span className="font-mono text-[10px] font-bold shrink-0 w-3 text-center" style={{ color: vc.text }}>{vc.icon}</span>
                <span className="font-mono text-[9px] font-bold shrink-0" style={{ color: vc.text, minWidth: "100px" }}>{key}</span>
                <span className="font-mono text-[9px] text-text-muted">{desc}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Classification footer */}
      <div className="bg-[#1a0a0a] border-t border-danger/30 px-4 py-1.5 text-center">
        <span className="font-mono text-[10px] text-danger/70 tracking-[2px]">
          TOP SECRET // NOFORN // PROPAGANDA ANALYSIS
        </span>
      </div>
    </div>
  );
}
