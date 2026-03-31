import { NextResponse } from "next/server";

const GITHUB_SOURCES = [
  {
    name: "danielrosehill-waves",
    url: "https://raw.githubusercontent.com/danielrosehill/Iran-Israel-War-2026-OSINT-Data/main/data/waves.json",
    type: "waves",
  },
  {
    name: "danielrosehill-strikes",
    url: "https://raw.githubusercontent.com/danielrosehill/Iran-Israel-War-2026-OSINT-Data/main/data/strikes.json",
    type: "strikes",
  },
  {
    name: "iranwarlive-feed",
    url: "https://iranwarlive.com/feed.json",
    type: "feed",
  },
];

// In-memory cache
let cachedData: Record<string, unknown> | null = null;
let cacheTimestamp = 0;
const CACHE_TTL = 3600000; // 1 hour

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const forceRefresh = searchParams.get("refresh") === "true";
  const now = Date.now();

  if (cachedData && !forceRefresh && now - cacheTimestamp < CACHE_TTL) {
    return NextResponse.json(
      { ...cachedData, cached: true, cacheAge: Math.floor((now - cacheTimestamp) / 1000) },
      { headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" } }
    );
  }

  const sources: Record<string, { status: string; count?: number }> = {};
  let totalLive = 0;

  for (const source of GITHUB_SOURCES) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);
      const res = await fetch(source.url, {
        signal: controller.signal,
        headers: { Accept: "application/json" },
      });
      clearTimeout(timeout);

      if (res.ok) {
        const data = await res.json();
        const count = Array.isArray(data)
          ? data.length
          : data.features?.length || data.strikes?.length || data.waves?.length || Object.keys(data).length;
        sources[source.name] = { status: "ok", count };
        totalLive += count;
      } else {
        sources[source.name] = { status: "error" };
      }
    } catch {
      sources[source.name] = { status: "timeout" };
    }
  }

  // Check static baseline
  try {
    const origin = new URL(request.url).origin;
    const staticRes = await fetch(`${origin}/data/conflict/strikes.json`);
    if (staticRes.ok) {
      const staticData = await staticRes.json();
      sources["static-baseline"] = {
        status: "ok",
        count: Array.isArray(staticData) ? staticData.length : 0,
      };
    }
  } catch {
    sources["static-baseline"] = { status: "error" };
  }

  cachedData = {
    sources,
    totalFromLiveSources: totalLive,
    timestamp: new Date().toISOString(),
  };
  cacheTimestamp = now;

  return NextResponse.json(cachedData, {
    headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" },
  });
}
