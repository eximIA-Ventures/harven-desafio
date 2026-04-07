import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { eq, ne, desc } from "drizzle-orm";
import { ALLOCATION_WEIGHTS } from "@/lib/allocation-weights";
import {
  fetchLivePrices,
  fetchReferencePrices,
  fetchLiveBenchmarks,
  fetchLiveIbovReturn,
} from "@/lib/price-service";

// ─── Reference price cache (DB-backed + in-memory) ──────────────────────────

type RefPriceCache = {
  cycleId: string;
  prices: Record<string, number>;
  fetchedAt: number;
};

const refPriceCaches: Record<string, RefPriceCache> = {};

/**
 * Get or fetch reference prices (close of last business day of previous month).
 * Stores in dc_monthly_prices.openPrice for persistence, caches in memory.
 */
async function getReferencePrices(
  cycleId: string,
  cycleMonth: number,
  cycleYear: number,
  tickers: string[]
): Promise<Record<string, number>> {
  // Check memory cache for this cycle
  const cached = refPriceCaches[cycleId];
  if (cached) {
    const missing = tickers.filter((t) => !(t in cached.prices));
    if (missing.length === 0) return cached.prices;
  }

  // Check DB for already-stored reference prices
  const existing = await db.query.monthlyPrices.findMany({
    where: eq(schema.monthlyPrices.cycleId, cycleId),
  });

  const dbPrices: Record<string, number> = {};
  for (const p of existing) {
    if (p.openPrice > 0 && !p.ticker.startsWith("__")) {
      dbPrices[p.ticker] = p.openPrice;
    }
  }

  // Find tickers that need reference prices fetched
  const needFetch = tickers.filter((t) => !(t in dbPrices));

  if (needFetch.length > 0) {
    console.log(
      `[LiveRanking] Fetching reference prices for ${needFetch.length} tickers (cycle ${cycleMonth}/${cycleYear})`
    );

    const fetched = await fetchReferencePrices(
      needFetch,
      cycleMonth,
      cycleYear
    );

    // Store in DB for persistence
    for (const [ticker, price] of Object.entries(fetched)) {
      await db
        .insert(schema.monthlyPrices)
        .values({
          ticker,
          cycleId,
          openPrice: price,
          closePrice: price,
          variation: 0,
        })
        .onConflictDoUpdate({
          target: [schema.monthlyPrices.ticker, schema.monthlyPrices.cycleId],
          set: { openPrice: price },
        });

      dbPrices[ticker] = price;
    }
  }

  // Update memory cache
  refPriceCaches[cycleId] = { cycleId, prices: dbPrices, fetchedAt: Date.now() };

  return dbPrices;
}

// ─── Shared ranking calculation ─────────────────────────────────────────────

const modelLabels: Record<number, string> = {
  1: "Conservador",
  2: "Moderado",
  3: "Arrojado",
  4: "Agressivo",
};

