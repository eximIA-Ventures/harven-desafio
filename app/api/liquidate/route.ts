import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db, schema } from "@/lib/db";
import { eq, desc, and, asc } from "drizzle-orm";
import {
  ALLOCATION_WEIGHTS,
  BENCHMARK_TICKERS,
  CDI_MONTHLY_RATE,
} from "@/lib/allocation-weights";

async function fetchMonthlyPrices(
  tickers: string[]
): Promise<Record<string, { open: number; close: number; variation: number }>> {
  const results: Record<string, { open: number; close: number; variation: number }> = {};

  try {
    const res = await fetch(
      "https://brapi.dev/api/quote/list?limit=120&sortBy=market_cap_basic&sortOrder=desc"
    );
    if (!res.ok) throw new Error("brapi failed");

    const data = await res.json();
    const tickerSet = new Set(tickers);

    for (const s of data.stocks || []) {
      if (tickerSet.has(s.stock) && s.close) {
        const close = s.close;
        const changePercent = s.change ?? 0;
        const open = close / (1 + changePercent / 100);
        const variation = changePercent / 100;

        results[s.stock] = { open: parseFloat(open.toFixed(2)), close, variation };
      }
    }
  } catch (error) {
    console.error("Failed to fetch prices from brapi:", error);
  }

  return results;
}

async function fetchBenchmarkReturns(): Promise<Record<string, number>> {
  const returns: Record<string, number> = {};

  // CDI (computed from Selic)
  returns.rf = CDI_MONTHLY_RATE;

  // Fetch ETF benchmarks from brapi
  const etfTickers = Object.values(BENCHMARK_TICKERS);
  try {
    const res = await fetch(
      `https://brapi.dev/api/quote/${etfTickers.join(",")}?range=1mo&interval=1mo`
    );
    if (res.ok) {
      const data = await res.json();
      for (const result of data.results ?? []) {
        const ticker = result.symbol;
        const key = Object.entries(BENCHMARK_TICKERS).find(([, v]) => v === ticker)?.[0];
        if (!key) continue;

        if (result.regularMarketChangePercent != null) {
          returns[key] = result.regularMarketChangePercent / 100;
        } else {
          const hist = result.historicalDataPrice;
          if (hist && hist.length >= 2) {
            const open = hist[0].open;
            const close = hist[hist.length - 1].close;
            if (open && close) returns[key] = (close - open) / open;
          }
        }
      }
    }
  } catch (error) {
    console.error("Failed to fetch ETF benchmarks:", error);
  }

  // Fetch USD/BRL
  try {
    const res = await fetch("https://brapi.dev/api/v2/currency?currency=USD-BRL");
    if (res.ok) {
      const data = await res.json();
      const usd = data.currency?.[0];
      if (usd?.bidVariation) {
        returns.dolar = parseFloat(usd.bidVariation) / 100;
      }
    }
  } catch (error) {
    console.error("Failed to fetch USD/BRL:", error);
  }

  return returns;
}

