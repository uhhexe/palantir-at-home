"use client";

import { useState, ReactNode } from "react";
import ScreenshotButton from "./ScreenshotButton";

interface SitrepPanelProps {
  strikes: { attacker?: string; side?: string }[];
  waves: unknown[];
  leadership: { leaders?: { name: string; role: string; status: string; importance?: string }[]; succession?: { newSupremeLeader?: string; appointedDate?: string } } | null;
  casualties: {
    bySource?: {
      hrana?: { iran?: { killed_total?: number; killed_civilian?: number; killed_military?: number } };
      hengaw?: { iran?: { killed_total?: number; killed_civilian?: number; killed_military?: number } };
      alJazeera?: { iran?: { killed?: number }; israel?: { killed?: number }; us_military?: { killed?: number }; iraq?: { killed?: number } };
    };
    usDeaths?: { confirmed_killed?: number; total_including_accidents?: number; killed_by_enemy_fire?: number };
    israelDeaths?: { killed?: number };
    gulfStateDeaths?: { uae?: { killed?: number }; saudi?: { killed?: number }; bahrain?: { killed?: number }; qatar?: { killed?: number } };
    notableIncidents?: unknown[];
  } | null;
  claims: { claims?: { verdict?: string; claimant?: string; claim?: string }[] } | null;
  weapons: { interceptorEconomics?: { costRatio?: string }; iranianOffensive?: unknown[]; airDefenseSystems?: unknown[]; usOffensive?: unknown[] } | null;
  economic: {
    oilPrices?: { preWar?: { brent?: number }; peak?: number; changePercent?: number; timeline?: { brent: number }[] };
    warCosts?: { us_first_6_days?: { total?: number }; daily_ongoing?: { high?: number }; pentagon_supplemental_request?: number };
    marketDisruption?: { shipping?: { hormuz_status?: string } };
    gasPrices?: unknown;
  } | null;
  energyStrikes: { target?: string; date?: string; attacker?: string }[];
}

