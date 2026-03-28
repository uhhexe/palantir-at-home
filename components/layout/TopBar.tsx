"use client";

import { useEffect, useState } from "react";
import {
  Satellite,
  Radio,
  Shield,
  Wifi,
} from "lucide-react";

export default function TopBar() {
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
    <div className="h-[42px] bg-surface border-b border-border flex items-center justify-between px-4 shrink-0 select-none">
      <div className="flex items-center gap-3">
        <Shield className="w-4 h-4 text-accent" />
        <span className="font-heading text-sm font-bold tracking-wider text-accent uppercase">
          WAR ROOM
        </span>
        <span className="text-text-dim text-[10px] ml-1">v1.0</span>
      </div>

      <div className="flex items-center gap-4 text-[11px] text-text-dim">
        <div className="flex items-center gap-1.5">
          <Satellite className="w-3 h-3" />
          <span>SIGINT</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Radio className="w-3 h-3 text-accent" />
          <span className="text-accent">ACTIVE</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Wifi className="w-3 h-3" />
          <span>ONLINE</span>
        </div>
        <div className="h-4 w-px bg-border" />
        <div className="flex items-center gap-2 font-mono">
          <span>LOCAL {time.local}</span>
          <span className="text-accent-blue">UTC {time.utc}</span>
        </div>
      </div>
    </div>
  );
}
