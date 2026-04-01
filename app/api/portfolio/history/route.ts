import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db, schema } from "@/lib/db";
import { eq, desc } from "drizzle-orm";

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const portfolios = await db.query.portfolios.findMany({
      where: eq(schema.portfolios.userId, session.id),
      with: {
        cycle: true,
        stocks: true,
      },
      orderBy: [desc(schema.portfolios.submittedAt)],
    });

    const history = portfolios.map((p) => ({
      cycleId: p.cycleId,
      cycleLabel: p.cycle.label,
      cycleStatus: p.cycle.status,
      allocationModel: p.allocationModel,
      stocks: p.stocks
        .sort((a, b) => a.position - b.position)
        .map((s) => s.ticker),
      submittedAt: p.submittedAt,
    }));

    return NextResponse.json({ history });
  } catch (error) {
    console.error("Portfolio history error:", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
