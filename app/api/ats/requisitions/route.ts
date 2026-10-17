import type { NextRequest } from "next/server";
import { and, desc, eq } from "drizzle-orm";
import { ZodError } from "zod";

import { withRoles, ok, err, parseBody } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { atsRequisitions, departments, users } from "@/lib/db/schema";
import { ATS_ROLES } from "@/lib/constants/roles";
import { ATS_MODULE_ENABLED } from "@/lib/constants/modules";
import { logRequisitionActivity } from "@/lib/ats/requisitions";
import { requisitionBodySchema } from "@/lib/validations/ats-requisition";

/**
 * MIYO-0632: headcount requests. Only the ATS roles reach this route, so the
 * salary range here is never served to an interviewer.
 */
export async function GET(req: NextRequest) {
  return withRoles(ATS_ROLES)(async (session) => {
    if (!ATS_MODULE_ENABLED) return err("Hiring is not enabled.", 404);

    const status = req.nextUrl.searchParams.get("status");
    const rows = await db
      .select({
        id: atsRequisitions.id,
        title: atsRequisitions.title,
        status: atsRequisitions.status,
        openings: atsRequisitions.openings,
        location: atsRequisitions.location,
        employmentType: atsRequisitions.employmentType,
        salaryMin: atsRequisitions.salaryMin,
        salaryMax: atsRequisitions.salaryMax,
        currency: atsRequisitions.currency,
        departmentName: departments.name,
        hiringManagerName: users.name,
        createdAt: atsRequisitions.createdAt,
        decidedAt: atsRequisitions.decidedAt,
      })
      .from(atsRequisitions)
      .leftJoin(departments, eq(departments.id, atsRequisitions.departmentId))
      .leftJoin(users, eq(users.id, atsRequisitions.hiringManagerId))
      .where(
        and(
          eq(atsRequisitions.orgId, session.orgId),
          status ? eq(atsRequisitions.status, status) : undefined,
        ),
      )
      .orderBy(desc(atsRequisitions.createdAt));

    return ok(rows);
  }, req);
}

export async function POST(req: NextRequest) {
  return withRoles(ATS_ROLES)(async (session) => {
    if (!ATS_MODULE_ENABLED) return err("Hiring is not enabled.", 404);
    try {
      const body = await parseBody(req, requisitionBodySchema);

      const [created] = await db
        .insert(atsRequisitions)
        .values({
          orgId: session.orgId,
          title: body.title,
          departmentId: body.departmentId ?? null,
          location: body.location ?? null,
          employmentType: body.employmentType,
          openings: body.openings,
          salaryMin: body.salaryMin?.toString() ?? null,
          salaryMax: body.salaryMax?.toString() ?? null,
          currency: body.currency,
          justification: body.justification ?? null,
          hiringManagerId: body.hiringManagerId ?? null,
          approverId: body.approverId ?? null,
          status: "DRAFT",
          createdBy: session.user.id,
        })
        .returning();

      await logRequisitionActivity({
        orgId: session.orgId,
        requisitionId: created.id,
        actorId: session.user.id,
        type: "requisition_created",
        data: { title: created.title, openings: created.openings },
      });

      return ok(created, 201);
    } catch (e) {
      if (e instanceof ZodError) return err(e.issues[0]?.message ?? "Invalid requisition.", 400);
      throw e;
    }
  }, req);
}
