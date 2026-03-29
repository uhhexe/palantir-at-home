import { NextResponse } from "next/server";

// In-memory cache — pipelines don't move
let cachedData: unknown = null;
let cacheTimestamp = 0;
const CACHE_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 days

export async function GET() {
  // Return cached data if fresh
  if (cachedData && Date.now() - cacheTimestamp < CACHE_DURATION) {
    return NextResponse.json(cachedData, {
      headers: {
        "Cache-Control": "public, s-maxage=604800, stale-while-revalidate=86400",
        "X-Cache": "HIT",
      },
    });
  }

  try {
    // Query ALL pipelines in the Middle East theater
    // Bounding box: 12°N to 42°N, 25°E to 65°E
    const query = `
[out:json][timeout:180][maxsize:100000000];
(
  way["man_made"="pipeline"](12,25,42,65);
);
out geom;
`.trim();

    console.log("Fetching pipelines from Overpass API...");
    const startTime = Date.now();

    const res = await fetch("https://overpass-api.de/api/interpreter", {
      method: "POST",
      body: `data=${encodeURIComponent(query)}`,
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    });

    if (!res.ok) {
      console.error("Overpass API error:", res.status);
      return NextResponse.json(getManualPipelines(), {
        headers: { "Cache-Control": "public, s-maxage=3600" },
      });
    }

    const data = await res.json();
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`Overpass returned ${data.elements?.length || 0} pipeline elements in ${elapsed}s`);

    // Convert OSM way elements to GeoJSON
    const features = (data.elements || [])
      .filter((el: { type: string; geometry?: { lat: number; lon: number }[] }) =>
        el.type === "way" && el.geometry && el.geometry.length > 1
      )
      .map((el: { id: number; tags?: Record<string, string>; geometry: { lat: number; lon: number }[] }) => {
        const substance = el.tags?.substance || el.tags?.content || el.tags?.contents || el.tags?.type || "";
        const name = el.tags?.name || el.tags?.["name:en"] || "";
        const operator = el.tags?.operator || "";

        // Classify the pipeline
        let pipelineType = "unknown";
        const sub = substance.toLowerCase();
        if (sub.includes("oil") || sub.includes("crude") || sub.includes("petroleum") || sub.includes("fuel") || sub.includes("condensate")) {
          pipelineType = "oil";
        } else if (sub.includes("gas") || sub.includes("natural_gas") || sub.includes("lng")) {
          pipelineType = "gas";
        } else if (sub.includes("water") || sub.includes("sewage") || sub.includes("drainage") || sub.includes("brine")) {
          pipelineType = "water";
        } else if (sub.includes("chemical") || sub.includes("ethylene") || sub.includes("ngl") || sub.includes("naphtha")) {
          pipelineType = "petrochemical";
        } else if (name.toLowerCase().includes("oil") || name.toLowerCase().includes("petro") || name.toLowerCase().includes("crude")) {
          pipelineType = "oil";
        } else if (name.toLowerCase().includes("gas")) {
          pipelineType = "gas";
        }

        return {
          type: "Feature" as const,
          properties: {
            name: name || `Pipeline ${el.id}`,
            substance: substance || "unknown",
            pipelineType,
            operator,
            osmId: el.id,
            diameter: el.tags?.diameter || el.tags?.width || "",
            pressure: el.tags?.pressure || "",
            location: el.tags?.location || "",
          },
          geometry: {
            type: "LineString" as const,
            coordinates: el.geometry.map((p) => [p.lon, p.lat]),
          },
        };
      });

    const stats = {
      total: features.length,
      oil: features.filter((f: { properties: { pipelineType: string } }) => f.properties.pipelineType === "oil").length,
      gas: features.filter((f: { properties: { pipelineType: string } }) => f.properties.pipelineType === "gas").length,
      water: features.filter((f: { properties: { pipelineType: string } }) => f.properties.pipelineType === "water").length,
      petrochemical: features.filter((f: { properties: { pipelineType: string } }) => f.properties.pipelineType === "petrochemical").length,
      unknown: features.filter((f: { properties: { pipelineType: string } }) => f.properties.pipelineType === "unknown").length,
    };

    console.log("Pipeline stats:", stats);

    const result = {
      type: "FeatureCollection" as const,
      features,
      stats,
      fetchedAt: new Date().toISOString(),
      source: "OpenStreetMap Overpass API",
    };

    // Cache it
    cachedData = result;
    cacheTimestamp = Date.now();

    return NextResponse.json(result, {
      headers: {
        "Cache-Control": "public, s-maxage=604800, stale-while-revalidate=86400",
        "X-Cache": "MISS",
      },
    });
  } catch (error) {
    console.error("Pipeline fetch error:", error);
    return NextResponse.json(getManualPipelines(), {
      headers: { "Cache-Control": "public, s-maxage=3600" },
    });
  }
}

