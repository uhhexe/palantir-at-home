import { NextResponse } from "next/server";

const BBOX = { lamin: 44, lamax: 52, lomin: 22, lomax: 42 };

export async function GET() {
  try {
    const url = `https://opensky-network.org/api/states/all?lamin=${BBOX.lamin}&lomin=${BBOX.lomin}&lamax=${BBOX.lamax}&lomax=${BBOX.lomax}`;
    const res = await fetch(url, {
      next: { revalidate: 30 },
      headers: { "User-Agent": "palantir-at-home/1.0 (personal-project)" },
    });

    if (!res.ok) {
      return NextResponse.json(
        { aircraft: [], count: 0, milCount: 0, timestamp: new Date().toISOString(), status: "rate_limited" },
        { headers: { "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60" } }
      );
    }

    const data = await res.json();
    const aircraft = (data.states || [])
      .filter((s: (string | number | boolean | null)[]) => s[6] !== null && s[5] !== null && !s[8])
      .map((s: (string | number | boolean | null)[]) => ({
        icao: s[0],
        callsign: (typeof s[1] === "string" ? s[1] : "").trim(),
        country: s[2] || "Unknown",
        lat: s[6],
        lng: s[5],
        altitude: s[7],
        altitudeGeo: s[13],
        velocity: s[9],
        heading: s[10],
        verticalRate: s[11],
        squawk: s[14],
        category: s[17],
        isMilitary: isMilitaryAircraft(
          typeof s[1] === "string" ? s[1] : "",
          typeof s[0] === "string" ? s[0] : "",
          typeof s[2] === "string" ? s[2] : ""
        ),
      }));

    const milCount = aircraft.filter((a: { isMilitary: boolean }) => a.isMilitary).length;
    return NextResponse.json(
      { aircraft, count: aircraft.length, milCount, timestamp: new Date().toISOString(), status: "ok" },
      { headers: { "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60" } }
    );
  } catch (error) {
    console.error("OpenSky fetch error:", error);
    return NextResponse.json(
      { aircraft: [], count: 0, milCount: 0, timestamp: new Date().toISOString(), status: "error" },
      { status: 200 }
    );
  }
}

function isMilitaryAircraft(callsign: string, icao: string, country: string): boolean {
  const cs = callsign.toUpperCase().trim();
  const milPrefixes = [
    "RCH", "REACH", "DUKE", "IRON", "VIPER", "RAGE", "FORTE", "HOMER",
    "DOOM", "KING", "SHELL", "TEAL", "ETHYL", "PACK", "TREK", "HERC",
    "EVAC", "SAM", "NAVY", "TOPCAT", "SENTRY", "JSTAR", "COBRA",
    "JAKE", "RED", "BOLT", "HAWK", "TITAN", "STORM", "REAPER",
    "RFF", "RAF", "BAF", "PLF", "UAF", "UKRF",
    "RSD", "RF",
  ];
  if (milPrefixes.some((p) => cs.startsWith(p))) return true;
  if (cs.startsWith("LAGR") || cs.startsWith("FORTE")) return true;

  const hex = parseInt(icao, 16);
  if (hex >= 0xae0000 && hex <= 0xafffff) return true;
  if (hex >= 0x508000 && hex <= 0x50ffff) return true; // Ukraine
  if (hex >= 0x155000 && hex <= 0x155fff) return true; // Russia mil

  return false;
}
