/**
 * Seed script — creates admin user + first cycle
 *
 * Usage: npx tsx scripts/seed.ts
 *
 * Environment: DATABASE_URL must be set
 */

import postgres from "postgres";
import bcrypt from "bcryptjs";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("DATABASE_URL is required");
  process.exit(1);
}

const sql = postgres(DATABASE_URL, { ssl: "require" });

async function seed() {
  console.log("Seeding database...\n");

  // --- Admin user ---
  const adminEmail = "hugo.capitelli@eximiaventures.com.br";
  const adminPassword = process.env.ADMIN_PASSWORD || "Eximia@@171227";
  const passwordHash = await bcrypt.hash(adminPassword, 12);

  const existing = await sql`
    SELECT id FROM dc_users WHERE email = ${adminEmail} AND type = 'admin'
  `;

  if (existing.length > 0) {
    console.log(`Admin already exists: ${adminEmail}`);
  } else {
    await sql`
      INSERT INTO dc_users (id, name, email, password_hash, type, active, created_at, updated_at)
      VALUES (
        gen_random_uuid(),
        'Hugo Capitelli',
        ${adminEmail},
        ${passwordHash},
        'admin',
        true,
        now(),
        now()
      )
    `;
    console.log(`Admin created: ${adminEmail} / ${adminPassword}`);
  }

  // --- Current cycle (Abril 2026) ---
  const month = 4;
  const year = 2026;
  const label = "Abril 2026";
  const deadline = new Date(2026, 3, 30, 18, 0, 0); // April 30, 18h

  const existingCycle = await sql`
    SELECT id FROM dc_cycles WHERE month = ${month} AND year = ${year}
  `;

  if (existingCycle.length > 0) {
    console.log(`Cycle already exists: ${label}`);
  } else {
    await sql`
      INSERT INTO dc_cycles (id, month, year, label, status, deadline, created_at)
      VALUES (
        gen_random_uuid(),
        ${month},
        ${year},
        ${label},
        'open',
        ${deadline},
        now()
      )
    `;
    console.log(`Cycle created: ${label} (deadline: ${deadline.toLocaleDateString("pt-BR")})`);
  }

  console.log("\nSeed complete.");
  await sql.end();
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
