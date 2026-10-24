import { type NextRequest } from "next/server";
import { ok, err } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { invitations, organizations } from "@/lib/db/schema";
import { eq, and, gt, isNull } from "drizzle-orm";
import { hashToken } from "@/lib/secret-crypto";
import { ACCOUNT_EXISTS_MESSAGE, findAccountByEmail } from "@/lib/org/email-identity";

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  if (!token) return err("Missing token", 400);

  const invitation = await db.query.invitations.findFirst({
    where: and(
      eq(invitations.token, hashToken(token)),
      gt(invitations.expiresAt, new Date()),
      isNull(invitations.acceptedAt)
    ),
  });

  if (!invitation) return err("Invalid or expired invitation", 404);
  // A stale invite for someone who already has an account must not offer
  // "Join Organization" (R3-ONB-07).
  if (await findAccountByEmail(invitation.email)) return err(ACCOUNT_EXISTS_MESSAGE, 409);

  const org = await db.query.organizations.findFirst({
    where: eq(organizations.id, invitation.orgId),
  });

  return ok({
    email: invitation.email,
    organizationName: org?.name ?? "Unknown",
    role: invitation.role,
  });
}
