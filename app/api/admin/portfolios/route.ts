import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db, schema } from "@/lib/db";
import { eq, desc, asc } from "drizzle-orm";

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.type !== "admin") {
      return NextResponse.json({ error: "Acesso restrito" }, { status: 403 });
    }

    const cycleId = request.nextUrl.searchParams.get("cycleId");

    // Get all cycles for the selector
    const allCycles = await db.query.cycles.findMany({
      orderBy: [desc(schema.cycles.year), desc(schema.cycles.month)],
    });

    if (allCycles.length === 0) {
      return NextResponse.json({ portfolios: [], cycles: [], currentCycleId: null });
    }

    const targetCycle = cycleId
      ? allCycles.find((c) => c.id === cycleId) ?? allCycles[0]
      : allCycles[0];

    const portfolios = await db.query.portfolios.findMany({
      where: eq(schema.portfolios.cycleId, targetCycle.id),
      with: { user: true, stocks: true },
      orderBy: asc(schema.portfolios.submittedAt),
    });

    const data = portfolios.map((p) => ({
      userId: p.userId,
      name: p.user.name,
      curso: p.user.curso,
      sala: p.user.sala,
      allocationModel: p.allocationModel,
      stocks: p.stocks.sort((a, b) => a.position - b.position).map((s) => s.ticker),
    }));

    return NextResponse.json({
      portfolios: data,
      currentCycleId: targetCycle.id,
      currentCycleLabel: targetCycle.label,
      cycles: allCycles.map((c) => ({ id: c.id, label: c.label, status: c.status })),
    });
  } catch {
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
