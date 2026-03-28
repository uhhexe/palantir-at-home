import { NextResponse } from "next/server";
import { HIFLD_LAYERS, fetchHifldLayer } from "@/lib/hifld";
import {
  fetchOsmCamerasByArea,
  fetchAlprCamerasByArea,
  osmCamerasToGeoJSON,
} from "@/lib/osm-cameras";
import {
  ATLAS_TECH_LAYERS,
  getAtlasByTechnology,
  atlasToGeoJSON,
} from "@/lib/eff-atlas";
import { fetchDeflockALPR } from "@/lib/deflock";

const CABLE_API = "https://www.submarinecablemap.com/api/v3/cable/cable-geo.json";
const LANDING_POINTS_API =
  "https://www.submarinecablemap.com/api/v3/landing-point/landing-point-geo.json";

// USGS earthquake feed — last 7 days, magnitude 2.5+
const USGS_EARTHQUAKES =
  "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_week.geojson";

// Active wildfire perimeters
const WILDFIRE_PERIMETERS =
  "https://services3.arcgis.com/T4QMspbfLg3qTGWY/arcgis/rest/services/Current_WildlandFire_Perimeters/FeatureServer/0/query?where=1%3D1&outFields=*&f=geojson&resultRecordCount=500";

// NOAA Weather Alerts — real-time severe weather
const NOAA_ALERTS = "https://api.weather.gov/alerts/active";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const layer = searchParams.get("layer");
  const state = searchParams.get("state") || undefined;

  try {
    // Submarine cables
    if (layer === "cables") {
      const res = await fetch(CABLE_API, { next: { revalidate: 86400 } });
      if (!res.ok) throw new Error(`Cable API error: ${res.status}`);
      const data = await res.json();
      return NextResponse.json(data);
    }

    if (layer === "landing-points") {
      const res = await fetch(LANDING_POINTS_API, { next: { revalidate: 86400 } });
      if (!res.ok) throw new Error(`Landing points API error: ${res.status}`);
      const data = await res.json();
      return NextResponse.json(data);
    }

    // USGS Earthquakes
    if (layer === "earthquakes") {
      const res = await fetch(USGS_EARTHQUAKES, { next: { revalidate: 300 } });
      if (!res.ok) throw new Error(`USGS API error: ${res.status}`);
      const data = await res.json();
      return NextResponse.json(data);
    }

    // Active wildfires
    if (layer === "wildfires") {
      const res = await fetch(WILDFIRE_PERIMETERS, { next: { revalidate: 3600 } });
      if (!res.ok) throw new Error(`Wildfire API error: ${res.status}`);
      const data = await res.json();
      return NextResponse.json(data);
    }

    // OSM Surveillance cameras (Overpass API)
    // Query by individual states in batches to avoid Overpass timeout
    if (layer === "osm-cameras") {
      if (state) {
        const cameras = await fetchOsmCamerasByArea(state, 120);
        const geojson = osmCamerasToGeoJSON(cameras);
        return NextResponse.json(geojson);
      }
      // Batch states in groups of 4 to avoid overwhelming Overpass
      const batches = [
        ["New Jersey", "New York", "Connecticut", "Delaware"],
        ["Pennsylvania", "Massachusetts", "Maryland", "Virginia"],
        ["California", "Florida", "Georgia", "Texas"],
      ];
      const allCameras = [];
      for (const batch of batches) {
        const results = await Promise.allSettled(
          batch.map((s) => fetchOsmCamerasByArea(s, 60))
        );
        for (const r of results) {
          if (r.status === "fulfilled") allCameras.push(...r.value);
        }
      }
      const geojson = osmCamerasToGeoJSON(allCameras);
      return NextResponse.json(geojson);
    }

    // ALPR / License Plate Readers (Overpass API)
    if (layer === "alpr") {
      if (state) {
        const cameras = await fetchAlprCamerasByArea(state, 120);
        const geojson = osmCamerasToGeoJSON(cameras);
        return NextResponse.json(geojson);
      }
      const batches = [
        ["New Jersey", "New York", "Pennsylvania", "California"],
        ["Florida", "Georgia", "Massachusetts", "Virginia"],
      ];
      const allCameras = [];
      for (const batch of batches) {
        const results = await Promise.allSettled(
          batch.map((s) => fetchAlprCamerasByArea(s, 60))
        );
        for (const r of results) {
          if (r.status === "fulfilled") allCameras.push(...r.value);
        }
      }
      const geojson = osmCamerasToGeoJSON(allCameras);
      return NextResponse.json(geojson);
    }

    // NOAA Weather Alerts
    if (layer === "weather-alerts") {
      const alertUrl = state
        ? `${NOAA_ALERTS}?area=${state}`
        : `${NOAA_ALERTS}?status=actual&message_type=alert`;
      const res = await fetch(alertUrl, {
        next: { revalidate: 300 },
        headers: {
          "User-Agent": "(war-room, contact@localhost)",
          Accept: "application/geo+json",
        },
      });
      if (!res.ok) throw new Error(`NOAA API error: ${res.status}`);
      const data = await res.json();
      return NextResponse.json(data);
    }

    // DeFlock ALPR locations (crowdsourced from OpenStreetMap)
    if (layer === "deflock-alpr") {
      const data = await fetchDeflockALPR();
      return NextResponse.json(data);
    }

    // EFF Atlas of Surveillance layers
    const atlasLayer = ATLAS_TECH_LAYERS.find((l) => l.id === layer);
    if (atlasLayer) {
      const records = getAtlasByTechnology(atlasLayer.tech);
      const filtered = state
        ? records.filter((r) => r.state === state)
        : records;
      return NextResponse.json(atlasToGeoJSON(filtered));
    }

    // HIFLD layers
    const hifldConfig = HIFLD_LAYERS.find((l) => l.id === layer);
    if (hifldConfig) {
      const data = await fetchHifldLayer(hifldConfig, state);
      return NextResponse.json(data);
    }

    return NextResponse.json(
      { error: `Unknown layer: ${layer}` },
      { status: 400 }
    );
  } catch (error) {
    console.error("Layer fetch error:", error);
    return NextResponse.json(
      { error: `Failed to fetch layer: ${error instanceof Error ? error.message : "unknown"}` },
      { status: 500 }
    );
  }
}
