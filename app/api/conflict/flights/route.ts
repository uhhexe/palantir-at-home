import { NextResponse } from "next/server";

// Middle East theater bounding box — wider to catch Yemen & Pakistan border
const BBOX = { lamin: 12, lamax: 42, lomin: 25, lomax: 65 };

export async function GET() {
  try {
    const url = `https://opensky-network.org/api/states/all?lamin=${BBOX.lamin}&lomin=${BBOX.lomin}&lamax=${BBOX.lamax}&lomax=${BBOX.lomax}`;
    const res = await fetch(url, {
      next: { revalidate: 30 },
      headers: { "User-Agent": "palantir-at-home/1.0 (personal-project)" },
    });

    if (!res.ok) {
      console.warn("OpenSky returned", res.status);
      return NextResponse.json(
        { aircraft: [], count: 0, milCount: 0, timestamp: new Date().toISOString(), status: "rate_limited" },
        { headers: { "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60" } }
      );
    }

    const data = await res.json();

    // OpenSky state vector indices:
    // [0] icao24, [1] callsign, [2] origin_country, [3] time_position,
    // [4] last_contact, [5] longitude, [6] latitude, [7] baro_altitude,
    // [8] on_ground, [9] velocity, [10] true_track (heading),
    // [11] vertical_rate, [12] sensors, [13] geo_altitude,
    // [14] squawk, [15] spi, [16] position_source, [17] category

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

  // US military callsign prefixes
  const usMilPrefixes = [
    "RCH", "REACH", "DUKE", "IRON", "VIPER", "RAGE", "DEATH", "BONE",
    "DOOM", "KING", "SHELL", "TEAL", "ETHYL", "PACK", "TREK", "HERC",
    "EVAC", "SAM", "NAVY", "TOPCAT", "SENTRY", "JSTAR", "COBRA", "OLIVE",
    "JAKE", "RED", "BOLT", "HAWK", "TITAN", "STORM", "REAPER",
  ];

  // Israeli Air Force
  const israelPrefixes = ["IAF", "LLBG", "ISR"];

  // Iranian military
  const iranPrefixes = ["IRGC", "IRI", "IRIAF"];

  if (usMilPrefixes.some((p) => cs.startsWith(p))) return true;
  if (israelPrefixes.some((p) => cs.startsWith(p))) return true;
  if (iranPrefixes.some((p) => cs.startsWith(p))) return true;

  // Generic military prefixes
  if (cs.startsWith("RFF") || cs.startsWith("RAF") || cs.startsWith("BAF")) return true;

  // US military ICAO hex ranges
  const hex = parseInt(icao, 16);
  if (hex >= 0xae0000 && hex <= 0xafffff) return true; // USAF range
  if (hex >= 0x738000 && hex <= 0x73ffff) return true; // Israeli range

  return false;
}