async function fetchIbovReturn(): Promise<number> {
  try {
    const res = await fetch(
      "https://brapi.dev/api/quote/%5EBVSP?range=1mo&interval=1mo"
    );
    if (!res.ok) throw new Error("brapi IBOV failed");

    const data = await res.json();
    const result = data.results?.[0];

    if (result?.regularMarketChangePercent != null) {
      return result.regularMarketChangePercent / 100;
    }

    const hist = result?.historicalDataPrice;
    if (hist && hist.length >= 2) {
      const open = hist[0].open;
      const close = hist[hist.length - 1].close;
      if (open && close) return (close - open) / open;
    }

    return 0;
  } catch (error) {
    console.error("Failed to fetch IBOV return:", error);
    return 0;
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.type !== "admin") {
      return NextResponse.json({ error: "Acesso restrito" }, { status: 403 });
    }

    const body = await request.json();
    const { cycleId } = body;

    if (!cycleId) {
      return NextResponse.json({ error: "cycleId obrigatório" }, { status: 400 });
    }

    const cycle = await db.query.cycles.findFirst({
      where: eq(schema.cycles.id, cycleId),
    });

    if (!cycle) {
      return NextResponse.json({ error: "Ciclo não encontrado" }, { status: 404 });
    }

    if (cycle.status === "liquidated") {
      return NextResponse.json({ error: "Ciclo já liquidado" }, { status: 400 });
    }

    const portfolios = await db.query.portfolios.findMany({
      where: eq(schema.portfolios.cycleId, cycleId),
      with: { stocks: true },
    });

    if (portfolios.length === 0) {
      return NextResponse.json({ error: "Nenhuma carteira neste ciclo" }, { status: 400 });
    }

    // Collect all unique tickers
    const allTickers = new Set<string>();
    for (const p of portfolios) {
      for (const s of p.stocks) {
        allTickers.add(s.ticker);
      }
    }

    // Fetch stock prices + benchmark returns in parallel
    const [prices, benchmarks] = await Promise.all([
      fetchMonthlyPrices([...allTickers]),
      fetchBenchmarkReturns(),
    ]);

    // Save stock prices to DB
    for (const [ticker, priceData] of Object.entries(prices)) {
      await db
        .insert(schema.monthlyPrices)
        .values({
          ticker,
          cycleId,
          openPrice: priceData.open,
          closePrice: priceData.close,
          variation: priceData.variation,
        })
        .onConflictDoUpdate({
          target: [schema.monthlyPrices.ticker, schema.monthlyPrices.cycleId],
          set: {
            openPrice: priceData.open,
            closePrice: priceData.close,
            variation: priceData.variation,
            fetchedAt: new Date(),
          },
        });
    }

    // Save benchmark returns as special tickers (__CDI__, __GOLD11__, etc.)
    for (const [key, ret] of Object.entries(benchmarks)) {
      const benchmarkTicker = `__${key.toUpperCase()}__`;
      await db
        .insert(schema.monthlyPrices)
        .values({
          ticker: benchmarkTicker,
          cycleId,
          openPrice: 100,
          closePrice: parseFloat((100 * (1 + ret)).toFixed(4)),
          variation: parseFloat(ret.toFixed(6)),
        })
        .onConflictDoUpdate({
          target: [schema.monthlyPrices.ticker, schema.monthlyPrices.cycleId],
          set: {
            closePrice: parseFloat((100 * (1 + ret)).toFixed(4)),
            variation: parseFloat(ret.toFixed(6)),
            fetchedAt: new Date(),
          },
        });
    }

    // Calculate weighted return for each portfolio
    const returns: { portfolioId: string; returnMonth: number }[] = [];

    for (const portfolio of portfolios) {
      // Stock return: average of all 10 stocks
      let stockReturn = 0;
      let stockCount = 0;

      for (const stock of portfolio.stocks) {
        const price = prices[stock.ticker];
        if (price) {
          stockReturn += price.variation;
          stockCount++;
        }
      }

      const avgStockReturn = stockCount > 0 ? stockReturn / stockCount : 0;

      // Apply allocation model weights
      const weights = ALLOCATION_WEIGHTS[portfolio.allocationModel] ?? ALLOCATION_WEIGHTS[4];
      let totalReturn = (weights.acoes ?? 1) * avgStockReturn;

      for (const [key, weight] of Object.entries(weights)) {
        if (key === "acoes" || weight === 0) continue;
        totalReturn += weight * (benchmarks[key] ?? 0);
      }

      returns.push({ portfolioId: portfolio.id, returnMonth: totalReturn });
    }

    // Sort by return and assign ranks
    returns.sort((a, b) => b.returnMonth - a.returnMonth);

    // Get previous cycle for accumulation
    const prevCycle = await db.query.cycles.findFirst({
      where: eq(schema.cycles.status, "liquidated"),
      orderBy: [desc(schema.cycles.year), desc(schema.cycles.month)],
    });

    // Update portfolios with returns and ranks
    for (let i = 0; i < returns.length; i++) {
      const r = returns[i];

      let prevAccum = 0;
      if (prevCycle) {
        const prevPortfolio = await db.query.portfolios.findFirst({
          where: and(
            eq(schema.portfolios.cycleId, prevCycle.id),
            eq(
              schema.portfolios.userId,
              portfolios.find((p) => p.id === r.portfolioId)!.userId
            )
          ),
        });
        prevAccum = prevPortfolio?.returnAccum ?? 0;
      }

      const returnAccum = prevAccum + r.returnMonth;

      await db
        .update(schema.portfolios)
        .set({
          returnMonth: parseFloat(r.returnMonth.toFixed(6)),
          returnAccum: parseFloat(returnAccum.toFixed(6)),
          rank: i + 1,
        })
        .where(eq(schema.portfolios.id, r.portfolioId));
    }

    // Fetch IBOV return
    const ibovReturn = await fetchIbovReturn();

    // Update cycle status
    await db
      .update(schema.cycles)
      .set({
        status: "liquidated",
        ibovReturn: parseFloat(ibovReturn.toFixed(6)),
        liquidatedAt: new Date(),
      })
      .where(eq(schema.cycles.id, cycleId));

    return NextResponse.json({
      success: true,
      message: `Ciclo ${cycle.label} liquidado com sucesso`,
      portfoliosProcessed: returns.length,
      stocksPriced: Object.keys(prices).length,
      benchmarks,
      ibovReturn,
    });
  } catch (error) {
    console.error("Liquidation error:", error);
    return NextResponse.json({ error: "Erro na liquidação" }, { status: 500 });
  }
}
