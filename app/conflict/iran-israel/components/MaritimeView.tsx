"use client";

import { useState } from "react";

const VESSELFINDER_EMBED = "https://www.vesselfinder.com/aismap?lat=26&lon=52&zoom=6&width=100%25&height=100%25&names=true&mmsi=0&track=0&fleet=&fleet_name=&fleet_timespan=0&ais_lp=0";

const MARINETRAFFIC_FALLBACK = "https://www.marinetraffic.com/en/ais/embed/zoom:6/centery:26/centerx:52/maptype:0/shownames:true/mmsi:0/shipid:0/fleet:/fleet_id:/vtypes:/showmenu:/remember:false";

export default function MaritimeView() {
  const [source, setSource] = useState<"vesselfinder" | "marinetraffic">("vesselfinder");

  return (
    <div className="w-full h-full flex flex-col bg-void">
      {/* Header bar */}
      <div className="h-[40px] bg-surface border-b border-border flex items-center justify-between px-3 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 bg-accent animate-pulse" />
          <span className="font-heading text-[15px] tracking-[2px] text-accent uppercase">
            Maritime Tracker — Persian Gulf / Red Sea AOR
          </span>
        </div>
        <div className="flex items-center gap-3 text-[15px] font-mono">
          <div className="flex items-center border border-border">
            <button
              onClick={() => setSource("vesselfinder")}
              className={`px-2 py-0.5 text-[14px] font-heading tracking-[1.5px] uppercase transition-colors ${
                source === "vesselfinder"
                  ? "bg-accent-glow text-accent border-r border-border"
                  : "text-text-muted hover:text-text-dim border-r border-border"
              }`}
            >
              VesselFinder
            </button>
            <button
              onClick={() => setSource("marinetraffic")}
              className={`px-2 py-0.5 text-[14px] font-heading tracking-[1.5px] uppercase transition-colors ${
                source === "marinetraffic"
                  ? "bg-accent-glow text-accent"
                  : "text-text-muted hover:text-text-dim"
              }`}
            >
              MarineTraffic
            </button>
          </div>
          <span className="text-text-muted">|</span>
          <span className="text-warning">HORMUZ: CLOSED</span>
          <span className="text-text-muted">|</span>
          <span className="text-warning">BAB EL-MANDEB: RESTRICTED</span>
        </div>
      </div>

      {/* Embed */}
      <div className="flex-1 overflow-hidden">
        <iframe
          key={source}
          src={source === "vesselfinder" ? VESSELFINDER_EMBED : MARINETRAFFIC_FALLBACK}
          className="w-full h-full border-0"
          title={`${source === "vesselfinder" ? "VesselFinder" : "MarineTraffic"} Maritime Tracker`}
          allow="fullscreen"
        />
      </div>
    </div>
  );
}
