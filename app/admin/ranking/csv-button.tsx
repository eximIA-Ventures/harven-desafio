"use client";

import { useState, useEffect } from "react";
import { Download } from "lucide-react";

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
};

function fmt(v: number | null): string {
  if (v === null) return "";
  return `${(v * 100).toFixed(2)}%`;
}

export function CsvRankingButton() {
  const [data, setData] = useState<{ ranking: RankingEntry[]; currentCycleLabel: string; ibovReturn: number } | null>(null);

  useEffect(() => {
    fetch("/api/ranking")
      .then((r) => r.json())
      .then(setData)
      .catch(() => {});
  }, []);

  function download() {
    if (!data || data.ranking.length === 0) return;

    const header = "Rank,Nome,Curso,Sala,Retorno Mensal,Retorno Acumulado,Modelo,Ações";
    const rows = data.ranking.map((r) =>
      [
        r.rank,
        `"${r.name}"`,
        r.curso ?? "",
        r.sala ?? "",
        fmt(r.returnMonth),
        fmt(r.returnAccum),
        r.allocationLabel,
        `"${r.stocks.join(" | ")}"`,
      ].join(",")
    );

    const csv = [header, ...rows].join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ranking-${data.currentCycleLabel.replace(/\s/g, "-")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <button
      onClick={download}
      disabled={!data || data.ranking.length === 0}
      className="inline-flex items-center gap-1.5 rounded-lg border border-[#E8E6E1] bg-white px-3 py-2 text-xs font-medium text-[#5C5C5C] hover:bg-[#F5F4F0] transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
    >
      <Download className="h-3.5 w-3.5" />
      CSV
    </button>
  );
}
