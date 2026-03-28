import { NextResponse } from "next/server";

interface NormalizedCamera {
  id: string;
  name: string;
  lat: number;
  lng: number;
  imageUrl: string | null;
  streamUrl: string | null;
  road: string;
  direction: string;
  county: string;
  state: string;
  source: string;
  inService: boolean;
}

// ─── Caltrans ArcGIS (all CA cameras in one call) ───

const CALTRANS_ARCGIS =
  "https://caltrans-gis.dot.ca.gov/arcgis/rest/services/CHhighway/CCTV/FeatureServer/0/query?where=1%3D1&outFields=*&f=json&resultRecordCount=5000";

interface ArcGISResponse {
  features: Array<{
    attributes: {
      OBJECTID: number;
      locationName: string;
      nearbyPlace: string;
      longitude: number;
      latitude: number;
      currentImageURL: string;
      streamingVideoURL: string;
      inService: string;
      district: number;
      county: string;
      route: string;
      direction: string;
    };
  }>;
}

function parseCaltransArcGIS(data: ArcGISResponse): NormalizedCamera[] {
  if (!data?.features) return [];
  return data.features
    .filter((f) => {
      const a = f.attributes;
      return a.latitude && a.longitude && a.inService !== "false";
    })
    .map((f) => {
      const a = f.attributes;
      return {
        id: `caltrans-${a.OBJECTID}`,
        name: a.locationName || a.nearbyPlace || `CA Camera ${a.OBJECTID}`,
        lat: a.latitude,
        lng: a.longitude,
        imageUrl: a.currentImageURL || null,
        streamUrl: a.streamingVideoURL || null,
        road: a.route ? `${a.route} ${a.direction || ""}`.trim() : "",
        direction: a.direction || "",
        county: a.county || "",
        state: "CA",
        source: "caltrans",
        inService: true,
      };
    });
}

// ─── 511 Platform (shared by NV, FL, GA, PA) ───

interface Platform511Entry {
  id: number;
  roadway: string;
  direction: string;
  location: string;
  latLng: {
    geography: {
      wellKnownText: string;
    };
  };
  images: Array<{
    imageUrl: string;
    videoUrl: string;
    description: string;
    disabled: boolean;
    blocked: boolean;
  }>;
  county: string | null;
  region: string | null;
  state: string | null;
}

interface Platform511Response {
  recordsTotal: number;
  data: Platform511Entry[];
}

const PLATFORM_511_SOURCES: Array<{
  name: string;
  baseUrl: string;
  stateCode: string;
  sourceId: string;
  streamsPublic: boolean;
}> = [
  {
    name: "Nevada",
    baseUrl: "https://www.nvroads.com",
    stateCode: "NV",
    sourceId: "nvdot",
    streamsPublic: true,
  },
  {
    name: "Florida",
    baseUrl: "https://fl511.com",
    stateCode: "FL",
    sourceId: "fldot",
    streamsPublic: false,
  },
  {
    name: "Georgia",
    baseUrl: "https://511ga.org",
    stateCode: "GA",
    sourceId: "gadot",
    streamsPublic: false,
  },
  {
    name: "Pennsylvania",
    baseUrl: "https://www.511pa.com",
    stateCode: "PA",
    sourceId: "padot",
    streamsPublic: false,
  },
];

function parseWKTPoint(wkt: string): { lat: number; lng: number } | null {
  const match = wkt.match(/POINT\s*\(\s*([-\d.]+)\s+([-\d.]+)\s*\)/);
  if (!match) return null;
  return { lng: parseFloat(match[1]), lat: parseFloat(match[2]) };
}

function parse511Platform(
  data: Platform511Response,
  source: (typeof PLATFORM_511_SOURCES)[number]
): NormalizedCamera[] {
  if (!data?.data) return [];
  return data.data
    .filter((entry) => {
      if (!entry.latLng?.geography?.wellKnownText) return false;
      const img = entry.images?.[0];
      if (img?.disabled || img?.blocked) return false;
      return true;
    })
    .map((entry) => {
      const coords = parseWKTPoint(entry.latLng.geography.wellKnownText);
      if (!coords) return null;

      const img = entry.images?.[0];
      const imageUrl = img?.imageUrl
        ? img.imageUrl.startsWith("http")
          ? img.imageUrl
          : `${source.baseUrl}${img.imageUrl}`
        : null;

      return {
        id: `${source.sourceId}-${entry.id}`,
        name:
          img?.description ||
          entry.roadway ||
          entry.location ||
          `${source.stateCode} Camera ${entry.id}`,
        lat: coords.lat,
        lng: coords.lng,
        imageUrl,
        streamUrl: source.streamsPublic ? (img?.videoUrl || null) : null,
        road: entry.roadway || "",
        direction: entry.direction || "",
        county: entry.county || "",
        state: source.stateCode,
        source: source.sourceId,
        inService: true,
      };
    })
    .filter((c): c is NormalizedCamera => c !== null);
}

