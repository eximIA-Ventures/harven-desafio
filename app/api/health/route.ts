import { NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { count } from "drizzle-orm";

export async function GET() {
  try {
    const [result] = await db.select({ value: count() }).from(schema.users);
    return NextResponse.json({
      status: "ok",
      timestamp: new Date().toISOString(),
      users: result.value,
    });
  } catch {
    return NextResponse.json(
      { status: "error", timestamp: new Date().toISOString() },
      { status: 503 }
    );
  }
}
