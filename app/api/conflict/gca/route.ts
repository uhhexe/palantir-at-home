import { NextResponse } from "next/server";

export async function GET() {
  try {
    // Try to fetch GCA data feed — URL structure may vary
    const endpoints = [
      "https://globalconflictawareness.com/api/events",
      "https://globalconflictawareness.com/data/events.json",
      "https://globalconflictawareness.com/feed.json",
    ];

    let events: unknown[] = [];

    for (const url of endpoints) {
      try {
        const res = await fetch(url, {
          next: { revalidate: 300 },
          headers: { Accept: "application/json" },
        });
        if (res.ok) {
          const data = await res.json();
          events = Array.isArray(data)
            ? data
            : (data as Record<string, unknown>).events
              ? ((data as Record<string, unknown>).events as unknown[])
              : (data as Record<string, unknown>).features
                ? ((data as Record<string, unknown>).features as unknown[])
                : [];
          if (events.length > 0) break;
        }
      } catch {
        continue;
      }
    }

    // If no API endpoint works, return empty with instructions
    if (events.length === 0) {
      return NextResponse.json({
        events: [],
        count: 0,
        status: "no_endpoint",
        note: "GlobalConflictAwareness.com may not expose a public JSON API. Check their GitHub for data access.",
      });
    }

    return NextResponse.json({
      events,
      count: events.length,
      timestamp: new Date().toISOString(),
      status: "ok",
    });
  } catch (error) {
    console.error("GCA fetch error:", error);
    return NextResponse.json({ events: [], count: 0, status: "error", error: "Failed to fetch events" });
  }
}
