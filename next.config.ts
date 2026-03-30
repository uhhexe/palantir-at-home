import type { NextConfig } from "next";

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-XSS-Protection", value: "1; mode=block" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-eval' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      "img-src 'self' data: blob: https://*.tile.openstreetmap.org https://*.basemaps.cartocdn.com https://server.arcgisonline.com https://tiles.stadiamaps.com https://*.tile.opentopomap.org https://tiles.openseamap.org https://unpkg.com",
      "connect-src 'self' https://api.anthropic.com https://*.supabase.co https://*.openstreetmap.org https://earthquake.usgs.gov https://api.weather.gov https://firms.modaps.eosdis.nasa.gov https://api.acleddata.com https://tiles.stadiamaps.com https://*.tile.opentopomap.org https://tiles.openseamap.org https://www.oref.org.il https://globalconflictawareness.com https://www.submarinecablemap.com https://services3.arcgis.com https://unpkg.com",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join("; "),
  },
];

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
