"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";

export function CreateCycleButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [loading, setLoading] = useState(false);

  async function handleCreate() {
    setLoading(true);
    try {
      const res = await fetch("/api/cycles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ month, year }),
      });
      const data = await res.json();

      if (!res.ok) {
        alert(data.error || "Erro ao criar ciclo");
        return;
      }

      setOpen(false);
      router.refresh();
    } catch {
      alert("Erro de conexão");
    } finally {
      setLoading(false);
    }
  }

  if (open) {
    return (
      <div className="flex items-center gap-2">
        <select
          value={month}
          onChange={(e) => setMonth(Number(e.target.value))}
          className="rounded-lg border border-[#E8E6E1] px-2 py-1.5 text-xs outline-none focus:border-[#C6AD7C]"
        >
          {[
            "Jan", "Fev", "Mar", "Abr", "Mai", "Jun",
            "Jul", "Ago", "Set", "Out", "Nov", "Dez",
          ].map((m, i) => (
            <option key={i + 1} value={i + 1}>
              {m}
            </option>
          ))}
        </select>
        <input
          type="number"
          value={year}
          onChange={(e) => setYear(Number(e.target.value))}
          min={2024}
          max={2030}
          className="w-16 rounded-lg border border-[#E8E6E1] px-2 py-1.5 text-xs font-mono outline-none focus:border-[#C6AD7C]"
        />
        <button
          onClick={handleCreate}
          disabled={loading}
          className="rounded-lg bg-[#1A1A1A] px-3 py-1.5 text-[10px] font-semibold text-white hover:bg-[#333] disabled:opacity-50 cursor-pointer"
        >
          {loading ? "..." : "Criar"}
        </button>
        <button
          onClick={() => setOpen(false)}
          className="rounded-lg border border-[#E8E6E1] px-3 py-1.5 text-[10px] text-[#9CA3AF] hover:bg-[#F5F4F0] cursor-pointer"
        >
          Cancelar
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => setOpen(true)}
      className="inline-flex items-center gap-1.5 rounded-xl bg-[#1A1A1A] px-4 py-2.5 text-xs font-medium text-white hover:bg-[#333] transition-colors cursor-pointer"
    >
      <Plus className="h-3.5 w-3.5" />
      Novo Ciclo
    </button>
  );
}
