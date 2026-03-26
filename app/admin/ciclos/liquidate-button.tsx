"use client";

import { useState } from "react";
import { Zap } from "lucide-react";
import { useRouter } from "next/navigation";

export function LiquidateButton({
  cycleId,
  cycleLabel,
}: {
  cycleId: string;
  cycleLabel: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  async function handleLiquidate() {
    setLoading(true);
    try {
      const res = await fetch("/api/liquidate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cycleId }),
      });
      const data = await res.json();

      if (!res.ok) {
        alert(data.error || "Erro na liquidação");
        return;
      }

      const ibovPct = ((data.ibovReturn ?? 0) * 100).toFixed(2);
      alert(
        `${data.message}\n${data.portfoliosProcessed} carteiras processadas\n${data.stocksPriced} ações precificadas\nIBOV: ${ibovPct}%`
      );
      router.refresh();
    } catch {
      alert("Erro de conexão");
    } finally {
      setLoading(false);
      setShowConfirm(false);
    }
  }

  if (showConfirm) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-[10px] text-[#9CA3AF]">
          Liquidar {cycleLabel}?
        </span>
        <button
          onClick={handleLiquidate}
          disabled={loading}
          className="rounded-lg bg-[#DC2626] px-3 py-1.5 text-[10px] font-semibold text-white hover:bg-[#B91C1C] disabled:opacity-50 cursor-pointer"
        >
          {loading ? "Processando..." : "Confirmar"}
        </button>
        <button
          onClick={() => setShowConfirm(false)}
          disabled={loading}
          className="rounded-lg border border-[#E8E6E1] px-3 py-1.5 text-[10px] text-[#9CA3AF] hover:bg-[#F5F4F0] cursor-pointer"
        >
          Cancelar
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => setShowConfirm(true)}
      className="inline-flex items-center gap-1.5 rounded-lg bg-[#1A1A1A] px-3 py-1.5 text-[10px] font-semibold text-white hover:bg-[#333] cursor-pointer"
    >
      <Zap className="h-3 w-3 text-[#C6AD7C]" />
      Liquidar
    </button>
  );
}
