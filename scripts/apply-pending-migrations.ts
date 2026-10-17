/**
 * Applies drizzle SQL migrations that are not yet recorded in
 * drizzle.__drizzle_migrations (idempotent SQL with IF NOT EXISTS is safe).
 *
 * `--deploy` (pnpm db:migrate:deploy, run by the Vercel build) reads only
 * DATABASE_URL_MIGRATE, never DATABASE_URL, and skips preview builds. A
 * production build without DATABASE_URL_MIGRATE fails, as does any failing
 * migration, so code never ships ahead of its schema (MIYO-0002).
 * A pg advisory lock stops two concurrent deploys migrating at once.
 *
 * Applied set: the explicit PENDING_TAGS baseline plus every drizzle/*.sql
 * numbered after the last baseline tag, so a new migration file needs no
 * edit here. Each file runs in its own transaction.
 */
import { createHash } from "crypto";
import { readFileSync, readdirSync } from "fs";
import { join } from "path";
import { DRIZZLE_DIR } from "@/lib/constants/paths";
import postgres from "postgres";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env" });

const DEPLOY = process.argv.includes("--deploy");
const DATABASE_URL = DEPLOY ? process.env.DATABASE_URL_MIGRATE : process.env.DATABASE_URL;
const MIGRATION_LOCK_ID = 727_001; // arbitrary, shared by every deploy

if (DEPLOY && process.env.VERCEL_ENV && process.env.VERCEL_ENV !== "production") {
  console.log(`skip migrations: VERCEL_ENV=${process.env.VERCEL_ENV}`);
  process.exit(0);
}
if (DEPLOY && !DATABASE_URL) {
  if (process.env.VERCEL_ENV === "production") {
    console.error("DATABASE_URL_MIGRATE is not set for this production build; refusing to ship code ahead of its schema.");
    process.exit(1);
  }
  console.log("skip migrations: DATABASE_URL_MIGRATE is not set");
  process.exit(0);
}
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
  "0151_remove_branch_roles",
  "0152_reimbursement_expense_link",
  "0153_dashboard_hot_path_indexes",
  "0154_projects_build_port_phase1",
  "0155_project_invitations",
  "0156_project_intake_token_client_portal",
  "0157_salary_structure_ot_multiplier_default_1x",
  "0158_salary_structure_professional_tax_drop_default",
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
  "0151_remove_branch_roles": 1774390151000,
  "0152_reimbursement_expense_link": 1774390152000,
  "0153_dashboard_hot_path_indexes": 1774390153000,
  "0154_projects_build_port_phase1": 1774390154000,
  "0155_project_invitations": 1774390155000,
  "0156_project_intake_token_client_portal": 1774390156000,
  "0157_salary_structure_ot_multiplier_default_1x": 1774390157000,
  "0158_salary_structure_professional_tax_drop_default": 1774390158000,
};

const migrationNumber = (tag: string) => Number(tag.slice(0, 4));
const LAST_BASELINE = Math.max(...PENDING_TAGS.map(migrationNumber));

/** Baseline tags, then every newer drizzle/NNNN_*.sql in order. */
function tagsToApply(files: readonly string[]): string[] {
  const newer = files
    .filter((f) => /^\d{4}_.+\.sql$/.test(f))
    .map((f) => f.replace(/\.sql$/, ""))
    .filter((tag) => migrationNumber(tag) > LAST_BASELINE)
    .sort();
  return [...PENDING_TAGS, ...newer];
}

function hashFile(tag: string): string {
  const content = readFileSync(join(DRIZZLE_DIR, `${tag}.sql`), "utf-8");
  return createHash("sha256").update(content).digest("hex");
}

async function main() {
  const ssl = DATABASE_URL!.includes("localhost") ? false : "require";
  const sql = postgres(DATABASE_URL!, { max: 1, ssl, onnotice: () => {} });

  await sql`SELECT pg_advisory_lock(${MIGRATION_LOCK_ID})`;
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

  for (const tag of tagsToApply(readdirSync(DRIZZLE_DIR))) {
    const hash = hashFile(tag);
    if (existingHashes.has(hash)) {
      console.log(`skip (already applied): ${tag}`);
      continue;
    }

    const fileSql = readFileSync(join(DRIZZLE_DIR, `${tag}.sql`), "utf-8");
    console.log(`applying: ${tag}`);
    await sql.begin(async (tx) => {
      await tx.unsafe(fileSql);
      await tx`
        INSERT INTO drizzle."__drizzle_migrations" (hash, created_at)
        VALUES (${hash}, ${TIMESTAMPS[tag] ?? Date.now()})
      `;
    });
    console.log(`applied: ${tag}`);
  }

  await sql`SELECT pg_advisory_unlock(${MIGRATION_LOCK_ID})`;
  await sql.end();
  console.log("All pending migrations processed.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
