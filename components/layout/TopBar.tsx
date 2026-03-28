"use client";

import { useEffect, useState } from "react";

interface TopBarProps {
  cameraCount?: number;
  sourceCount?: number;
}

export default function TopBar({ cameraCount = 0, sourceCount = 0 }: TopBarProps) {
  const [time, setTime] = useState<{ local: string; utc: string }>({
    local: "",
    utc: "",
  });

  useEffect(() => {
    function tick() {
      const now = new Date();
      setTime({
        local: now.toLocaleTimeString("en-US", { hour12: false }),
        utc: now.toUTCString().split(" ")[4],
      });
    }
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="h-[28px] bg-surface border-b border-border flex items-center justify-between px-3 shrink-0 select-none relative">
      {/* Teal accent line — right-aligned gradient */}
      <div
        className="absolute top-0 left-0 right-0 h-px"
        style={{
          background: "linear-gradient(to right, transparent 50%, rgba(0,212,170,0.3) 100%)",
        }}
      />

      {/* Left: Brand */}
      <div className="flex items-center gap-2">
        <div className="w-1.5 h-1.5 bg-accent" />
        <span className="font-heading text-[8px] font-semibold tracking-[2px] text-accent uppercase">
          WAR ROOM
        </span>
        <span className="text-text-muted text-[8px] font-mono ml-1">v1.0</span>
      </div>

      {/* Center: Stats */}
      <div className="flex items-center gap-3 text-[8px] font-mono text-text-dim">
        <span>
          <span className="text-white">{cameraCount.toLocaleString()}</span>{" "}
          FEEDS
        </span>
        <span className="text-text-muted">|</span>
        <span>
          <span className="text-white">{sourceCount}</span>{" "}
          SOURCES
        </span>
        <span className="text-text-muted">|</span>
        <span>REFRESH 10s</span>
      </div>

      {/* Right: Status + Time */}
      <div className="flex items-center gap-3 text-[8px] font-mono">
        <div className="flex items-center gap-1.5">
          <div className="w-1 h-1 bg-accent" />
          <span className="text-text-dim">SUPABASE</span>
        </div>
        <span className="text-text-muted">|</span>
        <span className="text-text-dim">{time.local}</span>
        <span className="text-accent">{time.utc} UTC</span>
      </div>
    </div>
  );
}
