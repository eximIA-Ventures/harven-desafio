import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db, schema } from "@/lib/db";
import { eq } from "drizzle-orm";
import { cn } from "@/lib/utils";
import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  Briefcase,
  User,
} from "lucide-react";

const modelLabels: Record<number, string> = {
  1: "Conservador",
  2: "Moderado",
  3: "Arrojado",
  4: "Agressivo",
};

const modelColors: Record<number, { bg: string; text: string }> = {
  1: { bg: "bg-blue-50", text: "text-blue-700" },
  2: { bg: "bg-emerald-50", text: "text-emerald-700" },
  3: { bg: "bg-amber-50", text: "text-amber-700" },
  4: { bg: "bg-red-50", text: "text-red-700" },
};

export default async function CycleDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSession();
  if (!session || session.type !== "admin") redirect("/login");

  const { id } = await params;

  const cycle = await db.query.cycles.findFirst({
    where: eq(schema.cycles.id, id),
  });

  if (!cycle) redirect("/admin/ciclos");

  const portfolios = await db.query.portfolios.findMany({
    where: eq(schema.portfolios.cycleId, id),
    with: { user: true, stocks: true },
    orderBy: (p, { asc }) => [asc(p.submittedAt)],
  });

  const totalParticipants = await db.query.users.findMany({
    where: eq(schema.users.type, "participant"),
  });

  const submitted = portfolios.length;
  const pending = totalParticipants.length - submitted;
  const isPre = cycle.status !== "liquidated";

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <Link
          href="/admin/ciclos"
          className="inline-flex items-center gap-1.5 text-sm text-[#9CA3AF] hover:text-[#5C5C5C] transition-colors mb-4"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Voltar aos ciclos
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-heading text-2xl font-bold text-[#1A1A1A]">
              {cycle.label}
            </h1>
            <p className="mt-1 text-sm text-[#9CA3AF]">
              Prazo:{" "}
              {new Date(cycle.deadline).toLocaleDateString("pt-BR", {
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
          </div>
          <span
            className={cn(
              "inline-flex items-center rounded-full border px-3 py-1.5 text-xs font-medium uppercase tracking-wider",
              cycle.status === "open" && "bg-[#16A34A]/10 text-[#16A34A] border-[#16A34A]/20",
              cycle.status === "closed" && "bg-[#D97706]/10 text-[#D97706] border-[#D97706]/20",
              cycle.status === "liquidated" && "bg-[#2563EB]/10 text-[#2563EB] border-[#2563EB]/20"
            )}
          >
            {cycle.status === "open" ? "Aberto" : cycle.status === "closed" ? "Fechado" : "Liquidado"}
          </span>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="rounded-xl border border-[#E8E6E1] bg-white p-4">
          <div className="flex items-center gap-2 text-[#9CA3AF] text-xs mb-1">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Enviadas
          </div>
          <p className="text-2xl font-bold text-[#1A1A1A]">{submitted}</p>
        </div>
        <div className="rounded-xl border border-[#E8E6E1] bg-white p-4">
          <div className="flex items-center gap-2 text-[#9CA3AF] text-xs mb-1">
            <Clock className="h-3.5 w-3.5" />
            Pendentes
          </div>
          <p className="text-2xl font-bold text-[#1A1A1A]">{pending}</p>
        </div>
        <div className="rounded-xl border border-[#E8E6E1] bg-white p-4">
          <div className="flex items-center gap-2 text-[#9CA3AF] text-xs mb-1">
            <User className="h-3.5 w-3.5" />
            Total membros
          </div>
          <p className="text-2xl font-bold text-[#1A1A1A]">
            {totalParticipants.length}
          </p>
        </div>
      </div>

      {isPre && submitted > 0 && (
        <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Visualização admin pré-liquidação — participantes não conseguem ver as carteiras dos outros.
        </div>
      )}

      {/* Submitted portfolios */}
      {submitted === 0 ? (
        <div className="rounded-2xl border border-[#E8E6E1] bg-white p-12 text-center">
          <Briefcase className="h-10 w-10 text-[#E8E6E1] mx-auto mb-3" />
          <p className="text-sm text-[#9CA3AF]">
            Nenhuma carteira enviada ainda.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {portfolios.map((p, idx) => {
            const mc = modelColors[p.allocationModel] ?? modelColors[2];
            const stocks = p.stocks
              .sort((a, b) => a.position - b.position)
              .map((s) => s.ticker);

            return (
              <div
                key={p.id}
                className="rounded-2xl border border-[#E8E6E1] bg-white p-5"
              >
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#F5F4F0] text-sm font-bold text-[#5C5C5C]">
                      {idx + 1}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-[#1A1A1A]">
                        {p.user.name}
                      </p>
                      <p className="text-[11px] text-[#9CA3AF]">
                        {p.user.curso}
                        {p.user.semestre ? ` · ${p.user.semestre}º sem` : ""}
                        {p.user.sala ? ` · Sala ${p.user.sala}` : ""}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium",
                        mc.bg,
                        mc.text
                      )}
                    >
                      {modelLabels[p.allocationModel] ?? "—"}
                    </span>
                    <span className="text-[10px] text-[#9CA3AF]">
                      {new Date(p.submittedAt).toLocaleDateString("pt-BR", {
                        day: "2-digit",
                        month: "2-digit",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {stocks.map((ticker, i) => (
                    <span
                      key={i}
                      className="inline-flex items-center rounded-md bg-[#F5F4F0] px-2 py-1 text-xs font-mono font-medium text-[#5C5C5C]"
                    >
                      {ticker}
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
