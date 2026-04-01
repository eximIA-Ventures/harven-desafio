import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db, schema } from "@/lib/db";

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    const body = await request.json();
    const { event, page, metadata } = body;

    if (!event) {
      return NextResponse.json({ ok: false }, { status: 400 });
    }

    await db.insert(schema.events).values({
      userId: session?.id ?? null,
      event,
      page: page ?? null,
      metadata: metadata ? JSON.stringify(metadata) : null,
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
