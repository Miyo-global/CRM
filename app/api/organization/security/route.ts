import { type NextRequest } from "next/server";
import { withAuth, ok, err, parseBody } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { organizations, organizationMembers } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { isAdminOrOwner } from "@/lib/auth/helpers";
import { createAuditLog } from "@/lib/audit-log";
import { z } from "zod";
import { invalidateUserSession } from "@/lib/auth";

const schema = z.object({
  mfaEnforced: z.boolean().optional(),
  passwordExpiryDays: z.number().int().min(30).max(365).nullable().optional(),
  allowedEmailDomains: z.array(z.string().min(1)).optional(),
});

export async function PATCH(req: NextRequest) {
  return withAuth(async (session) => {
    if (!isAdminOrOwner(session.user.role)) return err("Forbidden", 403);

    const body = await parseBody(req, schema);

    const updateData: {
      mfaEnforced?: boolean;
      passwordExpiryDays?: number | null;
      allowedEmailDomains?: string[];
    } = {};
    if (body.mfaEnforced !== undefined) updateData.mfaEnforced = body.mfaEnforced;
    if (body.passwordExpiryDays !== undefined) updateData.passwordExpiryDays = body.passwordExpiryDays;
    if (body.allowedEmailDomains !== undefined) updateData.allowedEmailDomains = body.allowedEmailDomains;

    if (Object.keys(updateData).length === 0) return ok({ success: true });

    await db
      .update(organizations)
      .set(updateData)
      .where(eq(organizations.id, session.orgId));

    await createAuditLog({
      action: "security_settings.updated",
      userId: session.user.id,
      orgId: session.orgId,
      targetId: session.orgId,
      targetType: "organization",
      metadata: updateData,
    });

    const members = await db.query.organizationMembers.findMany({
      where: eq(organizationMembers.orgId, session.orgId),
      columns: { userId: true },
    });

    await Promise.allSettled(members.map((m) => invalidateUserSession(m.userId)));

    return ok({ success: true });
  });
}
