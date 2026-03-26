import { db, schema } from "./db";
import { eq, and, desc, ne } from "drizzle-orm";
import { formatMonth, getLastDayOfMonth } from "./utils";

/**
 * Ensures a cycle exists for the current month.
 * If not, creates it and closes any previous open cycle.
 * Called lazily from API routes — no cron needed.
 */
export async function ensureCurrentCycle() {
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();

  // Check if cycle already exists
  const existing = await db.query.cycles.findFirst({
    where: and(
      eq(schema.cycles.month, month),
      eq(schema.cycles.year, year)
    ),
  });

  if (existing) return existing;

  // Close any previous open cycles
  const openCycles = await db.query.cycles.findMany({
    where: eq(schema.cycles.status, "open"),
  });

  for (const oc of openCycles) {
    if (oc.month !== month || oc.year !== year) {
      await db
        .update(schema.cycles)
        .set({ status: "closed" })
        .where(eq(schema.cycles.id, oc.id));
    }
  }

  // Create new cycle
  const label = formatMonth(month, year);
  const deadline = getLastDayOfMonth(month, year);

  const [cycle] = await db
    .insert(schema.cycles)
    .values({ month, year, label, status: "open", deadline })
    .onConflictDoNothing()
    .returning();

  return cycle ?? existing;
}