function buildConflictContext(data: SitrepPanelProps): string {
  const parts: string[] = [];

  if (data.strikes?.length) {
    const byAttacker: Record<string, number> = {};
    data.strikes.forEach((s) => {
      const attacker = s.attacker || s.side || "Unknown";
      byAttacker[attacker] = (byAttacker[attacker] || 0) + 1;
    });
    parts.push(`STRIKES: ${data.strikes.length} total. Breakdown: ${Object.entries(byAttacker).map(([k, v]) => `${k}: ${v}`).join(", ")}`);
  }

  if (data.waves?.length) {
    parts.push(`WAVES: ${data.waves.length} attack waves recorded.`);
  }

  if (data.leadership?.leaders) {
    const leaders = data.leadership.leaders;
    const eliminated = leaders.filter((l) => l.status === "ELIMINATED").length;
    const alive = leaders.filter((l) => l.status === "ALIVE" || l.status === "SURVIVED").length;
    parts.push(`LEADERSHIP: ${leaders.length} tracked. ${eliminated} eliminated, ${alive} alive/survived.`);
    if (data.leadership.succession) {
      parts.push(`SUCCESSION: New Supreme Leader ${data.leadership.succession.newSupremeLeader}, appointed ${data.leadership.succession.appointedDate}.`);
    }
    const keyLeaders = leaders.filter((l) => l.importance === "critical");
    if (keyLeaders.length) {
      parts.push(`KEY TARGETS: ${keyLeaders.map((l) => `${l.name} (${l.role}) — ${l.status}`).join("; ")}`);
    }
  }

  if (data.casualties?.bySource) {
    const src = data.casualties.bySource;
    parts.push("CASUALTIES BY SOURCE:");
    if (src.hrana) parts.push(`  HRANA: ${src.hrana.iran?.killed_total ?? "?"} killed (${src.hrana.iran?.killed_civilian ?? "?"} civilian, ${src.hrana.iran?.killed_military ?? "?"} military)`);
    if (src.hengaw) parts.push(`  HENGAW: ${src.hengaw.iran?.killed_total ?? "?"} killed (${src.hengaw.iran?.killed_civilian ?? "?"} civilian, ${src.hengaw.iran?.killed_military ?? "?"} military)`);
    if (src.alJazeera) parts.push(`  AL JAZEERA: Iran ${src.alJazeera.iran?.killed ?? "?"}, Israel ${src.alJazeera.israel?.killed ?? "?"}, US military ${src.alJazeera.us_military?.killed ?? "?"}`);
  }
  if (data.casualties?.usDeaths) {
    parts.push(`US DEATHS: ${data.casualties.usDeaths.confirmed_killed ?? "?"} KIA, ${data.casualties.usDeaths.total_including_accidents ?? "?"} total.`);
  }

  if (data.economic?.oilPrices) {
    const oil = data.economic.oilPrices;
    const latest = oil.timeline?.[oil.timeline.length - 1]?.brent;
    parts.push(`OIL: Pre-war $${oil.preWar?.brent ?? "?"}/bbl -> Current $${latest ?? oil.peak ?? "?"}/bbl (+${oil.changePercent ?? "?"}%). Hormuz: ${data.economic.marketDisruption?.shipping?.hormuz_status || "UNKNOWN"}.`);
  }
  if (data.economic?.warCosts) {
    const costs = data.economic.warCosts;
    parts.push(`WAR COST: First 6 days $${costs.us_first_6_days?.total ? (costs.us_first_6_days.total / 1e9).toFixed(1) : "?"}B. Daily rate $${costs.daily_ongoing?.high ? (costs.daily_ongoing.high / 1e9).toFixed(1) : "?"}B. Pentagon requesting $${costs.pentagon_supplemental_request ? (costs.pentagon_supplemental_request / 1e9).toFixed(0) : "?"}B supplemental.`);
  }

  if (data.energyStrikes?.length) {
    const events = data.energyStrikes.filter((e) => e.target);
    parts.push(`ENERGY WAR: ${events.length} energy facility strikes tracked.`);
  }

  if (data.claims?.claims) {
    const cl = data.claims.claims;
    const falseCount = cl.filter((c) => c.verdict?.includes("FALSE") || c.verdict?.includes("MISLEADING")).length;
    parts.push(`PROPAGANDA: ${cl.length} official claims tracked. ${falseCount} rated FALSE or MISLEADING.`);
  }

  if (data.weapons?.interceptorEconomics) {
    parts.push(`INTERCEPTOR ECONOMICS: Overall cost ratio ${data.weapons.interceptorEconomics.costRatio || "?"}:1.`);
  }

  return parts.join("\n");
}

function renderSitrep(text: string): ReactNode[] {
  return text.split("\n").map((line, i) => {
    if (line.startsWith("DAILY SITREP")) {
      return (
        <div key={i} className="font-heading text-[16px] font-bold text-text border-b-2 border-accent/15 pb-2 mb-3 tracking-[1px]">
          {line}
        </div>
      );
    }
    if (/^\d+\.\s+[A-Z]/.test(line)) {
      return (
        <div key={i} className="font-heading text-[12px] font-bold text-accent tracking-[1px] mt-4 mb-1.5 border-l-2 border-accent pl-2">
          {line}
        </div>
      );
    }
    if (/^[a-f]\.\s+[A-Z]/.test(line.trim())) {
      return (
        <div key={i} className="font-mono text-[10px] font-semibold text-text-dim mt-1.5 ml-3">
          {line}
        </div>
      );
    }
    if (line.includes("SECRET") || line.includes("NOFORN") || line.includes("CLASSIFICATION")) {
      return (
        <div key={i} className="font-mono text-[8px] tracking-[2px] text-danger text-center my-1">
          {line}
        </div>
      );
    }
    if (line.trim().startsWith("-") || line.trim().startsWith("\u2022")) {
      return (
        <div key={i} className="font-mono text-[10px] text-text ml-3 pl-2 border-l border-accent/6 mb-0.5">
          {line}
        </div>
      );
    }
    if (!line.trim()) {
      return <div key={i} className="h-1.5" />;
    }
    return (
      <div key={i} className="font-mono text-[10px] text-text mb-0.5">
        {line}
      </div>
    );
  });
}