async function fetch511Page(
  baseUrl: string,
  start: number
): Promise<Platform511Response> {
  const url = `${baseUrl}/List/GetData/Cameras?key=Statewide`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `start=${start}&length=100&search%5Bvalue%5D=`,
    next: { revalidate: 300 },
  });
  if (!res.ok) throw new Error(`511 HTTP ${res.status}`);
  return res.json();
}

async function fetch511Platform(
  source: (typeof PLATFORM_511_SOURCES)[number]
): Promise<NormalizedCamera[]> {
  // First page to get total count
  const firstPage = await fetch511Page(source.baseUrl, 0);
  const total = firstPage.recordsTotal;
  let allCameras = parse511Platform(firstPage, source);

  // Fetch remaining pages in parallel (batches of 5 to avoid overwhelming)
  const pageCount = Math.ceil(total / 100);
  for (let batch = 1; batch < pageCount; batch += 5) {
    const pages = [];
    for (let i = batch; i < Math.min(batch + 5, pageCount); i++) {
      pages.push(fetch511Page(source.baseUrl, i * 100));
    }
    const results = await Promise.allSettled(pages);
    for (const result of results) {
      if (result.status === "fulfilled") {
        allCameras = allCameras.concat(parse511Platform(result.value, source));
      }
    }
  }

  return allCameras;
}

// ─── NYC TMC (New York City Traffic Management Center) ───

const NYC_TMC_API = "https://webcams.nyctmc.org/api/cameras";

interface NycTmcCamera {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  area: string;
  isOnline: string;
  imageUrl: string;
}

function parseNycTmc(data: NycTmcCamera[]): NormalizedCamera[] {
  if (!Array.isArray(data)) return [];
  return data
    .filter((cam) => cam.latitude && cam.longitude && cam.isOnline === "true")
    .map((cam) => ({
      id: `nyctmc-${cam.id}`,
      name: cam.name || `NYC Camera`,
      lat: cam.latitude,
      lng: cam.longitude,
      imageUrl: cam.imageUrl || null,
      streamUrl: null,
      road: "",
      direction: "",
      county: cam.area || "",
      state: "NY",
      source: "nyctmc",
      inService: true,
    }));
}

// ─── MassDOT (Castle Rock / CARS program) ───

const MASSDOT_API =
  "https://matg.carsprogram.org/cameras_v1/api/cameras?cameraSystem=default";

interface MassDotCamera {
  id: number;
  name: string;
  location: {
    latitude: number;
    longitude: number;
    routeId: string;
    cityReference: string;
  };
  views: Array<{
    name: string;
    type: string;
    url: string;
    videoPreviewUrl: string;
  }>;
}

function parseMassDot(data: MassDotCamera[]): NormalizedCamera[] {
  if (!Array.isArray(data)) return [];
  return data
    .filter((cam) => cam.location?.latitude && cam.location?.longitude)
    .map((cam) => {
      const view = cam.views?.[0];
      return {
        id: `massdot-${cam.id}`,
        name: cam.name || `MA Camera ${cam.id}`,
        lat: cam.location.latitude,
        lng: cam.location.longitude,
        imageUrl: view?.videoPreviewUrl || null,
        streamUrl: view?.url || null,
        road: cam.location.routeId || "",
        direction: view?.name || "",
        county: cam.location.cityReference?.replace(/^in /, "") || "",
        state: "MA",
        source: "massdot",
        inService: true,
      };
    });
}

// ─── NJTA (NJ Turnpike Authority — Turnpike + Garden State Parkway) ───

const NJTA_PAGE = "https://www.njta.gov/travel-resources/camera-list/";

interface NjtaCamera {
  id: number;
  lat: number;
  lng: number;
  mile_marker: number | null;
  relative_direction: string;
  relative_text: string;
  video_url: string;
  section: string;
  type: string;
}

interface NjtaBlockConfig {
  mode: string;
  initialData: {
    cameras: {
      turnpike: NjtaCamera[];
      parkway: NjtaCamera[];
    };
  };
}

