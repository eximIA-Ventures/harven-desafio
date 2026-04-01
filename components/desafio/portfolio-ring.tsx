"use client";

import { useState, useEffect, useMemo } from "react";
import { cn } from "@/lib/utils";
import { Search, X, Swords, Check } from "lucide-react";

type Portfolio = {
  userId: string;
  name: string;
  curso: string | null;
  sala: string | null;
  allocationModel: number;
  stocks: string[];
};

const modelConfig: Record<number, { label: string; color: string; bg: string; border: string }> = {
  1: { label: "Conservador", color: "text-blue-600", bg: "bg-blue-50", border: "border-blue-200" },
  2: { label: "Moderado", color: "text-emerald-600", bg: "bg-emerald-50", border: "border-emerald-200" },
  3: { label: "Arrojado", color: "text-orange-600", bg: "bg-orange-50", border: "border-orange-200" },
  4: { label: "Agressivo", color: "text-red-600", bg: "bg-red-50", border: "border-red-200" },
};

// Distinct colors for each participant in the ring
const ringColors = [
  { bg: "bg-[#1A1A1A]", text: "text-white", dot: "bg-[#1A1A1A]" },
  { bg: "bg-[#C6AD7C]", text: "text-white", dot: "bg-[#C6AD7C]" },
  { bg: "bg-[#3B82F6]", text: "text-white", dot: "bg-[#3B82F6]" },
  { bg: "bg-[#16A34A]", text: "text-white", dot: "bg-[#16A34A]" },
  { bg: "bg-[#DC2626]", text: "text-white", dot: "bg-[#DC2626]" },
];

