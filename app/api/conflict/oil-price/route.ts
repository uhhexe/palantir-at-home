import { NextResponse } from "next/server";

interface OilPriceData {
  brent: number | null;
  wti: number | null;
  change: number | null;
  changePercent: number | null;
  timestamp: string;
}

async function fetchYahooQuote(symbol: string): Promise<{ price: number; change: number; changePercent: number } | null> {
  try {
    const res = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1m&range=1d`,
      {
        headers: { "User-Agent": "Mozilla/5.0" },
        next: { revalidate: 60 },
      }
    );
    if (!res.ok) return null;
    const data = await res.json();
    const meta = data?.chart?.result?.[0]?.meta;
    if (!meta) return null;
    return {
      price: meta.regularMarketPrice ?? null,
      change: (meta.regularMarketPrice ?? 0) - (meta.chartPreviousClose ?? 0),
      changePercent: meta.chartPreviousClose
        ? (((meta.regularMarketPrice - meta.chartPreviousClose) / meta.chartPreviousClose) * 100)
        : 0,
    };
  } catch {
    return null;
  }
}

export async function GET() {
  const [brent, wti] = await Promise.all([
    fetchYahooQuote("BZ=F"),  // Brent Crude
    fetchYahooQuote("CL=F"),  // WTI Crude
  ]);

  const result: OilPriceData = {
    brent: brent?.price ?? null,
    wti: wti?.price ?? null,
    change: brent?.change ?? null,
    changePercent: brent?.changePercent ?? null,
    timestamp: new Date().toISOString(),
  };

  return NextResponse.json(result, {
    headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=30" },
  });
}
