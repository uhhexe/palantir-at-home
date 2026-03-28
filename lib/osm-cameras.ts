export interface OsmCamera {
  id: string;
  lat: number;
  lng: number;
  type: string;
  zone: string;
  cameraType: string;
  operator: string;
  direction: string | null;
  source: "openstreetmap";
  hasLiveFeed: false;
}

const OVERPASS_API = "https://overpass-api.de/api/interpreter";

/**
 * Fetch surveillance cameras from OSM via Overpass API.
 * Supports bounding box queries or state-level queries.
 */
export async function fetchOsmCameras(
  bounds: { south: number; west: number; north: number; east: number }
): Promise<OsmCamera[]> {
  const query = `[out:json][timeout:60];node["man_made"="surveillance"](${bounds.south},${bounds.west},${bounds.north},${bounds.east});out body;`;
  const url = `${OVERPASS_API}?data=${encodeURIComponent(query)}`;
  const response = await fetch(url, { next: { revalidate: 86400 } });
  if (!response.ok) throw new Error(`Overpass API error: ${response.status}`);
  const data = await response.json();
  return parseOverpassElements(data.elements || []);
}

/**
 * Fetch surveillance cameras for a named area (state, country, etc.)
 */
export async function fetchOsmCamerasByArea(
  areaName: string,
  timeout = 120
): Promise<OsmCamera[]> {
  const query = `[out:json][timeout:${timeout}];area["name"="${areaName}"]->.a;node["man_made"="surveillance"](area.a);out body;`;
  const url = `${OVERPASS_API}?data=${encodeURIComponent(query)}`;
  const response = await fetch(url, { next: { revalidate: 86400 } });
  if (!response.ok) throw new Error(`Overpass API error: ${response.status}`);
  const data = await response.json();
  return parseOverpassElements(data.elements || []);
}

/**
 * Fetch ALPR / license plate reader cameras from OSM.
 */
export async function fetchAlprCameras(
  bounds: { south: number; west: number; north: number; east: number }
): Promise<OsmCamera[]> {
  const query = `[out:json][timeout:60];node["man_made"="surveillance"]["surveillance:type"="ALPR"](${bounds.south},${bounds.west},${bounds.north},${bounds.east});out body;`;
  const url = `${OVERPASS_API}?data=${encodeURIComponent(query)}`;
  const response = await fetch(url, { next: { revalidate: 86400 } });
  if (!response.ok) throw new Error(`Overpass API error: ${response.status}`);
  const data = await response.json();
  return parseOverpassElements(data.elements || []);
}

/**
 * Fetch ALPR cameras by named area.
 */
export async function fetchAlprCamerasByArea(
  areaName: string,
  timeout = 120
): Promise<OsmCamera[]> {
  const query = `[out:json][timeout:${timeout}];area["name"="${areaName}"]->.a;node["man_made"="surveillance"]["surveillance:type"="ALPR"](area.a);out body;`;
  const url = `${OVERPASS_API}?data=${encodeURIComponent(query)}`;
  const response = await fetch(url, { next: { revalidate: 86400 } });
  if (!response.ok) throw new Error(`Overpass API error: ${response.status}`);
  const data = await response.json();
  return parseOverpassElements(data.elements || []);
}

function parseOverpassElements(
  elements: Array<{
    type: string;
    id: number;
    lat: number;
    lon: number;
    tags?: Record<string, string>;
  }>
): OsmCamera[] {
  return elements
    .filter((el) => el.type === "node" && el.lat && el.lon)
    .map((el) => ({
      id: `osm-${el.id}`,
      lat: el.lat,
      lng: el.lon,
      type: el.tags?.["surveillance:type"] || "camera",
      zone: el.tags?.["surveillance:zone"] || "unknown",
      cameraType: el.tags?.["camera:type"] || "unknown",
      operator: el.tags?.operator || "Unknown",
      direction: el.tags?.["camera:direction"] || null,
      source: "openstreetmap" as const,
      hasLiveFeed: false as const,
    }));
}

/**
 * Convert OSM cameras to GeoJSON FeatureCollection for map rendering.
 */
export function osmCamerasToGeoJSON(
  cameras: OsmCamera[]
): GeoJSON.FeatureCollection {
  return {
    type: "FeatureCollection",
    features: cameras.map((cam) => ({
      type: "Feature" as const,
      geometry: {
        type: "Point" as const,
        coordinates: [cam.lng, cam.lat],
      },
      properties: {
        id: cam.id,
        type: cam.type,
        zone: cam.zone,
        cameraType: cam.cameraType,
        operator: cam.operator,
        direction: cam.direction,
        source: cam.source,
      },
    })),
  };
}
