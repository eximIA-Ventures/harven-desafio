"use client";

import { useState, useEffect, useMemo } from "react";
import { cn } from "@/lib/utils";
import { Search, X, Swords, Check, ChevronDown } from "lucide-react";

type Portfolio = {
  userId: string;
  name: string;
  curso: string | null;
  sala: string | null;
  allocationModel: number;
  stocks: string[];
};

type Cycle = { id: string; label: string; status: string };

const modelConfig: Record<number, { label: string; color: string; bg: string }> = {
  1: { label: "Conservador", color: "text-blue-600", bg: "bg-blue-50" },
  2: { label: "Moderado", color: "text-emerald-600", bg: "bg-emerald-50" },
  3: { label: "Arrojado", color: "text-orange-600", bg: "bg-orange-50" },
  4: { label: "Agressivo", color: "text-red-600", bg: "bg-red-50" },
};

const ringColors = [
  { bg: "bg-[#1A1A1A]", text: "text-white", dot: "bg-[#1A1A1A]", label: "text-[#1A1A1A]" },
  { bg: "bg-[#C6AD7C]", text: "text-white", dot: "bg-[#C6AD7C]", label: "text-[#C6AD7C]" },
  { bg: "bg-[#3B82F6]", text: "text-white", dot: "bg-[#3B82F6]", label: "text-[#3B82F6]" },
  { bg: "bg-[#16A34A]", text: "text-white", dot: "bg-[#16A34A]", label: "text-[#16A34A]" },
  { bg: "bg-[#DC2626]", text: "text-white", dot: "bg-[#DC2626]", label: "text-[#DC2626]" },
];

