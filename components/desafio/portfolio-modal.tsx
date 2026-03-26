"use client";

import { cn } from "@/lib/utils";
import { X, TrendingUp, TrendingDown, Minus, ExternalLink } from "lucide-react";
import { useEffect } from "react";

type PortfolioData = {
  rank: number;
  name: string;
  curso: string | null;
  sala: string | null;
  returnMonth: number | null;
  allocationLabel: string;
  stocks: string[];
};

type StockPrice = { open: number; close: number; variation: number };

function fmt(value: number | null): string {
  if (value === null) return "N/D";
  const sign = value >= 0 ? "+" : "";
  return `${sign}${(value * 100).toFixed(2)}%`;
}

export function PortfolioModal({
  data,
  ibovReturn,
  cycleLabel,
  stockPrices,
  onClose,
}: {
  data: PortfolioData;
  ibovReturn: number;
  cycleLabel: string;
  stockPrices: Record<string, StockPrice>;
  onClose: () => void;
}) {
  const vsIbov =
    data.returnMonth !== null ? data.returnMonth - ibovReturn : null;

  // Close on Escape
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose]);

  // Build stock items with prices
  const stockItems = data.stocks.map((ticker) => ({
    ticker,
    price: stockPrices[ticker] ?? null,
  }));

  // Sort by variation for best/worst
  const withVariation = stockItems.filter((s) => s.price !== null);
  const sorted = [...withVariation].sort(
    (a, b) => (b.price?.variation ?? 0) - (a.price?.variation ?? 0)
  );
  const best = sorted[0] ?? null;
  const worst = sorted[sorted.length - 1] ?? null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl border border-[#E8E6E1] bg-white shadow-2xl animate-[fade-in_0.15s_ease-out]">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-[#1A1A1A] px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className={cn(
                "flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold text-white",
                data.rank === 1
                  ? "bg-gradient-to-br from-[#C6AD7C] to-[#B59C6B]"
                  : data.rank === 2
                    ? "bg-gradient-to-br from-[#A0A0A0] to-[#888]"
                    : data.rank === 3
                      ? "bg-gradient-to-br from-[#CD7F32] to-[#B87333]"
                      : "bg-white/20"
              )}
            >
              {data.rank}
            </div>
            <div>
              <p className="text-base font-semibold text-white">{data.name}</p>
              <p className="text-[11px] text-white/50">
                {data.curso}
                {data.sala ? ` · Sala ${data.sala}` : ""} · {cycleLabel}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-white/50 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 border-b border-[#E8E6E1]">
          <div className="p-5 text-center border-r border-[#E8E6E1]">
            <p className="text-[9px] text-[#9CA3AF] uppercase tracking-wider mb-1.5">
              Rentabilidade
            </p>
            <p
              className={cn(
                "text-xl font-heading font-bold tabular-nums",
                data.returnMonth !== null && data.returnMonth > 0
                  ? "text-[#16A34A]"
                  : data.returnMonth !== null && data.returnMonth < 0
                    ? "text-[#DC2626]"
                    : "text-[#9CA3AF]"
              )}
            >
              {fmt(data.returnMonth)}
            </p>
          </div>
          <div className="p-5 text-center border-r border-[#E8E6E1]">
            <p className="text-[9px] text-[#9CA3AF] uppercase tracking-wider mb-1.5">
              vs IBOV
            </p>
            <p
              className={cn(
                "text-xl font-heading font-bold tabular-nums",
                vsIbov !== null && vsIbov > 0
                  ? "text-[#16A34A]"
                  : vsIbov !== null && vsIbov < 0
                    ? "text-[#DC2626]"
                    : "text-[#9CA3AF]"
              )}
            >
              {fmt(vsIbov)}
            </p>
          </div>
          <div className="p-5 text-center">
            <p className="text-[9px] text-[#9CA3AF] uppercase tracking-wider mb-1.5">
              Modelo
            </p>
            <p className="text-sm font-semibold text-[#1A1A1A]">
              {data.allocationLabel}
            </p>
          </div>
        </div>

        {/* Best / Worst */}
        {best && worst && best.price && worst.price && (
          <div className="grid grid-cols-2 border-b border-[#E8E6E1]">
            <div className="p-4 border-r border-[#E8E6E1] bg-[#16A34A]/[0.04]">
              <p className="text-[9px] text-[#16A34A] uppercase tracking-wider font-medium mb-1">
                Melhor papel
              </p>
              <div className="flex items-center justify-between">
                <span className="text-sm font-mono font-bold text-[#1A1A1A]">
                  {best.ticker}
                </span>
                <span className="text-sm font-mono font-bold text-[#16A34A] tabular-nums">
                  {fmt(best.price.variation)}
                </span>
              </div>
            </div>
            <div className="p-4 bg-[#DC2626]/[0.04]">
              <p className="text-[9px] text-[#DC2626] uppercase tracking-wider font-medium mb-1">
                Pior papel
              </p>
              <div className="flex items-center justify-between">
                <span className="text-sm font-mono font-bold text-[#1A1A1A]">
                  {worst.ticker}
                </span>
                <span className="text-sm font-mono font-bold text-[#DC2626] tabular-nums">
                  {fmt(worst.price.variation)}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Stocks table */}
        <div className="p-6">
          <p className="text-[10px] text-[#9CA3AF] uppercase tracking-wider mb-4">
            Composição da carteira
          </p>

          <div className="overflow-hidden rounded-xl border border-[#E8E6E1]">
            <table className="w-full">
              <thead>
                <tr className="bg-[#FAFAF8] border-b border-[#E8E6E1]">
                  <th className="px-3 py-2 text-left text-[9px] font-medium uppercase tracking-wider text-[#9CA3AF] w-8">
                    #
                  </th>
                  <th className="px-3 py-2 text-left text-[9px] font-medium uppercase tracking-wider text-[#9CA3AF]">
                    Ação
                  </th>
                  <th className="px-3 py-2 text-right text-[9px] font-medium uppercase tracking-wider text-[#9CA3AF]">
                    Início
                  </th>
                  <th className="px-3 py-2 text-right text-[9px] font-medium uppercase tracking-wider text-[#9CA3AF]">
                    Fim
                  </th>
                  <th className="px-3 py-2 text-right text-[9px] font-medium uppercase tracking-wider text-[#9CA3AF]">
                    Var.
                  </th>
                </tr>
              </thead>
              <tbody>
                {stockItems.map((item, i) => {
                  const v = item.price?.variation ?? null;
                  return (
                    <tr
                      key={item.ticker}
                      className="border-b border-[#E8E6E1]/50 last:border-0"
                    >
                      <td className="px-3 py-2.5 text-[10px] text-[#D9D7D2] tabular-nums">
                        {i + 1}
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-2">
                          <a
                            href={`https://investidor10.com.br/acoes/${item.ticker.toLowerCase()}/`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 hover:opacity-70 transition-opacity"
                          >
                            <img
                              src={`https://icons.brapi.dev/icons/${item.ticker}.svg`}
                              alt={item.ticker}
                              className="h-6 w-6 rounded-md object-contain bg-white border border-[#E8E6E1] p-0.5"
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display = "none";
                              }}
                            />
                            <span className="text-sm font-mono font-semibold text-[#1A1A1A] tracking-wide inline-flex items-center gap-1">
                              {item.ticker}
                              <ExternalLink className="h-2.5 w-2.5 text-[#D9D7D2]" />
                            </span>
                          </a>
                        </div>
                      </td>
                      <td className="px-3 py-2.5 text-right text-xs font-mono tabular-nums text-[#9CA3AF]">
                        {item.price
                          ? `R$ ${item.price.open.toFixed(2)}`
                          : "—"}
                      </td>
                      <td className="px-3 py-2.5 text-right text-xs font-mono tabular-nums text-[#9CA3AF]">
                        {item.price
                          ? `R$ ${item.price.close.toFixed(2)}`
                          : "—"}
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        <span
                          className={cn(
                            "inline-flex items-center gap-0.5 text-xs font-mono font-semibold tabular-nums",
                            v !== null && v > 0
                              ? "text-[#16A34A]"
                              : v !== null && v < 0
                                ? "text-[#DC2626]"
                                : "text-[#9CA3AF]"
                          )}
                        >
                          {v !== null && v > 0 ? (
                            <TrendingUp className="h-3 w-3" />
                          ) : v !== null && v < 0 ? (
                            <TrendingDown className="h-3 w-3" />
                          ) : (
                            <Minus className="h-3 w-3" />
                          )}
                          {v !== null ? fmt(v) : "—"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-[#E8E6E1] px-6 py-3 bg-[#FAFAF8] flex items-center justify-between">
          <p className="text-[10px] text-[#D9D7D2]">
            Peso igual (10% cada) · IBOV: {fmt(ibovReturn)}
          </p>
          <p className="text-[10px] text-[#D9D7D2]">Harven Finance</p>
        </div>
      </div>
    </div>
  );
}
