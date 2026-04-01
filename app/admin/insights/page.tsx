import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db, schema } from "@/lib/db";
import { eq, desc, sql, count } from "drizzle-orm";
import {
  BarChart3,
  Users,
  MousePointerClick,
  TrendingUp,
  Clock,
  Smartphone,
  Hash,
} from "lucide-react";

export default async function InsightsPage() {
  const session = await getSession();
  if (!session || session.type !== "admin") redirect("/login");

  // Total events
  const [totalEvents] = await db
    .select({ value: count() })
    .from(schema.events);

  // Total unique users who triggered events
  const [uniqueUsers] = await db
    .select({ value: sql<number>`COUNT(DISTINCT ${schema.events.userId})` })
    .from(schema.events);

  // Events by type
  const eventsByType = await db
    .select({
      event: schema.events.event,
      total: count(),
    })
    .from(schema.events)
    .groupBy(schema.events.event)
    .orderBy(desc(count()));

  // Logins by method (cpf vs phone)
  const loginEvents = await db
    .select({
      metadata: schema.events.metadata,
    })
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

  // Most popular allocation models
  const modelEvents = await db
    .select({ metadata: schema.events.metadata })
    .from(schema.events)
    .where(eq(schema.events.event, "model_select"));

  const modelCounts: Record<string, number> = {};
  for (const e of modelEvents) {
    try {
      const m = JSON.parse(e.metadata ?? "{}");
      const label = m.label ?? `Modelo ${m.model}`;
      modelCounts[label] = (modelCounts[label] ?? 0) + 1;
    } catch {}
  }
  const modelRanking = Object.entries(modelCounts).sort((a, b) => b[1] - a[1]);

  // Most selected stocks (from portfolio_submit events)
  const submitEvents = await db
    .select({ metadata: schema.events.metadata })
    .from(schema.events)
    .where(eq(schema.events.event, "portfolio_submit"));

  const stockCounts: Record<string, number> = {};
  for (const e of submitEvents) {
    try {
      const m = JSON.parse(e.metadata ?? "{}");
      for (const ticker of m.stocks ?? []) {
        stockCounts[ticker] = (stockCounts[ticker] ?? 0) + 1;
      }
    } catch {}
  }
  const topStocks = Object.entries(stockCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  // Recent events (last 20)
  const recentEvents = await db.query.events.findMany({
    orderBy: desc(schema.events.createdAt),
    limit: 20,
    with: { user: true } as never,
  });

  // Funnel: register_start → register_complete
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

  // Events per day (last 7 days)
  const dailyEvents = await db
    .select({
      day: sql<string>`DATE(${schema.events.createdAt})`,
      total: count(),
    })
    .from(schema.events)
    .groupBy(sql`DATE(${schema.events.createdAt})`)
    .orderBy(desc(sql`DATE(${schema.events.createdAt})`))
    .limit(7);

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="font-heading text-2xl font-bold text-[#1A1A1A]">
          Insights de Uso
        </h1>
        <p className="mt-1 text-sm text-[#9CA3AF]">
          Monitoramento de engajamento e comportamento
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
        <div className="rounded-xl border border-[#E8E6E1] bg-white p-4">
          <div className="flex items-center gap-2 text-[#9CA3AF] text-xs mb-1">
            <MousePointerClick className="h-3.5 w-3.5" />
            Total eventos
          </div>
          <p className="text-2xl font-bold text-[#1A1A1A]">
            {totalEvents.value}
          </p>
        </div>
        <div className="rounded-xl border border-[#E8E6E1] bg-white p-4">
          <div className="flex items-center gap-2 text-[#9CA3AF] text-xs mb-1">
            <Users className="h-3.5 w-3.5" />
            Usuários ativos
          </div>
          <p className="text-2xl font-bold text-[#1A1A1A]">
            {uniqueUsers.value}
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
                      <span className="text-xs font-mono text-[#5C5C5C]">
                        {e.event}
                      </span>
                      <span className="text-xs font-mono font-bold text-[#1A1A1A] tabular-nums">
                        {e.total}
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full bg-[#F5F4F0]">
                      <div
                        className="h-1.5 rounded-full bg-[#C6AD7C]"
                        style={{ width: `${pct}%` }}
                      />
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
                        {new Date(d.day + "T12:00:00").toLocaleDateString(
                          "pt-BR",
                          { weekday: "short", day: "2-digit", month: "2-digit" }
                        )}
                      </span>
                      <span className="text-xs font-mono font-bold text-[#1A1A1A] tabular-nums">
                        {d.total}
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full bg-[#F5F4F0]">
                      <div
                        className="h-1.5 rounded-full bg-[#16A34A]"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Model popularity */}
        <div className="rounded-xl border border-[#E8E6E1] bg-white p-5">
          <p className="text-xs font-medium uppercase tracking-wider text-[#9CA3AF] mb-4">
            Modelos mais escolhidos
          </p>
          {modelRanking.length === 0 ? (
            <p className="text-sm text-[#D9D7D2]">Sem dados</p>
          ) : (
            <div className="space-y-2.5">
              {modelRanking.map(([label, cnt]) => (
                <div
                  key={label}
                  className="flex items-center justify-between"
                >
                  <span className="text-sm text-[#5C5C5C]">{label}</span>
                  <span className="text-sm font-mono font-bold text-[#1A1A1A] tabular-nums">
                    {cnt}x
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Top stocks */}
        <div className="rounded-xl border border-[#E8E6E1] bg-white p-5">
          <p className="text-xs font-medium uppercase tracking-wider text-[#9CA3AF] mb-4">
            Ações mais submetidas
          </p>
          {topStocks.length === 0 ? (
            <p className="text-sm text-[#D9D7D2]">Sem dados</p>
          ) : (
            <div className="space-y-2">
              {topStocks.map(([ticker, cnt], i) => (
                <div
                  key={ticker}
                  className="flex items-center justify-between"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-[#D9D7D2] w-4 tabular-nums">
                      {i + 1}
                    </span>
                    <span className="text-sm font-mono font-semibold text-[#1A1A1A]">
                      {ticker}
                    </span>
                  </div>
                  <span className="text-sm font-mono text-[#9CA3AF] tabular-nums">
                    {cnt}x
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recent events feed */}
      <div className="rounded-xl border border-[#E8E6E1] bg-white p-5">
        <p className="text-xs font-medium uppercase tracking-wider text-[#9CA3AF] mb-4">
          <Clock className="inline h-3.5 w-3.5 mr-1" />
          Últimos eventos
        </p>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#E8E6E1]">
                <th className="px-3 py-2 text-left text-[9px] font-medium uppercase tracking-wider text-[#9CA3AF]">
                  Quando
                </th>
                <th className="px-3 py-2 text-left text-[9px] font-medium uppercase tracking-wider text-[#9CA3AF]">
                  Evento
                </th>
                <th className="px-3 py-2 text-left text-[9px] font-medium uppercase tracking-wider text-[#9CA3AF]">
                  Página
                </th>
                <th className="px-3 py-2 text-left text-[9px] font-medium uppercase tracking-wider text-[#9CA3AF]">
                  Detalhes
                </th>
              </tr>
            </thead>
            <tbody>
              {(recentEvents as { id: string; event: string; page: string | null; metadata: string | null; createdAt: Date }[]).map((e) => (
                <tr
                  key={e.id}
                  className="border-b border-[#E8E6E1]/50 last:border-0"
                >
                  <td className="px-3 py-2 text-[11px] text-[#9CA3AF] whitespace-nowrap tabular-nums">
                    {new Date(e.createdAt).toLocaleString("pt-BR", {
                      day: "2-digit",
                      month: "2-digit",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </td>
                  <td className="px-3 py-2">
                    <span className="inline-flex items-center rounded-md bg-[#F5F4F0] px-2 py-0.5 text-[10px] font-mono font-medium text-[#5C5C5C]">
                      {e.event}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-[11px] text-[#9CA3AF] font-mono">
                    {e.page ?? "—"}
                  </td>
                  <td className="px-3 py-2 text-[11px] text-[#9CA3AF] font-mono max-w-[200px] truncate">
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