export default function SitrepPanel({ strikes, waves, leadership, casualties, claims, weapons, economic, energyStrikes }: SitrepPanelProps) {
  const [sitrep, setSitrep] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState("");
  const [generatedAt, setGeneratedAt] = useState("");

  const generateSitrep = async () => {
    setIsGenerating(true);
    setError("");

    const conflictData = buildConflictContext({ strikes, waves, leadership, casualties, claims, weapons, economic, energyStrikes });

    try {
      const res = await fetch("/api/conflict/sitrep", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conflictData }),
      });
      const data = await res.json();

      if (data.status === "ok") {
        setSitrep(data.sitrep);
        setGeneratedAt(data.timestamp);
      } else if (data.status === "no_api_key") {
        setError("ANTHROPIC_API_KEY not set. Add it in Vercel Settings -> Environment Variables to enable SITREP generation.");
      } else {
        setError(`API error: ${data.error || data.code || "Unknown"}`);
      }
    } catch (e) {
      setError(`Network error: ${String(e).substring(0, 100)}`);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="h-full flex flex-col bg-void">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2.5">
          <span className="font-mono text-[8px] tracking-[3px] text-danger font-bold px-2 py-0.5 border border-danger/30 bg-danger/6">
            SECRET // NOFORN
          </span>
          <span className="font-heading text-[13px] font-bold text-text tracking-[1px]">
            DAILY SITREP
          </span>
        </div>
        <div className="flex items-center gap-2">
          {sitrep && (
            <ScreenshotButton targetSelector=".sitrep-content" filename="palantir-at-home-sitrep" variant="full" />
          )}
          <button
            onClick={generateSitrep}
            disabled={isGenerating}
            className="px-4 py-1.5 border rounded-[3px] font-mono text-[10px] font-bold tracking-[1px] transition-all"
            style={{
              background: isGenerating ? "rgba(255,184,48,0.12)" : "rgba(34,245,176,0.12)",
              borderColor: isGenerating ? "rgba(255,184,48,0.25)" : "rgba(34,245,176,0.25)",
              color: isGenerating ? "#ffb830" : "#22f5b0",
              cursor: isGenerating ? "wait" : "pointer",
            }}
          >
            {isGenerating ? "\u25CC GENERATING..." : "\u25B6 GENERATE SITREP"}
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 sitrep-content">
        {error && (
          <div className="p-3 bg-danger/6 border border-danger/15 rounded-[3px] font-mono text-[10px] text-danger mb-3">
            {error}
          </div>
        )}

        {!sitrep && !isGenerating && !error && (
          <div className="text-center py-10 text-text-muted font-mono text-[11px]">
            <div className="text-[24px] mb-3 opacity-30">&#128203;</div>
            <div>Click GENERATE SITREP to create a military-style</div>
            <div>situation report from all loaded conflict data.</div>
            <div className="mt-2 text-[9px] text-text-muted">Requires ANTHROPIC_API_KEY</div>
          </div>
        )}

        {isGenerating && (
          <div className="text-center py-10 font-mono">
            <div className="text-[11px] text-warning animate-pulse">ANALYZING CONFLICT DATA...</div>
            <div className="text-[9px] text-text-muted mt-2">
              Reading {strikes.length} strikes, {leadership?.leaders?.length || 0} leaders, {claims?.claims?.length || 0} claims, economic indicators...
            </div>
          </div>
        )}

        {sitrep && (
          <div className="leading-relaxed">{renderSitrep(sitrep)}</div>
        )}
      </div>

      {/* Footer */}
      {generatedAt && (
        <div className="px-4 py-1.5 border-t border-border/50 flex justify-between font-mono text-[8px] text-text-muted shrink-0">
          <span>GENERATED: {new Date(generatedAt).toLocaleString()}</span>
          <span className="text-danger/25 tracking-[2px]">SECRET // NOFORN</span>
        </div>
      )}
    </div>
  );
}
