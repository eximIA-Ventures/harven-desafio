"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { cn } from "@/lib/utils";
import {
  Trophy,
  TrendingUp,
  TrendingDown,
  Minus,
  ChevronDown,
  Crown,
  X,
  Radio,
  Clock,
} from "lucide-react";
import { PortfolioModal } from "./portfolio-modal";

type RankingEntry = {
  rank: number;
  name: string;
  curso: string | null;
  sala: string | null;
  returnMonth: number | null;
  returnAccum: number | null;
  allocationModel: number;
  allocationLabel: string;
  stocks: string[];
  replicated?: boolean;
  replicatedFrom?: string | null;
};

type Cycle = { id: string; label: string };

type StockPrice = { open: number; close: number; variation: number };

type RankingData = {
  cycles: Cycle[];
  currentCycleId: string;
  currentCycleLabel: string;
  ibovReturn: number;
  ranking: RankingEntry[];
  stockPrices: Record<string, StockPrice>;
  live?: boolean;
  updatedAt?: string;
};

function formatPercent(value: number | null): string {
  if (value === null) return "N/D";
  const sign = value >= 0 ? "+" : "";
  return `${sign}${(value * 100).toFixed(2)}%`;
}

function formatTime(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function ReturnBadge({ value }: { value: number | null }) {
  if (value === null) return <span className="text-[#D9D7D2]">---</span>;
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
      {formatPercent(value)}
    </span>
  );
}

/* -- Live badge ----------------------------------------------------------- */

function LiveBadge({ updatedAt }: { updatedAt?: string }) {
  return (
    <div className="inline-flex items-center gap-1.5 rounded-full bg-[#16A34A]/10 px-2.5 py-1">
      <Radio className="h-3 w-3 text-[#16A34A] animate-pulse" />
      <span className="text-[10px] font-semibold uppercase tracking-wider text-[#16A34A]">
        Parcial
      </span>
      {updatedAt && (
        <>
          <span className="text-[#16A34A]/30">|</span>
          <Clock className="h-2.5 w-2.5 text-[#16A34A]/60" />
          <span className="text-[10px] text-[#16A34A]/60">
            {formatTime(updatedAt)}
          </span>
        </>
      )}
    </div>
  );
}

/* -- Podium for top 3 ----------------------------------------------------- */

function Podium({ entries, ibov }: { entries: RankingEntry[]; ibov: number }) {
  const top3 = entries.slice(0, 3);
  if (top3.length === 0) return null;

  const podiumOrder = top3.length >= 3 ? [top3[1], top3[0], top3[2]] : top3;
  const heights = ["h-20", "h-28", "h-16"];
  const orderHeights =
    top3.length >= 3
      ? [heights[1], heights[0], heights[2]]
      : top3.map((_, i) => heights[i]);
  const medals = ["🥈", "🥇", "🥉"];
  const orderedMedals =
    top3.length >= 3
      ? [medals[0], medals[1], medals[2]]
      : top3.map((_, i) => medals[i]);

  return (
    <div className="flex items-end justify-center gap-3 px-6 pt-6 pb-4">
      {podiumOrder.map((entry, i) => (
        <div key={entry.rank} className="flex flex-col items-center gap-2 flex-1 max-w-[160px]">
          <span className="text-2xl">{orderedMedals[i]}</span>
          <p className="text-xs font-semibold text-[#1A1A1A] text-center truncate w-full">
            {entry.name.split(" ")[0]}
          </p>
          <span
            className={cn(
              "text-sm font-mono font-bold tabular-nums",
              (entry.returnMonth ?? 0) >= 0 ? "text-[#16A34A]" : "text-[#DC2626]"
            )}
          >
            {formatPercent(entry.returnMonth)}
          </span>
          <div
            className={cn(
              "w-full rounded-t-xl",
              orderHeights[i],
              entry.rank === 1
                ? "bg-gradient-to-t from-[#C6AD7C] to-[#D4C08E]"
                : entry.rank === 2
                  ? "bg-gradient-to-t from-[#A0A0A0] to-[#C0C0C0]"
                  : "bg-gradient-to-t from-[#CD7F32] to-[#DCA05A]"
            )}
          />
        </div>
      ))}
    </div>
  );
}

/* -- Desktop table (always rendered for download) ------------------------- */

