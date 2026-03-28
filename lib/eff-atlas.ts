import { readFileSync } from "fs";
import { join } from "path";

export interface AtlasRecord {
  id: string;
  city: string;
  county: string;
  state: string;
  agency: string;
  technology: string;
  vendor: string;
  summary: string;
  lat: number;
  lng: number;
}

// Technology categories for layer grouping
export const ATLAS_TECH_LAYERS = [
  { id: "eff-alpr", name: "Flock / ALPR Cameras", tech: "Automated License Plate Readers", color: "#ff6b35", markerType: "diamond" },
  { id: "eff-shotspotter", name: "ShotSpotter / Gunshot Detection", tech: "Gunshot Detection", color: "#ff2b4e", markerType: "triangle" },
  { id: "eff-drones", name: "Police Drones / UAVs", tech: "Drones", color: "#8b5cf6", markerType: "triangle" },
  { id: "eff-face-rec", name: "Facial Recognition", tech: "Face Recognition", color: "#f5a623", markerType: "diamond" },
  { id: "eff-cell-sim", name: "Cell-Site Simulators", tech: "Cell-site Simulator", color: "#ff2b4e", markerType: "square" },
  { id: "eff-rtcc", name: "Real-Time Crime Centers", tech: "Real-Time Crime Center", color: "#00b4ff", markerType: "square" },
  { id: "eff-bodycam", name: "Body-Worn Cameras", tech: "Body-worn Cameras", color: "#34d399", markerType: "circle" },
  { id: "eff-camera-reg", name: "Camera Registries", tech: "Camera Registry", color: "#9a9aaa", markerType: "circle" },
] as const;

let _coordsCache: Record<string, [number, number]> | null = null;
let _atlasCache: AtlasRecord[] | null = null;

function loadCityCoords(): Record<string, [number, number]> {
  if (_coordsCache) return _coordsCache;
  const filePath = join(process.cwd(), "data", "city_coords.json");
  const raw = readFileSync(filePath, "utf-8");
  _coordsCache = JSON.parse(raw);
  return _coordsCache!;
}

function parseCSVLine(line: string): string[] {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (ch === "," && !inQuotes) {
      fields.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  fields.push(current);
  return fields;
}

function geocodeCity(
  city: string,
  state: string,
  coords: Record<string, [number, number]>
): [number, number] | null {
  if (!city || !state) return null;
  // Try exact match: "CITY,STATE"
  const key = `${city.toUpperCase()},${state.toUpperCase()}`;
  if (coords[key]) return coords[key];
  // Try without special chars
  const cleanKey = key.replace(/[^A-Z,]/g, "");
  if (coords[cleanKey]) return coords[cleanKey];
  return null;
}

export function loadAtlasData(): AtlasRecord[] {
  if (_atlasCache) return _atlasCache;

  const coords = loadCityCoords();
  const filePath = join(process.cwd(), "data", "atlas-of-surveillance.csv");
  const raw = readFileSync(filePath, "utf-8");
  const lines = raw.split("\n");

  const records: AtlasRecord[] = [];
  const seen = new Set<string>();

  // Skip header
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const fields = parseCSVLine(line);
    const id = fields[0] || "";
    const city = fields[1] || "";
    const county = fields[2] || "";
    const state = fields[3] || "";
    const agency = fields[4] || "";
    const technology = fields[8] || "";
    const vendor = fields[9] || "";
    const summary = fields[6] || "";

    if (!technology || !city || !state) continue;

    // Dedup by id+technology
    const dedupKey = `${id}-${technology}`;
    if (seen.has(dedupKey)) continue;
    seen.add(dedupKey);

    const latLng = geocodeCity(city, state, coords);
    if (!latLng) continue;

    records.push({
      id: `eff-${id}-${technology.replace(/\s+/g, "-").toLowerCase()}`,
      city,
      county,
      state,
      agency,
      technology,
      vendor,
      summary: summary.length > 200 ? summary.slice(0, 200) + "..." : summary,
      lat: latLng[0],
      lng: latLng[1],
    });
  }

  _atlasCache = records;
  return records;
}

export function getAtlasByTechnology(tech: string): AtlasRecord[] {
  return loadAtlasData().filter((r) => r.technology === tech);
}

export function atlasToGeoJSON(records: AtlasRecord[]): GeoJSON.FeatureCollection {
  return {
    type: "FeatureCollection",
    features: records.map((r) => ({
      type: "Feature" as const,
      geometry: {
        type: "Point" as const,
        coordinates: [r.lng, r.lat],
      },
      properties: {
        id: r.id,
        city: r.city,
        county: r.county,
        state: r.state,
        agency: r.agency,
        technology: r.technology,
        vendor: r.vendor,
        summary: r.summary,
      },
    })),
  };
}
