import { NextRequest, NextResponse } from "next/server";

// Cache quotes in memory (avoids hitting brapi on every modal open)
const quotesCache: Record<string, { data: Record<string, QuoteData>; fetchedAt: number }> = {};
const CACHE_TTL = 1000 * 60 * 30; // 30 min

type QuoteData = {
  regularMarketPrice: number;
  regularMarketChangePercent: number;
  logourl?: string;
  shortName?: string;
};

export async function GET(request: NextRequest) {
  const tickers = request.nextUrl.searchParams.get("tickers");
  if (!tickers) {
    return NextResponse.json({ error: "tickers param required" }, { status: 400 });
  }

  const cacheKey = tickers.split(",").sort().join(",");

  // Check cache
  if (quotesCache[cacheKey] && Date.now() - quotesCache[cacheKey].fetchedAt < CACHE_TTL) {
    return NextResponse.json({ quotes: quotesCache[cacheKey].data });
  }

  try {
    const token = process.env.BRAPI_TOKEN ? `&token=${process.env.BRAPI_TOKEN}` : "";
    const res = await fetch(
      `https://brapi.dev/api/quote/${tickers}?range=1mo&interval=1mo${token}`,
      { next: { revalidate: 1800 } }
    );

    if (!res.ok) throw new Error(`brapi error: ${res.status}`);

    const data = await res.json();
    const results: Record<string, QuoteData> = {};

    for (const r of data.results || []) {
      results[r.symbol] = {
        regularMarketPrice: r.regularMarketPrice,
        regularMarketChangePercent: r.regularMarketChangePercent,
        logourl: r.logourl,
        shortName: r.shortName,
      };
    }

    quotesCache[cacheKey] = { data: results, fetchedAt: Date.now() };

    return NextResponse.json({ quotes: results });
  } catch (error) {
    console.error("Quotes API error:", error);
    return NextResponse.json({ quotes: {} });
  }
}
