/**
 * Fails when lib/db/schema declares a table or column that the migrations in
 * drizzle/*.sql never create (MIYO-0003).
 *
 * Run against a scratch database that was built by replaying every
 * drizzle/*.sql file in order (CI does this, see .github/workflows/ci.yml):
 *   DATABASE_URL=postgres://... pnpm db:check-drift
 *
 * Older tables were created with `drizzle-kit push`, not by a migration, so
 * they are listed in scripts/schema-drift-baseline.txt. Only gaps that are
 * not in the baseline fail the check. Pass --update to rewrite the baseline.
 */
import { readFileSync, writeFileSync } from "fs";
import { join } from "path";
import { getTableConfig, PgTable } from "drizzle-orm/pg-core";
import postgres from "postgres";
import * as schema from "@/lib/db/schema";

const BASELINE = join(process.cwd(), "scripts", "schema-drift-baseline.txt");

function declaredColumns(): Set<string> {
  const out = new Set<string>();
  for (const value of Object.values(schema)) {
    if (!(value instanceof PgTable)) continue;
    const { name, schema: pgSchema, columns } = getTableConfig(value);
    if (pgSchema && pgSchema !== "public") continue;
    for (const col of columns) out.add(`${name}.${col.name}`);
  }
  return out;
}

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is required");
  const sql = postgres(url, { max: 1, onnotice: () => {} });
  const rows = await sql<{ t: string; c: string }[]>`
    SELECT table_name AS t, column_name AS c
    FROM information_schema.columns WHERE table_schema = 'public'`;
  await sql.end();

  const actual = new Set(rows.map((r) => `${r.t}.${r.c}`));
  const missing = [...declaredColumns()].filter((k) => !actual.has(k)).sort();

  if (process.argv.includes("--update")) {
    writeFileSync(BASELINE, missing.join("\n") + "\n");
    console.log(`baseline updated: ${missing.length} known gaps`);
    return;
  }

  const baseline = new Set(
    readFileSync(BASELINE, "utf-8").split("\n").map((l) => l.trim()).filter(Boolean),
  );
  const added = missing.filter((k) => !baseline.has(k));
  const fixed = [...baseline].filter((k) => !missing.includes(k));

  if (fixed.length) {
    console.log(`${fixed.length} baseline entries now exist; run with --update to drop them.`);
  }
  if (added.length) {
    console.error("Schema declares columns that no migration creates:");
    for (const k of added) console.error(`  ${k}`);
    console.error("Add a migration in drizzle/ (IF NOT EXISTS) for each.");
    process.exit(1);
  }
  console.log(`schema drift ok (${missing.length} baseline gaps, 0 new)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
