import { NextResponse } from "next/server";

// Overpass API — fetch oil and gas pipelines in Middle East region
const OVERPASS_URL = "https://overpass-api.de/api/interpreter";

const BBOX = "20,25,42,65"; // south,west,north,east

const QUERY = `
[out:json][timeout:30];
(
  way["man_made"="pipeline"]["substance"="oil"](${BBOX});
  way["man_made"="pipeline"]["substance"="gas"](${BBOX});
  way["man_made"="pipeline"]["substance"="natural_gas"](${BBOX});
  way["man_made"="pipeline"]["type"="oil"](${BBOX});
  way["man_made"="pipeline"]["type"="gas"](${BBOX});
);
out geom;
`;

interface OverpassElement {
  id: number;
  tags?: Record<string, string>;
  geometry?: { lat: number; lon: number }[];
}

export async function GET() {
  try {
    const res = await fetch(OVERPASS_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: `data=${encodeURIComponent(QUERY)}`,
      signal: AbortSignal.timeout(35000),
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: "Overpass API unavailable", status: res.status },
        { status: 502 }
      );
    }

    const data = await res.json();
    const elements: OverpassElement[] = data.elements || [];

    const pipelines = elements
      .filter((el) => el.geometry && el.geometry.length > 1)
      .map((el) => ({
        id: el.id,
        name: el.tags?.name || el.tags?.["name:en"] || `Pipeline ${el.id}`,
        substance: el.tags?.substance || el.tags?.type || "unknown",
        operator: el.tags?.operator || null,
        coords: el.geometry!.map((p) => [p.lat, p.lon] as [number, number]),
      }));

    return NextResponse.json(
      {
        pipelines,
        count: pipelines.length,
        timestamp: Date.now(),
      },
      {
        headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=600" },
      }
    );
  } catch {
    return NextResponse.json({ error: "Failed to fetch pipeline data" }, { status: 500 });
  }
}