function parseNjta(config: NjtaBlockConfig): NormalizedCamera[] {
  const cameras: NormalizedCamera[] = [];
  const { turnpike = [], parkway = [] } = config.initialData?.cameras || {};

  for (const cam of turnpike) {
    if (!cam.lat || !cam.lng) continue;
    cameras.push({
      id: `njta-tp-${cam.id}`,
      name: cam.relative_text
        ? `NJ Turnpike MP ${cam.mile_marker ?? ""} — ${cam.relative_text}`
        : `NJ Turnpike Camera ${cam.id}`,
      lat: cam.lat,
      lng: cam.lng,
      imageUrl: null,
      streamUrl: cam.video_url || null,
      road: "NJ Turnpike",
      direction: cam.relative_direction || "",
      county: "",
      state: "NJ",
      source: "njta",
      inService: !!cam.video_url,
    });
  }

  for (const cam of parkway) {
    if (!cam.lat || !cam.lng) continue;
    cameras.push({
      id: `njta-gsp-${cam.id}`,
      name: cam.relative_text
        ? `Garden State Parkway MP ${cam.mile_marker ?? ""} — ${cam.relative_text}`
        : `GSP Camera ${cam.id}`,
      lat: cam.lat,
      lng: cam.lng,
      imageUrl: null,
      streamUrl: cam.video_url || null,
      road: "Garden State Parkway",
      direction: cam.relative_direction || "",
      county: "",
      state: "NJ",
      source: "njta",
      inService: !!cam.video_url,
    });
  }

  return cameras;
}

async function fetchNjtaCameras(): Promise<NormalizedCamera[]> {
  const res = await fetch(NJTA_PAGE, { next: { revalidate: 3600 } });
  if (!res.ok) throw new Error(`NJTA HTTP ${res.status}`);
  const html = await res.text();

  // Extract data-block-config JSON from the map block element
  const match = html.match(/data-block-config="([^"]+)"/);
  if (!match) throw new Error("NJTA: no data-block-config found");

  // HTML-decode the attribute value
  const decoded = match[1]
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'");

  const config: NjtaBlockConfig = JSON.parse(decoded);
  return parseNjta(config);
}

// ─── Main handler ───

export async function GET() {
  const allCameras: NormalizedCamera[] = [];
  const errors: string[] = [];
  const sourceCounts: Record<string, number> = {};

  // Caltrans ArcGIS
  try {
    const res = await fetch(CALTRANS_ARCGIS, { next: { revalidate: 300 } });
    if (!res.ok) throw new Error(`ArcGIS HTTP ${res.status}`);
    const data = await res.json();
    const cameras = parseCaltransArcGIS(data);
    allCameras.push(...cameras);
    sourceCounts.caltrans = cameras.length;
  } catch (err) {
    errors.push(`Caltrans: ${err instanceof Error ? err.message : "failed"}`);
  }

  // All 511 platform sources in parallel
  const results511 = await Promise.allSettled(
    PLATFORM_511_SOURCES.map(async (source) => {
      const cameras = await fetch511Platform(source);
      return { source, cameras };
    })
  );

  for (const result of results511) {
    if (result.status === "fulfilled") {
      allCameras.push(...result.value.cameras);
      sourceCounts[result.value.source.sourceId] = result.value.cameras.length;
    } else {
      errors.push(result.reason?.message || "511 fetch failed");
    }
  }

  // NYC TMC cameras
  try {
    const res = await fetch(NYC_TMC_API, { next: { revalidate: 300 } });
    if (!res.ok) throw new Error(`NYC TMC HTTP ${res.status}`);
    const data = await res.json();
    const cameras = parseNycTmc(data);
    allCameras.push(...cameras);
    sourceCounts.nyctmc = cameras.length;
  } catch (err) {
    errors.push(`NYC TMC: ${err instanceof Error ? err.message : "failed"}`);
  }

  // MassDOT cameras
  try {
    const res = await fetch(MASSDOT_API, { next: { revalidate: 300 } });
    if (!res.ok) throw new Error(`MassDOT HTTP ${res.status}`);
    const data = await res.json();
    const cameras = parseMassDot(data);
    allCameras.push(...cameras);
    sourceCounts.massdot = cameras.length;
  } catch (err) {
    errors.push(`MassDOT: ${err instanceof Error ? err.message : "failed"}`);
  }

  // NJTA cameras (NJ Turnpike + Garden State Parkway)
  try {
    const cameras = await fetchNjtaCameras();
    allCameras.push(...cameras);
    sourceCounts.njta = cameras.length;
  } catch (err) {
    errors.push(`NJTA: ${err instanceof Error ? err.message : "failed"}`);
  }

  return NextResponse.json({
    cameras: allCameras,
    count: allCameras.length,
    sources: sourceCounts,
    errors: errors.length > 0 ? errors : undefined,
  });
}
