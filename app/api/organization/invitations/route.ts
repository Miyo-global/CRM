import { type NextRequest } from "next/server";
import { withAuth, ok, err, serverError } from "@/lib/api/helpers";
import { getInvitations } from "@/server/queries/organization";
import { db } from "@/lib/db";
import { invitations } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { isAdminOrOwner } from "@/lib/auth/helpers";
import { z } from "zod";
import { createAuditLog } from "@/lib/audit-log";

const cancelSchema = z.object({
  invitationId: z.string(),
});

export async function GET() {
  return withAuth(async (session) => {
    try {
      if (!isAdminOrOwner(session.user.role)) {
        return err("Forbidden", 403);
      }
      const data = await getInvitations(session.orgId);
      return ok(data);
    } catch (error) {
      return serverError(error, { route: "organization/invitations", orgId: session.orgId }, "Failed to load invitations.");
    }
  });
}

export async function DELETE(req: NextRequest) {
  return withAuth(async (session) => {
    try {
      if (!isAdminOrOwner(session.user.role)) {
        return err("Forbidden", 403);
      }

      const body = await req.json();
      const { invitationId } = cancelSchema.parse(body);

      const [revoked] = await db
        .delete(invitations)
        .where(and(eq(invitations.id, invitationId), eq(invitations.orgId, session.orgId)))
        .returning({ id: invitations.id, email: invitations.email, role: invitations.role });

      if (revoked) {
        void createAuditLog({
          action: "org.invitation_revoked",
          userId: session.user.id,
          orgId: session.orgId,
          targetId: revoked.id,
          targetType: "invitation",
          metadata: { email: revoked.email, role: revoked.role },
        }).catch(() => undefined);
      }

      return ok({ success: true });
    } catch (error) {
      return serverError(error, { route: "organization/invitations", orgId: session.orgId }, "Failed to cancel invitation.");
    }
  });
}
