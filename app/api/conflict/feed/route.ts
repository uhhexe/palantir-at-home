import { NextResponse } from "next/server";

// Proxy for IranWarLive feed.json — avoids CORS, caches server-side
export async function GET() {
  try {
    const res = await fetch("https://iranwarlive.com/feed.json", {
      next: { revalidate: 300 },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return NextResponse.json(data, {
      headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=60" },
    });
  } catch {
    return NextResponse.json({ error: "Failed to fetch feed" }, { status: 500 });
  }
}
