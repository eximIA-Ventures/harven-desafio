// =============================================================================
// Market Data — B3 API (IBOV composition) + brapi.dev (quotes)
// =============================================================================

export type IbovStock = {
  ticker: string;
  company: string;
  type: string;
  weight: number;
};

// Cache in memory (refreshes on server restart)
let ibovCache: { stocks: IbovStock[]; fetchedAt: number } | null = null;
const CACHE_TTL = 1000 * 60 * 60 * 6; // 6 hours

export async function getIbovComposition(): Promise<IbovStock[]> {
  // Return cache if fresh
  if (ibovCache && Date.now() - ibovCache.fetchedAt < CACHE_TTL) {
    return ibovCache.stocks;
  }

  try {
    const payload = btoa(
      JSON.stringify({
        language: "pt-br",
        pageNumber: 1,
        pageSize: 120,
        index: "IBOV",
        segment: "1",
      })
    );

    const res = await fetch(
      `https://sistemaswebb3-listados.b3.com.br/indexProxy/indexCall/GetPortfolioDay/${payload}`,
      { next: { revalidate: 21600 } } // 6h
    );

    if (!res.ok) throw new Error(`B3 API error: ${res.status}`);

    const data = await res.json();
    const results = data.results || [];

    const stocks: IbovStock[] = results.map(
      (r: { cod: string; asset: string; type: string; part: string }) => ({
        ticker: r.cod,
        company: r.asset,
        type: r.type,
        weight: parseFloat(r.part.replace(",", ".")),
      })
    );

    // Sort by weight descending
    stocks.sort((a, b) => b.weight - a.weight);

    ibovCache = { stocks, fetchedAt: Date.now() };
    return stocks;
  } catch (error) {
    console.error("Failed to fetch IBOV composition:", error);
    // Return cache even if stale
    if (ibovCache) return ibovCache.stocks;
    return [];
  }
}
