import { NextResponse } from "next/server";

const OREF_URL = "https://www.oref.org.il/WarningMessages/alert/alerts.json";

// Store alert history in memory (persists across requests within the same server instance)
let alertHistory: Record<string, unknown>[] = [];
const MAX_HISTORY = 500;

// Israeli city/area coordinate mapping
const AREA_COORDS: Record<string, [number, number]> = {
  "תל אביב": [32.08, 34.78],
  "ירושלים": [31.77, 35.21],
  "חיפה": [32.79, 34.99],
  "באר שבע": [31.25, 34.79],
  "אשדוד": [31.80, 34.65],
  "אשקלון": [31.67, 34.57],
  "נתניה": [32.33, 34.86],
  "רמת גן": [32.08, 34.81],
  "קריית שמונה": [33.21, 35.57],
  "טבריה": [32.79, 35.53],
  "עפולה": [32.61, 35.29],
  "נהריה": [33.01, 35.09],
  "צפת": [32.97, 35.50],
  "אילת": [29.56, 34.95],
  "מטולה": [33.28, 35.58],
  "פתח תקווה": [32.09, 34.88],
  "הרצליה": [32.16, 34.84],
  "כפר סבא": [32.18, 34.91],
  "רעננה": [32.18, 34.87],
  "רחובות": [31.90, 34.81],
  "לוד": [31.95, 34.90],
  "רמלה": [31.93, 34.87],
  "עכו": [32.93, 35.08],
  "דימונה": [31.07, 35.03],
  "ערד": [31.26, 35.21],
  "שדרות": [31.52, 34.60],
  "קרית גת": [31.61, 34.76],
  "בית שאן": [32.50, 35.50],
  "עראד": [31.26, 35.21],
};

export async function GET() {
  try {
    const res = await fetch(OREF_URL, {
      headers: {
        Accept: "application/json",
        "X-Requested-With": "XMLHttpRequest",
        Referer: "https://www.oref.org.il/",
      },
      next: { revalidate: 10 },
    });

    let currentAlerts: Record<string, unknown>[] = [];

    if (res.ok) {
      const text = await res.text();
      if (text.trim()) {
        try {
          const parsed = JSON.parse(text);
          currentAlerts = Array.isArray(parsed) ? parsed : [parsed];
        } catch {
          currentAlerts = [];
        }
      }
    }

    // Add new alerts to history with timestamp
    const now = new Date().toISOString();
    for (const alert of currentAlerts) {
      const exists = alertHistory.some(
        (h) =>
          h.data === (alert as Record<string, unknown>).data &&
          Math.abs(new Date(h.timestamp as string).getTime() - Date.now()) < 120000
      );
      if (!exists) {
        alertHistory.unshift({
          ...alert,
          timestamp: now,
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        });
      }
    }

    // Trim history
    if (alertHistory.length > MAX_HISTORY) {
      alertHistory = alertHistory.slice(0, MAX_HISTORY);
    }

    return NextResponse.json(
      {
        active: currentAlerts,
        activeCount: currentAlerts.length,
        history: alertHistory.slice(0, 100),
        historyCount: alertHistory.length,
        areaCoords: AREA_COORDS,
        timestamp: now,
        status: "ok",
      },
      {
        headers: { "Cache-Control": "public, s-maxage=10, stale-while-revalidate=5" },
      }
    );
  } catch (error) {
    return NextResponse.json(
      {
        active: [],
        activeCount: 0,
        history: alertHistory.slice(0, 100),
        historyCount: alertHistory.length,
        timestamp: new Date().toISOString(),
        status: "error",
        error: "Failed to fetch alerts",
      },
      { status: 200 }
    );
  }
}
