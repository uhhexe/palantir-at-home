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
  // NYC TMC
  "webcams.nyctmc.org",
  // New York State
  "511ny.org",
  // MassDOT
  "public.carsprogram.org",
  "api.trafficland.com",
];

// Suffix-based matching for CDN subdomains (e.g. s58.nysdot.skyvdn.com)
const ALLOWED_HOST_SUFFIXES = [
  ".nysdot.skyvdn.com",
];

function isHostAllowed(hostname: string): boolean {
  if (ALLOWED_HOSTS.includes(hostname)) return true;
  return ALLOWED_HOST_SUFFIXES.some((suffix) => hostname.endsWith(suffix));
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const imageUrl = searchParams.get("url");

  if (!imageUrl) {
    return NextResponse.json({ error: "Missing url parameter" }, { status: 400 });
  }

  try {
    const parsed = new URL(imageUrl);

    // Only allow http/https schemes to prevent SSRF via file://, ftp://, etc.
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return NextResponse.json({ error: "Invalid URL scheme" }, { status: 400 });
    }

    if (!isHostAllowed(parsed.hostname)) {
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
        "Access-Control-Allow-Origin": process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3001",
      },
    });
  } catch {
    return new Response("Failed to fetch image", { status: 502 });
  }
}
