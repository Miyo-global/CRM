import { withAuth, ok, err, parseBody } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { performanceImprovementPlans, pipGoals, users, organizationMembers } from "@/lib/db/schema";
import { and, desc, eq, inArray, or } from "drizzle-orm";
import { isAdminOrOwner } from "@/lib/auth/helpers";
import { isManagerOf } from "@/lib/rbac/manager";
import { createPIPSchema } from "@/lib/validations/hr-pip";
import { derivePipLegacyFields } from "@/lib/hr/pip-reasons";
import { notifyPIPDraftCreated, scheduleAppraisalPipEmails } from "@/lib/email/hr-appraisal-pip";
import type { NextRequest } from "next/server";

export async function GET() {
  return withAuth(async (session) => {
    const isAdmin = isAdminOrOwner(session.user.role);
    const base = eq(performanceImprovementPlans.orgId, session.orgId);

    if (isAdmin) {
      const data = await db.query.performanceImprovementPlans.findMany({
        where: base,
        with: {
          user: { columns: { id: true, name: true, image: true, email: true } },
          manager: { columns: { id: true, name: true, image: true } },
          hrRep: { columns: { id: true, name: true } },
          goals: true,
        },
        orderBy: [desc(performanceImprovementPlans.createdAt)],
        limit: 100,
      });
      return ok(data);
    }

    const reporteeRows = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.reportingTo, session.user.id));
    const reporteeIds = reporteeRows.map((r) => r.id);

    const parts = [
      eq(performanceImprovementPlans.userId, session.user.id),
      eq(performanceImprovementPlans.managerId, session.user.id),
      eq(performanceImprovementPlans.hrRepId, session.user.id),
      eq(performanceImprovementPlans.mentorId, session.user.id),
    ];
    if (reporteeIds.length > 0) {
      parts.push(inArray(performanceImprovementPlans.userId, reporteeIds));
    }

    const data = await db.query.performanceImprovementPlans.findMany({
      where: and(base, or(...parts)),
      with: {
        user: { columns: { id: true, name: true, image: true, email: true } },
        manager: { columns: { id: true, name: true, image: true } },
        hrRep: { columns: { id: true, name: true } },
        goals: true,
      },
      orderBy: [desc(performanceImprovementPlans.createdAt)],
      limit: 100,
    });

    return ok(data);
  });
}

export async function POST(req: NextRequest) {
  return withAuth(async (session) => {
    const body = await parseBody(req, createPIPSchema);
    const isAdmin = isAdminOrOwner(session.user.role);
    if (!isAdmin) {
      const mgr = await isManagerOf(session.user.id, body.userId);
      if (!mgr) return err("Only HR, CEO, or the employee's manager can create a PIP.", 403);
    }

    const memberIds = Array.from(
      new Set(
        [body.userId, body.hrRepId, body.mentorId].filter(
          (v): v is string => typeof v === "string" && v.length > 0
        )
      )
    );
    const members = await db.query.organizationMembers.findMany({
      where: and(
        eq(organizationMembers.orgId, session.orgId),
        inArray(organizationMembers.userId, memberIds)
      ),
      columns: { userId: true },
    });
    const memberSet = new Set(members.map((m) => m.userId));
    for (const uid of memberIds) {
      if (!memberSet.has(uid)) return err("User not found in organization.", 404);
    }

    const openPips = await db.query.performanceImprovementPlans.findMany({
      where: and(
        eq(performanceImprovementPlans.orgId, session.orgId),
        eq(performanceImprovementPlans.userId, body.userId),
        inArray(performanceImprovementPlans.status, ["DRAFT", "ACTIVE", "EXTENDED"])
      ),
      columns: { startDate: true, endDate: true, description: true },
    });
    const legacy = derivePipLegacyFields(body.reasons);
    const duplicate = openPips.some(
      (p) =>
        p.startDate === body.startDate &&
        p.endDate === body.endDate &&
        (p.description ?? "").trim() === legacy.description.trim()
    );
    if (duplicate) {
      return err("An open PIP with identical details already exists for this employee.", 409);
    }

    const id = await db.transaction(async (tx) => {
      const [pip] = await tx
        .insert(performanceImprovementPlans)
        .values({
          orgId: session.orgId,
          userId: body.userId,
          managerId: session.user.id,
          reason: legacy.reason,
          objectives: body.goals.map((g) => ({
            objective: g.title,
            metric: g.successCriteria,
            deadline: g.deadline,
          })),
          startDate: body.startDate,
          endDate: body.endDate,
          status: "DRAFT",
          reasonCategory: legacy.reasonCategory,
          reasonEntries: body.reasons,
          description: legacy.description,
          areasOfConcern: body.areasOfConcern,
          evidence: body.evidence,
          reviewFrequency: body.reviewFrequency,
          reviewMethod: body.reviewMethod,
          mentorId: body.mentorId ?? null,
          hrRepId: body.hrRepId,
          expectedImprovement: body.expectedImprovement,
          consequencesIfNotMet: body.consequencesIfNotMet,
          linkedAppraisalId: body.linkedAppraisalId ?? null,
          initiatedBy: session.user.id,
        })
        .returning({ id: performanceImprovementPlans.id });

      const pipId = pip!.id;
      for (let i = 0; i < body.goals.length; i++) {
        const g = body.goals[i]!;
        await tx.insert(pipGoals).values({
          pipId,
          title: g.title,
          description: g.description ?? null,
          successCriteria: g.successCriteria,
          deadline: g.deadline,
          sortOrder: i,
        });
      }
      return pipId;
    });

    const row = await db.query.performanceImprovementPlans.findFirst({
      where: eq(performanceImprovementPlans.id, id),
      with: {
        user: { columns: { id: true, name: true, image: true, email: true } },
        manager: { columns: { id: true, name: true } },
        hrRep: { columns: { id: true, name: true } },
        goals: true,
      },
    });

    scheduleAppraisalPipEmails(() => notifyPIPDraftCreated(id));

    return ok(row, 201);
  });
}