export function PortfolioRing() {
  const [portfolios, setPortfolios] = useState<Portfolio[]>([]);
  const [cycles, setCycles] = useState<Cycle[]>([]);
  const [currentCycleId, setCurrentCycleId] = useState<string | null>(null);
  const [currentCycleLabel, setCurrentCycleLabel] = useState<string>("");
  const [selected, setSelected] = useState<string[]>([]);
  const [search, setSearch] = useState("");

  function fetchCycle(cycleId?: string) {
    const url = cycleId ? `/api/admin/portfolios?cycleId=${cycleId}` : "/api/admin/portfolios";
    fetch(url)
      .then((r) => r.json())
      .then((d) => {
        setPortfolios(d.portfolios ?? []);
        setCycles(d.cycles ?? []);
        setCurrentCycleId(d.currentCycleId ?? null);
        setCurrentCycleLabel(d.currentCycleLabel ?? "");
        setSelected([]);
      })
      .catch(() => {});
  }

  useEffect(() => { fetchCycle(); }, []);

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
        : prev.length < 5 ? [...prev, userId] : prev
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
  const partialStocks = allStocks.filter((s) => s.count > 1 && s.count < selectedPortfolios.length);

  // Map exclusive stock → owner name + color
  const exclusiveMap = useMemo(() => {
    const map = new Map<string, { name: string; colorIdx: number }>();
    for (const s of exclusiveStocks) {
      const ownerIdx = selectedPortfolios.findIndex((p) => s.owners.includes(p.userId));
      if (ownerIdx >= 0) {
        map.set(s.ticker, {
          name: selectedPortfolios[ownerIdx].name.split(" ")[0],
          colorIdx: ownerIdx,
        });
      }
    }
    return map;
  }, [exclusiveStocks, selectedPortfolios]);

  if (portfolios.length === 0 && cycles.length === 0) return null;

  return (
    <div className="rounded-xl border border-[#E8E6E1] bg-white overflow-hidden">
      {/* Header */}
      <div className="px-5 py-3 bg-[#1A1A1A] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Swords className="h-4 w-4 text-[#C6AD7C]" />
          <p className="text-sm font-semibold text-white">Ring de Comparação</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Cycle selector */}
          {cycles.length > 1 && (
            <div className="relative">
              <select
                value={currentCycleId ?? ""}
                onChange={(e) => fetchCycle(e.target.value)}
                className="appearance-none bg-white/10 text-white text-[10px] font-medium rounded-lg pl-2 pr-6 py-1 outline-none cursor-pointer border border-white/20 hover:bg-white/20 transition-colors"
              >
                {cycles.map((c) => (
                  <option key={c.id} value={c.id} className="text-[#1A1A1A]">
                    {c.label} {c.status === "liquidated" ? "✓" : ""}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-1.5 top-1/2 -translate-y-1/2 h-3 w-3 text-white/50 pointer-events-none" />
            </div>
          )}
          <p className="text-[10px] text-white/50">
            {selected.length}/5 selecionados
          </p>
        </div>
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

        {selected.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {selectedPortfolios.map((p, idx) => {
              const rc = ringColors[idx % ringColors.length];
              return (
                <button
                  key={p.userId}
                  onClick={() => toggle(p.userId)}
                  className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-medium cursor-pointer", rc.bg, rc.text)}
                >
                  {p.name.split(" ")[0]}
                  <X className="h-2.5 w-2.5" />
                </button>
              );
            })}
          </div>
        )}

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
          {portfolios.length === 0 && (
            <p className="text-xs text-[#9CA3AF] text-center py-4">Nenhuma carteira neste ciclo.</p>
          )}
        </div>
      </div>

      {/* Comparison view */}
      {selectedPortfolios.length >= 2 && (
        <div className="p-5">
          <p className="text-[10px] text-[#9CA3AF] uppercase tracking-wider font-medium mb-3">
            Comparação de papéis · {currentCycleLabel}
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
                    Status
                  </th>
                </tr>
              </thead>
              <tbody>
                {allStocks.map(({ ticker, owners, count }) => {
                  const isShared = count === selectedPortfolios.length;
                  const isExclusive = count === 1;
                  const exclusiveOwner = isExclusive ? exclusiveMap.get(ticker) : null;

                  return (
                    <tr
                      key={ticker}
                      className={cn(
                        "border-b border-[#E8E6E1]/30 last:border-0",
                        isShared && "bg-[#16A34A]/[0.04]",
                        isExclusive && "bg-[#D97706]/[0.03]"
                      )}
                    >
                      <td className="px-2 py-1.5">
                        <span className={cn(
                          "text-xs font-mono font-semibold",
                          isShared ? "text-[#16A34A]" : isExclusive ? "text-[#D97706]" : "text-[#1A1A1A]"
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
                        {isShared ? (
                          <span className="text-[9px] font-medium text-[#16A34A] bg-[#16A34A]/10 rounded-full px-1.5 py-0.5">
                            Todos
                          </span>
                        ) : isExclusive && exclusiveOwner ? (
                          <span className={cn("text-[9px] font-medium rounded-full px-1.5 py-0.5 bg-[#D97706]/10", ringColors[exclusiveOwner.colorIdx % ringColors.length].label)}>
                            Só {exclusiveOwner.name}
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold tabular-nums text-[#9CA3AF]">
                            {count}/{selectedPortfolios.length}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Summary */}
          <div className={cn("gap-3 mt-4 pt-4 border-t border-[#E8E6E1]", partialStocks.length > 0 ? "grid grid-cols-3" : "grid grid-cols-2")}>
            <div className="text-center">
              <p className="text-xl font-bold text-[#16A34A]">{sharedStocks.length}</p>
              <p className="text-[9px] text-[#9CA3AF] uppercase tracking-wider">Em comum</p>
              {sharedStocks.length > 0 && (
                <p className="text-[10px] text-[#16A34A] font-mono mt-1">
                  {sharedStocks.map((s) => s.ticker).join(", ")}
                </p>
              )}
            </div>
            {partialStocks.length > 0 && (
              <div className="text-center">
                <p className="text-xl font-bold text-[#5C5C5C]">{partialStocks.length}</p>
                <p className="text-[9px] text-[#9CA3AF] uppercase tracking-wider">Parciais</p>
                <p className="text-[10px] text-[#9CA3AF] font-mono mt-1">
                  {partialStocks.map((s) => s.ticker).join(", ")}
                </p>
              </div>
            )}
            <div className="text-center">
              <p className="text-xl font-bold text-[#D97706]">{exclusiveStocks.length}</p>
              <p className="text-[9px] text-[#9CA3AF] uppercase tracking-wider">Exclusivos</p>
              {exclusiveStocks.length > 0 && (
                <div className="flex flex-wrap justify-center gap-1 mt-1">
                  {exclusiveStocks.map((s) => {
                    const owner = exclusiveMap.get(s.ticker);
                    const rc = owner ? ringColors[owner.colorIdx % ringColors.length] : ringColors[0];
                    return (
                      <span key={s.ticker} className={cn("text-[9px] font-mono font-medium", rc.label)}>
                        {s.ticker}
                      </span>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Venn chart */}
          <div className="mt-4 pt-4 border-t border-[#E8E6E1]">
            <p className="text-[10px] text-[#9CA3AF] uppercase tracking-wider font-medium mb-3">
              Distribuição
            </p>
            {(() => {
              const total = allStocks.length;
              if (total === 0) return null;
              const sharedPct = (sharedStocks.length / total) * 100;
              const partialPct = (partialStocks.length / total) * 100;
              const exclusivePct = (exclusiveStocks.length / total) * 100;
              return (
                <div>
                  {/* Stacked bar */}
                  <div className="h-6 rounded-lg overflow-hidden flex">
                    {sharedPct > 0 && (
                      <div className="bg-[#16A34A] flex items-center justify-center" style={{ width: `${sharedPct}%` }}>
                        <span className="text-[9px] font-bold text-white">{sharedStocks.length}</span>
                      </div>
                    )}
                    {partialPct > 0 && (
                      <div className="bg-[#9CA3AF] flex items-center justify-center" style={{ width: `${partialPct}%` }}>
                        <span className="text-[9px] font-bold text-white">{partialStocks.length}</span>
                      </div>
                    )}
                    {exclusivePct > 0 && (
                      <div className="bg-[#D97706] flex items-center justify-center" style={{ width: `${exclusivePct}%` }}>
                        <span className="text-[9px] font-bold text-white">{exclusiveStocks.length}</span>
                      </div>
                    )}
                  </div>
                  {/* Legend */}
                  <div className="flex items-center justify-center gap-4 mt-2">
                    <span className="flex items-center gap-1.5 text-[10px] text-[#5C5C5C]">
                      <span className="h-2.5 w-2.5 rounded-sm bg-[#16A34A]" />
                      Em comum ({sharedStocks.length})
                    </span>
                    {partialStocks.length > 0 && (
                      <span className="flex items-center gap-1.5 text-[10px] text-[#5C5C5C]">
                        <span className="h-2.5 w-2.5 rounded-sm bg-[#9CA3AF]" />
                        Parcial ({partialStocks.length})
                      </span>
                    )}
                    <span className="flex items-center gap-1.5 text-[10px] text-[#5C5C5C]">
                      <span className="h-2.5 w-2.5 rounded-sm bg-[#D97706]" />
                      Exclusivo ({exclusiveStocks.length})
                    </span>
                  </div>

                  {/* Per-participant breakdown */}
                  <div className="mt-3 space-y-1.5">
                    {selectedPortfolios.map((p, idx) => {
                      const rc = ringColors[idx % ringColors.length];
                      const pExclusive = exclusiveStocks.filter((s) => s.owners.includes(p.userId));
                      const pShared = sharedStocks.length;
                      const pPartial = p.stocks.length - pExclusive.length - pShared;
                      return (
                        <div key={p.userId}>
                          <div className="flex items-center justify-between mb-0.5">
                            <div className="flex items-center gap-1.5">
                              <span className={cn("h-2.5 w-2.5 rounded-full", rc.dot)} />
                              <span className="text-[10px] font-medium text-[#1A1A1A]">
                                {p.name.split(" ")[0]}
                              </span>
                            </div>
                            <span className="text-[10px] text-[#9CA3AF]">
                              {pExclusive.length} exclusivo{pExclusive.length !== 1 ? "s" : ""}
                              {pExclusive.length > 0 && (
                                <span className="ml-1 font-mono text-[9px] text-[#D97706]">
                                  ({pExclusive.map((s) => s.ticker).join(", ")})
                                </span>
                              )}
                            </span>
                          </div>
                          <div className="h-1.5 rounded-full overflow-hidden flex bg-[#F5F4F0]">
                            <div className="bg-[#16A34A]" style={{ width: `${(pShared / 10) * 100}%` }} />
                            {pPartial > 0 && <div className="bg-[#9CA3AF]" style={{ width: `${(pPartial / 10) * 100}%` }} />}
                            <div className="bg-[#D97706]" style={{ width: `${(pExclusive.length / 10) * 100}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {selectedPortfolios.length === 1 && (
        <div className="p-5 text-center text-sm text-[#9CA3AF]">
          Selecione pelo menos 2 participantes para comparar.
        </div>
      )}

      {selectedPortfolios.length === 0 && portfolios.length > 0 && (
        <div className="p-5 text-center text-sm text-[#9CA3AF]">
          Selecione participantes acima para iniciar a comparação.
        </div>
      )}
    </div>
  );
}
