import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db, schema } from "@/lib/db";
import { eq, and, desc } from "drizzle-orm";
import { ensureCurrentCycle } from "@/lib/cycle-manager";

// GET — fetch user's portfolio for current open cycle
export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    // Ensure current month's cycle exists (auto-creates if needed)
    await ensureCurrentCycle();

    // Find current open cycle
    const openCycle = await db.query.cycles.findFirst({
      where: eq(schema.cycles.status, "open"),
      orderBy: [desc(schema.cycles.year), desc(schema.cycles.month)],
    });

    if (!openCycle) {
      return NextResponse.json({ portfolio: null, cycle: null });
    }

    // Find user's portfolio for this cycle
    const portfolio = await db.query.portfolios.findFirst({
      where: and(
        eq(schema.portfolios.userId, session.id),
        eq(schema.portfolios.cycleId, openCycle.id)
      ),
      with: { stocks: true },
    });

    return NextResponse.json({
      cycle: {
        id: openCycle.id,
        label: openCycle.label,
        deadline: openCycle.deadline,
        status: openCycle.status,
      },
      portfolio: portfolio
        ? {
            id: portfolio.id,
            allocationModel: portfolio.allocationModel,
            stocks: portfolio.stocks
              .sort((a, b) => a.position - b.position)
              .map((s) => s.ticker),
            submittedAt: portfolio.submittedAt,
            replicated: portfolio.replicated,
          }
        : null,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("Portfolio GET error:", msg, error);
    return NextResponse.json({ error: `Erro: ${msg}` }, { status: 500 });
  }
}

// POST — submit or update portfolio
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const body = await request.json();
    const { allocationModel, stocks } = body;

    // Validate
    if (!allocationModel || ![1, 2, 3, 4].includes(allocationModel)) {
      return NextResponse.json(
        { error: "Modelo de alocação inválido" },
        { status: 400 }
      );
    }

    if (!stocks || !Array.isArray(stocks) || stocks.length !== 10) {
      return NextResponse.json(
        { error: "Selecione exatamente 10 ações" },
        { status: 400 }
      );
    }

    // Check unique tickers
    const uniqueTickers = new Set(stocks);
    if (uniqueTickers.size !== 10) {
      return NextResponse.json(
        { error: "Ações não podem se repetir" },
        { status: 400 }
      );
    }

    // Find current open cycle
    const openCycle = await db.query.cycles.findFirst({
      where: eq(schema.cycles.status, "open"),
      orderBy: [desc(schema.cycles.year), desc(schema.cycles.month)],
    });

    if (!openCycle) {
      return NextResponse.json(
        { error: "Nenhum ciclo aberto no momento" },
        { status: 400 }
      );
    }

    // Check deadline
    if (new Date() > new Date(openCycle.deadline)) {
      return NextResponse.json(
        { error: "O prazo para este ciclo já encerrou" },
        { status: 400 }
      );
    }

    // Check if user already has a portfolio for this cycle
    const existing = await db.query.portfolios.findFirst({
      where: and(
        eq(schema.portfolios.userId, session.id),
        eq(schema.portfolios.cycleId, openCycle.id)
      ),
    });

    if (existing) {
      // Update existing: delete old stocks, update portfolio
      await db
        .delete(schema.portfolioStocks)
        .where(eq(schema.portfolioStocks.portfolioId, existing.id));

      await db
        .update(schema.portfolios)
        .set({
          allocationModel,
          submittedAt: new Date(),
          replicated: false,
        })
        .where(eq(schema.portfolios.id, existing.id));

      // Insert new stocks
      await db.insert(schema.portfolioStocks).values(
        stocks.map((ticker: string, i: number) => ({
          portfolioId: existing.id,
          ticker,
          position: i + 1,
        }))
      );

      return NextResponse.json({
        success: true,
        message: "Carteira atualizada com sucesso",
        portfolioId: existing.id,
        updated: true,
      });
    }

    // Create new portfolio
    const [portfolio] = await db
      .insert(schema.portfolios)
      .values({
        userId: session.id,
        cycleId: openCycle.id,
        allocationModel,
        submittedAt: new Date(),
      })
      .returning();

    // Insert stocks
    await db.insert(schema.portfolioStocks).values(
      stocks.map((ticker: string, i: number) => ({
        portfolioId: portfolio.id,
        ticker,
        position: i + 1,
      }))
    );

    return NextResponse.json({
      success: true,
      message: "Carteira enviada com sucesso",
      portfolioId: portfolio.id,
      updated: false,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("Portfolio POST error:", msg, error);
    return NextResponse.json({ error: `Erro: ${msg}` }, { status: 500 });
  }
}
