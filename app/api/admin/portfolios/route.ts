import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db, schema } from "@/lib/db";
import { eq, desc, ne, asc } from "drizzle-orm";

export async function GET() {
  try {
    const session = await getSession();
    if (!session || session.type !== "admin") {
      return NextResponse.json({ error: "Acesso restrito" }, { status: 403 });
    }

    const cycle = await db.query.cycles.findFirst({
      orderBy: [desc(schema.cycles.year), desc(schema.cycles.month)],
    });

    if (!cycle) {
      return NextResponse.json({ portfolios: [], cycleLabel: null });
    }

    const portfolios = await db.query.portfolios.findMany({
      where: eq(schema.portfolios.cycleId, cycle.id),
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

    return NextResponse.json({ portfolios: data, cycleLabel: cycle.label });
  } catch {
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
