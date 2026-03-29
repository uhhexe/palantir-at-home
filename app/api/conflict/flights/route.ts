import { NextResponse } from "next/server";

// OpenSky API — Middle East bounding box
const BBOX = { lamin: 20, lamax: 42, lomin: 25, lomax: 65 };

interface OpenSkyState {
  icao24: string;
  callsign: string | null;
  origin_country: string;
  longitude: number | null;
  latitude: number | null;
  baro_altitude: number | null;
  velocity: number | null;
  true_track: number | null;
  on_ground: boolean;
  geo_altitude: number | null;
}

// Countries likely to have military flights in region
const MILITARY_COUNTRIES = new Set([
  "United States", "Israel", "Iran", "Turkey", "Saudi Arabia",
  "United Arab Emirates", "Qatar", "Kuwait", "United Kingdom",
  "France", "Jordan", "Egypt", "Iraq", "Oman", "Bahrain",
]);

export async function GET() {
  try {
    const url = `https://opensky-network.org/api/states/all?lamin=${BBOX.lamin}&lomin=${BBOX.lomin}&lamax=${BBOX.lamax}&lomax=${BBOX.lomax}`;
    const res = await fetch(url, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: "OpenSky API unavailable", status: res.status },
        { status: 502 }
      );
    }

    const data = await res.json();
    if (!data.states || !Array.isArray(data.states)) {
      return NextResponse.json({ flights: [], time: data.time || 0 });
    }

    const flights: OpenSkyState[] = data.states
      .map((s: (string | number | boolean | null)[]) => ({
        icao24: s[0],
        callsign: typeof s[1] === "string" ? s[1].trim() : null,
        origin_country: s[2],
        longitude: s[5],
        latitude: s[6],
        baro_altitude: s[7],
        velocity: s[9],
        true_track: s[10],
        on_ground: s[8],
        geo_altitude: s[13],
      }))
      .filter((f: OpenSkyState) => f.latitude && f.longitude && !f.on_ground);

    // Separate military-interest vs all
    const militaryInterest = flights.filter((f: OpenSkyState) =>
      MILITARY_COUNTRIES.has(f.origin_country)
    );

    return NextResponse.json(
      {
        flights: militaryInterest,
        allCount: flights.length,
        militaryCount: militaryInterest.length,
        time: data.time,
      },
      {
        headers: { "Cache-Control": "public, s-maxage=15, stale-while-revalidate=10" },
      }
    );
  } catch {
    return NextResponse.json({ error: "Failed to fetch flight data" }, { status: 500 });
  }
}
