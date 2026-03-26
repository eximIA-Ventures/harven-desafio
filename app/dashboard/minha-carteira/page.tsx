"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Briefcase,
  Search,
  Check,
  X,
  TrendingUp,
  Shield,
  Flame,
  Zap,
  ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";

// --- Allocation Models ---

const allocationModels = [
  {
    id: 1,
    label: "Conservador",
    icon: Shield,
    color: "text-blue-600",
    bgColor: "bg-blue-50",
    borderColor: "border-blue-200",
    description:
      "Foco em renda fixa e preservação de capital. Ideal para quem prioriza segurança com exposição mínima a risco.",
    composition: [
      { label: "Renda Fixa (CDI)", value: 70, color: "#3B82F6" },
      { label: "Ouro (XAU)", value: 10, color: "#F59E0B" },
      { label: "Dólar (USD)", value: 10, color: "#10B981" },
      { label: "Cripto (BTC)", value: 5, color: "#8B5CF6" },
      { label: "EUA (S&P)", value: 5, color: "#EF4444" },
    ],
  },
  {
    id: 2,
    label: "Moderado",
    icon: TrendingUp,
    color: "text-emerald-600",
    bgColor: "bg-emerald-50",
    borderColor: "border-emerald-200",
    description:
      "Equilíbrio entre segurança e crescimento. Diversificação global com base sólida em renda fixa.",
    composition: [
      { label: "Renda Fixa (CDI)", value: 50, color: "#3B82F6" },
      { label: "Ouro (XAU)", value: 15, color: "#F59E0B" },
      { label: "Dólar (USD)", value: 15, color: "#10B981" },
      { label: "Cripto (BTC)", value: 10, color: "#8B5CF6" },
      { label: "EUA (S&P)", value: 5, color: "#EF4444" },
      { label: "China (SSE)", value: 5, color: "#EC4899" },
    ],
  },
  {
    id: 3,
    label: "Arrojado",
    icon: Flame,
    color: "text-orange-600",
    bgColor: "bg-orange-50",
    borderColor: "border-orange-200",
    description:
      "Maior exposição a ativos de risco em busca de retornos superiores. Para quem aceita volatilidade.",
    composition: [
      { label: "Renda Fixa (CDI)", value: 30, color: "#3B82F6" },
      { label: "Ouro (XAU)", value: 20, color: "#F59E0B" },
      { label: "Dólar (USD)", value: 20, color: "#10B981" },
      { label: "Cripto (BTC)", value: 15, color: "#8B5CF6" },
      { label: "EUA (S&P)", value: 10, color: "#EF4444" },
      { label: "China (SSE)", value: 5, color: "#EC4899" },
    ],
  },
  {
    id: 4,
    label: "Agressivo",
    icon: Zap,
    color: "text-red-600",
    bgColor: "bg-red-50",
    borderColor: "border-red-200",
    description:
      "Máxima exposição a risco e mercados internacionais. Potencial de alto retorno com alta volatilidade.",
    composition: [
      { label: "Renda Fixa (CDI)", value: 10, color: "#3B82F6" },
      { label: "Ouro (XAU)", value: 20, color: "#F59E0B" },
      { label: "Dólar (USD)", value: 20, color: "#10B981" },
      { label: "Cripto (BTC)", value: 20, color: "#8B5CF6" },
      { label: "EUA (S&P)", value: 15, color: "#EF4444" },
      { label: "China (SSE)", value: 15, color: "#EC4899" },
    ],
  },
];

function DonutChart({
  composition,
  size = 110,
}: {
  composition: { label: string; value: number; color: string }[];
  size?: number;
}) {
  const total = composition.reduce((sum, c) => sum + c.value, 0);
  let cumulative = 0;
  const radius = 38;
  const circumference = 2 * Math.PI * radius;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      className="transform -rotate-90"
    >
      {composition.map((segment) => {
        const offset = (cumulative / total) * circumference;
        const length = (segment.value / total) * circumference;
        cumulative += segment.value;
        return (
          <circle
            key={segment.label}
            cx="50"
            cy="50"
            r={radius}
            fill="none"
            stroke={segment.color}
            strokeWidth="14"
            strokeDasharray={`${length} ${circumference - length}`}
            strokeDashoffset={-offset}
          />
        );
      })}
    </svg>
  );
}

