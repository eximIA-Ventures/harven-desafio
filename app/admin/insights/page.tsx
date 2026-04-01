import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db, schema } from "@/lib/db";
import { eq, desc, sql, count, asc, ne } from "drizzle-orm";
import {
  Users,
  MousePointerClick,
  TrendingUp,
  Clock,
  Smartphone,
  Hash,
  CheckCircle2,
  XCircle,
  User,
} from "lucide-react";
import { cn } from "@/lib/utils";

const modelLabels: Record<number, { label: string; color: string; bg: string }> = {
  1: { label: "Conservador", color: "text-blue-600", bg: "bg-blue-50" },
  2: { label: "Moderado", color: "text-emerald-600", bg: "bg-emerald-50" },
  3: { label: "Arrojado", color: "text-orange-600", bg: "bg-orange-50" },
  4: { label: "Agressivo", color: "text-red-600", bg: "bg-red-50" },
};

export default async function InsightsPage() {
  const session = await getSession();
  if (!session || session.type !== "admin") redirect("/login");

  // === KPIs ===
  const [totalEvents] = await db
    .select({ value: count() })
    .from(schema.events);

  const [uniqueUsers] = await db
    .select({ value: sql<number>`COUNT(DISTINCT ${schema.events.userId})` })
    .from(schema.events);

  const loginEvents = await db
    .select({ metadata: schema.events.metadata })
    .from(schema.events)
    .where(eq(schema.events.event, "login"));

  let loginCpf = 0;
  let loginPhone = 0;
  for (const e of loginEvents) {
    try {
      const m = JSON.parse(e.metadata ?? "{}");
      if (m.method === "cpf") loginCpf++;
      else if (m.method === "phone") loginPhone++;
    } catch {}
  }

  // Events by type
  const eventsByType = await db
    .select({ event: schema.events.event, total: count() })
    .from(schema.events)
    .groupBy(schema.events.event)
    .orderBy(desc(count()));

  // Daily activity (last 7 days)
  const dailyEvents = await db
    .select({
      day: sql<string>`DATE(${schema.events.createdAt})`,
      total: count(),
    })
    .from(schema.events)
    .groupBy(sql`DATE(${schema.events.createdAt})`)
    .orderBy(desc(sql`DATE(${schema.events.createdAt})`))
    .limit(7);

  // Funnel
  const [registerStarts] = await db
    .select({ value: count() })
    .from(schema.events)
    .where(eq(schema.events.event, "register_start"));
  const [registerCompletes] = await db
    .select({ value: count() })
    .from(schema.events)
    .where(eq(schema.events.event, "register_complete"));
  const funnelRate =
    registerStarts.value > 0
      ? ((registerCompletes.value / registerStarts.value) * 100).toFixed(0)
      : "—";

  // === USER-LEVEL DATA ===
  const currentCycle = await db.query.cycles.findFirst({
    where: ne(schema.cycles.status, "liquidated"),
    orderBy: [desc(schema.cycles.year), desc(schema.cycles.month)],
  });

  const allParticipants = await db.query.users.findMany({
    where: eq(schema.users.type, "participant"),
    orderBy: asc(schema.users.name),
  });

  // Portfolios for current cycle
  const currentPortfolios = currentCycle
    ? await db.query.portfolios.findMany({
        where: eq(schema.portfolios.cycleId, currentCycle.id),
        with: { stocks: true },
      })
    : [];
  const portfolioByUser = new Map(currentPortfolios.map((p) => [p.userId, p]));

  // Events per user
  const userEvents = await db
    .select({
      userId: schema.events.userId,
      event: schema.events.event,
      total: count(),
    })
    .from(schema.events)
    .groupBy(schema.events.userId, schema.events.event);

  const userEventMap = new Map<string, Record<string, number>>();
  for (const ue of userEvents) {
    if (!ue.userId) continue;
    if (!userEventMap.has(ue.userId)) userEventMap.set(ue.userId, {});
    userEventMap.get(ue.userId)![ue.event] = ue.total;
  }

  // Last activity per user
  const lastActivity = await db
    .select({
      userId: schema.events.userId,
      lastSeen: sql<Date>`MAX(${schema.events.createdAt})`,
    })
    .from(schema.events)
    .groupBy(schema.events.userId);
  const lastSeenMap = new Map(lastActivity.map((l) => [l.userId, l.lastSeen]));

  // Build user profiles
  const userProfiles = allParticipants.map((u) => {
    const events = userEventMap.get(u.id) ?? {};
    const portfolio = portfolioByUser.get(u.id);
    const lastSeen = lastSeenMap.get(u.id);
    const totalActions = Object.values(events).reduce((s, n) => s + n, 0);

    return {
      id: u.id,
      name: u.name,
      curso: u.curso,
      sala: u.sala,
      hasPortfolio: !!portfolio,
      allocationModel: portfolio?.allocationModel ?? null,
      stocks: portfolio
        ? portfolio.stocks.sort((a, b) => a.position - b.position).map((s) => s.ticker)
        : [],
      logins: (events.login ?? 0) + (events.register_complete ?? 0),
      modelChanges: events.model_select ?? 0,
      submissions: (events.portfolio_submit ?? 0) + (events.portfolio_update ?? 0),
      totalActions,
      lastSeen,
      hasAnyEvent: totalActions > 0,
    };
  });

  const withPortfolio = userProfiles.filter((u) => u.hasPortfolio).length;
  const withEvents = userProfiles.filter((u) => u.hasAnyEvent).length;
  const ghost = userProfiles.filter((u) => !u.hasAnyEvent && !u.hasPortfolio).length;

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="font-heading text-2xl font-bold text-[#1A1A1A]">
          Insights de Uso
        </h1>
        <p className="mt-1 text-sm text-[#9CA3AF]">
          Monitoramento de engajamento e comportamento
          {currentCycle && ` · ${currentCycle.label}`}
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
        <div className="rounded-xl border border-[#E8E6E1] bg-white p-4">
          <div className="flex items-center gap-2 text-[#9CA3AF] text-xs mb-1">
            <MousePointerClick className="h-3.5 w-3.5" />
            Total eventos
          </div>
          <p className="text-2xl font-bold text-[#1A1A1A]">{totalEvents.value}</p>
        </div>
        <div className="rounded-xl border border-[#E8E6E1] bg-white p-4">
          <div className="flex items-center gap-2 text-[#9CA3AF] text-xs mb-1">
            <Users className="h-3.5 w-3.5" />
            Engajados / Total
          </div>
          <p className="text-2xl font-bold text-[#1A1A1A]">
            {withEvents}<span className="text-sm text-[#9CA3AF] font-normal"> / {allParticipants.length}</span>
          </p>
        </div>
        <div className="rounded-xl border border-[#E8E6E1] bg-white p-4">
          <div className="flex items-center gap-2 text-[#9CA3AF] text-xs mb-1">
            <TrendingUp className="h-3.5 w-3.5" />
            Cadastro → Envio
          </div>
          <p className="text-2xl font-bold text-[#1A1A1A]">{funnelRate}%</p>
        </div>
        <div className="rounded-xl border border-[#E8E6E1] bg-white p-4">
          <div className="flex items-center gap-2 text-[#9CA3AF] text-xs mb-1">
            <div className="flex gap-1">
              <Hash className="h-3.5 w-3.5" />
              <Smartphone className="h-3.5 w-3.5" />
            </div>
            Login CPF / Celular
          </div>
          <p className="text-2xl font-bold text-[#1A1A1A]">
            {loginCpf} / {loginPhone}
          </p>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6 mb-8">
        {/* Events by type */}
        <div className="rounded-xl border border-[#E8E6E1] bg-white p-5">
          <p className="text-xs font-medium uppercase tracking-wider text-[#9CA3AF] mb-4">
            Eventos por tipo
          </p>
          {eventsByType.length === 0 ? (
            <p className="text-sm text-[#D9D7D2]">Nenhum evento registrado</p>
          ) : (
            <div className="space-y-2.5">
              {eventsByType.map((e) => {
                const maxVal = eventsByType[0]?.total ?? 1;
                const pct = (e.total / maxVal) * 100;
                return (
                  <div key={e.event}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-mono text-[#5C5C5C]">{e.event}</span>
                      <span className="text-xs font-mono font-bold text-[#1A1A1A] tabular-nums">{e.total}</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-[#F5F4F0]">
                      <div className="h-1.5 rounded-full bg-[#C6AD7C]" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Daily activity */}
        <div className="rounded-xl border border-[#E8E6E1] bg-white p-5">
          <p className="text-xs font-medium uppercase tracking-wider text-[#9CA3AF] mb-4">
            Atividade diária (últimos 7 dias)
          </p>
          {dailyEvents.length === 0 ? (
            <p className="text-sm text-[#D9D7D2]">Sem dados</p>
          ) : (
            <div className="space-y-2.5">
              {dailyEvents.map((d) => {
                const maxVal = dailyEvents[0]?.total ?? 1;
                const pct = (d.total / maxVal) * 100;
                return (
                  <div key={d.day}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-[#5C5C5C]">
                        {new Date(d.day + "T12:00:00").toLocaleDateString("pt-BR", {
                          weekday: "short", day: "2-digit", month: "2-digit",
                        })}
                      </span>
                      <span className="text-xs font-mono font-bold text-[#1A1A1A] tabular-nums">{d.total}</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-[#F5F4F0]">
                      <div className="h-1.5 rounded-full bg-[#16A34A]" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* User-level engagement table */}
      <div className="rounded-xl border border-[#E8E6E1] bg-white overflow-hidden mb-8">
        <div className="px-5 py-3 bg-[#FAFAF8] border-b border-[#E8E6E1] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-[#9CA3AF]" />
            <p className="text-xs font-medium uppercase tracking-wider text-[#9CA3AF]">
              Engajamento por usuário
            </p>
          </div>
          <div className="flex items-center gap-3 text-[10px] text-[#9CA3AF]">
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-[#16A34A]" />
              Enviou ({withPortfolio})
            </span>
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-[#D97706]" />
              Acessou ({withEvents - withPortfolio > 0 ? withEvents - withPortfolio : 0})
            </span>
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-[#E8E6E1]" />
              Inativo ({ghost})
            </span>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#E8E6E1] bg-[#FAFAF8]/50">
                <th className="px-4 py-2.5 text-left text-[9px] font-medium uppercase tracking-wider text-[#9CA3AF]">
                  Participante
                </th>
                <th className="px-3 py-2.5 text-center text-[9px] font-medium uppercase tracking-wider text-[#9CA3AF]">
                  Carteira
                </th>
                <th className="px-3 py-2.5 text-center text-[9px] font-medium uppercase tracking-wider text-[#9CA3AF]">
                  Modelo
                </th>
                <th className="px-3 py-2.5 text-center text-[9px] font-medium uppercase tracking-wider text-[#9CA3AF]">
                  Logins
                </th>
                <th className="px-3 py-2.5 text-center text-[9px] font-medium uppercase tracking-wider text-[#9CA3AF]">
                  Mudanças modelo
                </th>
                <th className="px-3 py-2.5 text-center text-[9px] font-medium uppercase tracking-wider text-[#9CA3AF]">
                  Envios
                </th>
                <th className="px-3 py-2.5 text-center text-[9px] font-medium uppercase tracking-wider text-[#9CA3AF]">
                  Total ações
                </th>
                <th className="px-3 py-2.5 text-right text-[9px] font-medium uppercase tracking-wider text-[#9CA3AF]">
                  Última atividade
                </th>
              </tr>
            </thead>
            <tbody>
              {userProfiles.map((u) => {
                const model = u.allocationModel ? modelLabels[u.allocationModel] : null;
                return (
                  <tr key={u.id} className="border-b border-[#E8E6E1]/50 last:border-0">
                    <td className="px-4 py-2.5">
                      <div>
                        <p className="text-sm font-medium text-[#1A1A1A]">{u.name}</p>
                        <p className="text-[10px] text-[#9CA3AF]">
                          {u.curso ?? "—"}
                          {u.sala ? ` · ${u.sala}` : ""}
                        </p>
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      {u.hasPortfolio ? (
                        <CheckCircle2 className="h-4 w-4 text-[#16A34A] mx-auto" />
                      ) : u.hasAnyEvent ? (
                        <XCircle className="h-4 w-4 text-[#D97706] mx-auto" />
                      ) : (
                        <span className="h-4 w-4 rounded-full border-2 border-[#E8E6E1] block mx-auto" />
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      {model ? (
                        <span className={cn("text-[10px] font-medium rounded-full px-2 py-0.5", model.bg, model.color)}>
                          {model.label}
                        </span>
                      ) : (
                        <span className="text-[10px] text-[#D9D7D2]">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-center text-xs font-mono tabular-nums text-[#5C5C5C]">
                      {u.logins || <span className="text-[#E8E6E1]">0</span>}
                    </td>
                    <td className="px-3 py-2.5 text-center text-xs font-mono tabular-nums text-[#5C5C5C]">
                      {u.modelChanges || <span className="text-[#E8E6E1]">0</span>}
                    </td>
                    <td className="px-3 py-2.5 text-center text-xs font-mono tabular-nums text-[#5C5C5C]">
                      {u.submissions || <span className="text-[#E8E6E1]">0</span>}
                    </td>
                    <td className="px-3 py-2.5 text-center text-xs font-mono tabular-nums text-[#5C5C5C]">
                      {u.totalActions || <span className="text-[#E8E6E1]">0</span>}
                    </td>
                    <td className="px-3 py-2.5 text-right text-[10px] text-[#9CA3AF] tabular-nums whitespace-nowrap">
                      {u.lastSeen
                        ? new Date(u.lastSeen).toLocaleString("pt-BR", {
                            day: "2-digit",
                            month: "2-digit",
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recent events feed */}
      <div className="rounded-xl border border-[#E8E6E1] bg-white p-5">
        <p className="text-xs font-medium uppercase tracking-wider text-[#9CA3AF] mb-4">
          <Clock className="inline h-3.5 w-3.5 mr-1" />
          Últimos 30 eventos
        </p>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#E8E6E1]">
                <th className="px-3 py-2 text-left text-[9px] font-medium uppercase tracking-wider text-[#9CA3AF]">
                  Quando
                </th>
                <th className="px-3 py-2 text-left text-[9px] font-medium uppercase tracking-wider text-[#9CA3AF]">
                  Usuário
                </th>
                <th className="px-3 py-2 text-left text-[9px] font-medium uppercase tracking-wider text-[#9CA3AF]">
                  Evento
                </th>
                <th className="px-3 py-2 text-left text-[9px] font-medium uppercase tracking-wider text-[#9CA3AF]">
                  Detalhes
                </th>
              </tr>
            </thead>
            <tbody>
              {(await db.query.events.findMany({
                orderBy: desc(schema.events.createdAt),
                limit: 30,
                with: { user: true },
              })).map((e) => (
                <tr key={e.id} className="border-b border-[#E8E6E1]/50 last:border-0">
                  <td className="px-3 py-2 text-[11px] text-[#9CA3AF] whitespace-nowrap tabular-nums">
                    {new Date(e.createdAt).toLocaleString("pt-BR", {
                      day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit",
                    })}
                  </td>
                  <td className="px-3 py-2 text-[11px] text-[#5C5C5C] whitespace-nowrap">
                    {e.user?.name ?? <span className="text-[#D9D7D2]">anônimo</span>}
                  </td>
                  <td className="px-3 py-2">
                    <span className="inline-flex items-center rounded-md bg-[#F5F4F0] px-2 py-0.5 text-[10px] font-mono font-medium text-[#5C5C5C]">
                      {e.event}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-[11px] text-[#9CA3AF] font-mono max-w-[250px] truncate">
                    {e.metadata ?? "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
