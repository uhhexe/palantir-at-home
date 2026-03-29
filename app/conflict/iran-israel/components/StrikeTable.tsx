"use client";

import { useState, useMemo } from "react";
import type { ConflictStrike } from "./ConflictMap";

interface StrikeTableProps {
  strikes: ConflictStrike[];
}

const ATTACKER_COLORS: Record<string, string> = {
  US: "#388bfd",
  ISRAEL: "#e6edf3",
  IRAN: "#e8364a",
  HOUTHI: "#d4962a",
  HEZBOLLAH: "#c8b832",
  UNKNOWN: "#8b949e",
};

const CONFIDENCE_COLORS: Record<string, string> = {
  CONFIRMED: "#00d4aa",
  REPORTED: "#d4962a",
  UNVERIFIED: "#8b949e",
};

type SortKey = "date" | "attacker" | "target" | "country" | "weapon" | "confidence";
type SortDir = "asc" | "desc";

function formatDate(dateStr: string): string {
  if (!dateStr) return "—";
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
  } catch {
    return dateStr;
  }
}

function formatTime(dateStr: string): string {
  if (!dateStr) return "";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "";
    const h = d.getUTCHours();
    const m = d.getUTCMinutes();
    if (h === 0 && m === 0) return "";
    return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")} UTC`;
  } catch {
    return "";
  }
}

export default function StrikeTable({ strikes }: StrikeTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>("date");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [filterAttacker, setFilterAttacker] = useState<string>("ALL");

  const filtered = useMemo(() => {
    let result = [...strikes];
    if (filterAttacker !== "ALL") {
      result = result.filter((s) => s.attacker === filterAttacker);
    }
    result.sort((a, b) => {
      let va: string, vb: string;
      switch (sortKey) {
        case "date": va = a.date || ""; vb = b.date || ""; break;
        case "attacker": va = a.attacker; vb = b.attacker; break;
        case "target": va = a.target || ""; vb = b.target || ""; break;
        case "country": va = a.country || ""; vb = b.country || ""; break;
        case "weapon": va = a.weaponType || ""; vb = b.weaponType || ""; break;
        case "confidence": va = a.confidence || ""; vb = b.confidence || ""; break;
        default: va = ""; vb = "";
      }
      const cmp = va.localeCompare(vb);
      return sortDir === "asc" ? cmp : -cmp;
    });
    return result;
  }, [strikes, sortKey, sortDir, filterAttacker]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("desc"); }
  };

  const attackerCounts = useMemo(() => {
    const counts: Record<string, number> = { ALL: strikes.length };
    strikes.forEach((s) => { counts[s.attacker] = (counts[s.attacker] || 0) + 1; });
    return counts;
  }, [strikes]);

  const SortHeader = ({ k, label, w }: { k: SortKey; label: string; w: string }) => (
    <button
      onClick={() => handleSort(k)}
      className={`text-left font-heading text-[14px] tracking-[1.5px] uppercase px-2 py-1.5 transition-colors ${w} ${
        sortKey === k ? "text-accent" : "text-text-muted hover:text-text-dim"
      }`}
    >
      {label} {sortKey === k ? (sortDir === "asc" ? "▲" : "▼") : ""}
    </button>
  );

  return (
    <div className="flex flex-col h-full bg-void">
      {/* Filter bar */}
      <div className="flex items-center gap-1 px-3 py-1.5 bg-surface border-b border-border shrink-0 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
        <span className="font-heading text-[14px] tracking-[1.5px] text-text-muted uppercase shrink-0 mr-1">
          Filter:
        </span>
        {["ALL", "US", "ISRAEL", "IRAN", "HOUTHI", "HEZBOLLAH"].map((a) => (
          <button
            key={a}
            onClick={() => setFilterAttacker(a)}
            className={`shrink-0 px-2 py-0.5 font-mono text-[14px] tracking-wide transition-colors border ${
              filterAttacker === a
                ? "border-accent/30 bg-accent-glow text-accent"
                : "border-transparent text-text-dim hover:text-text"
            }`}
          >
            {a === "ALL" ? (
              <span>ALL <span className="text-text-muted">{attackerCounts.ALL}</span></span>
            ) : (
              <span style={{ color: filterAttacker === a ? ATTACKER_COLORS[a] : undefined }}>
                {a} <span className="text-text-muted">{attackerCounts[a] || 0}</span>
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Table header */}
      <div className="flex items-center bg-surface-2 border-b border-border shrink-0">
        <SortHeader k="date" label="Date / Time" w="w-[140px]" />
        <SortHeader k="attacker" label="Attacker" w="w-[90px]" />
        <SortHeader k="target" label="Target" w="flex-1" />
        <SortHeader k="country" label="Country" w="w-[80px]" />
        <SortHeader k="weapon" label="Weapon" w="w-[140px]" />
        <SortHeader k="confidence" label="Status" w="w-[90px]" />
        <div className="w-[60px] px-2 py-1.5 font-heading text-[14px] tracking-[1.5px] text-text-muted uppercase">
          Source
        </div>
      </div>

      {/* Table body */}
      <div className="flex-1 overflow-y-auto">
        {filtered.map((strike) => (
          <div
            key={strike.id}
            className="flex items-start border-b border-border hover:bg-surface-2/50 transition-colors"
          >
            {/* Date */}
            <div className="w-[140px] px-2 py-1.5 shrink-0">
              <div className="font-mono text-[15px] text-text">
                {formatDate(strike.date)}
              </div>
              <div className="font-mono text-[14px] text-text-muted">
                {formatTime(strike.date)}
              </div>
            </div>

            {/* Attacker */}
            <div className="w-[90px] px-2 py-1.5 shrink-0">
              <span
                className="font-mono text-[15px] font-semibold"
                style={{ color: ATTACKER_COLORS[strike.attacker] || "#8b949e" }}
              >
                {strike.attacker}
              </span>
            </div>

            {/* Target */}
            <div className="flex-1 px-2 py-1.5 min-w-0">
              <div className="font-body text-[16px] text-text truncate">
                {strike.target || strike.location || "Unknown"}
              </div>
              {strike.notes && (
                <div className="font-mono text-[14px] text-text-muted truncate mt-0.5">
                  {strike.notes}
                </div>
              )}
            </div>

            {/* Country */}
            <div className="w-[80px] px-2 py-1.5 shrink-0">
              <span className="font-mono text-[15px] text-text-dim">
                {strike.country || "—"}
              </span>
            </div>

            {/* Weapon */}
            <div className="w-[140px] px-2 py-1.5 shrink-0">
              <span className="font-mono text-[14px] text-warning truncate block">
                {strike.weaponType || "—"}
              </span>
            </div>

            {/* Confidence */}
            <div className="w-[90px] px-2 py-1.5 shrink-0">
              <span
                className="font-mono text-[14px]"
                style={{ color: CONFIDENCE_COLORS[strike.confidence] || "#8b949e" }}
              >
                {strike.confidence}
              </span>
            </div>

            {/* Source */}
            <div className="w-[60px] px-2 py-1.5 shrink-0">
              <span className="font-mono text-[9px] text-text-muted truncate block">
                {strike.source?.split("/").pop()?.split(".")[0] || "—"}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="px-3 py-1 bg-surface border-t border-border shrink-0 flex items-center justify-between">
        <span className="font-mono text-[14px] text-text-muted">
          {filtered.length} of {strikes.length} strikes
        </span>
        <span className="font-mono text-[14px] text-text-muted">
          Sorted by {sortKey} {sortDir === "asc" ? "↑" : "↓"}
        </span>
      </div>
    </div>
  );
}
