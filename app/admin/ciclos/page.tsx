import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db, schema } from "@/lib/db";
import { desc, eq, count } from "drizzle-orm";
import { formatPercent } from "@/lib/utils";
import {
  CalendarClock,
  Play,
  CheckCircle2,
  Lock,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { LiquidateButton } from "./liquidate-button";
import { CreateCycleButton } from "./create-cycle-button";

const statusConfig = {
  open: {
    label: "Aberto",
    icon: Play,
    bg: "bg-[#16A34A]/10",
    text: "text-[#16A34A]",
    border: "border-[#16A34A]/20",
  },
  closed: {
    label: "Fechado",
    icon: Lock,
    bg: "bg-[#D97706]/10",
    text: "text-[#D97706]",
    border: "border-[#D97706]/20",
  },
  liquidated: {
    label: "Liquidado",
    icon: CheckCircle2,
    bg: "bg-[#2563EB]/10",
    text: "text-[#2563EB]",
    border: "border-[#2563EB]/20",
  },
};

export default async function CiclosPage() {
  const session = await getSession();
  if (!session || session.type !== "admin") redirect("/login");

  const cycles = await db.query.cycles.findMany({
    orderBy: [desc(schema.cycles.year), desc(schema.cycles.month)],
  });

  const portfolioCounts: Record<string, number> = {};
  for (const cycle of cycles) {
    const [result] = await db
      .select({ value: count() })
      .from(schema.portfolios)
      .where(eq(schema.portfolios.cycleId, cycle.id));
    portfolioCounts[cycle.id] = result.value;
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold text-[#1A1A1A]">
            Ciclos Mensais
          </h1>
          <p className="mt-1 text-sm text-[#9CA3AF]">
            {cycles.length} ciclos criados
          </p>
        </div>
        <CreateCycleButton />
      </div>

      {/* Workflow */}
      <div className="mb-8 rounded-2xl border border-[#E8E6E1] bg-white p-6">
        <p className="text-xs font-medium uppercase tracking-wider text-[#9CA3AF] mb-4">
          Fluxo do ciclo
        </p>
        <div className="flex items-center gap-3 text-sm">
          <div className="flex items-center gap-1.5">
            <div className="h-6 w-6 rounded-full bg-[#16A34A]/10 flex items-center justify-center">
              <Play className="h-3 w-3 text-[#16A34A]" />
            </div>
            <span className="text-[#5C5C5C]">Aberto</span>
          </div>
          <div className="h-px flex-1 bg-[#E8E6E1]" />
          <div className="flex items-center gap-1.5">
            <div className="h-6 w-6 rounded-full bg-[#D97706]/10 flex items-center justify-center">
              <Lock className="h-3 w-3 text-[#D97706]" />
            </div>
            <span className="text-[#5C5C5C]">Fechado</span>
          </div>
          <div className="h-px flex-1 bg-[#E8E6E1]" />
          <div className="flex items-center gap-1.5">
            <div className="h-6 w-6 rounded-full bg-[#2563EB]/10 flex items-center justify-center">
              <CheckCircle2 className="h-3 w-3 text-[#2563EB]" />
            </div>
            <span className="text-[#5C5C5C]">Liquidado</span>
          </div>
        </div>
      </div>

      {/* Cycles */}
      <div className="space-y-3">
        {cycles.map((cycle) => {
          const st = statusConfig[cycle.status as keyof typeof statusConfig];
          const StatusIcon = st.icon;
          const cnt = portfolioCounts[cycle.id] ?? 0;
          const canLiquidate = cycle.status !== "liquidated" && cnt > 0;

          return (
            <div
              key={cycle.id}
              className="rounded-2xl border border-[#E8E6E1] bg-white p-5"
            >
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div
                    className={cn(
                      "flex h-10 w-10 items-center justify-center rounded-xl",
                      st.bg
                    )}
                  >
                    <StatusIcon className={cn("h-4 w-4", st.text)} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-[#1A1A1A]">
                      {cycle.label}
                    </p>
                    <p className="text-[11px] text-[#9CA3AF] mt-0.5">
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
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-right hidden sm:block">
                    <div className="flex items-center gap-1 text-[11px] text-[#9CA3AF]">
                      <Users className="h-3 w-3" />
                      {cnt} carteiras
                    </div>
                    {cycle.ibovReturn !== null && (
                      <p className="text-[11px] font-mono tabular-nums text-[#9CA3AF] mt-0.5">
                        IBOV: {formatPercent(cycle.ibovReturn)}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        "inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-medium uppercase tracking-wider",
                        st.bg,
                        st.text,
                        st.border
                      )}
                    >
                      {st.label}
                    </span>
                    {canLiquidate && (
                      <LiquidateButton cycleId={cycle.id} cycleLabel={cycle.label} />
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
