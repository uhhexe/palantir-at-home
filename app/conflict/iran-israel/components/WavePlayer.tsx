"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";

export interface WaveEvent {
  id: string;
  round: string;
  waveNumber: number;
  codeName?: string | null;
  timestamp: string;
  attacker: string;
  targets: {
    name: string;
    lat: number;
    lng: number;
    type: string;
    hit: boolean;
    notes?: string;
  }[];
  weapons: {
    name: string;
    type: string;
    count?: number | null;
  }[];
  defenseResponse?: string;
  outcome?: string;
  sources?: string[];
  description?: string;
  countries?: string[];
}

export interface CumulativeWaveTarget {
  lat: number;
  lng: number;
  name: string;
  attacker: string;
  round: string;
}

interface WavePlayerProps {
  waves: WaveEvent[];
  onWaveSelect: (wave: WaveEvent | null) => void;
  onCumulativeChange: (targets: CumulativeWaveTarget[]) => void;
  selectedWaveId: string | null;
}

const ROUND_COLORS: Record<string, string> = {
  TP1: "#ffb020",
  TP2: "#d4962a",
  TP3: "#e87830",
  TP4: "#e8364a",
};

const ROUND_LABELS: Record<string, string> = {
  TP1: "Apr '24",
  TP2: "Oct '24",
  TP3: "Jun '25",
  TP4: "Feb-Mar '26",
};

