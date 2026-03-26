import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db, schema } from "@/lib/db";
import { eq, asc, desc } from "drizzle-orm";
import { Users } from "lucide-react";
import { ParticipantsTable } from "./participants-table";

export default async function ParticipantesPage() {
  const session = await getSession();
  if (!session || session.type !== "admin") redirect("/login");

  const participants = await db.query.users.findMany({
    where: eq(schema.users.type, "participant"),
    orderBy: asc(schema.users.name),
  });

  // Find the most recent cycle (prefer open, then most recent by date)
  const latestCycle = await db.query.cycles.findFirst({
    orderBy: [
      asc(schema.cycles.status), // "open" < "closed" < "liquidated" alphabetically
      desc(schema.cycles.year),
      desc(schema.cycles.month),
    ],
  });

  // Fetch all portfolios for that cycle with stocks
  const portfolioMap: Record<
    string,
    { allocationModel: number; submittedAt: Date; stocks: string[] }
  > = {};

  if (latestCycle) {
    const portfolios = await db.query.portfolios.findMany({
      where: eq(schema.portfolios.cycleId, latestCycle.id),
      with: { stocks: { orderBy: asc(schema.portfolioStocks.position) } },
    });

    for (const p of portfolios) {
      portfolioMap[p.userId] = {
        allocationModel: p.allocationModel,
        submittedAt: p.submittedAt,
        stocks: p.stocks.map((s) => s.ticker),
      };
    }
  }

  const participantData = participants.map((p) => ({
    id: p.id,
    name: p.name,
    email: p.email,
    cpf: p.cpf,
    curso: p.curso,
    semestre: p.semestre,
    sala: p.sala,
    portfolio: portfolioMap[p.id]
      ? {
          allocationModel: portfolioMap[p.id].allocationModel,
          submittedAt: portfolioMap[p.id].submittedAt.toISOString(),
          stocks: portfolioMap[p.id].stocks,
        }
      : null,
  }));

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold text-[#1A1A1A]">
            Participantes
          </h1>
          <p className="mt-1 text-sm text-[#9CA3AF]">
            {participants.length} cadastrados
          </p>
        </div>
      </div>

      {participants.length === 0 ? (
        <div className="rounded-2xl border border-[#E8E6E1] bg-white p-12 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#F5F4F0]">
            <Users className="h-6 w-6 text-[#C6AD7C]" />
          </div>
          <h3 className="font-heading text-lg font-semibold text-[#1A1A1A]">
            Nenhum participante cadastrado
          </h3>
          <p className="mt-2 text-sm text-[#9CA3AF] max-w-md mx-auto">
            Os participantes se cadastram automaticamente via CPF na tela de
            login.
          </p>
        </div>
      ) : (
        <ParticipantsTable
          participants={participantData}
          cycleLabel={latestCycle?.label ?? null}
        />
      )}
    </div>
  );
}
