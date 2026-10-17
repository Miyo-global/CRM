/**
 * One-off backfill for SEC-0006 / MIYO-0077: re-saves plaintext PAN, bank
 * details and Google tokens so the encrypted column types write ciphertext.
 *
 * Idempotent: only rows still holding plaintext are touched, so a second run
 * updates nothing. Needs ENCRYPTION_KEY (the same one the app uses).
 *
 *   ALLOW_REMOTE_DB=1 npx tsx --env-file=.env scripts/encrypt-pii-backfill.ts
 *
 * Run by Tarun, never by an agent against production.
 */
import { eq, and, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { accounts, users } from "@/lib/db/schema";
import { assertLocalDatabase } from "./_guard";

assertLocalDatabase("encrypt-pii-backfill");
if (!process.env.ENCRYPTION_KEY) throw new Error("ENCRYPTION_KEY is required");

const plain = (col: string) => sql.raw(`(${col} is not null and ${col} not like 'enc:v1:%')`);

async function main() {
  // Read through Drizzle (decrypts / passes legacy through), write back (encrypts).
  const userRows = await db
    .select({ id: users.id, taxId: users.taxId, bankDetails: users.bankDetails, googleRefreshToken: users.googleRefreshToken })
    .from(users)
    .where(sql`${plain("tax_id")} or ${plain("google_refresh_token")} or jsonb_typeof(bank_details) = 'object'`);
  for (const u of userRows) {
    await db
      .update(users)
      .set({ taxId: u.taxId, bankDetails: u.bankDetails, googleRefreshToken: u.googleRefreshToken })
      .where(eq(users.id, u.id));
  }
  console.log(`users re-encrypted: ${userRows.length}`);

  const accountRows = await db
    .select({ provider: accounts.provider, providerAccountId: accounts.providerAccountId, refresh: accounts.refresh_token, access: accounts.access_token, idToken: accounts.id_token })
    .from(accounts)
    .where(sql`${plain("refresh_token")} or ${plain("access_token")} or ${plain("id_token")}`);
  for (const a of accountRows) {
    await db
      .update(accounts)
      .set({ refresh_token: a.refresh, access_token: a.access, id_token: a.idToken })
      .where(and(eq(accounts.provider, a.provider), eq(accounts.providerAccountId, a.providerAccountId)));
  }
  console.log(`accounts re-encrypted: ${accountRows.length}`);
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