export default function WavePlayer({ waves, onWaveSelect, onCumulativeChange, selectedWaveId }: WavePlayerProps) {
  const [playing, setPlaying] = useState(false);
  const [currentIdx, setCurrentIdx] = useState<number | null>(null);
  const [finished, setFinished] = useState(false);
  const playRef = useRef(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const cumulativeRef = useRef<CumulativeWaveTarget[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  // Sort waves by timestamp
  const sorted = useMemo(
    () => [...waves].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()),
    [waves]
  );

  // Group by round
  const rounds = useMemo(() => {
    const r: Record<string, WaveEvent[]> = {};
    sorted.forEach((w) => {
      if (!r[w.round]) r[w.round] = [];
      r[w.round].push(w);
    });
    return r;
  }, [sorted]);

  // Time range
  const timeRange = useMemo(() => {
    if (sorted.length === 0) return { min: 0, max: 1 };
    return {
      min: new Date(sorted[0].timestamp).getTime(),
      max: new Date(sorted[sorted.length - 1].timestamp).getTime(),
    };
  }, [sorted]);

  const selectedWave = useMemo(
    () => sorted.find((w) => w.id === selectedWaveId) || null,
    [sorted, selectedWaveId]
  );

  // Add a wave's targets to cumulative state
  const addToCumulative = useCallback((wave: WaveEvent) => {
    const newTargets = wave.targets
      .filter((t) => t.lat && t.lng)
      .map((t) => ({
        lat: t.lat,
        lng: t.lng,
        name: t.name,
        attacker: wave.attacker,
        round: wave.round,
      }));
    cumulativeRef.current = [...cumulativeRef.current, ...newTargets];
    onCumulativeChange(cumulativeRef.current);
  }, [onCumulativeChange]);

  // Clear cumulative state
  const clearCumulative = useCallback(() => {
    cumulativeRef.current = [];
    onCumulativeChange([]);
  }, [onCumulativeChange]);

  // Build cumulative up to an index (for manual stepping)
  const buildCumulativeUpTo = useCallback((idx: number) => {
    const targets: CumulativeWaveTarget[] = [];
    for (let i = 0; i <= idx; i++) {
      const w = sorted[i];
      if (!w) continue;
      w.targets.filter((t) => t.lat && t.lng).forEach((t) => {
        targets.push({ lat: t.lat, lng: t.lng, name: t.name, attacker: w.attacker, round: w.round });
      });
    }
    cumulativeRef.current = targets;
    onCumulativeChange(targets);
  }, [sorted, onCumulativeChange]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  // Play/pause engine
  const startPlayback = useCallback((fromIdx: number) => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    playRef.current = true;
    setPlaying(true);
    setFinished(false);

    let idx = fromIdx;

    // Select the first wave immediately
    if (idx >= 0 && idx < sorted.length) {
      setCurrentIdx(idx);
      onWaveSelect(sorted[idx]);
      addToCumulative(sorted[idx]);
    }

    intervalRef.current = setInterval(() => {
      if (!playRef.current) return;
      idx++;
      if (idx >= sorted.length) {
        if (intervalRef.current) clearInterval(intervalRef.current);
        playRef.current = false;
        setPlaying(false);
        setFinished(true);
        return;
      }
      setCurrentIdx(idx);
      onWaveSelect(sorted[idx]);
      addToCumulative(sorted[idx]);
    }, 2000);
  }, [sorted, onWaveSelect, addToCumulative]);

  const togglePlay = useCallback(() => {
    if (playing) {
      // Pause
      playRef.current = false;
      if (intervalRef.current) clearInterval(intervalRef.current);
      setPlaying(false);
    } else {
      // Play or Replay
      if (finished || currentIdx === null || currentIdx >= sorted.length - 1) {
        // Start from beginning
        clearCumulative();
        startPlayback(0);
      } else {
        // Resume from current position
        startPlayback(currentIdx + 1);
      }
    }
  }, [playing, finished, currentIdx, sorted.length, clearCumulative, startPlayback]);

  const resetPlayback = useCallback(() => {
    playRef.current = false;
    if (intervalRef.current) clearInterval(intervalRef.current);
    setPlaying(false);
    setCurrentIdx(null);
    setFinished(false);
    clearCumulative();
    onWaveSelect(null);
  }, [clearCumulative, onWaveSelect]);

  // Keyboard navigation
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "ArrowRight") {
        e.preventDefault();
        setCurrentIdx((prev) => {
          const next = Math.min((prev ?? -1) + 1, sorted.length - 1);
          onWaveSelect(sorted[next]);
          buildCumulativeUpTo(next);
          setFinished(next >= sorted.length - 1);
          return next;
        });
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        setCurrentIdx((prev) => {
          const next = Math.max((prev ?? 1) - 1, 0);
          onWaveSelect(sorted[next]);
          buildCumulativeUpTo(next);
          setFinished(false);
          return next;
        });
      } else if (e.key === " ") {
        e.preventDefault();
        togglePlay();
      }
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [sorted, onWaveSelect, togglePlay, buildCumulativeUpTo]);

  const handleWaveClick = useCallback(
    (wave: WaveEvent, idx: number) => {
      playRef.current = false;
      if (intervalRef.current) clearInterval(intervalRef.current);
      setPlaying(false);
      setCurrentIdx(idx);
      setFinished(idx >= sorted.length - 1);
      onWaveSelect(wave);
      buildCumulativeUpTo(idx);
    },
    [onWaveSelect, sorted.length, buildCumulativeUpTo]
  );

  const getPosition = (timestamp: string) => {
    const t = new Date(timestamp).getTime();
    const range = timeRange.max - timeRange.min;
    if (range === 0) return 50;
    return ((t - timeRange.min) / range) * 100;
  };

  const progressPct = useMemo(() => {
    if (currentIdx === null || sorted.length <= 1) return 0;
    return (currentIdx / (sorted.length - 1)) * 100;
  }, [currentIdx, sorted.length]);

  if (waves.length === 0) return null;

  return (
    <div className="bg-surface border-t border-border shrink-0 select-none">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-border/50">
        <div className="flex items-center gap-2">
          <span className="font-heading text-[14px] tracking-[2px] text-accent uppercase">
            Wave Player
          </span>
          <span className="font-mono text-[12px] text-text-muted">
            {sorted.length} waves across {Object.keys(rounds).length} rounds
          </span>
        </div>
        <div className="flex items-center gap-2">
          {/* Reset */}
          <button
            onClick={resetPlayback}
            className="px-1.5 py-0.5 border border-border font-heading text-[12px] tracking-[1.5px] uppercase transition-colors hover:bg-accent-glow text-text-muted hover:text-accent"
            title="Reset"
          >
            RESET
          </button>
          {/* Play / Pause / Replay */}
          <button
            onClick={togglePlay}
            className="px-2 py-0.5 border font-heading text-[12px] tracking-[1.5px] uppercase transition-colors"
            style={{
              color: playing ? "#e8364a" : "#00d4aa",
              borderColor: playing ? "rgba(232,54,74,0.3)" : "rgba(0,212,170,0.2)",
              background: playing ? "rgba(232,54,74,0.06)" : "transparent",
              boxShadow: playing ? "0 0 12px rgba(232,54,74,0.08)" : "none",
            }}
          >
            {playing ? "II PAUSE" : finished ? "▶ REPLAY" : "▶ PLAY"}
          </button>
          {/* Wave counter */}
          <span className="font-mono text-[12px] text-text-muted min-w-[50px]">
            {currentIdx !== null ? currentIdx + 1 : 0} / {sorted.length}
          </span>
          <span className="font-mono text-[10px] text-text-muted">2s/wave</span>
          <span className="font-mono text-[11px] text-text-muted">| ← → STEP | SPACE PLAY</span>
        </div>
      </div>

      {/* Timeline */}
      <div className="relative px-3 py-2" ref={containerRef}>
        {/* Round labels */}
        <div className="flex items-center gap-3 mb-1">
          {Object.entries(ROUND_LABELS).map(([round, label]) => (
            <div key={round} className="flex items-center gap-1">
              <div
                className="w-2 h-2"
                style={{ backgroundColor: ROUND_COLORS[round] }}
              />
              <span className="font-mono text-[11px]" style={{ color: ROUND_COLORS[round] }}>
                {round}
              </span>
              <span className="font-mono text-[10px] text-text-muted">{label}</span>
              {rounds[round] && (
                <span className="font-mono text-[10px] text-text-muted">
                  ({rounds[round].length})
                </span>
              )}
            </div>
          ))}
        </div>

        {/* Wave ticks */}
        <div className="relative h-[28px] bg-void border border-border/50">
          {/* Progress fill */}
          {currentIdx !== null && (
            <div
              className="absolute top-0 bottom-0 left-0 pointer-events-none transition-[width] duration-300"
              style={{
                width: `${progressPct}%`,
                background: "rgba(0,212,170,0.04)",
                borderRight: "1px solid rgba(0,212,170,0.2)",
              }}
            />
          )}

          {sorted.map((wave, idx) => {
            const pos = getPosition(wave.timestamp);
            const isSelected = wave.id === selectedWaveId;
            const isPlayed = currentIdx !== null && idx <= currentIdx;
            const color = ROUND_COLORS[wave.round] || "#5c6c78";
            return (
              <button
                key={wave.id}
                onClick={() => handleWaveClick(wave, idx)}
                className="absolute top-0 bottom-0 transition-all hover:z-10"
                style={{
                  left: `${pos}%`,
                  width: isSelected ? "4px" : "2px",
                  backgroundColor: isPlayed ? "#00d4aa" : color,
                  opacity: isSelected ? 1 : isPlayed ? 0.8 : 0.5,
                  transform: isSelected ? "scaleY(1.5)" : "scaleY(1)",
                  boxShadow: isSelected ? "0 0 6px rgba(255,42,109,0.4)" : "none",
                }}
                title={`${wave.id}: ${wave.codeName || wave.attacker}`}
              />
            );
          })}
        </div>
      </div>

      {/* Selected wave details */}
      {selectedWave && (
        <div className="px-3 py-1.5 border-t border-border/50 flex items-start gap-4">
          <div className="flex items-center gap-2 shrink-0">
            <div
              className="w-2.5 h-2.5"
              style={{ backgroundColor: ROUND_COLORS[selectedWave.round] }}
            />
            <span
              className="font-heading text-[13px] tracking-[1.5px] uppercase"
              style={{ color: ROUND_COLORS[selectedWave.round] }}
            >
              {selectedWave.id}
            </span>
          </div>
          {selectedWave.codeName && (
            <span className="font-mono text-[12px] text-text-dim italic shrink-0">
              &quot;{selectedWave.codeName}&quot;
            </span>
          )}
          <span className="font-mono text-[11px] text-text-muted shrink-0">
            {new Date(selectedWave.timestamp).toUTCString().slice(0, 25)}
          </span>
          <span className="font-mono text-[11px] text-accent shrink-0">
            {selectedWave.attacker}
          </span>
          <span className="font-mono text-[11px] text-text-dim shrink-0">
            {selectedWave.targets.length} targets
          </span>
          <span className="font-mono text-[11px] text-text-dim truncate flex-1">
            {selectedWave.weapons.map((w) => w.name).join(", ") || "Mixed weapons"}
          </span>
          {selectedWave.targets.length > 0 && (
            <span className="font-mono text-[11px] text-warning shrink-0">
              {selectedWave.targets.filter((t) => t.hit).length > 0
                ? `${selectedWave.targets.filter((t) => t.hit).length} HIT`
                : "INTERCEPTED"}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
