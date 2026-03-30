import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    // Serve strikes from the public static JSON — no filesystem access needed
    const origin = request.nextUrl.origin;
    const res = await fetch(`${origin}/data/conflict/strikes.json`);
    if (!res.ok) throw new Error(`Static file returned ${res.status}`);
    const strikes = await res.json();
    return NextResponse.json(strikes, {
      headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=60" },
    });
  } catch {
    return NextResponse.json({ error: "Failed to load strikes" }, { status: 500 });
  }
}
