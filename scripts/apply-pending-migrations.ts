/**
 * Applies drizzle SQL migrations that are not yet recorded in
 * drizzle.__drizzle_migrations (idempotent SQL with IF NOT EXISTS is safe).
 */
import { createHash } from "crypto";
import { readFileSync } from "fs";
import { join } from "path";
import { DRIZZLE_DIR } from "@/lib/constants/paths";
import postgres from "postgres";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env" });

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) throw new Error("DATABASE_URL is required in .env");

const PENDING_TAGS = [
  "0117_payroll_leaves_display",
  "0118_document_folders_and_org_variables",
  "0119_payroll_paid_actor_timestamps",
  "0130_career_ladders_add_description",
  "0131_qa_batch2_fixes",
  "0132_qa_phase2_schema",
  "0145_hr_letter_templates",
  "0146_job_application_fields",
  "0147_candidate_offer_ceo_approval",
  "0150_drop_orphaned_tables",
] as const;

const TIMESTAMPS: Record<string, number> = {
  "0117_payroll_leaves_display": 1774390014500,
  "0118_document_folders_and_org_variables": 1774390014750,
  "0119_payroll_paid_actor_timestamps": 1774390015000,
  "0130_career_ladders_add_description": 1774390013000,
  "0131_qa_batch2_fixes": 1774390131000,
  "0132_qa_phase2_schema": 1774390132000,
  "0145_hr_letter_templates": 1774390145000,
  "0146_job_application_fields": 1774390146000,
  "0147_candidate_offer_ceo_approval": 1774390147000,
  "0150_drop_orphaned_tables": 1774390150000,
};


function hashFile(tag: string): string {
  const content = readFileSync(join(DRIZZLE_DIR, `${tag}.sql`), "utf-8");
  return createHash("sha256").update(content).digest("hex");
}

async function main() {
  const ssl = DATABASE_URL!.includes("localhost") ? false : "require";
  const sql = postgres(DATABASE_URL!, { max: 1, ssl });

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

  for (const tag of PENDING_TAGS) {
    const hash = hashFile(tag);
    if (existingHashes.has(hash)) {
      console.log(`skip (already applied): ${tag}`);
      continue;
    }

    const fileSql = readFileSync(join(DRIZZLE_DIR, `${tag}.sql`), "utf-8");
    console.log(`applying: ${tag}`);
    await sql.unsafe(fileSql);

    await sql`
      INSERT INTO drizzle."__drizzle_migrations" (hash, created_at)
      VALUES (${hash}, ${TIMESTAMPS[tag]})
    `;
    console.log(`done: ${tag}`);
  }

  await sql.end();
  console.log("All pending migrations processed.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
