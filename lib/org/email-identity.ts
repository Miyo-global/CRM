import { and, eq, isNull, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { invitations, users } from "@/lib/db/schema";

type Db = Pick<typeof db, "query" | "delete">;

export const ACCOUNT_EXISTS_MESSAGE = "An account with this email already exists. Sign in instead.";

/**
 * The one identity check shared by invite, onboarding wizard and invitation
 * accept (R3-ONB-07): does any user already own this address? Case-insensitive.
 */
export async function findAccountByEmail(email: string, conn: Db = db) {
  return conn.query.users.findFirst({
    where: sql`lower(${users.email}) = ${email.trim().toLowerCase()}`,
    columns: { id: true },
  });
}

/**
 * Revoke every unaccepted invitation for this address in the org, so a link
 * sent before the person was onboarded another way cannot be used (R3-ONB-07).
 * Returns how many were revoked.
 */
export async function revokePendingInvitations(orgId: string, email: string, conn: Db = db) {
  const rows = await conn
    .delete(invitations)
    .where(
      and(
        eq(invitations.orgId, orgId),
        sql`lower(${invitations.email}) = ${email.trim().toLowerCase()}`,
        isNull(invitations.acceptedAt),
      ),
    )
    .returning({ id: invitations.id });
  return rows.length;
}
