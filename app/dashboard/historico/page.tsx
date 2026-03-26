import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db, schema } from "@/lib/db";
import { eq, and, desc, asc } from "drizzle-orm";
import { formatPercent } from "@/lib/utils";
import {
  History,
  TrendingUp,
  TrendingDown,
  Minus,
  Trophy,
  Shield,
  Flame,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";

const modelConfig: Record<
  number,
  { label: string; color: string; bg: string; icon: typeof Shield }
> = {
  1: { label: "Conservador", color: "text-blue-600", bg: "bg-blue-50", icon: Shield },
  2: { label: "Moderado", color: "text-emerald-600", bg: "bg-emerald-50", icon: TrendingUp },
  3: { label: "Arrojado", color: "text-orange-600", bg: "bg-orange-50", icon: Flame },
  4: { label: "Agressivo", color: "text-red-600", bg: "bg-red-50", icon: Zap },
};

function ReturnDisplay({ value, size = "sm" }: { value: number | null; size?: "sm" | "lg" }) {
  if (value === null) return <span className="text-[#D9D7D2]">—</span>;
  const textSize = size === "lg" ? "text-lg" : "text-xs";
  const iconSize = size === "lg" ? "h-4 w-4" : "h-3 w-3";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 font-mono tabular-nums font-semibold",
        textSize,
        value > 0
          ? "text-[#16A34A]"
          : value < 0
            ? "text-[#DC2626]"
            : "text-[#9CA3AF]"
      )}
    >
      {value > 0 ? (
        <TrendingUp className={iconSize} />
      ) : value < 0 ? (
        <TrendingDown className={iconSize} />
      ) : (
        <Minus className={iconSize} />
      )}
      {formatPercent(value)}
    </span>
  );
}

export default async function HistoricoPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  // Fetch all user's portfolios across liquidated cycles
  const portfolios = await db.query.portfolios.findMany({
    where: eq(schema.portfolios.userId, session.id),
    with: {
      cycle: true,
      stocks: { orderBy: asc(schema.portfolioStocks.position) },
    },
  });

  // Only show liquidated cycles
  const liquidated = portfolios
    .filter((p) => p.cycle.status === "liquidated" && p.returnMonth !== null)
    .sort((a, b) => {
      if (b.cycle.year !== a.cycle.year) return b.cycle.year - a.cycle.year;
      return b.cycle.month - a.cycle.month;
    });

  // Get total participants per cycle for rank context
  const cycleIds = [...new Set(liquidated.map((p) => p.cycleId))];
  const totalPerCycle: Record<string, number> = {};
  for (const cid of cycleIds) {
    const all = await db.query.portfolios.findMany({
      where: eq(schema.portfolios.cycleId, cid),
    });
    totalPerCycle[cid] = all.length;
  }

  const latestAccum = liquidated[0]?.returnAccum ?? null;

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-8">
        <h1 className="font-heading text-2xl font-bold text-[#1A1A1A]">
          Histórico
        </h1>
        <p className="mt-1 text-sm text-[#9CA3AF]">
          Acompanhe a performance das suas carteiras ao longo dos meses
        </p>
      </div>

      {liquidated.length === 0 ? (
        <div className="rounded-2xl border border-[#E8E6E1] bg-white p-12 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#F5F4F0]">
            <History className="h-6 w-6 text-[#C6AD7C]" />
          </div>
          <h3 className="font-heading text-lg font-semibold text-[#1A1A1A]">
            Sem histórico ainda
          </h3>
          <p className="mt-2 text-sm text-[#9CA3AF] max-w-md mx-auto">
            Seu histórico de carteiras e performance aparecerá aqui após a
            liquidação do primeiro ciclo.
          </p>
        </div>
      ) : (
        <>
          {/* Summary card */}
          <div className="mb-6 grid grid-cols-2 gap-3">
            <div className="rounded-2xl border border-[#E8E6E1] bg-white p-5">
              <p className="text-[10px] text-[#9CA3AF] uppercase tracking-wider mb-2">
                Retorno acumulado
              </p>
              <ReturnDisplay value={latestAccum} size="lg" />
            </div>
            <div className="rounded-2xl border border-[#E8E6E1] bg-white p-5">
              <p className="text-[10px] text-[#9CA3AF] uppercase tracking-wider mb-2">
                Ciclos participados
              </p>
              <p className="text-lg font-heading font-bold text-[#1A1A1A]">
                {liquidated.length}
              </p>
            </div>
          </div>

          {/* Cycles timeline */}
          <div className="space-y-3">
            {liquidated.map((p) => {
              const model = modelConfig[p.allocationModel];
              const ModelIcon = model?.icon ?? Shield;
              const vsIbov =
                p.returnMonth !== null && p.cycle.ibovReturn !== null
                  ? p.returnMonth - p.cycle.ibovReturn
                  : null;
              const total = totalPerCycle[p.cycleId] ?? 0;
              const beatIbov = vsIbov !== null && vsIbov > 0;

              return (
                <div
                  key={p.id}
                  className="rounded-2xl border border-[#E8E6E1] bg-white overflow-hidden"
                >
                  {/* Cycle header */}
                  <div className="flex items-center justify-between px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div
                        className={cn(
                          "flex h-10 w-10 items-center justify-center rounded-xl",
                          model?.bg ?? "bg-gray-50"
                        )}
                      >
                        <ModelIcon
                          className={cn(
                            "h-4 w-4",
                            model?.color ?? "text-gray-500"
                          )}
                        />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-[#1A1A1A]">
                          {p.cycle.label}
                        </p>
                        <p className="text-[10px] text-[#9CA3AF] mt-0.5">
                          {model?.label ?? "—"} ·{" "}
                          {p.rank && total > 0 ? (
                            <span className="font-mono">
                              {p.rank}º de {total}
                            </span>
                          ) : (
                            "—"
                          )}
                        </p>
                      </div>
                    </div>

                    <div className="text-right">
                      <ReturnDisplay value={p.returnMonth} />
                      <div className="mt-1 flex items-center justify-end gap-1.5">
                        <span className="text-[9px] text-[#9CA3AF]">
                          vs IBOV
                        </span>
                        {vsIbov !== null ? (
                          <span
                            className={cn(
                              "text-[10px] font-mono font-semibold tabular-nums",
                              beatIbov ? "text-[#16A34A]" : "text-[#DC2626]"
                            )}
                          >
                            {formatPercent(vsIbov)}
                          </span>
                        ) : (
                          <span className="text-[10px] text-[#D9D7D2]">—</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Stocks */}
                  <div className="border-t border-[#E8E6E1]/50 px-5 py-3 bg-[#FAFAF8]/50">
                    <div className="flex flex-wrap gap-1.5">
                      {p.stocks.map((s) => (
                        <span
                          key={s.id}
                          className="rounded-md bg-white border border-[#E8E6E1] px-2 py-0.5 text-[10px] font-mono font-medium text-[#5C5C5C]"
                        >
                          {s.ticker}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
