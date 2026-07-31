
import { createHash } from "crypto";
import { readFileSync, readdirSync } from "fs";
import { join } from "path";
import postgres from "postgres";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env" });

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) throw new Error("DATABASE_URL is required");

// Migrations already applied via db:push (do NOT include 0014 — it needs to run)
const BASELINE_TAGS = [
  "0000_glamorous_amazoness",
  "0001_typical_mockingbird",
  "0002_flaky_captain_cross",
  "0003_add_overtime_and_auto_checkout",
  "0004_brief_nekra",
  "0005_foamy_dust",
  "0006_magenta_night_nurse",
  "0007_add_projects_crm_tables",
  "0008_add_deal_activities",
  "0009_add_trigram_indexes",
  "0010_add_leave_priority",
  "0011_add_performance_indexes",
  "0012_add_soft_deletes",
  "0013_add_audit_columns",
];

// Timestamps from _journal.json
const TIMESTAMPS: Record<string, number> = {
  "0000_glamorous_amazoness":          1767162898184,
  "0001_typical_mockingbird":          1768129123682,
  "0002_flaky_captain_cross":          1768982869418,
  "0003_add_overtime_and_auto_checkout": 1738700000000,
  "0004_brief_nekra":                  1773141065397,
  "0005_foamy_dust":                   1773144395110,
  "0006_magenta_night_nurse":          1773144609031,
  "0007_add_projects_crm_tables":      1774072680000,
  "0008_add_deal_activities":          1774082460000,
  "0009_add_trigram_indexes":          1774090000000,
  "0010_add_leave_priority":           1774100000000,
  "0011_add_performance_indexes":      1774110000000,
  "0012_add_soft_deletes":             1774120000000,
  "0013_add_audit_columns":            1774130000000,
};

const DRIZZLE_DIR = join(process.cwd(), "drizzle");

function hashFile(tag: string): string {
  const file = join(DRIZZLE_DIR, `${tag}.sql`);
  const content = readFileSync(file, "utf-8");
  return createHash("sha256").update(content).digest("hex");
}

async function main() {
  const sql = postgres(DATABASE_URL!, { max: 1, ssl: "require" });

  await sql`CREATE SCHEMA IF NOT EXISTS drizzle`;
  await sql`
    CREATE TABLE IF NOT EXISTS drizzle."__drizzle_migrations" (
      id         SERIAL PRIMARY KEY,
      hash       text NOT NULL,
      created_at bigint
    )
  `;

  const existing = await sql<{ hash: string }[]>`
    SELECT hash FROM drizzle."__drizzle_migrations"
  `;
  const existingHashes = new Set(existing.map((r) => r.hash));

  for (const tag of BASELINE_TAGS) {
    const hash = hashFile(tag);
    if (existingHashes.has(hash)) {
      continue;
    }
    const createdAt = TIMESTAMPS[tag];
    await sql`
      INSERT INTO drizzle."__drizzle_migrations" (hash, created_at)
      VALUES (${hash}, ${createdAt})
    `;
  }

  await sql.end();
  process.exit(0);
}

main().catch((err) => {
  console.error("❌ Error:", err);
  process.exit(1);
});
