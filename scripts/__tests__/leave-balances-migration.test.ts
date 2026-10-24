import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import postgres from "postgres";

/**
 * drizzle/0193 removes duplicate leave_balances rows. The deletion has to keep
 * exactly the row the app was reading (the oldest, lowest id), back up the
 * rest first, and be safe to run twice.
 *
 * The SQL itself runs only when MIGRATION_TEST_DATABASE_URL points at a
 * scratch Postgres (never the app's DATABASE_URL); it works in a throwaway
 * schema and drops it afterwards.
 */
const SQL = readFileSync(join(__dirname, "..", "..", "drizzle", "0193_leave_balances_unique.sql"), "utf-8");
const URL = process.env.MIGRATION_TEST_DATABASE_URL;

describe("0193_leave_balances_unique (static)", () => {
  it("backs up before it deletes, and deletes before it adds the index", () => {
    const backup = SQL.indexOf('INSERT INTO "leave_balances_dupes_backup_0193"');
    const del = SQL.indexOf('DELETE FROM "leave_balances"');
    const index = SQL.indexOf("CREATE UNIQUE INDEX IF NOT EXISTS");
    expect(backup).toBeGreaterThan(-1);
    expect(del).toBeGreaterThan(backup);
    expect(index).toBeGreaterThan(del);
  });

  it("writes idempotent DDL", () => {
    expect([...SQL.matchAll(/CREATE (?:TABLE|INDEX|UNIQUE INDEX) (?!IF NOT EXISTS)/g)]).toHaveLength(0);
  });
});

describe.skipIf(!URL)("0193_leave_balances_unique (against Postgres)", () => {
  const schema = `mig0193_${process.pid}`;
  const sql = URL ? postgres(URL, { max: 1, onnotice: () => {} }) : null!;

  beforeAll(async () => {
    await sql.unsafe(`CREATE SCHEMA ${schema}; SET search_path TO ${schema};`);
    await sql.unsafe(`
      CREATE TABLE leave_balances (
        id serial PRIMARY KEY, org_id text NOT NULL, user_id text NOT NULL,
        leave_type_id integer, balance numeric DEFAULT '0' NOT NULL, year integer NOT NULL
      );
      INSERT INTO leave_balances (id, org_id, user_id, leave_type_id, balance, year) VALUES
        (1, 'o', 'u', 10, '9',  2026),  -- real row (oldest)
        (2, 'o', 'u', 10, '12', 2026),  -- untouched duplicate
        (3, 'o', 'u', 10, '12', 2026),  -- second duplicate
        (4, 'o', 'u', 11, '5',  2026),  -- other type: kept
        (5, 'o', 'u', 10, '12', 2025),  -- other year: kept
        (6, 'o2','u', 10, '12', 2026),  -- other org: kept
        (7, 'o', 'u2',10, '12', 2026);  -- other user: kept
    `);
  });

  afterAll(async () => {
    await sql.unsafe(`DROP SCHEMA ${schema} CASCADE`);
    await sql.end();
  });

  it("keeps the oldest row per (org, user, type, year) and backs up the rest", async () => {
    await sql.begin((tx) => tx.unsafe(SQL));
    const kept = await sql.unsafe(`SELECT id FROM leave_balances ORDER BY id`);
    expect(kept.map((r) => r.id)).toEqual([1, 4, 5, 6, 7]);
    const backup = await sql.unsafe(`SELECT id, balance FROM leave_balances_dupes_backup_0193 ORDER BY id`);
    expect(backup.map((r) => [r.id, r.balance])).toEqual([[2, "12"], [3, "12"]]);
  });

  it("is idempotent and leaves the unique index enforcing one row", async () => {
    await sql.begin((tx) => tx.unsafe(SQL));
    const backup = await sql.unsafe(`SELECT count(*)::int AS n FROM leave_balances_dupes_backup_0193`);
    expect(backup[0].n).toBe(2);
    await expect(
      sql.unsafe(`INSERT INTO leave_balances (id, org_id, user_id, leave_type_id, year) VALUES (99, 'o', 'u', 10, 2026)`),
    ).rejects.toThrow(/uq_leave_balances_org_user_type_year/);
  });
});
