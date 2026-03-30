"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { PortfolioModal } from "./portfolio-modal";

type Entry = {
  rank: number;
  name: string;
  curso: string | null;
  sala: string | null;
  returnMonth: number | null;
  allocationModel: number;
  allocationLabel: string;
  stocks: string[];
};

type StockPrice = { open: number; close: number; variation: number };

function fmt(v: number | null) {
  if (v === null) return "—";
  return `${v >= 0 ? "+" : ""}${(v * 100).toFixed(2)}%`;
}

function ReturnBadge({ value }: { value: number | null }) {
  if (value === null) return <span className="text-[#D9D7D2]">—</span>;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-xs font-mono tabular-nums font-semibold",
        value > 0
          ? "text-[#16A34A]"
          : value < 0
            ? "text-[#DC2626]"
            : "text-[#9CA3AF]"
      )}
    >
      {value > 0 ? (
        <TrendingUp className="h-3 w-3" />
      ) : value < 0 ? (
        <TrendingDown className="h-3 w-3" />
      ) : (
        <Minus className="h-3 w-3" />
      )}
      {fmt(value)}
    </span>
  );
}

export function AdminRankingTable({
  entries,
  ibovReturn,
  cycleLabel,
  stockPrices,
}: {
  entries: Entry[];
  ibovReturn: number;
  cycleLabel: string;
  stockPrices: Record<string, StockPrice>;
}) {
  const [selected, setSelected] = useState<Entry | null>(null);

  return (
    <>
      <div className="overflow-hidden rounded-2xl border border-[#E8E6E1] bg-white">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[#E8E6E1] bg-[#FAFAF8]">
              <th className="px-5 py-3 text-left text-[10px] font-medium uppercase tracking-wider text-[#9CA3AF] w-12">
                #
              </th>
              <th className="px-5 py-3 text-left text-[10px] font-medium uppercase tracking-wider text-[#9CA3AF]">
                Participante
              </th>
              <th className="px-5 py-3 text-right text-[10px] font-medium uppercase tracking-wider text-[#9CA3AF]">
                Rent. Mês
              </th>
              <th className="px-5 py-3 text-right text-[10px] font-medium uppercase tracking-wider text-[#9CA3AF]">
                vs IBOV
              </th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) => {
              const vsIbov =
                entry.returnMonth !== null
                  ? entry.returnMonth - ibovReturn
                  : null;
              return (
                <tr
                  key={entry.rank}
                  onClick={() => setSelected(entry)}
                  className={cn(
                    "border-b border-[#E8E6E1]/50 cursor-pointer transition-colors hover:bg-[#FAFAF8]",
                    entry.rank <= 3 && "bg-[#FAFAF8]/40"
                  )}
                >
                  <td className="px-5 py-3.5 text-center">
                    {entry.rank <= 3 ? (
                      <div
                        className={cn(
                          "inline-flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-bold text-white",
                          entry.rank === 1
                            ? "bg-gradient-to-br from-[#C6AD7C] to-[#B59C6B]"
                            : entry.rank === 2
                              ? "bg-gradient-to-br from-[#A0A0A0] to-[#888]"
                              : "bg-gradient-to-br from-[#CD7F32] to-[#B87333]"
                        )}
                      >
                        {entry.rank}
                      </div>
                    ) : (
                      <span className="text-xs text-[#9CA3AF] tabular-nums">
                        {entry.rank}
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-3.5">
                    <p
                      className={cn(
                        "text-sm",
                        entry.rank <= 3
                          ? "font-semibold text-[#1A1A1A]"
                          : "text-[#5C5C5C]"
                      )}
                    >
                      {entry.name}
                    </p>
                    <p className="text-[10px] text-[#9CA3AF] mt-0.5 font-mono">
                      {entry.stocks.slice(0, 5).join(", ")}…
                    </p>
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <ReturnBadge value={entry.returnMonth} />
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <ReturnBadge value={vsIbov} />
                  </td>
                </tr>
              );
            })}
            <tr className="bg-[#F5F4F0] border-t border-[#E8E6E1]">
              <td className="px-5 py-3 text-center">
                <span className="text-[10px] text-[#9CA3AF]">—</span>
              </td>
              <td className="px-5 py-3">
                <span className="text-sm italic text-[#9CA3AF]">
                  IBOV (referência)
                </span>
              </td>
              <td className="px-5 py-3 text-right text-xs font-mono tabular-nums text-[#9CA3AF]">
                {fmt(ibovReturn)}
              </td>
              <td className="px-5 py-3 text-right text-xs text-[#9CA3AF]">
                —
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <p className="mt-2 text-center text-[10px] text-[#D9D7D2]">
        Clique em um participante para ver a carteira
      </p>

      {selected && (
        <PortfolioModal
          data={selected}
          ibovReturn={ibovReturn}
          cycleLabel={cycleLabel}
          stockPrices={stockPrices}
          onClose={() => setSelected(null)}
        />
      )}
    </>
  );
}
