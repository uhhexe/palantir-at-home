// DeFlock ALPR camera locations — pulled from cdn.deflock.me tile data
// Source: https://deflock.org (OpenStreetMap ALPR nodes)

const CDN_BASE = "https://cdn.deflock.me";
const INDEX_URL = `${CDN_BASE}/regions/index.json`;

interface DeflockNode {
  id: number;
  lat: number;
  lon: number;
  tags: Record<string, string>;
}

interface DeflockIndex {
  regions: Array<{ lat: number; lon: number }>;
}

let _cache: GeoJSON.FeatureCollection | null = null;

// US bounding box (approximate)
function isUS(lat: number, lon: number): boolean {
  return lat >= 24 && lat <= 50 && lon >= -125 && lon <= -66;
}

export async function fetchDeflockALPR(): Promise<GeoJSON.FeatureCollection> {
  if (_cache) return _cache;

  // Fetch tile index
  const indexRes = await fetch(INDEX_URL);
  if (!indexRes.ok) throw new Error(`DeFlock index: HTTP ${indexRes.status}`);
  const index: DeflockIndex = await indexRes.json();

  // Filter to US region tiles only
  const usTiles = index.regions.filter((r) => isUS(r.lat, r.lon));

  // Fetch all US tiles in parallel (batches of 10)
  const allNodes: DeflockNode[] = [];
  for (let i = 0; i < usTiles.length; i += 10) {
    const batch = usTiles.slice(i, i + 10);
    const results = await Promise.allSettled(
      batch.map(async (tile) => {
        const url = `${CDN_BASE}/regions/${tile.lat}/${tile.lon}.json`;
        const res = await fetch(url);
        if (!res.ok) return [];
        return (await res.json()) as DeflockNode[];
      })
    );
    for (const r of results) {
      if (r.status === "fulfilled") allNodes.push(...r.value);
    }
  }

  const geojson: GeoJSON.FeatureCollection = {
    type: "FeatureCollection",
    features: allNodes
      .filter((n) => n.lat && n.lon)
      .map((n) => ({
        type: "Feature" as const,
        geometry: {
          type: "Point" as const,
          coordinates: [n.lon, n.lat],
        },
        properties: {
          id: `deflock-${n.id}`,
          osmId: n.id,
          operator: n.tags?.operator || "",
          manufacturer: n.tags?.manufacturer || n.tags?.brand || "",
          direction: n.tags?.direction || n.tags?.["camera:direction"] || "",
          source: "DeFlock / OpenStreetMap",
        },
      })),
  };

  _cache = geojson;
  return geojson;
}
