import { type NextRequest } from "next/server";
import { withAuth, ok, err, serverError } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { organizationMembers, users } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { isAdminOrOwner } from "@/lib/auth/helpers";
import { createAuditLog } from "@/lib/audit-log";
import { checkRoleAssignment } from "@/lib/auth/role-assignment";
import { z } from "zod";

const updateRoleSchema = z.object({
  role: z.string().min(1),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ memberId: string }> }
) {
  return withAuth(async (session) => {
    try {
      const { memberId: userId } = await params;

      // Admins and HR may move ordinary members; checkRoleAssignment keeps
      // Admin-level roles and the Super Admin for the Super Admin alone
      // (QA-AUTH-01). A CEO-only gate here left an org whose owner held
      // plain Admin unable to change any role.
      if (!isAdminOrOwner(session.user.role)) {
        return err("Only admins can update member roles", 403);
      }

      const body = await req.json();
      const role = updateRoleSchema.parse(body).role.trim().toUpperCase();

      const member = await db.query.organizationMembers.findFirst({
        where: and(eq(organizationMembers.userId, userId), eq(organizationMembers.orgId, session.orgId)),
        columns: { role: true },
      });
      if (!member) return err("Member not found in this organization", 404);
      const roleError = await checkRoleAssignment({
        orgId: session.orgId,
        actorRole: session.user.role,
        actorId: session.user.id,
        targetUserId: userId,
        targetCurrentRole: member.role,
        newRole: role,
      });
      if (roleError) return err(roleError.message, roleError.status);

      await db.transaction(async (tx) => {
        const updated = await tx
          .update(organizationMembers)
          .set({ role })
          .where(
            and(
              eq(organizationMembers.userId, userId),
              eq(organizationMembers.orgId, session.orgId)
            )
          )
          .returning({ userId: organizationMembers.userId });

        if (updated.length === 0) {
          throw new Error("Member not found in this organization");
        }

        await tx.update(users).set({ role }).where(eq(users.id, userId));
      });

      await createAuditLog({
        action: "org.member_role_changed",
        userId: session.user.id,
        orgId: session.orgId,
        targetId: userId,
        targetType: "user",
        metadata: { newRole: role },
      });

      return ok({ success: true });
    } catch (error) {
      return serverError(error, { route: "organization/members/[memberId]", orgId: session.orgId }, "Failed to update member role.");
    }
  });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ memberId: string }> }
) {
  return withAuth(async (session) => {
    try {
      const { memberId: userId } = await params;

      if (userId === session.user.id) {
        return err("You cannot remove yourself from the organization", 400);
      }

      if (!isAdminOrOwner(session.user.role)) {
        return err("Forbidden", 403);
      }

      const target = await db.query.organizationMembers.findFirst({
        where: and(eq(organizationMembers.userId, userId), eq(organizationMembers.orgId, session.orgId)),
        columns: { role: true },
      });
      if (target?.role === "CEO") {
        return err("The Super Admin cannot be removed from the organization", 403);
      }

      await db
        .delete(organizationMembers)
        .where(
          and(
            eq(organizationMembers.userId, userId),
            eq(organizationMembers.orgId, session.orgId)
          )
        );

      await createAuditLog({
        action: "org.member_removed",
        userId: session.user.id,
        orgId: session.orgId,
        targetId: userId,
        targetType: "user",
      });

      return ok({ success: true });
    } catch (error) {
      return serverError(error, { route: "organization/members/[memberId]", orgId: session.orgId }, "Failed to remove member.");
    }
  });
}
