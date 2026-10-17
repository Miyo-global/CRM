import { createHash } from "crypto";
import { sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { err } from "@/lib/api/helpers";

let tableEnsured = false;

async function ensureTable(): Promise<void> {
  if (tableEnsured) return;
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS submit_guard (
      key text PRIMARY KEY,
      created_at timestamptz NOT NULL DEFAULT now()
    )
  `);
  tableEnsured = true;
}

/** Stable fingerprint of one person's create request. */
export function submitKey(scope: string, userId: string, payload: unknown): string {
  const body = createHash("sha256").update(JSON.stringify(payload ?? null)).digest("hex").slice(0, 32);
  return `${scope}:${userId}:${body}`;
}

/**
 * Rejects the same create from the same person within `windowSeconds`
 * (R3-0008): six parallel clicks used to make six loans, departments,
 * holidays or calendar events. One atomic upsert, so concurrent requests
 * cannot both pass. Returns a 409 response for a duplicate, else null.
 * If the guard table cannot be reached the request goes through.
 */
export async function rejectDuplicateSubmit(
  scope: string,
  userId: string,
  payload: unknown,
  windowSeconds = 10,
) {
  const key = submitKey(scope, userId, payload);
  try {
    await ensureTable();
    const res = await db.execute<{ key: string }>(sql`
      INSERT INTO submit_guard (key, created_at) VALUES (${key}, now())
      ON CONFLICT (key) DO UPDATE SET created_at = now()
        WHERE submit_guard.created_at < now() - make_interval(secs => ${windowSeconds})
      RETURNING key
    `);
    const rows = (res as unknown as { rows?: unknown[] }).rows ?? (res as unknown as unknown[]);
    if (Array.isArray(rows) && rows.length === 0) {
      return err("This was just submitted. Refresh to see it.", 409);
    }
  } catch {
    // ponytail: fail open if the guard table is unavailable; the create still works.
  }
  return null;
}
