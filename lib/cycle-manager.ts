import { db, schema } from "./db";
import { eq, and, desc, ne } from "drizzle-orm";
import { formatMonth, getLastDayOfMonth } from "./utils";

/**
 * Ensures a cycle exists for submissions.
 * Only creates a new cycle if ALL previous cycles are liquidated.
 * This prevents opening April before March is liquidated.
 */
export async function ensureCurrentCycle() {
  // If there's any non-liquidated cycle, return it (don't create new)
  const pending = await db.query.cycles.findFirst({
    where: ne(schema.cycles.status, "liquidated"),
    orderBy: [desc(schema.cycles.year), desc(schema.cycles.month)],
  });

  if (pending) return pending;

  // All cycles are liquidated (or none exist) — create new cycle for current month
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();

  const existing = await db.query.cycles.findFirst({
    where: and(
      eq(schema.cycles.month, month),
      eq(schema.cycles.year, year)
    ),
  });

  if (existing) return existing;

  const label = formatMonth(month, year);
  const deadline = getLastDayOfMonth(month, year);

  const [cycle] = await db
    .insert(schema.cycles)
    .values({ month, year, label, status: "open", deadline })
    .onConflictDoNothing()
    .returning();

  return cycle ?? existing;
}
