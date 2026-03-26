import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { eq, asc, desc } from "drizzle-orm";

export async function GET(request: NextRequest) {
  try {
    const cycleId = request.nextUrl.searchParams.get("cycleId");

    const cycles = await db.query.cycles.findMany({
      where: eq(schema.cycles.status, "liquidated"),
      orderBy: [desc(schema.cycles.year), desc(schema.cycles.month)],
    });

    if (cycles.length === 0) {
      return NextResponse.json({ cycles: [], ranking: [], ibovReturn: 0, stockPrices: {} });
    }

    const targetCycle = cycleId
      ? cycles.find((c) => c.id === cycleId) ?? cycles[0]
      : cycles[0];

    // Get portfolios
    const portfolios = await db.query.portfolios.findMany({
      where: eq(schema.portfolios.cycleId, targetCycle.id),
      orderBy: asc(schema.portfolios.rank),
      with: { user: true, stocks: true },
    });

    // Get monthly prices for this cycle
    const prices = await db.query.monthlyPrices.findMany({
      where: eq(schema.monthlyPrices.cycleId, targetCycle.id),
    });

    const stockPrices: Record<string, { open: number; close: number; variation: number }> = {};
    for (const p of prices) {
      stockPrices[p.ticker] = {
        open: p.openPrice,
        close: p.closePrice,
        variation: p.variation,
      };
    }

    const modelLabels: Record<number, string> = {
      1: "Conservador", 2: "Moderado", 3: "Arrojado", 4: "Agressivo",
    };

    const ranking = portfolios.map((p) => ({
      rank: p.rank ?? 0,
      name: p.user.name,
      curso: p.user.curso,
      sala: p.user.sala,
      returnMonth: p.returnMonth,
      returnAccum: p.returnAccum,
      allocationModel: p.allocationModel,
      allocationLabel: modelLabels[p.allocationModel] ?? "—",
      stocks: p.stocks
        .sort((a, b) => a.position - b.position)
        .map((s) => s.ticker),
    }));

    return NextResponse.json({
      cycles: cycles.map((c) => ({ id: c.id, label: c.label })),
      currentCycleId: targetCycle.id,
      currentCycleLabel: targetCycle.label,
      ibovReturn: targetCycle.ibovReturn ?? 0,
      ranking,
      stockPrices,
    });
  } catch (error) {
    console.error("Ranking API error:", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
