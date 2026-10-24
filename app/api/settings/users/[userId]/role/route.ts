import { type NextRequest } from "next/server";
import { withAuth, ok, err, parseBody } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { users, organizationMembers } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { isAdminOrOwner } from "@/lib/auth/helpers";
import { checkRoleAssignment } from "@/lib/auth/role-assignment";
import { createAuditLog } from "@/lib/audit-log";
import { z } from "zod";

const updateRoleSchema = z.object({
  role: z.string().min(1),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  return withAuth(async (session) => {
    if (!isAdminOrOwner(session.user.role)) {
      return err("Only the Super Admin or an Admin can change user roles", 403);
    }

    const { userId } = await params;

    const member = await db.query.organizationMembers.findFirst({
      where: and(
        eq(organizationMembers.userId, userId),
        eq(organizationMembers.orgId, session.orgId)
      ),
    });
    if (!member) return err("User not found in this organization", 404);

    const input = await parseBody(req, updateRoleSchema);

    // Privilege-escalation gate (SEC-0001): only the CEO may grant or remove CEO/ADMIN.
    const roleError = await checkRoleAssignment({
      orgId: session.orgId,
      actorRole: session.user.role,
      actorId: session.user.id,
      targetUserId: userId,
      targetCurrentRole: member.role,
      newRole: input.role,
    });
    if (roleError) return err(roleError.message, roleError.status);
    input.role = input.role.trim().toUpperCase();

    const previousRole = member.role;

    await db.transaction(async (tx) => {
      await tx
        .update(users)
        .set({ role: input.role })
        .where(eq(users.id, userId));

      await tx
        .update(organizationMembers)
        .set({ role: input.role })
        .where(
          and(
            eq(organizationMembers.userId, userId),
            eq(organizationMembers.orgId, session.orgId)
          )
        );
    });

    void createAuditLog({
      action: "role.changed",
      userId: session.user.id,
      orgId: session.orgId,
      targetId: userId,
      targetType: "user",
      metadata: { oldRole: previousRole, newRole: input.role },
    }).catch(() => {});

    return ok({ success: true, userId, role: input.role });
  });
}