function RankingTable({
  data,
  isAdmin,
  onSelect,
}: {
  data: RankingData;
  isAdmin: boolean;
  onSelect: (e: RankingEntry) => void;
}) {
  return (
    <table className="w-full">
      <thead>
        <tr className="border-b border-[#E8E6E1] bg-[#FAFAF8]">
          <th className="px-5 py-3 text-left text-[10px] font-medium uppercase tracking-wider text-[#9CA3AF] w-12">
            #
          </th>
          <th className="px-5 py-3 text-left text-[10px] font-medium uppercase tracking-wider text-[#9CA3AF]">
            Participante
          </th>
          {isAdmin && (
            <th className="px-5 py-3 text-center text-[10px] font-medium uppercase tracking-wider text-[#9CA3AF]">
              Modelo
            </th>
          )}
          <th className="px-5 py-3 text-right text-[10px] font-medium uppercase tracking-wider text-[#9CA3AF]">
            Rent. Mês
          </th>
          <th className="px-5 py-3 text-right text-[10px] font-medium uppercase tracking-wider text-[#9CA3AF]">
            vs IBOV
          </th>
        </tr>
      </thead>
      <tbody>
        {data.ranking.map((entry) => {
          const vsIbov =
            entry.returnMonth !== null
              ? entry.returnMonth - data.ibovReturn
              : null;
          return (
            <tr
              key={entry.rank}
              onClick={() => onSelect(entry)}
              className={cn(
                "border-b border-[#E8E6E1]/50 transition-colors cursor-pointer hover:bg-[#FAFAF8]",
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
                <p className="text-[10px] text-[#9CA3AF] mt-0.5">
                  {entry.curso}
                  {entry.sala ? ` · Sala ${entry.sala}` : ""}
                  {entry.replicated && (
                    <span className="ml-1.5 inline-flex items-center gap-0.5 rounded bg-[#F59E0B]/10 px-1 py-px text-[9px] text-[#F59E0B] font-medium" title={`Carteira de ${entry.replicatedFrom}`}>
                      ↺ {entry.replicatedFrom}
                    </span>
                  )}
                </p>
              </td>
              {isAdmin && (
                <td className="px-5 py-3.5 text-center">
                  <span className="text-[10px] text-[#9CA3AF] uppercase font-medium">
                    {entry.allocationLabel}
                  </span>
                </td>
              )}
              <td className="px-5 py-3.5 text-right">
                <ReturnBadge value={entry.returnMonth} />
              </td>
              <td className="px-5 py-3.5 text-right">
                <ReturnBadge value={vsIbov} />
              </td>
            </tr>
          );
        })}

        {/* IBOV reference */}
        <tr className="bg-[#F5F4F0] border-t border-[#E8E6E1]">
          <td className="px-5 py-3 text-center">
            <span className="text-[10px] text-[#9CA3AF]">---</span>
          </td>
          <td className="px-5 py-3">
            <span className="text-sm italic text-[#9CA3AF]">
              IBOV (referência)
            </span>
          </td>
          {isAdmin && <td />}
          <td className="px-5 py-3 text-right text-xs font-mono tabular-nums text-[#9CA3AF]">
            {formatPercent(data.ibovReturn)}
          </td>
          <td className="px-5 py-3 text-right text-xs text-[#9CA3AF]">---</td>
        </tr>
      </tbody>
    </table>
  );
}

/* -- Mobile cards --------------------------------------------------------- */

function MobileRankingCards({
  data,
  onSelect,
}: {
  data: RankingData;
  onSelect: (e: RankingEntry) => void;
}) {
  return (
    <div className="divide-y divide-[#E8E6E1]/50">
      {data.ranking.map((entry) => {
        const vsIbov =
          entry.returnMonth !== null
            ? entry.returnMonth - data.ibovReturn
            : null;
        return (
          <div
            key={entry.rank}
            onClick={() => onSelect(entry)}
            className={cn(
              "flex items-center gap-3 px-4 py-3.5 cursor-pointer hover:bg-[#FAFAF8]",
              entry.rank <= 3 && "bg-[#FAFAF8]/40"
            )}
          >
            {entry.rank <= 3 ? (
              <div
                className={cn(
                  "flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-bold text-white shrink-0",
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
              <span className="text-xs text-[#9CA3AF] tabular-nums w-7 text-center shrink-0">
                {entry.rank}
              </span>
            )}
            <div className="flex-1 min-w-0">
              <p
                className={cn(
                  "text-sm truncate",
                  entry.rank <= 3
                    ? "font-semibold text-[#1A1A1A]"
                    : "text-[#5C5C5C]"
                )}
              >
                {entry.name}
                {entry.replicated && (
                  <span className="ml-1.5 inline-flex items-center gap-0.5 rounded bg-[#F59E0B]/10 px-1 py-px text-[9px] text-[#F59E0B] font-medium align-middle">
                    ↺
                  </span>
                )}
              </p>
              <div className="flex items-center gap-2 mt-0.5">
                <ReturnBadge value={entry.returnMonth} />
                <span className="text-[#E8E6E1]">·</span>
                <span className="text-[10px] text-[#9CA3AF]">
                  vs IBOV{" "}
                </span>
                <ReturnBadge value={vsIbov} />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* -- Main component ------------------------------------------------------- */

const LIVE_REFRESH_INTERVAL = 1000 * 60 * 15; // 15 minutes

type LiveCycle = { id: string; label: string; status: string };

export function RankingView({
  isAdmin = false,
  showChampionPopup = false,
}: {
  isAdmin?: boolean;
  showChampionPopup?: boolean;
}) {
  const [data, setData] = useState<RankingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedCycleId, setSelectedCycleId] = useState<string | null>(null);
  const [selectedEntry, setSelectedEntry] = useState<RankingEntry | null>(null);
  const [showChampion, setShowChampion] = useState(showChampionPopup);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [allCycles, setAllCycles] = useState<LiveCycle[]>([]);
  const [isLive, setIsLive] = useState(false);
  const [selectedCycleStatus, setSelectedCycleStatus] = useState<string>("open");
  const refreshTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  // Fetch live ranking for any cycle
  const fetchLiveForCycle = useCallback(async (cycleId?: string) => {
    try {
      const url = cycleId
        ? `/api/ranking/live?cycleId=${cycleId}`
        : "/api/ranking/live";
      const res = await fetch(url);
      const result = await res.json();

      if (result.cycles?.length > 0) {
        setAllCycles(result.cycles);
      }

      if (result.live && result.ranking.length > 0) {
        setData({
          cycles: result.cycles ?? [],
          currentCycleId: result.cycleId,
          currentCycleLabel: result.cycleLabel,
          ibovReturn: result.ibovReturn ?? 0,
          ranking: result.ranking,
          stockPrices: result.stockPrices ?? {},
          live: true,
          updatedAt: result.updatedAt,
        });
        setSelectedCycleId(result.cycleId);
        setUpdatedAt(result.updatedAt);
        setIsLive(true);

        // Track status of the selected cycle
        const cycleStatus = result.cycles?.find(
          (c: LiveCycle) => c.id === result.cycleId
        )?.status ?? "open";
        setSelectedCycleStatus(cycleStatus);

        return true;
      }

      setData(null);
      return false;
    } catch {
      console.error("Failed to fetch live ranking");
      return false;
    }
  }, []);

  // Fetch liquidated (final) ranking for a cycle
  const fetchFinalRanking = useCallback(async (cycleId?: string) => {
    try {
      const url = cycleId
        ? `/api/ranking?cycleId=${cycleId}`
        : "/api/ranking";
      const res = await fetch(url);
      const result = await res.json();

      if (result.ranking?.length > 0) {
        setData({
          ...result,
          live: false,
          updatedAt: undefined,
        });
        setSelectedCycleId(result.currentCycleId);
        setUpdatedAt(null);
        setIsLive(false);
        return true;
      }
      return false;
    } catch {
      console.error("Failed to fetch final ranking");
      return false;
    }
  }, []);

  // Initial load: open cycle → live, liquidated → final (default)
  const fetchRanking = useCallback(async () => {
    setLoading(true);
    try {
      // First get cycle list via live endpoint
      const liveRes = await fetch("/api/ranking/live");
      const liveData = await liveRes.json();

      if (liveData.cycles?.length > 0) {
        setAllCycles(liveData.cycles);
      }

      // Default cycle: first non-liquidated, or most recent
      const defaultCycle = liveData.cycles?.find(
        (c: LiveCycle) => c.status !== "liquidated"
      ) ?? liveData.cycles?.[0];

      if (!defaultCycle) {
        setData(null);
        return;
      }

      setSelectedCycleStatus(defaultCycle.status);

      if (defaultCycle.status !== "liquidated") {
        // Open cycle → always live
        if (liveData.live && liveData.ranking?.length > 0) {
          setData({
            cycles: liveData.cycles ?? [],
            currentCycleId: liveData.cycleId,
            currentCycleLabel: liveData.cycleLabel,
            ibovReturn: liveData.ibovReturn ?? 0,
            ranking: liveData.ranking,
            stockPrices: liveData.stockPrices ?? {},
            live: true,
            updatedAt: liveData.updatedAt,
          });
          setSelectedCycleId(liveData.cycleId);
          setUpdatedAt(liveData.updatedAt);
          setIsLive(true);
        }
      } else {
        // Liquidated cycle → show final by default
        await fetchFinalRanking(defaultCycle.id);
      }
    } finally {
      setLoading(false);
    }
  }, [fetchFinalRanking]);

  // Initial fetch
  useEffect(() => {
    fetchRanking();
    return () => {
      if (refreshTimer.current) clearInterval(refreshTimer.current);
    };
  }, [fetchRanking]);

  // Auto-refresh when in live mode
  useEffect(() => {
    if (refreshTimer.current) clearInterval(refreshTimer.current);

    if (isLive) {
      refreshTimer.current = setInterval(() => {
        fetchLiveForCycle(selectedCycleId ?? undefined);
      }, LIVE_REFRESH_INTERVAL);
    }

    return () => {
      if (refreshTimer.current) clearInterval(refreshTimer.current);
    };
  }, [isLive, selectedCycleId, fetchLiveForCycle]);

  // Change cycle
  function handleCycleChange(cycleId: string) {
    const cycle = allCycles.find((c) => c.id === cycleId);
    setSelectedCycleId(cycleId);
    setSelectedCycleStatus(cycle?.status ?? "open");
    setLoading(true);

    if (cycle?.status !== "liquidated") {
      // Open/closed cycle → always live
      fetchLiveForCycle(cycleId).finally(() => setLoading(false));
    } else {
      // Liquidated cycle → show final by default
      setIsLive(false);
      fetchFinalRanking(cycleId).finally(() => setLoading(false));
    }
  }

  // Toggle live/final for liquidated cycles
  function handleToggleLive() {
    if (!selectedCycleId) return;
    setLoading(true);

    if (isLive) {
      // Switch to final
      fetchFinalRanking(selectedCycleId).finally(() => setLoading(false));
    } else {
      // Switch to live
      fetchLiveForCycle(selectedCycleId).finally(() => setLoading(false));
    }
  }

  if (loading) {
    return (
      <div className="p-12 text-center">
        <span className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-[#C6AD7C]/30 border-t-[#C6AD7C]" />
        <p className="mt-3 text-sm text-[#9CA3AF]">Carregando ranking...</p>
      </div>
    );
  }

  if (!data || data.ranking.length === 0) {
    return (
      <div className="rounded-2xl border border-[#E8E6E1] bg-white p-12 text-center">
        <Trophy className="mx-auto h-6 w-6 text-[#D9D7D2] mb-3" />
        <h3 className="font-heading text-lg font-semibold text-[#1A1A1A]">
          Ranking em breve
        </h3>
        <p className="mt-2 text-sm text-[#9CA3AF] max-w-md mx-auto">
          O ranking aparecerá quando houver carteiras submetidas no ciclo atual.
        </p>
      </div>
    );
  }

  const champion = data.ranking[0];

  return (
    <>
      {/* Champion popup */}
      {showChampion && champion && (
        <div className="mb-6 rounded-2xl border border-[#C6AD7C]/30 bg-gradient-to-r from-[#C6AD7C]/5 to-[#B59C6B]/5 p-5 relative">
          <button
            onClick={() => setShowChampion(false)}
            className="absolute top-3 right-3 rounded-lg p-1 text-[#9CA3AF] hover:text-[#5C5C5C] transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-[#C6AD7C] to-[#B59C6B]">
              <Crown className="h-5 w-5 text-white" />
            </div>
            <div className="flex-1">
              <p className="text-[10px] text-[#C6AD7C] uppercase tracking-wider font-medium">
                Campeão --- {data.currentCycleLabel}
              </p>
              <p className="font-heading text-lg font-bold text-[#1A1A1A]">
                {champion.name}
              </p>
              <p className="text-xs text-[#9CA3AF] mt-0.5">
                {champion.curso} · {champion.allocationLabel} ·{" "}
                <span
                  className={cn(
                    "font-mono font-semibold",
                    champion.returnMonth !== null && champion.returnMonth > 0
                      ? "text-[#16A34A]"
                      : "text-[#DC2626]"
                  )}
                >
                  {formatPercent(champion.returnMonth)}
                </span>
              </p>
            </div>
            <button
              onClick={() => setSelectedEntry(champion)}
              className="rounded-xl bg-[#1A1A1A] px-4 py-2 text-xs font-medium text-white hover:bg-[#333] transition-colors cursor-pointer"
            >
              Ver carteira
            </button>
          </div>
        </div>
      )}

      {/* Controls: badge + cycle selector + live toggle */}
      <div className="mb-5 flex items-center gap-3 flex-wrap">
        {/* Status badge */}
        {isLive ? (
          <LiveBadge updatedAt={updatedAt ?? undefined} />
        ) : (
          <div className="inline-flex items-center gap-1.5 rounded-full bg-[#1A1A1A]/5 px-2.5 py-1">
            <Trophy className="h-3 w-3 text-[#C6AD7C]" />
            <span className="text-[10px] font-semibold uppercase tracking-wider text-[#1A1A1A]">
              Resultado final
            </span>
          </div>
        )}

        {/* Live/Final toggle for liquidated cycles */}
        {selectedCycleStatus === "liquidated" && (
          <button
            onClick={handleToggleLive}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-medium uppercase tracking-wider transition-colors cursor-pointer",
              isLive
                ? "border-[#C6AD7C]/30 text-[#C6AD7C] hover:bg-[#C6AD7C]/5"
                : "border-[#16A34A]/30 text-[#16A34A] hover:bg-[#16A34A]/5"
            )}
          >
            {isLive ? (
              <>
                <Trophy className="h-3 w-3" />
                Ver fechamento
              </>
            ) : (
              <>
                <Radio className="h-3 w-3" />
                Ver ao vivo
              </>
            )}
          </button>
        )}

        {/* Cycle selector */}
        {allCycles.length > 1 && (
          <>
            <span className="text-[#E8E6E1]">|</span>
            <span className="text-xs text-[#9CA3AF] uppercase tracking-wider">
              Período
            </span>
            <div className="relative">
              <select
                value={selectedCycleId ?? ""}
                onChange={(e) => handleCycleChange(e.target.value)}
                className="appearance-none rounded-xl border border-[#E8E6E1] bg-white pl-4 pr-10 py-2.5 text-sm font-medium text-[#1A1A1A] outline-none transition-colors focus:border-[#C6AD7C] cursor-pointer"
              >
                {allCycles.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#9CA3AF] pointer-events-none" />
            </div>
          </>
        )}
      </div>

      {/* -- Ranking card (downloadable --- always desktop layout) ----------- */}
      <div
        id="ranking-card"
        className="overflow-hidden rounded-2xl border border-[#E8E6E1] bg-white"
      >
        {/* Dark header */}
        <div className="bg-[#1A1A1A] px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Trophy className="h-4 w-4 text-[#C6AD7C]" />
            <span className="text-sm font-semibold text-white">
              Ranking {data.currentCycleLabel}
            </span>
            {isLive && (
              <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-[#16A34A]/20 px-2 py-0.5">
                <span className="h-1.5 w-1.5 rounded-full bg-[#16A34A] animate-pulse" />
                <span className="text-[9px] font-semibold uppercase tracking-wider text-[#16A34A]">
                  Ao vivo
                </span>
              </span>
            )}
          </div>
          <span className="text-[10px] text-white/40 uppercase tracking-widest">
            Harven Finance
          </span>
        </div>

        {/* Desktop table --- always rendered (hidden on mobile screen, visible for download) */}
        <div className="hidden md:block">
          <RankingTable data={data} isAdmin={isAdmin} onSelect={setSelectedEntry} />
        </div>

        {/* Footer */}
        <div className="bg-[#FAFAF8] border-t border-[#E8E6E1] px-6 py-3 flex items-center justify-between">
          <p className="text-[10px] text-[#9CA3AF]">
            IBOV: {formatPercent(data.ibovReturn)} · Peso igual (10% cada)
            {updatedAt && (
              <span className="ml-2">
                · Atualizado {formatTime(updatedAt)}
              </span>
            )}
          </p>
          <p className="text-[10px] text-[#9CA3AF]">
            Harven Finance · Desafio Carteiras
          </p>
        </div>
      </div>

      {/* -- Mobile cards (screen only, outside ranking-card) --------------- */}
      <div className="block md:hidden overflow-hidden rounded-2xl border border-[#E8E6E1] bg-white -mt-[1px]">
        <MobileRankingCards data={data} onSelect={setSelectedEntry} />
      </div>

      <p className="mt-3 text-center text-[10px] text-[#D9D7D2]">
        {isLive
          ? "Ranking baseado em cotações em tempo real · Resultado oficial na liquidação mensal"
          : "Resultado oficial da liquidação · Clique em um participante para ver a carteira"}
      </p>

      {/* Portfolio modal */}
      {selectedEntry && data && (
        <PortfolioModal
          data={selectedEntry}
          ibovReturn={data.ibovReturn}
          cycleLabel={data.currentCycleLabel}
          stockPrices={data.stockPrices ?? {}}
          onClose={() => setSelectedEntry(null)}
        />
      )}
    </>
  );
}
