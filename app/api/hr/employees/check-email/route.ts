import { withAdmin, ok, err } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { invitations } from "@/lib/db/schema";
import { and, eq, gt, isNull, sql } from "drizzle-orm";
import type { NextRequest } from "next/server";
import { z } from "zod";
import { findAccountByEmail } from "@/lib/org/email-identity";

export async function GET(req: NextRequest) {
  return withAdmin(async (session) => {
    const email = req.nextUrl.searchParams.get("email");
    if (!email || !z.string().email().safeParse(email).success) {
      return err("Invalid email", 400);
    }
    // Same identity check the onboard POST runs (R3-ONB-07): any existing
    // account blocks, not only members of this org, so step 1 and submit agree.
    const existing = await findAccountByEmail(email);
    const pending = existing
      ? undefined
      : await db.query.invitations.findFirst({
          where: and(
            eq(invitations.orgId, session.orgId),
            sql`lower(${invitations.email}) = ${email.trim().toLowerCase()}`,
            isNull(invitations.acceptedAt),
            gt(invitations.expiresAt, new Date()),
          ),
          columns: { id: true },
        });
    return ok({ exists: !!existing, pendingInvitation: !!pending });
  });
}
