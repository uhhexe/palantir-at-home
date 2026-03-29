import { NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function POST() {
  const supabase = getServiceClient();

  // Fetch cameras from the main cameras API (same server)
  const baseUrl = process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : "http://localhost:3001";
  const res = await fetch(`${baseUrl}/api/cameras`);
  if (!res.ok) {
    return NextResponse.json(
      { error: "Failed to fetch camera data" },
      { status: 500 }
    );
  }

  const { cameras, sources } = await res.json();

  // Upsert cameras into Supabase in batches
  const batchSize = 500;
  let inserted = 0;
  let errors = 0;

  for (let i = 0; i < cameras.length; i += batchSize) {
    const batch = cameras.slice(i, i + batchSize).map(
      (cam: {
        id: string;
        name: string;
        state: string;
        road: string;
        lat: number;
        lng: number;
        imageUrl: string | null;
        streamUrl: string | null;
        source: string;
        direction: string;
        county: string;
        inService: boolean;
      }) => ({
        id: cam.id,
        name: cam.name,
        state: cam.state,
        road: cam.road,
        lat: cam.lat,
        lng: cam.lng,
        feed_url: cam.imageUrl,
        feed_type: cam.streamUrl ? "hls" : cam.imageUrl ? "jpeg" : null,
        source: cam.source,
        is_live: cam.inService,
        last_checked: new Date().toISOString(),
        metadata: {
          direction: cam.direction,
          county: cam.county,
          stream_url: cam.streamUrl,
        },
      })
    );

    const { error } = await supabase.from("cameras").upsert(batch, {
      onConflict: "id",
      ignoreDuplicates: false,
    });

    if (error) {
      console.error(`Batch ${i / batchSize} error:`, error.message);
      errors++;
    } else {
      inserted += batch.length;
    }
  }

  return NextResponse.json({
    synced: inserted,
    errors,
    sources,
    timestamp: new Date().toISOString(),
  });
}
