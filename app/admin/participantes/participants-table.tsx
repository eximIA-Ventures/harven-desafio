"use client";

import { Fragment, useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

const modelLabels: Record<
  number,
  { label: string; color: string; bg: string }
> = {
  1: { label: "Conservador", color: "text-blue-600", bg: "bg-blue-50" },
  2: { label: "Moderado", color: "text-emerald-600", bg: "bg-emerald-50" },
  3: { label: "Arrojado", color: "text-orange-600", bg: "bg-orange-50" },
  4: { label: "Agressivo", color: "text-red-600", bg: "bg-red-50" },
};

type ParticipantData = {
  id: string;
  name: string;
  email: string | null;
  cpf: string | null;
  curso: string | null;
  semestre: number | null;
  sala: string | null;
  portfolio: {
    allocationModel: number;
    submittedAt: string;
    stocks: string[];
  } | null;
};

export function ParticipantsTable({
  participants,
  cycleLabel,
}: {
  participants: ParticipantData[];
  cycleLabel: string | null;
}) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  return (
    <div className="overflow-hidden rounded-2xl border border-[#E8E6E1] bg-white">
      {cycleLabel && (
        <div className="px-5 py-2.5 bg-[#FAFAF8] border-b border-[#E8E6E1]">
          <p className="text-[10px] text-[#9CA3AF] uppercase tracking-wider">
            Carteiras do ciclo:{" "}
            <span className="font-semibold text-[#5C5C5C]">{cycleLabel}</span>
          </p>
        </div>
      )}
      <table className="w-full">
        <thead>
          <tr className="border-b border-[#E8E6E1] bg-[#FAFAF8]">
            <th className="px-5 py-3 text-left text-[10px] font-medium uppercase tracking-wider text-[#9CA3AF]">
              Nome
            </th>
            <th className="px-5 py-3 text-left text-[10px] font-medium uppercase tracking-wider text-[#9CA3AF] hidden md:table-cell">
              CPF
            </th>
            <th className="px-5 py-3 text-left text-[10px] font-medium uppercase tracking-wider text-[#9CA3AF]">
              Curso
            </th>
            <th className="px-5 py-3 text-center text-[10px] font-medium uppercase tracking-wider text-[#9CA3AF] hidden sm:table-cell">
              Sem.
            </th>
            <th className="px-5 py-3 text-center text-[10px] font-medium uppercase tracking-wider text-[#9CA3AF] hidden sm:table-cell">
              Sala
            </th>
            <th className="px-5 py-3 text-center text-[10px] font-medium uppercase tracking-wider text-[#9CA3AF]">
              Carteira
            </th>
          </tr>
        </thead>
        <tbody>
          {participants.map((p) => {
            const isExpanded = expandedId === p.id;
            const hasPortfolio = p.portfolio !== null;
            const model = p.portfolio
              ? modelLabels[p.portfolio.allocationModel]
              : null;

            return (
              <Fragment key={p.id}>
                <tr
                  className={cn(
                    "border-b border-[#E8E6E1]/50 transition-colors",
                    hasPortfolio
                      ? "hover:bg-[#FAFAF8]/60 cursor-pointer"
                      : ""
                  )}
                  onClick={() =>
                    hasPortfolio && setExpandedId(isExpanded ? null : p.id)
                  }
                >
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2">
                      {hasPortfolio ? (
                        isExpanded ? (
                          <ChevronDown className="h-3.5 w-3.5 text-[#C6AD7C] shrink-0" />
                        ) : (
                          <ChevronRight className="h-3.5 w-3.5 text-[#D9D7D2] shrink-0" />
                        )
                      ) : (
                        <div className="w-3.5" />
                      )}
                      <div>
                        <p className="text-sm font-medium text-[#1A1A1A]">
                          {p.name}
                        </p>
                        {p.email && (
                          <p className="text-[10px] text-[#9CA3AF] mt-0.5">
                            {p.email}
                          </p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 hidden md:table-cell">
                    <span className="text-xs font-mono text-[#9CA3AF] tabular-nums">
                      {p.cpf
                        ? `***.***.${p.cpf.slice(6, 9)}-${p.cpf.slice(9)}`
                        : "—"}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className="text-xs text-[#5C5C5C]">
                      {p.curso ?? "—"}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-center hidden sm:table-cell">
                    <span className="text-xs text-[#5C5C5C]">
                      {p.semestre ? `${p.semestre}º` : "—"}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-center hidden sm:table-cell">
                    <span className="text-xs text-[#5C5C5C]">
                      {p.sala ?? "—"}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-center">
                    {model ? (
                      <span
                        className={cn(
                          "inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-medium",
                          model.bg,
                          model.color
                        )}
                      >
                        {model.label}
                      </span>
                    ) : (
                      <span className="text-[10px] text-[#D9D7D2]">
                        Não enviou
                      </span>
                    )}
                  </td>
                </tr>
                {isExpanded && p.portfolio && (
                  <tr className="border-b border-[#E8E6E1]/50">
                    <td colSpan={6} className="px-5 py-4 bg-[#FAFAF8]/40">
                      <div className="flex flex-wrap gap-2">
                        {p.portfolio.stocks.map((ticker, i) => (
                          <div
                            key={ticker}
                            className="flex items-center gap-1.5 rounded-lg border border-[#E8E6E1] bg-white px-2.5 py-1.5"
                          >
                            <span className="text-[9px] text-[#D9D7D2] tabular-nums">
                              {i + 1}
                            </span>
                            <img
                              src={`https://icons.brapi.dev/icons/${ticker}.svg`}
                              alt={ticker}
                              className="h-4 w-4 rounded object-contain"
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display =
                                  "none";
                              }}
                            />
                            <span className="text-xs font-mono font-semibold text-[#1A1A1A]">
                              {ticker}
                            </span>
                          </div>
                        ))}
                      </div>
                      <p className="text-[10px] text-[#9CA3AF] mt-2">
                        Enviada em{" "}
                        {new Date(p.portfolio.submittedAt).toLocaleDateString(
                          "pt-BR",
                          {
                            day: "2-digit",
                            month: "2-digit",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          }
                        )}
                      </p>
                    </td>
                  </tr>
                )}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
