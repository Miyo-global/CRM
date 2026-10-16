import { type NextRequest } from "next/server";
import { withAuth, ok, err, serverError } from "@/lib/api/helpers";
import { getInvitations } from "@/server/queries/organization";
import { db } from "@/lib/db";
import { invitations } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { isAdminOrOwner } from "@/lib/auth/helpers";
import { z } from "zod";

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

      await db.delete(invitations).where(
        and(
          eq(invitations.id, invitationId),
          eq(invitations.orgId, session.orgId)
        )
      );

      return ok({ success: true });
    } catch (error) {
      return serverError(error, { route: "organization/invitations", orgId: session.orgId }, "Failed to cancel invitation.");
    }
  });
}
