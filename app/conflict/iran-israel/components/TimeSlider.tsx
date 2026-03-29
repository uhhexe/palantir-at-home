"use client";

import { useState, useCallback, useMemo, useRef, useEffect } from "react";

interface TimeSliderProps {
  minDate: string; // ISO date
  maxDate: string;
  onRangeChange: (start: string, end: string) => void;
  strikeCounts: Record<string, number>; // date -> count
  attackerCounts: Record<string, Record<string, number>>; // date -> attacker -> count
  playing?: boolean;
  onPlayingChange?: (playing: boolean) => void;
}

const ATTACKER_COLORS: Record<string, string> = {
  US: "#388bfd",
  ISRAEL: "#e6edf3",
  IRAN: "#e8364a",
  HOUTHI: "#d4962a",
  HEZBOLLAH: "#c8b832",
  UNKNOWN: "#5c6c78",
};

function dateToDay(dateStr: string, baseDate: Date): number {
  const d = new Date(dateStr);
  return Math.floor((d.getTime() - baseDate.getTime()) / 86400000);
}

function dayToDate(day: number, baseDate: Date): string {
  const d = new Date(baseDate.getTime() + day * 86400000);
  return d.toISOString().slice(0, 10);
}

function formatShort(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "2-digit" });
}

export default function TimeSlider({ minDate, maxDate, onRangeChange, strikeCounts, attackerCounts, playing, onPlayingChange }: TimeSliderProps) {
  const baseDate = useMemo(() => new Date(minDate), [minDate]);
  const totalDays = useMemo(() => dateToDay(maxDate, baseDate), [maxDate, baseDate]);

  const [rangeStart, setRangeStart] = useState(0);
  const [rangeEnd, setRangeEnd] = useState(totalDays);
  const [dragging, setDragging] = useState<"start" | "end" | null>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const playRef = useRef(false);
  const [playheadDay, setPlayheadDay] = useState<number | null>(null);

  // Sync when totalDays changes
  useEffect(() => {
    setRangeEnd(totalDays);
  }, [totalDays]);

  // Playback engine: advance playhead day by day, skip empty days faster
  useEffect(() => {
    playRef.current = !!playing;
    if (!playing) {
      // When stopped, if we had a playhead, keep the range where it is
      if (playheadDay !== null) {
        setRangeStart(0);
        setRangeEnd(playheadDay);
        setPlayheadDay(null);
      }
      return;
    }

    // Start playback from day 0
    let currentDay = 0;
    setPlayheadDay(0);
    setRangeStart(0);
    setRangeEnd(0);
    onRangeChange(dayToDate(0, baseDate), dayToDate(0, baseDate));

    // Find all days that have strikes for faster skip
    const strikeDays = new Set<number>();
    for (let d = 0; d <= totalDays; d++) {
      const date = dayToDate(d, baseDate);
      if (strikeCounts[date]) strikeDays.add(d);
    }

    const interval = setInterval(() => {
      if (!playRef.current) return;
      // Advance one day at a time, skip gaps of empty days (max 3)
      let nextDay = currentDay + 1;
      if (nextDay <= totalDays && !strikeDays.has(nextDay)) {
        let skipTo = nextDay;
        while (skipTo <= totalDays && !strikeDays.has(skipTo) && skipTo - currentDay < 3) {
          skipTo++;
        }
        nextDay = Math.min(skipTo, totalDays);
      }
      currentDay = nextDay;

      if (currentDay > totalDays) {
        // Finished — show all strikes
        setRangeStart(0);
        setRangeEnd(totalDays);
        setPlayheadDay(null);
        onRangeChange(dayToDate(0, baseDate), dayToDate(totalDays, baseDate));
        onPlayingChange?.(false);
        return;
      }

      setPlayheadDay(currentDay);
      setRangeEnd(currentDay);
      onRangeChange(dayToDate(0, baseDate), dayToDate(currentDay, baseDate));
    }, 350);

    return () => clearInterval(interval);
  }, [playing, totalDays, baseDate, strikeCounts, onRangeChange, onPlayingChange]);

  const maxCount = useMemo(() => {
    return Math.max(1, ...Object.values(strikeCounts));
  }, [strikeCounts]);

  // Build bar chart data for each day
  const bars = useMemo(() => {
    const result: { day: number; date: string; segments: { attacker: string; count: number }[] }[] = [];
    for (let d = 0; d <= totalDays; d++) {
      const date = dayToDate(d, baseDate);
      const ac = attackerCounts[date];
      if (!ac) continue;
      const segments = Object.entries(ac).map(([attacker, count]) => ({ attacker, count }));
      if (segments.length > 0) result.push({ day: d, date, segments });
    }
    return result;
  }, [totalDays, baseDate, attackerCounts]);

  const handleMouseDown = useCallback((handle: "start" | "end") => {
    setDragging(handle);
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!dragging || !trackRef.current) return;
    const rect = trackRef.current.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const day = Math.round(pct * totalDays);
    if (dragging === "start") {
      const newStart = Math.min(day, rangeEnd - 1);
      setRangeStart(newStart);
      onRangeChange(dayToDate(newStart, baseDate), dayToDate(rangeEnd, baseDate));
    } else {
      const newEnd = Math.max(day, rangeStart + 1);
      setRangeEnd(newEnd);
      onRangeChange(dayToDate(rangeStart, baseDate), dayToDate(newEnd, baseDate));
    }
  }, [dragging, totalDays, rangeStart, rangeEnd, baseDate, onRangeChange]);

  const handleMouseUp = useCallback(() => {
    setDragging(null);
  }, []);

  const pctStart = totalDays > 0 ? (rangeStart / totalDays) * 100 : 0;
  const pctEnd = totalDays > 0 ? (rangeEnd / totalDays) * 100 : 100;

  const strikesInRange = useMemo(() => {
    let count = 0;
    for (let d = rangeStart; d <= rangeEnd; d++) {
      const date = dayToDate(d, baseDate);
      count += strikeCounts[date] || 0;
    }
    return count;
  }, [rangeStart, rangeEnd, baseDate, strikeCounts]);

  const handleReset = useCallback(() => {
    setRangeStart(0);
    setRangeEnd(totalDays);
    onRangeChange(minDate, maxDate);
  }, [totalDays, minDate, maxDate, onRangeChange]);

  return (
    <div
      className="bg-surface border-t border-border px-3 py-1.5 select-none shrink-0"
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <button
            onClick={() => onPlayingChange?.(!playing)}
            className="px-2 py-0.5 border border-border font-heading text-[13px] tracking-[1.5px] uppercase transition-colors hover:bg-accent-glow"
            style={{ color: playing ? "#e8364a" : "#00d4aa" }}
          >
            {playing ? "■ STOP" : "▶ PLAY"}
          </button>
          <span className="font-heading text-[15px] tracking-[1.5px] text-accent uppercase">
            ◆ Timeline Filter
          </span>
          <span className="font-mono text-[14px] text-text-muted">
            {formatShort(dayToDate(rangeStart, baseDate))} — {formatShort(dayToDate(rangeEnd, baseDate))}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-mono text-[15px] text-white">
            {strikesInRange} strikes
          </span>
          {(rangeStart > 0 || rangeEnd < totalDays) && !playing && (
            <button
              onClick={handleReset}
              className="font-mono text-[14px] text-accent border border-border px-1.5 py-0.5 hover:border-accent/30 transition-colors"
            >
              RESET
            </button>
          )}
        </div>
      </div>

      {/* Bar chart + range slider */}
      <div className="relative h-[40px]" ref={trackRef}>
        {/* Background bars */}
        <div className="absolute inset-0 flex items-end">
          {bars.map((bar) => {
            const left = totalDays > 0 ? (bar.day / totalDays) * 100 : 0;
            const barWidth = Math.max(0.5, 100 / totalDays);
            const totalCount = bar.segments.reduce((s, seg) => s + seg.count, 0);
            const h = (totalCount / maxCount) * 100;
            const inRange = bar.day >= rangeStart && bar.day <= rangeEnd;
            return (
              <div
                key={bar.date}
                className="absolute bottom-0 flex flex-col-reverse"
                style={{ left: `${left}%`, width: `${barWidth}%`, height: `${h}%`, opacity: inRange ? 1 : 0.15 }}
              >
                {bar.segments.map((seg, i) => {
                  const segH = totalCount > 0 ? (seg.count / totalCount) * 100 : 0;
                  return (
                    <div
                      key={i}
                      style={{
                        backgroundColor: ATTACKER_COLORS[seg.attacker] || "#5c6c78",
                        height: `${segH}%`,
                        minHeight: 1,
                      }}
                    />
                  );
                })}
              </div>
            );
          })}
        </div>

        {/* Selected range overlay */}
        <div
          className="absolute top-0 bottom-0 border-l border-r border-accent/40"
          style={{
            left: `${pctStart}%`,
            width: `${pctEnd - pctStart}%`,
            backgroundColor: "rgba(0,212,170,0.04)",
          }}
        />

        {/* Playhead line */}
        {playing && playheadDay !== null && totalDays > 0 && (
          <div
            className="absolute top-0 bottom-0 w-[2px] bg-danger z-20"
            style={{
              left: `${(playheadDay / totalDays) * 100}%`,
              boxShadow: "0 0 6px rgba(232,54,74,0.6)",
            }}
          />
        )}

        {/* Start handle */}
        <div
          className="absolute top-0 bottom-0 w-1.5 cursor-ew-resize z-10 group"
          style={{ left: `calc(${pctStart}% - 3px)` }}
          onMouseDown={() => handleMouseDown("start")}
        >
          <div className="w-full h-full bg-accent/60 group-hover:bg-accent transition-colors" />
        </div>

        {/* End handle */}
        <div
          className="absolute top-0 bottom-0 w-1.5 cursor-ew-resize z-10 group"
          style={{ left: `calc(${pctEnd}% - 3px)` }}
          onMouseDown={() => handleMouseDown("end")}
        >
          <div className="w-full h-full bg-accent/60 group-hover:bg-accent transition-colors" />
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-3 mt-1">
        {Object.entries(ATTACKER_COLORS).filter(([k]) => k !== "UNKNOWN").map(([name, color]) => (
          <div key={name} className="flex items-center gap-1">
            <div className="w-2 h-2" style={{ backgroundColor: color }} />
            <span className="font-mono text-[9px] text-text-muted">{name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
