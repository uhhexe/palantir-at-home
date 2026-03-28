import { NextResponse } from "next/server";

const ALLOWED_HOSTS = [
  // California
  "cwwp2.dot.ca.gov",
  "wzmedia.dot.ca.gov",
  "caltrans-gis.dot.ca.gov",
  // Washington
  "images.wsdot.wa.gov",
  "www.wsdot.wa.gov",
  // Nevada
  "www.nvroads.com",
  // Florida
  "fl511.com",
  // Georgia
  "511ga.org",
  // Pennsylvania
  "www.511pa.com",
];

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const imageUrl = searchParams.get("url");

  if (!imageUrl) {
    return NextResponse.json({ error: "Missing url parameter" }, { status: 400 });
  }

  try {
    const parsed = new URL(imageUrl);
    if (!ALLOWED_HOSTS.includes(parsed.hostname)) {
      return NextResponse.json({ error: "Host not allowed" }, { status: 403 });
    }

    const response = await fetch(imageUrl, {
      headers: {
        "User-Agent": "WarRoom/1.0",
      },
    });

    if (!response.ok) {
      return new Response("Feed unavailable", { status: response.status });
    }

    const buffer = await response.arrayBuffer();
    const contentType = response.headers.get("content-type") || "image/jpeg";

    return new Response(buffer, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "no-cache, no-store, must-revalidate",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch {
    return new Response("Failed to fetch image", { status: 502 });
  }
}