export function PortfolioRing() {
  const [portfolios, setPortfolios] = useState<Portfolio[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetch("/api/admin/portfolios")
      .then((r) => r.json())
      .then((d) => setPortfolios(d.portfolios ?? []))
      .catch(() => {});
  }, []);

  const filtered = useMemo(() => {
    if (!search.trim()) return portfolios;
    const q = search.toLowerCase();
    return portfolios.filter(
      (p) => p.name.toLowerCase().includes(q) || (p.curso?.toLowerCase().includes(q) ?? false)
    );
  }, [portfolios, search]);

  const selectedPortfolios = portfolios.filter((p) => selected.includes(p.userId));

  function toggle(userId: string) {
    setSelected((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : prev.length < 5
          ? [...prev, userId]
          : prev
    );
  }

  // Compute comparison data
  const allStocks = useMemo(() => {
    const stockMap = new Map<string, string[]>();
    for (const p of selectedPortfolios) {
      for (const ticker of p.stocks) {
        if (!stockMap.has(ticker)) stockMap.set(ticker, []);
        stockMap.get(ticker)!.push(p.userId);
      }
    }
    return [...stockMap.entries()]
      .sort((a, b) => b[1].length - a[1].length)
      .map(([ticker, owners]) => ({ ticker, owners, count: owners.length }));
  }, [selectedPortfolios]);

  const sharedStocks = allStocks.filter((s) => s.count === selectedPortfolios.length && selectedPortfolios.length > 1);
  const exclusiveStocks = allStocks.filter((s) => s.count === 1);

  if (portfolios.length === 0) return null;

  return (
    <div className="rounded-xl border border-[#E8E6E1] bg-white overflow-hidden">
      {/* Header */}
      <div className="px-5 py-3 bg-[#1A1A1A] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Swords className="h-4 w-4 text-[#C6AD7C]" />
          <p className="text-sm font-semibold text-white">Ring de Comparação</p>
        </div>
        <p className="text-[10px] text-white/50">
          {selected.length}/5 selecionados
        </p>
      </div>

      {/* Participant selector */}
      <div className="p-4 border-b border-[#E8E6E1]">
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#D9D7D2]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar participante..."
            className="w-full rounded-lg border border-[#E8E6E1] bg-[#FAFAF8] pl-9 pr-4 py-2 text-xs text-[#1A1A1A] outline-none focus:border-[#C6AD7C] placeholder:text-[#D9D7D2]"
          />
        </div>

        {/* Selected chips */}
        {selected.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {selectedPortfolios.map((p, idx) => {
              const rc = ringColors[idx % ringColors.length];
              return (
                <button
                  key={p.userId}
                  onClick={() => toggle(p.userId)}
                  className={cn(
                    "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-medium cursor-pointer",
                    rc.bg, rc.text
                  )}
                >
                  {p.name.split(" ")[0]}
                  <X className="h-2.5 w-2.5" />
                </button>
              );
            })}
          </div>
        )}

        {/* Participant list */}
        <div className="max-h-40 overflow-y-auto space-y-0.5">
          {filtered.map((p) => {
            const isSelected = selected.includes(p.userId);
            const idx = selected.indexOf(p.userId);
            const model = modelConfig[p.allocationModel];
            return (
              <button
                key={p.userId}
                onClick={() => toggle(p.userId)}
                className={cn(
                  "w-full flex items-center justify-between px-3 py-2 rounded-lg text-left transition-colors cursor-pointer",
                  isSelected ? "bg-[#F5F4F0]" : "hover:bg-[#FAFAF8]"
                )}
              >
                <div className="flex items-center gap-2 min-w-0">
                  {isSelected ? (
                    <span className={cn("h-4 w-4 rounded-full flex items-center justify-center", ringColors[idx % ringColors.length].bg)}>
                      <Check className="h-2.5 w-2.5 text-white" />
                    </span>
                  ) : (
                    <span className="h-4 w-4 rounded-full border-2 border-[#E8E6E1]" />
                  )}
                  <span className="text-xs text-[#1A1A1A] truncate">{p.name}</span>
                </div>
                <span className={cn("text-[9px] font-medium rounded-full px-1.5 py-0.5", model?.bg, model?.color)}>
                  {model?.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Comparison view */}
      {selectedPortfolios.length >= 2 && (
        <div className="p-5">
          {/* Stock grid — who has what */}
          <p className="text-[10px] text-[#9CA3AF] uppercase tracking-wider font-medium mb-3">
            Comparação de papéis
          </p>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#E8E6E1]">
                  <th className="px-2 py-2 text-left text-[9px] font-medium uppercase tracking-wider text-[#9CA3AF]">
                    Papel
                  </th>
                  {selectedPortfolios.map((p, idx) => {
                    const rc = ringColors[idx % ringColors.length];
                    return (
                      <th key={p.userId} className="px-2 py-2 text-center">
                        <div className="flex flex-col items-center gap-0.5">
                          <span className={cn("h-3 w-3 rounded-full", rc.dot)} />
                          <span className="text-[8px] text-[#9CA3AF] truncate max-w-[60px]">
                            {p.name.split(" ")[0]}
                          </span>
                        </div>
                      </th>
                    );
                  })}
                  <th className="px-2 py-2 text-center text-[9px] font-medium uppercase tracking-wider text-[#9CA3AF]">
                    Total
                  </th>
                </tr>
              </thead>
              <tbody>
                {allStocks.map(({ ticker, owners, count }) => (
                  <tr
                    key={ticker}
                    className={cn(
                      "border-b border-[#E8E6E1]/30 last:border-0",
                      count === selectedPortfolios.length && "bg-[#16A34A]/[0.04]"
                    )}
                  >
                    <td className="px-2 py-1.5">
                      <span className={cn(
                        "text-xs font-mono font-semibold",
                        count === selectedPortfolios.length ? "text-[#16A34A]" : "text-[#1A1A1A]"
                      )}>
                        {ticker}
                      </span>
                    </td>
                    {selectedPortfolios.map((p, idx) => {
                      const has = owners.includes(p.userId);
                      const rc = ringColors[idx % ringColors.length];
                      return (
                        <td key={p.userId} className="px-2 py-1.5 text-center">
                          {has ? (
                            <span className={cn("inline-block h-3 w-3 rounded-full", rc.dot)} />
                          ) : (
                            <span className="inline-block h-3 w-3 rounded-full border border-[#E8E6E1]" />
                          )}
                        </td>
                      );
                    })}
                    <td className="px-2 py-1.5 text-center">
                      <span className={cn(
                        "text-[10px] font-bold tabular-nums",
                        count === selectedPortfolios.length ? "text-[#16A34A]" : "text-[#9CA3AF]"
                      )}>
                        {count}/{selectedPortfolios.length}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Summary */}
          <div className="grid grid-cols-3 gap-3 mt-4 pt-4 border-t border-[#E8E6E1]">
            <div className="text-center">
              <p className="text-xl font-bold text-[#16A34A]">{sharedStocks.length}</p>
              <p className="text-[9px] text-[#9CA3AF] uppercase tracking-wider">Em comum</p>
            </div>
            <div className="text-center">
              <p className="text-xl font-bold text-[#1A1A1A]">{allStocks.length}</p>
              <p className="text-[9px] text-[#9CA3AF] uppercase tracking-wider">Papéis únicos</p>
            </div>
            <div className="text-center">
              <p className="text-xl font-bold text-[#D97706]">{exclusiveStocks.length}</p>
              <p className="text-[9px] text-[#9CA3AF] uppercase tracking-wider">Exclusivos</p>
            </div>
          </div>
        </div>
      )}

      {selectedPortfolios.length === 1 && (
        <div className="p-5 text-center text-sm text-[#9CA3AF]">
          Selecione pelo menos 2 participantes para comparar.
        </div>
      )}

      {selectedPortfolios.length === 0 && (
        <div className="p-5 text-center text-sm text-[#9CA3AF]">
          Selecione participantes acima para iniciar a comparação.
        </div>
      )}
    </div>
  );
}
