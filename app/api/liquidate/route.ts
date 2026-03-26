import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db, schema } from "@/lib/db";
import { eq, desc, and, asc } from "drizzle-orm";

// Allocation model returns (simplified monthly estimates based on benchmarks)
const ALLOCATION_RETURNS: Record<number, Record<string, number>> = {
  // Model 1: Conservador (70% RF, 10% Ouro, 10% Dolar, 5% Cripto, 5% EUA)
  1: { rf: 0.70, ouro: 0.10, dolar: 0.10, cripto: 0.05, eua: 0.05, china: 0 },
  // Model 2: Moderado (50% RF, 15% Ouro, 15% Dolar, 10% Cripto, 5% EUA, 5% China)
  2: { rf: 0.50, ouro: 0.15, dolar: 0.15, cripto: 0.10, eua: 0.05, china: 0.05 },
  // Model 3: Arrojado (30% RF, 20% Ouro, 20% Dolar, 15% Cripto, 10% EUA, 5% China)
  3: { rf: 0.30, ouro: 0.20, dolar: 0.20, cripto: 0.15, eua: 0.10, china: 0.05 },
  // Model 4: Agressivo (10% RF, 20% Ouro, 20% Dolar, 20% Cripto, 15% EUA, 15% China)
  4: { rf: 0.10, ouro: 0.20, dolar: 0.20, cripto: 0.20, eua: 0.15, china: 0.15 },
};

async function fetchMonthlyPrices(
  tickers: string[]
): Promise<Record<string, { open: number; close: number; variation: number }>> {
  const results: Record<string, { open: number; close: number; variation: number }> = {};

  // Fetch from brapi in batches of 20 (free endpoint quote/list has all)
  try {
    const res = await fetch(
      "https://brapi.dev/api/quote/list?limit=120&sortBy=market_cap_basic&sortOrder=desc"
    );
    if (!res.ok) throw new Error("brapi failed");

    const data = await res.json();
    const tickerSet = new Set(tickers);

    for (const s of data.stocks || []) {
      if (tickerSet.has(s.stock) && s.close) {
        // Use close as current, and calculate open from change%
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

    // Get cycle
    const cycle = await db.query.cycles.findFirst({
      where: eq(schema.cycles.id, cycleId),
    });

    if (!cycle) {
      return NextResponse.json({ error: "Ciclo não encontrado" }, { status: 404 });
    }

    if (cycle.status === "liquidated") {
      return NextResponse.json({ error: "Ciclo já liquidado" }, { status: 400 });
    }

    // Get all portfolios for this cycle
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

    // Fetch prices
    const prices = await fetchMonthlyPrices([...allTickers]);

    // Save prices to DB
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

    // Calculate return for each portfolio
    const returns: { portfolioId: string; returnMonth: number }[] = [];

    for (const portfolio of portfolios) {
      // Stock return: average of all 10 stocks' variations
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

      // For simplicity in this version, the total return IS the stock return
      // The allocation model affects how much weight goes to stocks vs other assets
      // In a full implementation, we'd also fetch gold, USD, BTC, S&P, SSE returns
      const totalReturn = avgStockReturn;

      returns.push({ portfolioId: portfolio.id, returnMonth: totalReturn });
    }

    // Sort by return and assign ranks
    returns.sort((a, b) => b.returnMonth - a.returnMonth);

    // Get previous cycle for accumulation
    const prevCycle = await db.query.cycles.findFirst({
      where: and(
        eq(schema.cycles.status, "liquidated"),
      ),
      orderBy: [desc(schema.cycles.year), desc(schema.cycles.month)],
    });

    // Update portfolios with returns and ranks
    for (let i = 0; i < returns.length; i++) {
      const r = returns[i];

      // Get previous accumulated return
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

    // Fetch IBOV return automatically
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
      ibovReturn,
    });
  } catch (error) {
    console.error("Liquidation error:", error);
    return NextResponse.json({ error: "Erro na liquidação" }, { status: 500 });
  }
}
