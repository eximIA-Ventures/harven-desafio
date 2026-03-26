import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db, schema } from "@/lib/db";
import { eq, count, desc, asc, sql } from "drizzle-orm";
import { formatPercent } from "@/lib/utils";
import {
  Users,
  CalendarClock,
  TrendingUp,
  Trophy,
  BarChart3,
  ArrowRight,
} from "lucide-react";
import Link from "next/link";
import { AdminRankingTable } from "@/components/desafio/admin-ranking-table";

export default async function AdminPage() {
  const session = await getSession();
  if (!session || session.type !== "admin") redirect("/login");

  // Stats
  const [userCount] = await db.select({ value: count() }).from(schema.users).where(eq(schema.users.type, "participant"));
  const [cycleCount] = await db.select({ value: count() }).from(schema.cycles);
  const [portfolioCount] = await db.select({ value: count() }).from(schema.portfolios);

  // Latest liquidated cycle
  const latestCycle = await db.query.cycles.findFirst({
    where: eq(schema.cycles.status, "liquidated"),
    orderBy: [desc(schema.cycles.year), desc(schema.cycles.month)],
  });

  // Current open cycle
  const openCycle = await db.query.cycles.findFirst({
    where: eq(schema.cycles.status, "open"),
    orderBy: [desc(schema.cycles.year), desc(schema.cycles.month)],
  });

  // Top 10 ranking
  let top10: { rank: number; name: string; curso: string | null; sala: string | null; returnMonth: number | null; allocationLabel: string; stocks: string[] }[] = [];
  let ibovReturn = 0;
  let stockPrices: Record<string, { open: number; close: number; variation: number }> = {};
  const modelLabels: Record<number, string> = { 1: "Conservador", 2: "Moderado", 3: "Arrojado", 4: "Agressivo" };

  if (latestCycle) {
    ibovReturn = latestCycle.ibovReturn ?? 0;
    const portfolios = await db.query.portfolios.findMany({
      where: eq(schema.portfolios.cycleId, latestCycle.id),
      orderBy: asc(schema.portfolios.rank),
      with: { user: true, stocks: true },
      limit: 10,
    });
    top10 = portfolios.map((p) => ({
      rank: p.rank ?? 0,
      name: p.user.name,
      curso: p.user.curso,
      sala: p.user.sala,
      returnMonth: p.returnMonth,
      allocationLabel: modelLabels[p.allocationModel] ?? "—",
      stocks: p.stocks.sort((a, b) => a.position - b.position).map((s) => s.ticker),
    }));

    // Fetch stock prices for modal
    const prices = await db.query.monthlyPrices.findMany({
      where: eq(schema.monthlyPrices.cycleId, latestCycle.id),
    });
    for (const p of prices) {
      stockPrices[p.ticker] = { open: p.openPrice, close: p.closePrice, variation: p.variation };
    }
  }

  // Most popular stocks (across all portfolios of latest cycle)
  let popularStocks: { ticker: string; count: number }[] = [];
  if (latestCycle) {
    const result = await db.execute(sql`
      SELECT ps.ticker, COUNT(*) as cnt
      FROM dc_portfolio_stocks ps
      JOIN dc_portfolios p ON ps.portfolio_id = p.id
      WHERE p.cycle_id = ${latestCycle.id}
      GROUP BY ps.ticker
      ORDER BY cnt DESC, ps.ticker
      LIMIT 15
    `);
    popularStocks = (result as unknown as { ticker: string; cnt: string }[]).map((r) => ({
      ticker: r.ticker,
      count: parseInt(r.cnt),
    }));
  }

  const maxVotes = Math.max(...popularStocks.map((s) => s.count), 1);

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="font-heading text-2xl font-bold text-[#1A1A1A]">
          Painel Administrativo
        </h1>
        <p className="mt-1 text-sm text-[#9CA3AF]">
          Visão geral do Desafio de Carteiras
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="rounded-2xl border border-[#E8E6E1] bg-white p-5">
          <Users className="h-5 w-5 text-[#C6AD7C] mb-2" />
          <p className="font-heading text-2xl font-bold text-[#1A1A1A]">{userCount.value}</p>
          <p className="text-[11px] text-[#9CA3AF] uppercase tracking-wider">Participantes</p>
        </div>
        <div className="rounded-2xl border border-[#E8E6E1] bg-white p-5">
          <CalendarClock className="h-5 w-5 text-[#C6AD7C] mb-2" />
          <p className="font-heading text-2xl font-bold text-[#1A1A1A]">{cycleCount.value}</p>
          <p className="text-[11px] text-[#9CA3AF] uppercase tracking-wider">Ciclos</p>
        </div>
        <div className="rounded-2xl border border-[#E8E6E1] bg-white p-5">
          <Trophy className="h-5 w-5 text-[#C6AD7C] mb-2" />
          <p className="font-heading text-2xl font-bold text-[#1A1A1A]">{portfolioCount.value}</p>
          <p className="text-[11px] text-[#9CA3AF] uppercase tracking-wider">Carteiras</p>
        </div>
        <div className="rounded-2xl border border-[#E8E6E1] bg-white p-5">
          <TrendingUp className="h-5 w-5 text-[#C6AD7C] mb-2" />
          <p className="font-heading text-2xl font-bold text-[#1A1A1A]">
            {ibovReturn ? formatPercent(ibovReturn) : "—"}
          </p>
          <p className="text-[11px] text-[#9CA3AF] uppercase tracking-wider">IBOV {latestCycle?.label ?? ""}</p>
        </div>
      </div>

      {/* Two columns: Ranking + Popular stocks */}
      <div className="grid md:grid-cols-5 gap-6 mb-8">
        {/* Ranking top 10 */}
        <div className="md:col-span-3">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-[#1A1A1A] uppercase tracking-wider">
              Top 10 — {latestCycle?.label ?? "Sem dados"}
            </h2>
            <Link
              href="/admin/ranking"
              className="inline-flex items-center gap-1 text-[11px] text-[#C6AD7C] hover:text-[#B59C6B] transition-colors"
            >
              Ver completo
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          {top10.length === 0 ? (
            <div className="rounded-2xl border border-[#E8E6E1] bg-white p-10 text-center">
              <Trophy className="mx-auto h-6 w-6 text-[#D9D7D2] mb-2" />
              <p className="text-sm text-[#9CA3AF]">Nenhum ciclo liquidado</p>
            </div>
          ) : (
            <AdminRankingTable
              entries={top10}
              ibovReturn={ibovReturn}
              cycleLabel={latestCycle?.label ?? ""}
              stockPrices={stockPrices}
            />
          )}
        </div>

        {/* Popular stocks */}
        <div className="md:col-span-2">
          <h2 className="text-sm font-semibold text-[#1A1A1A] uppercase tracking-wider mb-4">
            Papéis mais escolhidos
          </h2>

          {popularStocks.length === 0 ? (
            <div className="rounded-2xl border border-[#E8E6E1] bg-white p-10 text-center">
              <BarChart3 className="mx-auto h-6 w-6 text-[#D9D7D2] mb-2" />
              <p className="text-sm text-[#9CA3AF]">Sem dados</p>
            </div>
          ) : (
            <div className="rounded-2xl border border-[#E8E6E1] bg-white p-5 space-y-3">
              {popularStocks.map((stock, i) => {
                const barWidth = (stock.count / maxVotes) * 100;
                return (
                  <div key={stock.ticker}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-[#9CA3AF] w-4 tabular-nums">{i + 1}</span>
                        <span className="text-sm font-mono font-semibold text-[#1A1A1A] tracking-wide">{stock.ticker}</span>
                      </div>
                      <span className="text-[11px] text-[#9CA3AF]">{stock.count}×</span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-[#F5F4F0] overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-[#C6AD7C] to-[#B59C6B]"
                        style={{ width: `${barWidth}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Quick links */}
      <div className="grid md:grid-cols-3 gap-4">
        <Link href="/admin/ranking" className="group rounded-2xl border border-[#E8E6E1] bg-white p-5 transition-all hover:border-[#C6AD7C]/30 hover:shadow-[0_4px_20px_rgba(0,0,0,0.04)]">
          <Trophy className="h-5 w-5 text-[#C6AD7C] mb-2" />
          <p className="text-sm font-semibold text-[#1A1A1A]">Ranking Completo</p>
          <p className="text-[11px] text-[#9CA3AF] mt-0.5">Visualizar e exportar imagem do top 10</p>
        </Link>
        <Link href="/admin/participantes" className="group rounded-2xl border border-[#E8E6E1] bg-white p-5 transition-all hover:border-[#C6AD7C]/30 hover:shadow-[0_4px_20px_rgba(0,0,0,0.04)]">
          <Users className="h-5 w-5 text-[#C6AD7C] mb-2" />
          <p className="text-sm font-semibold text-[#1A1A1A]">Participantes</p>
          <p className="text-[11px] text-[#9CA3AF] mt-0.5">{userCount.value} cadastrados</p>
        </Link>
        <Link href="/admin/ciclos" className="group rounded-2xl border border-[#E8E6E1] bg-white p-5 transition-all hover:border-[#C6AD7C]/30 hover:shadow-[0_4px_20px_rgba(0,0,0,0.04)]">
          <CalendarClock className="h-5 w-5 text-[#C6AD7C] mb-2" />
          <p className="text-sm font-semibold text-[#1A1A1A]">Ciclos Mensais</p>
          <p className="text-[11px] text-[#9CA3AF] mt-0.5">{openCycle ? `${openCycle.label} aberto` : "Gerenciar ciclos"}</p>
        </Link>
      </div>
    </div>
  );
}
