import { NextResponse } from "next/server";
import { getIbovComposition } from "@/lib/market-data";

// Cache brapi prices in memory
let priceCache: { data: Record<string, { price: number; change: number }>; at: number } | null = null;
const PRICE_CACHE_TTL = 1000 * 60 * 15; // 15 min

async function fetchPrices(): Promise<Record<string, { price: number; change: number }>> {
  if (priceCache && Date.now() - priceCache.at < PRICE_CACHE_TTL) {
    return priceCache.data;
  }

  try {
    // brapi /api/quote/list is free without token
    const res = await fetch(
      "https://brapi.dev/api/quote/list?limit=100&sortBy=market_cap_basic&sortOrder=desc",
      { next: { revalidate: 900 } }
    );
    if (!res.ok) return priceCache?.data ?? {};

    const data = await res.json();
    const prices: Record<string, { price: number; change: number }> = {};

    for (const s of data.stocks || []) {
      if (s.stock && s.close) {
        prices[s.stock] = {
          price: s.close,
          change: s.change ?? 0,
        };
      }
    }

    priceCache = { data: prices, at: Date.now() };
    return prices;
  } catch {
    return priceCache?.data ?? {};
  }
}

export async function GET() {
  try {
    const [stocks, prices] = await Promise.all([
      getIbovComposition(),
      fetchPrices(),
    ]);

    const enriched = stocks.map((s) => ({
      ...s,
      logo: `https://icons.brapi.dev/icons/${s.ticker}.svg`,
      price: prices[s.ticker]?.price ?? null,
      change: prices[s.ticker]?.change ?? null,
    }));

    return NextResponse.json({ stocks: enriched, count: enriched.length });
  } catch (error) {
    console.error("IBOV API error:", error);
    return NextResponse.json(
      { error: "Falha ao carregar composição do Ibovespa" },
      { status: 500 }
    );
  }
}
