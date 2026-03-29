import { NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { join } from "path";

export async function GET() {
  try {
    const filePath = join(process.cwd(), "public/data/conflict/strikes.json");
    const raw = await readFile(filePath, "utf-8");
    const strikes = JSON.parse(raw);
    return NextResponse.json(strikes, {
      headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=60" },
    });
  } catch {
    return NextResponse.json({ error: "Failed to load strikes" }, { status: 500 });
  }
}