type IbovStock = {
  ticker: string;
  company: string;
  type: string;
  weight: number;
  logo: string;
  price: number | null;
  change: number | null;
};

export default function MinhaCarteiraPage() {
  const [selectedModel, setSelectedModel] = useState<number | null>(null);
  const [selectedStocks, setSelectedStocks] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [ibovStocks, setIbovStocks] = useState<IbovStock[]>([]);
  const [loadingStocks, setLoadingStocks] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitMessage, setSubmitMessage] = useState("");
  const [cycleLabel, setCycleLabel] = useState<string | null>(null);
  const [existingPortfolio, setExistingPortfolio] = useState(false);

  // Fetch IBOV composition + existing portfolio
  useEffect(() => {
    fetch("/api/ibov")
      .then((res) => res.json())
      .then((data) => {
        setIbovStocks(data.stocks || []);
        setLoadingStocks(false);
      })
      .catch(() => setLoadingStocks(false));

    fetch("/api/portfolio")
      .then((res) => res.json())
      .then((data) => {
        if (data.cycle) setCycleLabel(data.cycle.label);
        if (data.portfolio) {
          setSelectedModel(data.portfolio.allocationModel);
          setSelectedStocks(data.portfolio.stocks);
          setExistingPortfolio(true);
        }
      })
      .catch(() => {});
  }, []);

  // Filter stocks by search
  const filteredStocks = useMemo(() => {
    if (!search.trim()) return ibovStocks;
    const q = search.toUpperCase().trim();
    return ibovStocks.filter(
      (s) =>
        s.ticker.includes(q) ||
        s.company.toUpperCase().includes(q)
    );
  }, [ibovStocks, search]);

  function toggleStock(ticker: string) {
    setSubmitted(false);
    setSubmitMessage("");
    setSelectedStocks((prev) => {
      if (prev.includes(ticker)) {
        return prev.filter((t) => t !== ticker);
      }
      if (prev.length >= 10) return prev;
      return [...prev, ticker];
    });
  }

  function removeStock(ticker: string) {
    setSelectedStocks((prev) => prev.filter((t) => t !== ticker));
    setSubmitted(false);
    setSubmitMessage("");
  }

  const canSubmit = selectedModel !== null && selectedStocks.length === 10;

  async function handleSubmit(e?: React.MouseEvent) {
    if (e) e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    setSubmitMessage("");

    try {
      const res = await fetch("/api/portfolio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          allocationModel: selectedModel,
          stocks: selectedStocks,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        setSubmitMessage(data.error || "Erro ao enviar");
        return;
      }

      setSubmitted(true);
      setExistingPortfolio(true);
      setSubmitMessage(
        data.updated
          ? "Carteira atualizada com sucesso!"
          : "Carteira enviada com sucesso!"
      );
    } catch (err) {
      console.error("Submit error:", err);
      setSubmitMessage("Erro de conexão. Tente novamente.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#C6AD7C] to-[#B59C6B]">
            <Briefcase className="h-4 w-4 text-white" />
          </div>
          <div>
            <h1 className="font-heading text-2xl font-bold text-[#1A1A1A]">
              Minha Carteira
            </h1>
            <p className="text-sm text-[#9CA3AF]">
              {cycleLabel ?? "Carregando ciclo..."}
            </p>
          </div>
        </div>
      </div>

      {/* Existing portfolio banner */}
      {existingPortfolio && (
        <div className="mb-6 rounded-2xl border border-[#16A34A]/20 bg-[#16A34A]/[0.04] p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#16A34A]/10">
              <Check className="h-4 w-4 text-[#16A34A]" />
            </div>
            <div>
              <p className="text-sm font-medium text-[#1A1A1A]">
                Carteira enviada para {cycleLabel}
              </p>
              <p className="text-[11px] text-[#9CA3AF]">
                Você pode alterar a seleção abaixo e atualizar até o prazo
              </p>
            </div>
          </div>
          <span className="inline-flex items-center rounded-full bg-[#16A34A]/10 border border-[#16A34A]/20 px-2.5 py-1 text-[10px] font-medium text-[#16A34A] uppercase tracking-wider">
            Enviada
          </span>
        </div>
      )}

      {/* Como funciona — only show for new users */}
      {!existingPortfolio && (
        <div className="mb-8 flex gap-3 overflow-x-auto pb-1">
          {[
            { n: "1", t: "Modelo", d: "Escolha o perfil de alocação" },
            { n: "2", t: "10 Ações", d: "Selecione do Ibovespa vigente" },
            { n: "3", t: "Envie", d: "Até 18h do último dia do mês" },
            { n: "4", t: "Ranking", d: "Compare com IBOV e colegas" },
          ].map((s) => (
            <div
              key={s.n}
              className="flex items-center gap-3 rounded-xl border border-[#E8E6E1] bg-white px-4 py-3 min-w-[200px] flex-1"
            >
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#1A1A1A] text-[10px] font-bold text-[#C6AD7C]">
                {s.n}
              </span>
              <div>
                <p className="text-xs font-semibold text-[#1A1A1A]">{s.t}</p>
                <p className="text-[10px] text-[#9CA3AF]">{s.d}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* === STEP 1: Modelo de Alocação === */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-4">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#1A1A1A] text-[10px] font-bold text-white">
            1
          </span>
          <h2 className="text-sm font-semibold text-[#1A1A1A] uppercase tracking-wider">
            Modelo de Alocação
          </h2>
        </div>

        <p className="mb-5 text-sm text-[#5C5C5C] leading-relaxed">
          Cada modelo representa um perfil de risco diferente. A distribuição é
          entre Renda Fixa (CDI), Ouro (XAU), Dólar (USD), Cripto (BTC), EUA
          (S&P 500) e China (SSE). Escolha o que mais combina com sua
          estratégia.
        </p>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {allocationModels.map((model) => {
            const isSelected = selectedModel === model.id;

            return (
              <button
                key={model.id}
                onClick={() => {
                  setSelectedModel(model.id);
                  setSubmitted(false);
                  setSubmitMessage("");
                }}
                className={cn(
                  "rounded-xl border-2 p-5 text-left transition-all cursor-pointer",
                  isSelected
                    ? `${model.borderColor} ${model.bgColor} shadow-sm`
                    : "border-[#E8E6E1] bg-white hover:border-[#D9D7D2]"
                )}
              >
                {/* Label */}
                <div className="flex items-center justify-between mb-4">
                  <span
                    className={cn(
                      "text-[10px] font-semibold uppercase tracking-wider",
                      isSelected ? model.color : "text-[#9CA3AF]"
                    )}
                  >
                    {model.label}
                  </span>
                  {isSelected && (
                    <Check className="h-4 w-4 text-[#16A34A]" />
                  )}
                </div>

                {/* Donut */}
                <div className="flex justify-center mb-4">
                  <DonutChart composition={model.composition} size={110} />
                </div>

                {/* Legend */}
                <div className="space-y-1.5">
                  {model.composition.map((c) => (
                    <div
                      key={c.label}
                      className="flex items-center justify-between"
                    >
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span
                          className="h-2 w-2 rounded-full shrink-0"
                          style={{ backgroundColor: c.color }}
                        />
                        <span className="text-[11px] text-[#5C5C5C] truncate">
                          {c.label}
                        </span>
                      </div>
                      <span className="text-[11px] font-mono font-semibold text-[#1A1A1A] tabular-nums ml-2">
                        {c.value}%
                      </span>
                    </div>
                  ))}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* === STEP 2: Ações === */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-4">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#1A1A1A] text-[10px] font-bold text-white">
            2
          </span>
          <h2 className="text-sm font-semibold text-[#1A1A1A] uppercase tracking-wider">
            Ações do Ibovespa
          </h2>
        </div>

        {/* Selected stocks bar */}
        <div className="mb-4 rounded-xl border border-[#E8E6E1] bg-white p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Briefcase className="h-4 w-4 text-[#C6AD7C]" />
              <span className="text-xs font-medium text-[#9CA3AF] uppercase tracking-wider">
                Selecionadas
              </span>
            </div>
            <span
              className={cn(
                "text-sm font-mono font-bold tabular-nums",
                selectedStocks.length === 10
                  ? "text-[#16A34A]"
                  : "text-[#9CA3AF]"
              )}
            >
              {selectedStocks.length}/10
            </span>
          </div>

          {selectedStocks.length === 0 ? (
            <div className="flex items-center justify-center py-3 rounded-lg border border-dashed border-[#E8E6E1] bg-[#FAFAF8]">
              <p className="text-xs text-[#D9D7D2]">
                Selecione 10 ações da lista abaixo
              </p>
            </div>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {selectedStocks.map((ticker, i) => {
                const stock = ibovStocks.find((s) => s.ticker === ticker);
                return (
                  <span
                    key={ticker}
                    className="group inline-flex items-center gap-1.5 rounded-lg bg-[#1A1A1A] pl-1.5 pr-2 py-1 text-xs font-mono font-medium text-white"
                  >
                    {stock?.logo && (
                      <img
                        src={stock.logo}
                        alt=""
                        className="h-5 w-5 rounded-md bg-white p-0.5"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                      />
                    )}
                    {ticker}
                    <button
                      onClick={() => removeStock(ticker)}
                      className="ml-0.5 rounded-full p-0.5 opacity-50 hover:opacity-100 hover:bg-white/20 transition-all cursor-pointer"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                );
              })}
            </div>
          )}
        </div>

        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-[#D9D7D2]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-[#E8E6E1] bg-white pl-11 pr-4 py-3 text-sm text-[#1A1A1A] outline-none transition-colors focus:border-[#C6AD7C] placeholder:text-[#D9D7D2]"
            placeholder="Buscar por ticker ou empresa..."
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-[#D9D7D2] hover:text-[#9CA3AF] cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Stock grid */}
        <div className="rounded-xl border border-[#E8E6E1] bg-white overflow-hidden">
          {loadingStocks ? (
            <div className="p-8 text-center">
              <span className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-[#C6AD7C]/30 border-t-[#C6AD7C]" />
              <p className="mt-3 text-sm text-[#9CA3AF]">
                Carregando ações do Ibovespa...
              </p>
            </div>
          ) : filteredStocks.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-sm text-[#9CA3AF]">
                {search
                  ? `Nenhuma ação encontrada para "${search}"`
                  : "Nenhuma ação disponível"}
              </p>
            </div>
          ) : (
            <div className="max-h-[420px] overflow-y-auto">
              {filteredStocks.map((stock) => {
                const isSelected = selectedStocks.includes(stock.ticker);
                const isFull = selectedStocks.length >= 10 && !isSelected;

                return (
                  <div
                    key={stock.ticker}
                    onClick={() => !isFull && toggleStock(stock.ticker)}
                    className={cn(
                      "flex items-center gap-3 px-4 py-3 border-b border-[#E8E6E1]/50 transition-colors",
                      isSelected
                        ? "bg-[#F5F4F0]"
                        : isFull
                          ? "opacity-30 cursor-not-allowed"
                          : "hover:bg-[#FAFAF8] cursor-pointer"
                    )}
                  >
                    {/* Checkbox */}
                    <div
                      className={cn(
                        "h-5 w-5 rounded-md border-2 flex items-center justify-center transition-colors shrink-0",
                        isSelected
                          ? "border-[#1A1A1A] bg-[#1A1A1A]"
                          : "border-[#D9D7D2]"
                      )}
                    >
                      {isSelected && (
                        <Check className="h-3 w-3 text-white" />
                      )}
                    </div>

                    {/* Logo + Ticker + Company — link to stock info */}
                    <a
                      href={`https://investidor10.com.br/acoes/${stock.ticker.toLowerCase()}/`}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="flex items-center gap-3 flex-1 min-w-0 hover:opacity-70 transition-opacity"
                    >
                      <img
                        src={stock.logo}
                        alt={stock.ticker}
                        className="h-8 w-8 rounded-lg object-contain bg-white border border-[#E8E6E1] p-0.5 shrink-0"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = "none";
                        }}
                      />
                      <div className="min-w-0">
                        <p
                          className={cn(
                            "text-sm font-mono font-semibold tracking-wide inline-flex items-center gap-1",
                            isSelected ? "text-[#1A1A1A]" : "text-[#5C5C5C]"
                          )}
                        >
                          {stock.ticker}
                          <ExternalLink className="h-2.5 w-2.5 text-[#D9D7D2]" />
                        </p>
                        <p className="text-[10px] text-[#9CA3AF] truncate capitalize">
                          {stock.company.toLowerCase()}
                        </p>
                      </div>
                    </a>

                    {/* Price */}
                    <div className="text-right shrink-0">
                      {stock.price ? (
                        <>
                          <p className="text-xs font-mono font-medium text-[#1A1A1A] tabular-nums">
                            R$ {stock.price.toFixed(2)}
                          </p>
                          <p
                            className={cn(
                              "text-[10px] font-mono tabular-nums",
                              stock.change !== null && stock.change > 0
                                ? "text-[#16A34A]"
                                : stock.change !== null && stock.change < 0
                                  ? "text-[#DC2626]"
                                  : "text-[#9CA3AF]"
                            )}
                          >
                            {stock.change !== null
                              ? `${stock.change >= 0 ? "+" : ""}${stock.change.toFixed(2)}%`
                              : ""}
                          </p>
                        </>
                      ) : (
                        <p className="text-xs text-[#D9D7D2]">—</p>
                      )}
                    </div>

                    {/* Weight badge */}
                    <span className="text-[10px] font-mono tabular-nums text-[#D9D7D2] w-12 text-right shrink-0">
                      {stock.weight.toFixed(1)}%
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <p className="mt-2 text-[10px] text-[#D9D7D2] text-center">
          Composição do Ibovespa vigente — {ibovStocks.length} ações disponíveis
        </p>
      </div>

      {/* === SUBMIT === */}
      <div className="mt-8 mb-6">
        {submitted ? (
          <div className="rounded-2xl border border-[#16A34A]/20 bg-[#16A34A]/[0.04] p-5 text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#16A34A]/10">
                <Check className="h-4 w-4 text-[#16A34A]" />
              </div>
            </div>
            <p className="text-sm font-semibold text-[#16A34A]">{submitMessage}</p>
            <p className="text-[11px] text-[#9CA3AF] mt-1">
              Você pode alterar sua carteira até o prazo do ciclo
            </p>
            <button
              onClick={() => setSubmitted(false)}
              className="mt-3 text-xs text-[#9CA3AF] hover:text-[#5C5C5C] underline underline-offset-2 cursor-pointer"
            >
              Editar carteira
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3">
            {/* Status text */}
            <div className="text-sm text-[#9CA3AF]">
              {!selectedModel && "Selecione um modelo de alocação para começar"}
              {selectedModel && selectedStocks.length < 10 && (
                <span>
                  Faltam{" "}
                  <span className="font-bold text-[#1A1A1A]">
                    {10 - selectedStocks.length}
                  </span>{" "}
                  {10 - selectedStocks.length === 1 ? "ação" : "ações"} para completar
                </span>
              )}
              {canSubmit && !existingPortfolio && (
                <span className="text-[#16A34A] font-medium">Carteira pronta para envio!</span>
              )}
              {canSubmit && existingPortfolio && (
                <span className="text-[#C6AD7C] font-medium">Alterações prontas para salvar</span>
              )}
            </div>

            {/* Error */}
            {submitMessage && (
              <p className="text-xs text-[#DC2626]">{submitMessage}</p>
            )}

            {/* Button */}
            <button
              onClick={handleSubmit}
              disabled={!canSubmit || submitting}
              className={cn(
                "inline-flex items-center gap-2 rounded-xl px-8 py-3.5 text-sm font-semibold transition-all cursor-pointer w-full max-w-xs justify-center",
                canSubmit
                  ? existingPortfolio
                    ? "bg-[#1A1A1A] text-white hover:bg-[#333] hover:shadow-lg"
                    : "bg-gradient-to-r from-[#C6AD7C] to-[#B59C6B] text-white hover:shadow-lg hover:shadow-[#C6AD7C]/20"
                  : "bg-[#E8E6E1] text-[#9CA3AF] cursor-not-allowed"
              )}
            >
              {submitting ? (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              ) : (
                <>
                  <Check className="h-4 w-4" />
                  {existingPortfolio ? "Salvar Alterações" : "Enviar Carteira"}
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