async function calculateLiveRanking(cycle: {
  id: string;
  month: number;
  year: number;
  label: string;
}) {
  // Get all portfolios for this cycle
  const portfolios = await db.query.portfolios.findMany({
    where: eq(schema.portfolios.cycleId, cycle.id),
    with: { user: true, stocks: true },
  });

  // Find users who participated before but not in this cycle — carry forward
  const currentUserIds = new Set(portfolios.map((p) => p.userId));

  // Get the most recent previous cycle
  const prevCycles = await db.query.cycles.findMany({
    orderBy: [desc(schema.cycles.year), desc(schema.cycles.month)],
  });
  const prevCycle = prevCycles.find(
    (c) =>
      c.id !== cycle.id &&
      (c.year < cycle.year ||
        (c.year === cycle.year && c.month < cycle.month))
  );

  // Replicated portfolios from previous cycle
  type ReplicatedPortfolio = {
    userId: string;
    user: { name: string; curso: string | null; sala: string | null };
    allocationModel: number;
    stocks: { ticker: string; position: number }[];
    replicated: true;
    replicatedFrom: string;
  };

  const replicatedPortfolios: ReplicatedPortfolio[] = [];

  if (prevCycle) {
    const prevPortfolios = await db.query.portfolios.findMany({
      where: eq(schema.portfolios.cycleId, prevCycle.id),
      with: { user: true, stocks: true },
    });

    for (const prev of prevPortfolios) {
      if (!currentUserIds.has(prev.userId) && prev.stocks.length > 0) {
        replicatedPortfolios.push({
          userId: prev.userId,
          user: prev.user,
          allocationModel: prev.allocationModel,
          stocks: prev.stocks,
          replicated: true,
          replicatedFrom: prevCycle.label,
        });
      }
    }
  }

  // Combine: current portfolios + replicated
  const allEntries = [
    ...portfolios.map((p) => ({
      userId: p.userId,
      user: p.user,
      allocationModel: p.allocationModel,
      stocks: p.stocks,
      replicated: false as const,
      replicatedFrom: null as string | null,
    })),
    ...replicatedPortfolios,
  ];

  if (allEntries.length === 0) {
    return {
      cycleId: cycle.id,
      cycleLabel: cycle.label,
      ranking: [],
      stockPrices: {} as Record<string, { open: number; close: number; variation: number }>,
      ibovReturn: 0,
      benchmarkReturns: {} as Record<string, number>,
    };
  }

  // Collect all unique tickers
  const allTickers = [
    ...new Set(allEntries.flatMap((p) => p.stocks.map((s) => s.ticker))),
  ];

  // Fetch everything in parallel
  const [refPrices, livePrices, benchmarks, ibovReturn] = await Promise.all([
    getReferencePrices(cycle.id, cycle.month, cycle.year, allTickers),
    fetchLivePrices(allTickers),
    fetchLiveBenchmarks(),
    fetchLiveIbovReturn(),
  ]);

  // Calculate live return for each portfolio
  const ranked = allEntries
    .map((entry) => {
      let stockReturn = 0;
      let stockCount = 0;

      for (const stock of entry.stocks) {
        const ref = refPrices[stock.ticker];
        const live = livePrices[stock.ticker];

        if (ref && live && ref > 0) {
          stockReturn += (live.price - ref) / ref;
          stockCount++;
        }
      }

      const avgStockReturn = stockCount > 0 ? stockReturn / stockCount : 0;

      const weights =
        ALLOCATION_WEIGHTS[entry.allocationModel] ?? ALLOCATION_WEIGHTS[4];
      let totalReturn = (weights.acoes ?? 1) * avgStockReturn;

      for (const [key, weight] of Object.entries(weights)) {
        if (key === "acoes" || weight === 0) continue;
        totalReturn += weight * (benchmarks[key] ?? 0);
      }

      return {
        userId: entry.userId,
        name: entry.user.name,
        curso: entry.user.curso,
        sala: entry.user.sala,
        allocationModel: entry.allocationModel,
        allocationLabel: modelLabels[entry.allocationModel] ?? "---",
        returnMonth: totalReturn,
        stocks: [...entry.stocks]
          .sort((a, b) => a.position - b.position)
          .map((s) => s.ticker),
        replicated: entry.replicated,
        replicatedFrom: entry.replicatedFrom,
      };
    })
    .sort((a, b) => b.returnMonth - a.returnMonth)
    .map((entry, index) => ({ rank: index + 1, ...entry }));

  // Build stock prices map
  const stockPrices: Record<string, { open: number; close: number; variation: number }> = {};
  for (const ticker of allTickers) {
    const ref = refPrices[ticker];
    const live = livePrices[ticker];
    if (ref && live) {
      stockPrices[ticker] = {
        open: ref,
        close: live.price,
        variation: ref > 0 ? (live.price - ref) / ref : 0,
      };
    }
  }

  return { cycleId: cycle.id, cycleLabel: cycle.label, ranking: ranked, stockPrices, ibovReturn, benchmarkReturns: benchmarks };
}

// ─── GET /api/ranking/live?cycleId=<optional> ───────────────────────────────

export async function GET(request: NextRequest) {
  try {
    const requestedCycleId = request.nextUrl.searchParams.get("cycleId");

    // Get all cycles for the selector
    const allCycles = await db.query.cycles.findMany({
      orderBy: [desc(schema.cycles.year), desc(schema.cycles.month)],
    });

    if (allCycles.length === 0) {
      return NextResponse.json({
        live: false,
        message: "Nenhum ciclo encontrado",
        ranking: [],
        cycles: [],
      });
    }

    // Determine which cycle to show live ranking for
    let cycle: typeof allCycles[0] | undefined;

    if (requestedCycleId) {
      // Specific cycle requested
      cycle = allCycles.find((c) => c.id === requestedCycleId);
    } else {
      // Default: current open/closed cycle, or most recent liquidated
      cycle = allCycles.find((c) => c.status !== "liquidated") ?? allCycles[0];
    }

    if (!cycle) {
      return NextResponse.json({
        live: false,
        message: "Ciclo não encontrado",
        ranking: [],
        cycles: allCycles.map((c) => ({ id: c.id, label: c.label, status: c.status })),
      });
    }

    const result = await calculateLiveRanking(cycle);

    return NextResponse.json({
      live: true,
      ...result,
      cycles: allCycles.map((c) => ({ id: c.id, label: c.label, status: c.status })),
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[LiveRanking] Error:", error);
    return NextResponse.json(
      { error: "Erro ao calcular ranking live" },
      { status: 500 }
    );
  }
}
