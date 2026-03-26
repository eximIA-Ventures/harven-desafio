import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db, schema } from "@/lib/db";
import { formatMonth, getLastDayOfMonth } from "@/lib/utils";

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.type !== "admin") {
      return NextResponse.json({ error: "Acesso restrito" }, { status: 403 });
    }

    const body = await request.json();
    const { month, year } = body;

    if (!month || !year || month < 1 || month > 12 || year < 2024) {
      return NextResponse.json(
        { error: "Mês e ano inválidos" },
        { status: 400 }
      );
    }

    const label = formatMonth(month, year);
    const deadline = getLastDayOfMonth(month, year);

    const [cycle] = await db
      .insert(schema.cycles)
      .values({ month, year, label, status: "open", deadline })
      .onConflictDoNothing()
      .returning();

    if (!cycle) {
      return NextResponse.json(
        { error: `Ciclo ${label} já existe` },
        { status: 409 }
      );
    }

    return NextResponse.json({ success: true, cycle });
  } catch (error) {
    console.error("Create cycle error:", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
