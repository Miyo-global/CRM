import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * KB-0024: every KB migration has to be reachable by the deploy applier.
 *
 * apply-pending-migrations.ts applies the explicit PENDING_TAGS baseline plus
 * every drizzle/NNNN_*.sql numbered after the last baseline tag, so a new file
 * needs no edit there — as long as its number really is higher. This test is
 * what catches a KB migration numbered into the baseline range, where it would
 * be silently skipped on deploy.
 */
const ROOT = join(__dirname, "..", "..");
const DRIZZLE = join(ROOT, "drizzle");

const applier = readFileSync(join(ROOT, "scripts", "apply-pending-migrations.ts"), "utf-8");

function baselineTags(): string[] {
  const block = applier.match(/const PENDING_TAGS = \[([\s\S]*?)\] as const;/);
  if (!block) throw new Error("PENDING_TAGS not found in apply-pending-migrations.ts");
  return [...block[1].matchAll(/"([^"]+)"/g)].map((m) => m[1]);
}

const lastBaseline = Math.max(...baselineTags().map((tag) => Number(tag.slice(0, 4))));

const kbFiles = readdirSync(DRIZZLE)
  .filter((f) => /^\d{4}_.*kb.*\.sql$/.test(f))
  .sort();

const journalTags: string[] = JSON.parse(
  readFileSync(join(DRIZZLE, "meta", "_journal.json"), "utf-8"),
).entries.map((e: { tag: string }) => e.tag);

describe("KB migrations", () => {
  it("has KB migration files", () => {
    expect(kbFiles.length).toBeGreaterThan(0);
  });

  it("numbers every KB migration after the applier's baseline, so deploy picks it up", () => {
    for (const file of kbFiles) {
      expect(Number(file.slice(0, 4)), file).toBeGreaterThan(lastBaseline);
    }
  });

  it("registers every KB migration in the drizzle journal", () => {
    for (const file of kbFiles) {
      expect(journalTags, file).toContain(file.replace(/\.sql$/, ""));
    }
  });

  it("gives every KB migration its own number", () => {
    // Some pre-KB migrations share a number; new ones must not.
    const numbers = kbFiles.map((f) => f.slice(0, 4));
    expect(new Set(numbers).size).toBe(numbers.length);
  });

  it("writes idempotent DDL: no bare CREATE TABLE or CREATE INDEX", () => {
    for (const file of kbFiles) {
      const sql = readFileSync(join(DRIZZLE, file), "utf-8");
      // Inside a DO block the statement is built with EXECUTE, and those still
      // say IF NOT EXISTS; this catches a plain top-level CREATE that does not.
      const bare = [...sql.matchAll(/CREATE (?:TABLE|INDEX|UNIQUE INDEX) (?!IF NOT EXISTS)/g)];
      expect(bare, `${file} has non-idempotent DDL`).toHaveLength(0);
    }
  });
});
