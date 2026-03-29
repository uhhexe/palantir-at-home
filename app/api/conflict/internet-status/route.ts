import { NextResponse } from "next/server";

export async function GET() {
  // Static connectivity status — manually updated or automated later via Cloudflare Radar API
  const status = {
    asOf: new Date().toISOString(),
    countries: [
      {
        name: "Iran",
        code: "IR",
        connectivity: 15,
        normalBaseline: 100,
        status: "SEVERELY RESTRICTED",
        since: "2026-02-28",
        note: "Near-total blackout Feb 28 - Mar 2 (1% connectivity for 60+ hours). Partial restoration to ~15%. Government-controlled throttling.",
        color: "#e8364a",
      },
      {
        name: "Israel",
        code: "IL",
        connectivity: 92,
        normalBaseline: 100,
        status: "OPERATIONAL",
        note: "Minor disruptions during heavy missile barrages. Media censorship on military infrastructure locations.",
        color: "#22f5b0",
      },
      {
        name: "Lebanon",
        code: "LB",
        connectivity: 65,
        normalBaseline: 100,
        status: "DEGRADED",
        note: "Infrastructure damage from Israeli strikes affecting connectivity in southern regions.",
        color: "#ffb830",
      },
      {
        name: "Qatar",
        code: "QA",
        connectivity: 88,
        normalBaseline: 100,
        status: "OPERATIONAL",
        note: "AWS UAE data center outage affected some services. Minor disruptions during missile strikes.",
        color: "#22f5b0",
      },
      {
        name: "UAE",
        code: "AE",
        connectivity: 85,
        normalBaseline: 100,
        status: "MOSTLY OPERATIONAL",
        note: "AWS data center physically struck. Brief closures of Dubai airport. Some infrastructure damage.",
        color: "#ffb830",
      },
      {
        name: "Iraq",
        code: "IQ",
        connectivity: 70,
        normalBaseline: 100,
        status: "DEGRADED",
        note: "Intermittent disruptions near military targets. Kurdish region infrastructure damaged.",
        color: "#ffb830",
      },
      {
        name: "Ukraine",
        code: "UA",
        connectivity: 75,
        normalBaseline: 100,
        status: "DEGRADED",
        note: "Ongoing energy infrastructure attacks causing regional internet outages. Starlink providing backup.",
        color: "#ffb830",
      },
      {
        name: "Russia",
        code: "RU",
        connectivity: 95,
        normalBaseline: 100,
        status: "OPERATIONAL (censored)",
        note: "Internet functional but heavily censored. VPN usage widespread. Some disruptions from Ukrainian strikes.",
        color: "#22f5b0",
      },
    ],
  };

  return NextResponse.json(status, {
    headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=60" },
  });
}
