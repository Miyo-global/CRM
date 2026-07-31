import { type NextRequest } from "next/server";
import { withAuth, ok, err, parseBody } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { users, organizationMembers } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { isAdminOrOwner } from "@/lib/auth/helpers";
import { ALL_ROLES } from "@/lib/constants/roles";
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
      return err("Only CEO or Admin can change user roles", 403);
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

    if (!ALL_ROLES.includes(input.role as (typeof ALL_ROLES)[number])) {
      return err(`Invalid role. Valid roles: ${ALL_ROLES.join(", ")}`, 400);
    }

    if (userId === session.user.id) {
      return err("You cannot change your own role", 403);
    }

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
