"use client";

import { useState, useEffect } from "react";

interface FlightData {
  icao24: string;
  callsign: string | null;
  origin_country: string;
  latitude: number;
  longitude: number;
  baro_altitude: number | null;
  velocity: number | null;
  true_track: number | null;
  geo_altitude: number | null;
}

interface FlightsResponse {
  flights: FlightData[];
  allCount: number;
  militaryCount: number;
  time: number;
}

export default function FlightsView() {
  const [data, setData] = useState<FlightsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showEmbed, setShowEmbed] = useState(true);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    function fetchFlights() {
      fetch("/api/conflict/flights")
        .then((r) => r.json())
        .then((d) => {
          if (d.error) setError(d.error);
          else setData(d);
          setLoading(false);
        })
        .catch(() => {
          setError("Network error");
          setLoading(false);
        });
    }
    fetchFlights();
    const id = setInterval(fetchFlights, 15000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="w-full h-full flex flex-col bg-void">
      {/* Header bar */}
      <div className="h-[40px] bg-surface border-b border-border flex items-center justify-between px-3 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 bg-accent animate-pulse" />
          <span className="font-heading text-[15px] tracking-[2px] text-accent uppercase">
            Flight Tracker — Middle East AOR
          </span>
        </div>
        <div className="flex items-center gap-3 text-[15px] font-mono">
          <button
            onClick={() => setShowEmbed(!showEmbed)}
            className={`px-2 py-0.5 border transition-colors ${
              showEmbed
                ? "border-accent text-accent bg-accent-glow"
                : "border-border text-text-muted hover:text-text-dim"
            }`}
          >
            {showEmbed ? "GLOBE VIEW" : "TABLE VIEW"}
          </button>
          {data && (
            <>
              <span className="text-text-muted">|</span>
              <span className="text-text-dim">
                <span className="text-white">{data.militaryCount}</span> MIL
              </span>
              <span className="text-text-muted">/</span>
              <span className="text-text-dim">
                <span className="text-white">{data.allCount}</span> TOTAL
              </span>
            </>
          )}
          {loading && <span className="text-text-muted animate-pulse">LOADING...</span>}
          {error && <span className="text-danger">{error}</span>}
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-hidden relative">
        {showEmbed ? (
          <iframe
            src="https://globe.adsb.fi/?lat=32&lon=48&zoom=5&hideSidebar&hideButtons&mil"
            className="w-full h-full border-0"
            title="ADSB.lol Flight Tracker"
            allow="fullscreen"
          />
        ) : (
          <div className="w-full h-full overflow-auto">
            {data && data.flights.length > 0 ? (
              <table className="w-full text-[15px] font-mono">
                <thead className="sticky top-0 bg-surface border-b border-border">
                  <tr className="text-left text-text-muted font-heading tracking-[1.5px] uppercase">
                    <th className="px-2 py-1.5">ICAO</th>
                    <th className="px-2 py-1.5">Callsign</th>
                    <th className="px-2 py-1.5">Country</th>
                    <th className="px-2 py-1.5">Alt (ft)</th>
                    <th className="px-2 py-1.5">Speed (kts)</th>
                    <th className="px-2 py-1.5">Heading</th>
                    <th className="px-2 py-1.5">Lat</th>
                    <th className="px-2 py-1.5">Lon</th>
                  </tr>
                </thead>
                <tbody>
                  {data.flights.map((f) => (
                    <tr
                      key={f.icao24}
                      className="border-b border-border/50 hover:bg-surface-2 text-text-dim"
                    >
                      <td className="px-2 py-1 text-accent">{f.icao24}</td>
                      <td className="px-2 py-1 text-white">{f.callsign || "—"}</td>
                      <td className="px-2 py-1">{f.origin_country}</td>
                      <td className="px-2 py-1">
                        {f.baro_altitude ? Math.round(f.baro_altitude * 3.281).toLocaleString() : "—"}
                      </td>
                      <td className="px-2 py-1">
                        {f.velocity ? Math.round(f.velocity * 1.944) : "—"}
                      </td>
                      <td className="px-2 py-1">
                        {f.true_track ? `${Math.round(f.true_track)}°` : "—"}
                      </td>
                      <td className="px-2 py-1">{f.latitude.toFixed(3)}</td>
                      <td className="px-2 py-1">{f.longitude.toFixed(3)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="flex items-center justify-center h-full text-text-muted font-heading text-[16px] tracking-[3px] uppercase">
                {loading ? "Loading flight data..." : "No flights in region"}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
