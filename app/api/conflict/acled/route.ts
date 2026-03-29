import { NextResponse } from "next/server";

const ACLED_BASE = "https://api.acleddata.com/acled/read";

const COUNTRIES: Record<string, string> = {
  iran: "Iran|Israel|Lebanon|Iraq|Qatar|United Arab Emirates|Kuwait|Bahrain|Saudi Arabia|Yemen|Syria|Jordan",
  ukraine: "Ukraine|Russia",
};

export async function GET(request: Request) {
  const key = process.env.ACLED_API_KEY || process.env.ACLED_KEY || "";
  const email = process.env.ACLED_EMAIL || "";

  if (!key || !email) {
    return NextResponse.json({
      events: [],
      count: 0,
      status: "no_api_key",
      note: "Register for free ACLED key at https://developer.acleddata.com/",
    });
  }

  const { searchParams } = new URL(request.url);
  const theater = searchParams.get("theater") || searchParams.get("country") || "iran";

  // Support both theater names and direct country names
  const countries = COUNTRIES[theater.toLowerCase()] || theater;

  try {
    const params = new URLSearchParams({
      key,
      email,
      country: countries,
      event_date: "2026-02-28|2026-12-31",
      event_date_where: "BETWEEN",
      limit: "500",
      fields: "event_id_cnty|event_date|year|event_type|sub_event_type|actor1|actor2|country|admin1|location|latitude|longitude|fatalities|notes|source",
    });

    const url = `${ACLED_BASE}?${params}`;

    const res = await fetch(url, {
      next: { revalidate: 86400 },
    });

    if (!res.ok) {
      return NextResponse.json({ events: [], count: 0, status: "api_error" });
    }

    const data = await res.json();

    const events = (data.data || [])
      .map((e: Record<string, string>) => ({
        id: e.event_id_cnty,
        event_id_cnty: e.event_id_cnty || "",
        event_date: e.event_date || "",
        event_type: e.event_type || "",
        sub_event_type: e.sub_event_type || "",
        actor1: e.actor1 || "",
        actor2: e.actor2 || "",
        country: e.country || "",
        admin1: e.admin1 || "",
        location: e.location || "",
        lat: parseFloat(e.latitude) || 0,
        lng: parseFloat(e.longitude) || 0,
        fatalities: parseInt(e.fatalities) || 0,
        notes: e.notes || "",
        source: e.source || "",
      }))
      .filter((e: { lat: number; lng: number }) => !isNaN(e.lat) && !isNaN(e.lng));

    return NextResponse.json(
      {
        events,
        count: events.length,
        theater,
        timestamp: new Date().toISOString(),
        status: "ok",
      },
      {
        headers: { "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=3600" },
      }
    );
  } catch (error) {
    console.error("ACLED fetch error:", error);
    return NextResponse.json({ events: [], count: 0, status: "error", error: "Failed to fetch conflict data" });
  }
}
