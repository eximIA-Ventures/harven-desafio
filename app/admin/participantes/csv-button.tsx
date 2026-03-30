"use client";

import { Download } from "lucide-react";

type Participant = {
  name: string;
  email: string | null;
  cpf: string | null;
  curso: string | null;
  semestre: number | null;
  sala: string | null;
  portfolio: { allocationModel: number; submittedAt: string; stocks: string[] } | null;
};

const modelLabels: Record<number, string> = {
  1: "Conservador",
  2: "Moderado",
  3: "Arrojado",
  4: "Agressivo",
};

function maskCpf(cpf: string | null): string {
  if (!cpf) return "";
  return `***.***.${cpf.slice(6, 9)}-${cpf.slice(9)}`;
}

export function CsvExportButton({ participants, cycleLabel }: { participants: Participant[]; cycleLabel: string | null }) {
  function download() {
    const header = "Nome,Email,CPF,Curso,Semestre,Sala,Status,Modelo,Ações";
    const rows = participants.map((p) => {
      const status = p.portfolio ? "Enviou" : "Não enviou";
      const modelo = p.portfolio ? modelLabels[p.portfolio.allocationModel] ?? "" : "";
      const stocks = p.portfolio ? p.portfolio.stocks.join(" | ") : "";
      return [
        `"${p.name}"`,
        p.email ?? "",
        maskCpf(p.cpf),
        p.curso ?? "",
        p.semestre ? `${p.semestre}º` : "",
        p.sala ?? "",
        status,
        modelo,
        `"${stocks}"`,
      ].join(",");
    });

    const csv = [header, ...rows].join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `participantes${cycleLabel ? `-${cycleLabel.replace(/\s/g, "-")}` : ""}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <button
      onClick={download}
      className="inline-flex items-center gap-1.5 rounded-lg border border-[#E8E6E1] bg-white px-3 py-2 text-xs font-medium text-[#5C5C5C] hover:bg-[#F5F4F0] transition-colors cursor-pointer"
    >
      <Download className="h-3.5 w-3.5" />
      CSV
    </button>
  );
}
