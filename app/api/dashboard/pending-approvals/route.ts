import { withAuth, ok, err } from "@/lib/api/helpers";
import { isAdminOrOwner } from "@/lib/auth/helpers";
import { db } from "@/lib/db";
import { resignations } from "@/lib/db/schema";
import { countPendingLeaveApprovals } from "@/lib/hr/leave-approvals-server";
import { eq, and, sql, inArray } from "drizzle-orm";
import type { NextRequest } from "next/server";

export async function GET(_req: NextRequest) {
  return withAuth(async (session) => {
    if (!isAdminOrOwner(session.user.role)) {
      return err("Forbidden", 403);
    }

    const pendingLeaves = await countPendingLeaveApprovals(session.orgId, {
      id: session.user.id,
      role: session.user.role,
    });

    const isHrReviewer =
      session.user.role === "HR" || session.user.role === "ADMIN";
    const resignationStatuses = isHrReviewer
      ? ["SUBMITTED", "PENDING_HR"]
      : ["HR_APPROVED"];

    const [resignationCount] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(resignations)
      .where(
        and(
          eq(resignations.orgId, session.orgId),
          inArray(resignations.status, resignationStatuses as ("SUBMITTED" | "PENDING_HR" | "HR_APPROVED")[])
        )
      );

    const pendingResignations = resignationCount?.count ?? 0;

    return ok({
      pendingLeaves,
      pendingResignations,
      total: pendingLeaves + pendingResignations,
    });
  });
}
