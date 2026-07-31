import { withAuth, ok, err, parseBody } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { appraisals, appraisalStages, organizationMembers } from "@/lib/db/schema";
import { and, desc, eq, inArray, or } from "drizzle-orm";
import { isAdminOrOwner } from "@/lib/auth/helpers";
import { isManagerOf } from "@/lib/rbac/manager";
import { createAppraisalSchema } from "@/lib/validations/hr-appraisals";
import { createAppraisalBundle } from "@/lib/hr/create-appraisal";
import { notifyNewAppraisalAssignee, scheduleAppraisalPipEmails } from "@/lib/email/hr-appraisal-pip";
import { logger } from "@/lib/logger";
import type { NextRequest } from "next/server";

export async function GET(req: NextRequest) {
  return withAuth(async (session) => {
    const isAdmin = isAdminOrOwner(session.user.role);
    const myActions = req.nextUrl.searchParams.get("myActions") === "1";
    const filterUserId = req.nextUrl.searchParams.get("userId") ?? undefined;

    const myPendingRows = await db
      .selectDistinct({ appraisalId: appraisalStages.appraisalId })
      .from(appraisalStages)
      .innerJoin(appraisals, eq(appraisalStages.appraisalId, appraisals.id))
      .where(
        and(
          eq(appraisals.orgId, session.orgId),
          eq(appraisalStages.status, "PENDING"),
          eq(appraisalStages.assigneeId, session.user.id)
        )
      );
    const myPendingAppraisalIds = myPendingRows.map((r) => r.appraisalId);

    const conditions = [eq(appraisals.orgId, session.orgId)];

    if (myActions) {
      if (myPendingAppraisalIds.length === 0) {
        return ok([]);
      }
      conditions.push(inArray(appraisals.id, myPendingAppraisalIds));
    } else if (filterUserId) {
      if (filterUserId !== session.user.id && !isAdmin) {
        const mgr = await isManagerOf(session.user.id, filterUserId);
        if (!mgr) return err("Not authorized to filter this user.", 403);
      }
      conditions.push(eq(appraisals.userId, filterUserId));
    } else if (!isAdmin) {
      const visibility = [
        eq(appraisals.userId, session.user.id),
        eq(appraisals.reviewerId, session.user.id),
      ];
      if (myPendingAppraisalIds.length > 0) {
        visibility.push(inArray(appraisals.id, myPendingAppraisalIds));
      }
      conditions.push(or(...visibility)!);
    }

    let data;
    try {
      data = await db.query.appraisals.findMany({
        where: and(...conditions),
        with: {
          user: { columns: { id: true, name: true, image: true, email: true } },
          reviewer: { columns: { id: true, name: true, image: true } },
          cycle: true,
          stages: { orderBy: (s, { asc }) => [asc(s.id)] },
        },
        orderBy: [desc(appraisals.updatedAt)],
        limit: 100,
      });
    } catch (e) {
      logger.error("appraisals GET findMany failed", { error: e });
      const msg = e instanceof Error ? e.message : String(e);
      if (/does not exist|relation|appraisal/i.test(msg)) {
        return err(
          "This feature isn't available yet. Please contact your administrator.",
          503
        );
      }
      return err("Could not load appraisals.", 500);
    }

    return ok(data);
  });
}

export async function POST(req: NextRequest) {
  return withAuth(async (session) => {
    const body = await parseBody(req, createAppraisalSchema);
    const isAdmin = isAdminOrOwner(session.user.role);
    if (!isAdmin) {
      const mgr = await isManagerOf(session.user.id, body.userId);
      if (!mgr) return err("Only HR, CEO, or the employee's manager can create an appraisal.", 403);
    }

    const member = await db.query.organizationMembers.findFirst({
      where: and(
        eq(organizationMembers.userId, body.userId),
        eq(organizationMembers.orgId, session.orgId)
      ),
    });
    if (!member) return err("Employee not found in organization.", 404);

    let appraisalId: number;
    try {
      const out = await createAppraisalBundle({
        orgId: session.orgId,
        userId: body.userId,
        reviewerId: body.reviewerId ?? null,
        cycleId: body.cycleId ?? null,
        type: body.type,
        periodStart: body.periodStart,
        periodEnd: body.periodEnd,
        dueDate: body.dueDate ?? null,
        confidentialityNote: body.confidentialityNote ?? null,
        initiatorId: session.user.id,
      });
      appraisalId = out.appraisalId;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (/does not exist|relation|appraisal/i.test(msg)) {
        logger.error("createAppraisalBundle failed: appraisal schema objects missing", {
          error: e,
          hint: "Apply migration drizzle/0104_appraisal_pip_module.sql (and later HR migrations) to this environment.",
        });
        return err(
          "Appraisals are temporarily unavailable. Please try again later or contact your administrator.",
          503
        );
      }
      logger.error("createAppraisalBundle failed", { error: e });
      return err("Could not create appraisal.", 500);
    }

    const row = await db.query.appraisals.findFirst({
      where: eq(appraisals.id, appraisalId),
      with: {
        user: { columns: { id: true, name: true, image: true, email: true } },
        reviewer: { columns: { id: true, name: true, image: true } },
        cycle: true,
        stages: true,
      },
    });

    scheduleAppraisalPipEmails(() => notifyNewAppraisalAssignee(appraisalId));

    return ok(row, 201);
  });
}
