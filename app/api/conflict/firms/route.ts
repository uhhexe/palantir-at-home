import { NextResponse } from "next/server";

interface FirmsPoint {
  lat: number;
  lng: number;
  brightness: number;
  confidence: string;
  frp: number;
  acq_date: string;
  acq_time: string;
  satellite: string;
  daynight: string;
}

function parseCsv(csv: string): FirmsPoint[] {
  const lines = csv.trim().split("\n");
  if (lines.length < 2) return [];
  const headers = lines[0].split(",").map((h) => h.trim());

  const points: FirmsPoint[] = [];
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(",");
    const row: Record<string, string> = {};
    headers.forEach((h, idx) => (row[h] = values[idx]?.trim() || ""));

    const lat = parseFloat(row.latitude);
    const lng = parseFloat(row.longitude);
    if (isNaN(lat) || isNaN(lng)) continue;

    points.push({
      lat,
      lng,
      brightness: parseFloat(row.bright_ti4 || row.brightness || "0"),
      confidence: row.confidence || "nominal",
      frp: parseFloat(row.frp || "0"),
      acq_date: row.acq_date || "",
      acq_time: row.acq_time || "",
      satellite: row.satellite || "NOAA-20",
      daynight: row.daynight || "",
    });
  }
  return points;
}

// Bounding boxes: west,south,east,north
const BBOX: Record<string, string> = {
  iran: "25,12,65,42",
  ukraine: "22,44,42,52",
};

export async function GET(request: Request) {
  const MAP_KEY = process.env.NASA_FIRMS_KEY || "";

  if (!MAP_KEY) {
    return NextResponse.json({
      fires: [],
      count: 0,
      status: "no_api_key",
      note: "Register for free NASA FIRMS key at https://firms.modaps.eosdis.nasa.gov/api/map_key/",
    });
  }

  const { searchParams } = new URL(request.url);
  const theater = searchParams.get("theater") || searchParams.get("country") || "iran";

  // Support both theater names and country codes
  let bbox = BBOX[theater.toLowerCase()];
  if (!bbox) {
    // Fallback: treat as country code for legacy compat
    bbox = theater === "UKR" ? BBOX.ukraine : BBOX.iran;
  }

  try {
    const url = `https://firms.modaps.eosdis.nasa.gov/api/area/csv/${MAP_KEY}/VIIRS_NOAA20_NRT/${bbox}/2`;

    const res = await fetch(url, {
      next: { revalidate: 3600 },
    });

    if (!res.ok) {
      return NextResponse.json({ fires: [], count: 0, status: "api_error", code: res.status });
    }

    const csv = await res.text();
    const fires = parseCsv(csv);

    return NextResponse.json(
      {
        fires,
        count: fires.length,
        theater,
        timestamp: new Date().toISOString(),
        status: "ok",
      },
      {
        headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=1800" },
      }
    );
  } catch (error) {
    console.error("FIRMS fetch error:", error);
    return NextResponse.json({ fires: [], count: 0, status: "error", error: "Failed to fetch fire data" });
  }
}
