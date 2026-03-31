import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 30;

export async function GET(request: NextRequest) {
  // Verify cron secret if set
  const authHeader = request.headers.get("authorization");
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  const baseUrl = new URL(request.url).origin;

  const results: Record<string, unknown> = {};

  // 1. Warm live strikes cache
  try {
    const res = await fetch(`${baseUrl}/api/conflict/live-strikes?refresh=true`);
    const data = await res.json();
    results.liveStrikes = { status: "ok", sources: data.sources };
  } catch (e) {
    results.liveStrikes = { status: "error", error: String(e).substring(0, 100) };
  }

  // 2. Warm news feed
  try {
    const res = await fetch(`${baseUrl}/api/conflict/news`);
    const data = await res.json();
    results.news = { status: "ok", count: Array.isArray(data) ? data.length : 0 };
  } catch (e) {
    results.news = { status: "error", error: String(e).substring(0, 100) };
  }

  // 3. Warm Ukraine news
  try {
    const res = await fetch(`${baseUrl}/api/conflict/ukraine-news`);
    const data = await res.json();
    results.ukraineNews = { status: "ok", count: Array.isArray(data) ? data.length : 0 };
  } catch (e) {
    results.ukraineNews = { status: "error", error: String(e).substring(0, 100) };
  }

  // 4. OREF alerts
  try {
    const res = await fetch(`${baseUrl}/api/conflict/oref-alerts`);
    const data = await res.json();
    results.oref = { status: "ok", active: data.activeCount, history: data.history?.length || 0 };
  } catch (e) {
    results.oref = { status: "error", error: String(e).substring(0, 100) };
  }

  // 5. Internet status
  try {
    const res = await fetch(`${baseUrl}/api/conflict/internet-status`);
    const data = await res.json();
    results.internet = { status: "ok", countries: data.countries?.length || 0 };
  } catch (e) {
    results.internet = { status: "error", error: String(e).substring(0, 100) };
  }

  // 6. FIRMS thermal data (if key set)
  if (process.env.NASA_FIRMS_KEY && process.env.NASA_FIRMS_KEY !== "placeholder") {
    try {
      const res = await fetch(`${baseUrl}/api/conflict/firms?theater=iran`);
      const data = await res.json();
      results.firms_iran = { status: "ok", fires: data.count };
    } catch {
      results.firms_iran = { status: "error" };
    }

    try {
      const res = await fetch(`${baseUrl}/api/conflict/firms?theater=ukraine`);
      const data = await res.json();
      results.firms_ukraine = { status: "ok", fires: data.count };
    } catch {
      results.firms_ukraine = { status: "error" };
    }
  }

  return NextResponse.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    results,
  });
}
