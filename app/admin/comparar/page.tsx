import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db, schema } from "@/lib/db";
import { eq, desc, ne, asc } from "drizzle-orm";
import { cn } from "@/lib/utils";
import {
  GitCompareArrows,
  Copy,
  TrendingUp,
  BarChart3,
} from "lucide-react";
import { PortfolioRing } from "@/components/desafio/portfolio-ring";

const modelLabels: Record<number, { label: string; color: string; bg: string; border: string }> = {
  1: { label: "Conservador", color: "text-blue-600", bg: "bg-blue-50", border: "border-blue-200" },
  2: { label: "Moderado", color: "text-emerald-600", bg: "bg-emerald-50", border: "border-emerald-200" },
  3: { label: "Arrojado", color: "text-orange-600", bg: "bg-orange-50", border: "border-orange-200" },
  4: { label: "Agressivo", color: "text-red-600", bg: "bg-red-50", border: "border-red-200" },
};

export default async function CompararPage() {
  const session = await getSession();
  if (!session || session.type !== "admin") redirect("/login");

  // Get current (or latest) cycle
  const cycle = await db.query.cycles.findFirst({
    orderBy: [desc(schema.cycles.year), desc(schema.cycles.month)],
  });

  if (!cycle) {
    return (
      <div className="max-w-5xl mx-auto">
        <h1 className="font-heading text-2xl font-bold text-[#1A1A1A]">Comparar Carteiras</h1>
        <p className="mt-2 text-sm text-[#9CA3AF]">Nenhum ciclo encontrado.</p>
      </div>
    );
  }

  const portfolios = await db.query.portfolios.findMany({
    where: eq(schema.portfolios.cycleId, cycle.id),
    with: { user: true, stocks: true },
    orderBy: asc(schema.portfolios.submittedAt),
  });

  // === Stock popularity ===
  const stockCount: Record<string, number> = {};
  for (const p of portfolios) {
    for (const s of p.stocks) {
      stockCount[s.ticker] = (stockCount[s.ticker] ?? 0) + 1;
    }
  }
  const stockRanking = Object.entries(stockCount)
    .sort((a, b) => b[1] - a[1]);
  const maxStockCount = stockRanking[0]?.[1] ?? 1;

  // === Model distribution ===
  const modelCount: Record<number, number> = {};
  for (const p of portfolios) {
    modelCount[p.allocationModel] = (modelCount[p.allocationModel] ?? 0) + 1;
  }

  // === Find duplicate/similar portfolios ===
  type PortfolioGroup = {
    stocks: string[];
    members: { name: string; model: number }[];
  };

  const groups: PortfolioGroup[] = [];
  const processed = new Set<string>();

  for (const p of portfolios) {
    const key = p.stocks
      .sort((a, b) => a.ticker.localeCompare(b.ticker))
      .map((s) => s.ticker)
      .join(",");

    if (processed.has(key)) continue;
    processed.add(key);

    const members = portfolios
      .filter((q) => {
        const qKey = q.stocks
          .sort((a, b) => a.ticker.localeCompare(b.ticker))
          .map((s) => s.ticker)
          .join(",");
        return qKey === key;
      })
      .map((q) => ({ name: q.user.name, model: q.allocationModel }));

    if (members.length > 1) {
      groups.push({
        stocks: key.split(","),
        members,
      });
    }
  }

  // === Similarity matrix (Jaccard) — find pairs with high overlap ===
  type SimilarPair = {
    userA: string;
    userB: string;
    overlap: string[];
    similarity: number;
  };

  const similarPairs: SimilarPair[] = [];
  for (let i = 0; i < portfolios.length; i++) {
    const aStocks = new Set(portfolios[i].stocks.map((s) => s.ticker));
    for (let j = i + 1; j < portfolios.length; j++) {
      const bStocks = new Set(portfolios[j].stocks.map((s) => s.ticker));
      const overlap = [...aStocks].filter((t) => bStocks.has(t));
      const union = new Set([...aStocks, ...bStocks]);
      const similarity = overlap.length / union.size;
      if (overlap.length >= 5) {
        similarPairs.push({
          userA: portfolios[i].user.name,
          userB: portfolios[j].user.name,
          overlap,
          similarity,
        });
      }
    }
  }
  similarPairs.sort((a, b) => b.similarity - a.similarity);

  // === Unique stocks (only 1 person chose) ===
  const uniqueStocks = stockRanking.filter(([, cnt]) => cnt === 1);

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="font-heading text-2xl font-bold text-[#1A1A1A]">
          Comparar Carteiras
        </h1>
        <p className="mt-1 text-sm text-[#9CA3AF]">
          {cycle.label} · {portfolios.length} carteiras
        </p>
      </div>

      {/* Ring — interactive comparison */}
      <div className="mb-8">
        <PortfolioRing />
      </div>

      {/* Model distribution */}
      <div className="grid md:grid-cols-4 gap-3 mb-8">
        {[1, 2, 3, 4].map((m) => {
          const ml = modelLabels[m];
          const cnt = modelCount[m] ?? 0;
          const pct = portfolios.length > 0 ? ((cnt / portfolios.length) * 100).toFixed(0) : "0";
          return (
            <div key={m} className={cn("rounded-xl border p-4", ml.border, ml.bg)}>
              <p className={cn("text-[10px] font-medium uppercase tracking-wider mb-1", ml.color)}>
                {ml.label}
              </p>
              <p className="text-2xl font-bold text-[#1A1A1A]">
                {cnt}
                <span className="text-sm text-[#9CA3AF] font-normal ml-1">({pct}%)</span>
              </p>
            </div>
          );
        })}
      </div>

      <div className="grid md:grid-cols-2 gap-6 mb-8">
        {/* Stock popularity chart */}
        <div className="rounded-xl border border-[#E8E6E1] bg-white p-5">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="h-4 w-4 text-[#9CA3AF]" />
            <p className="text-xs font-medium uppercase tracking-wider text-[#9CA3AF]">
              Papéis mais selecionados
            </p>
          </div>
          <div className="space-y-2">
            {stockRanking.slice(0, 15).map(([ticker, cnt], i) => {
              const pct = (cnt / maxStockCount) * 100;
              const presence = ((cnt / portfolios.length) * 100).toFixed(0);
              return (
                <div key={ticker}>
                  <div className="flex items-center justify-between mb-0.5">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-[#D9D7D2] w-4 tabular-nums text-right">{i + 1}</span>
                      <span className="text-xs font-mono font-semibold text-[#1A1A1A]">{ticker}</span>
                    </div>
                    <span className="text-[10px] text-[#9CA3AF] tabular-nums">
                      {cnt}x ({presence}%)
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-[#F5F4F0] ml-6">
                    <div
                      className={cn(
                        "h-2 rounded-full",
                        pct === 100 ? "bg-[#C6AD7C]" : pct >= 50 ? "bg-[#16A34A]" : "bg-[#3B82F6]"
                      )}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
          {stockRanking.length > 15 && (
            <p className="text-[10px] text-[#D9D7D2] mt-3 ml-6">
              +{stockRanking.length - 15} papéis adicionais
            </p>
          )}
        </div>

        {/* Unique picks + stats */}
        <div className="space-y-6">
          {/* Quick stats */}
          <div className="rounded-xl border border-[#E8E6E1] bg-white p-5">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="h-4 w-4 text-[#9CA3AF]" />
              <p className="text-xs font-medium uppercase tracking-wider text-[#9CA3AF]">
                Estatísticas
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-2xl font-bold text-[#1A1A1A]">{stockRanking.length}</p>
                <p className="text-[10px] text-[#9CA3AF] uppercase tracking-wider">Papéis únicos</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-[#1A1A1A]">
                  {stockRanking.length > 0 ? (portfolios.length * 10 / stockRanking.length).toFixed(1) : "0"}x
                </p>
                <p className="text-[10px] text-[#9CA3AF] uppercase tracking-wider">Média seleções/papel</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-[#1A1A1A]">{uniqueStocks.length}</p>
                <p className="text-[10px] text-[#9CA3AF] uppercase tracking-wider">Escolhas exclusivas</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-[#1A1A1A]">
                  {stockRanking[0] ? `${((stockRanking[0][1] / portfolios.length) * 100).toFixed(0)}%` : "—"}
                </p>
                <p className="text-[10px] text-[#9CA3AF] uppercase tracking-wider">
                  {stockRanking[0]?.[0] ?? "—"} (mais popular)
                </p>
              </div>
            </div>
          </div>

          {/* Unique picks */}
          {uniqueStocks.length > 0 && (
            <div className="rounded-xl border border-[#E8E6E1] bg-white p-5">
              <p className="text-xs font-medium uppercase tracking-wider text-[#9CA3AF] mb-3">
                Apostas exclusivas (só 1 pessoa escolheu)
              </p>
              <div className="flex flex-wrap gap-1.5">
                {uniqueStocks.map(([ticker]) => (
                  <span
                    key={ticker}
                    className="inline-flex items-center rounded-md bg-[#F5F4F0] px-2 py-1 text-xs font-mono font-medium text-[#5C5C5C]"
                  >
                    {ticker}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Duplicate portfolios */}
      {groups.length > 0 && (
        <div className="rounded-xl border border-[#DC2626]/20 bg-[#DC2626]/[0.03] p-5 mb-8">
          <div className="flex items-center gap-2 mb-4">
            <Copy className="h-4 w-4 text-[#DC2626]" />
            <p className="text-xs font-medium uppercase tracking-wider text-[#DC2626]">
              Carteiras idênticas
            </p>
          </div>
          <div className="space-y-3">
            {groups.map((g, i) => (
              <div key={i} className="rounded-lg border border-[#DC2626]/10 bg-white p-4">
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {g.members.map((m) => {
                    const ml = modelLabels[m.model];
                    return (
                      <span key={m.name} className="text-sm font-medium text-[#1A1A1A]">
                        {m.name}
                        <span className={cn("ml-1 text-[9px] rounded-full px-1.5 py-0.5", ml?.bg, ml?.color)}>
                          {ml?.label}
                        </span>
                        <span className="text-[#D9D7D2] mx-1">·</span>
                      </span>
                    );
                  })}
                </div>
                <p className="text-[10px] text-[#9CA3AF] font-mono">
                  {g.stocks.join(" · ")}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Similar portfolios (high overlap) */}
      {similarPairs.length > 0 && (
        <div className="rounded-xl border border-[#E8E6E1] bg-white p-5 mb-8">
          <div className="flex items-center gap-2 mb-4">
            <GitCompareArrows className="h-4 w-4 text-[#9CA3AF]" />
            <p className="text-xs font-medium uppercase tracking-wider text-[#9CA3AF]">
              Carteiras similares (5+ papéis em comum)
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#E8E6E1]">
                  <th className="px-3 py-2 text-left text-[9px] font-medium uppercase tracking-wider text-[#9CA3AF]">
                    Participante A
                  </th>
                  <th className="px-3 py-2 text-left text-[9px] font-medium uppercase tracking-wider text-[#9CA3AF]">
                    Participante B
                  </th>
                  <th className="px-3 py-2 text-center text-[9px] font-medium uppercase tracking-wider text-[#9CA3AF]">
                    Em comum
                  </th>
                  <th className="px-3 py-2 text-center text-[9px] font-medium uppercase tracking-wider text-[#9CA3AF]">
                    Similaridade
                  </th>
                  <th className="px-3 py-2 text-left text-[9px] font-medium uppercase tracking-wider text-[#9CA3AF]">
                    Papéis compartilhados
                  </th>
                </tr>
              </thead>
              <tbody>
                {similarPairs.slice(0, 20).map((pair, i) => (
                  <tr key={i} className="border-b border-[#E8E6E1]/50 last:border-0">
                    <td className="px-3 py-2.5 text-sm text-[#1A1A1A]">{pair.userA}</td>
                    <td className="px-3 py-2.5 text-sm text-[#1A1A1A]">{pair.userB}</td>
                    <td className="px-3 py-2.5 text-center">
                      <span className={cn(
                        "text-xs font-bold tabular-nums",
                        pair.overlap.length >= 8 ? "text-[#DC2626]" : pair.overlap.length >= 6 ? "text-[#D97706]" : "text-[#5C5C5C]"
                      )}>
                        {pair.overlap.length}/10
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      <div className="w-16 mx-auto">
                        <div className="h-1.5 rounded-full bg-[#F5F4F0]">
                          <div
                            className={cn(
                              "h-1.5 rounded-full",
                              pair.similarity >= 0.8 ? "bg-[#DC2626]" : pair.similarity >= 0.5 ? "bg-[#D97706]" : "bg-[#3B82F6]"
                            )}
                            style={{ width: `${pair.similarity * 100}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-[10px] font-mono text-[#9CA3AF]">
                      {pair.overlap.join(", ")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