// Fallback: the major pipelines that matter for this conflict
function getManualPipelines() {
  return {
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        properties: { name: "East-West Pipeline (Petroline)", pipelineType: "oil", substance: "crude oil", operator: "Saudi Aramco", osmId: 0 },
        geometry: { type: "LineString", coordinates: [[49.68, 25.94], [48.5, 25.5], [46.5, 25.0], [44.5, 24.5], [42.5, 24.2], [40.0, 24.2], [39.1, 21.5]] },
      },
      {
        type: "Feature",
        properties: { name: "Habshan-Fujairah Pipeline", pipelineType: "oil", substance: "crude oil", operator: "ADNOC", osmId: 0 },
        geometry: { type: "LineString", coordinates: [[53.57, 23.82], [54.0, 24.0], [54.5, 24.3], [55.0, 24.7], [55.5, 25.0], [56.35, 25.13]] },
      },
      {
        type: "Feature",
        properties: { name: "Kirkuk-Ceyhan Pipeline", pipelineType: "oil", substance: "crude oil", operator: "SOMO/BOTAS", osmId: 0 },
        geometry: { type: "LineString", coordinates: [[44.39, 35.47], [43.5, 36.0], [42.0, 36.5], [40.0, 36.8], [37.5, 36.8], [36.0, 36.9], [35.33, 36.76]] },
      },
      {
        type: "Feature",
        properties: { name: "SUMED Pipeline", pipelineType: "oil", substance: "crude oil", operator: "SUMED", osmId: 0 },
        geometry: { type: "LineString", coordinates: [[32.34, 29.6], [31.5, 30.0], [30.5, 30.5], [29.87, 31.19]] },
      },
      {
        type: "Feature",
        properties: { name: "Dolphin Gas Pipeline", pipelineType: "gas", substance: "natural gas", operator: "Dolphin Energy", osmId: 0 },
        geometry: { type: "LineString", coordinates: [[51.53, 25.93], [52.0, 25.5], [52.5, 25.2], [53.0, 25.0], [54.0, 24.5], [54.5, 24.3]] },
      },
      {
        type: "Feature",
        properties: { name: "Iran-Turkey Gas Pipeline (IGAT)", pipelineType: "gas", substance: "natural gas", operator: "NIGC/BOTAS", osmId: 0 },
        geometry: { type: "LineString", coordinates: [[51.4, 35.7], [49.0, 36.0], [47.0, 36.5], [45.5, 37.0], [44.0, 37.5], [43.0, 38.5]] },
      },
      {
        type: "Feature",
        properties: { name: "Arab Gas Pipeline", pipelineType: "gas", substance: "natural gas", operator: "Various", osmId: 0 },
        geometry: { type: "LineString", coordinates: [[33.8, 31.1], [34.5, 31.5], [35.0, 31.8], [35.5, 32.5], [36.0, 33.5], [36.3, 34.5]] },
      },
      {
        type: "Feature",
        properties: { name: "Iran-Pakistan Pipeline (IP)", pipelineType: "gas", substance: "natural gas", operator: "NIGC", osmId: 0 },
        geometry: { type: "LineString", coordinates: [[52.0, 26.5], [54.0, 26.0], [56.0, 25.8], [58.0, 25.5], [60.0, 25.3], [62.0, 25.2]] },
      },
      {
        type: "Feature",
        properties: { name: "TAPline (Trans-Arabian)", pipelineType: "oil", substance: "crude oil", operator: "Aramco (decommissioned)", osmId: 0 },
        geometry: { type: "LineString", coordinates: [[48.8, 28.3], [46.0, 29.0], [43.0, 30.0], [40.0, 31.0], [37.5, 31.5], [35.5, 32.5]] },
      },
      {
        type: "Feature",
        properties: { name: "Basra-Aqaba Pipeline (IPSA)", pipelineType: "oil", substance: "crude oil", operator: "Iraq (decommissioned)", osmId: 0 },
        geometry: { type: "LineString", coordinates: [[47.8, 30.5], [46.5, 29.0], [44.0, 28.0], [41.0, 29.0], [38.0, 29.5], [35.0, 29.5]] },
      },
    ],
    stats: { total: 10, oil: 6, gas: 3, water: 0, petrochemical: 0, unknown: 0 },
    fetchedAt: new Date().toISOString(),
    source: "Manual fallback — Overpass unavailable",
  };
}
