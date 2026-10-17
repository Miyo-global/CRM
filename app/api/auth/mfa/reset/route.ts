import { type NextRequest } from "next/server";
import { withAdmin, ok, err, parseBody } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { users, mfaBackupCodes, organizationMembers } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { invalidateUserSession } from "@/lib/auth";
import { createAuditLog } from "@/lib/audit-log";
import { sendMfaResetByAdminEmail } from "@/lib/email";
import { ROLES, hasFullAccess } from "@/lib/constants/roles";

const schema = z.object({ userId: z.string().min(1) });

export async function POST(req: NextRequest) {
  return withAdmin(async (session) => {
    const body = await parseBody(req, schema);

    const membership = await db.query.organizationMembers.findFirst({
      where: and(
        eq(organizationMembers.userId, body.userId),
        eq(organizationMembers.orgId, session.orgId)
      ),
      columns: { id: true },
    });
    if (!membership) return err("User not found", 404);

    const user = await db.query.users.findFirst({
      where: eq(users.id, body.userId),
      columns: { id: true, name: true, email: true, role: true },
    });
    if (!user) return err("User not found", 404);

    // Resetting MFA on a full-access account is a takeover route, so only the
    // CEO may do it (QA-0036).
    if (hasFullAccess(user.role) && session.user.role !== ROLES.CEO) {
      return err("Only the CEO can reset MFA for a CEO or Admin account.", 403);
    }

    await db.transaction(async (tx) => {
      await tx
        .update(users)
        .set({ totpEnabled: false, totpSecret: null })
        .where(eq(users.id, body.userId));

      await tx.delete(mfaBackupCodes).where(eq(mfaBackupCodes.userId, body.userId));
    });

    await invalidateUserSession(body.userId);

    await createAuditLog({
      action: "mfa.reset",
      userId: session.user.id,
      orgId: session.orgId,
      targetId: body.userId,
      targetType: "user",
      metadata: { targetRole: user.role },
    });

    // MIYO-0227: the account owner is told their second factor was removed.
    if (user.email) {
      await sendMfaResetByAdminEmail(user.email).catch(() => undefined);
    }

    return ok({ reset: true });
  });
}
