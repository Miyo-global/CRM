import { type NextRequest } from "next/server";
import { withAuth, ok, err, parseBody } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { invitations, organizations, users } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { isAdminOrOwner } from "@/lib/auth/helpers";
import { sendInvitationEmail } from "@/lib/email";
import { baseUrl } from "@/lib/email/sender";
import { hashToken } from "@/lib/secret-crypto";
import { nanoid } from "nanoid";
import { z } from "zod";
import { createAuditLog } from "@/lib/audit-log";

// deliver "link" (R3-INV-12) rotates the token like a resend but returns the
// link for the admin to copy instead of emailing it. Only the hash is stored,
// so a fresh token is the only way to hand out a link; the old one stops working.
const schema = z.object({
  invitationId: z.string().min(1),
  deliver: z.enum(["email", "link"]).default("email"),
});

export async function POST(req: NextRequest) {
  return withAuth(async (session) => {
    if (!isAdminOrOwner(session.user.role)) return err("Forbidden", 403);

    const body = await parseBody(req, schema);

    const invitation = await db.query.invitations.findFirst({
      where: and(
        eq(invitations.id, body.invitationId),
        eq(invitations.orgId, session.orgId)
      ),
    });

    if (!invitation) return err("Invitation not found", 404);
    if (invitation.acceptedAt) return err("Invitation already accepted", 400);

    const newExpiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000);
    const newToken = nanoid(32);

    await db
      .update(invitations)
      .set({ expiresAt: newExpiresAt, token: hashToken(newToken) })
      .where(eq(invitations.id, body.invitationId));

    const audit = () =>
      void createAuditLog({
        action: "org.invitation_resent",
        userId: session.user.id,
        orgId: session.orgId,
        targetId: invitation.id,
        targetType: "invitation",
        metadata: {
          email: invitation.email,
          role: invitation.role,
          expiresAt: newExpiresAt.toISOString(),
          via: body.deliver,
        },
      }).catch(() => undefined);

    if (body.deliver === "link") {
      audit();
      return ok({ success: true, url: `${baseUrl}/invitation/${newToken}` });
    }

    const [org, inviter] = await Promise.all([
      db.query.organizations.findFirst({
        where: eq(organizations.id, session.orgId),
        columns: { name: true },
      }),
      db.query.users.findFirst({
        where: eq(users.id, session.user.id),
        columns: { name: true, firstName: true, lastName: true },
      }),
    ]);

    const inviterName =
      inviter?.firstName && inviter?.lastName
        ? `${inviter.firstName} ${inviter.lastName}`
        : inviter?.name ?? undefined;

    await sendInvitationEmail(invitation.email, newToken, org?.name ?? "Miyo Global", {
      inviterName,
      role: invitation.role,
      expiresOn: newExpiresAt,
    });

    audit();
    return ok({ success: true });
  });
}
