import { withAuth, ok, err } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { careerEvaluations, careerLadders, users, careerAuditLogs } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { z } from "zod";
import type { NextRequest } from "next/server";
import { isAdminOrOwner } from "@/lib/constants/roles";

const READINESS = ["NOT_READY", "DEVELOPING", "READY_SOON", "RECOMMENDED"] as const;

const createSchema = z.object({
  employeeUserId: z.string().min(1),
  ladderId: z.number().int().positive().optional().nullable(),
  level: z.number().int().positive().max(20).optional().nullable(),
  readinessStatus: z.enum(READINESS),
  strengths: z.string().max(2000).trim().optional().nullable(),
  areasToGrow: z.string().max(2000).trim().optional().nullable(),
  notes: z.string().max(2000).trim().optional().nullable(),
});

export async function GET() {
  return withAuth(async (session) => {
    const role = session.user.role as string;

    const rows = await db
      .select({
        id: careerEvaluations.id,
        orgId: careerEvaluations.orgId,
        employeeUserId: careerEvaluations.employeeUserId,
        evaluatorUserId: careerEvaluations.evaluatorUserId,
        ladderId: careerEvaluations.ladderId,
        level: careerEvaluations.level,
        readinessStatus: careerEvaluations.readinessStatus,
        strengths: careerEvaluations.strengths,
        areasToGrow: careerEvaluations.areasToGrow,
        notes: careerEvaluations.notes,
        evaluatedAt: careerEvaluations.evaluatedAt,
        createdAt: careerEvaluations.createdAt,
        ladderTitle: careerLadders.title,
        employeeName: users.name,
      })
      .from(careerEvaluations)
      .leftJoin(careerLadders, eq(careerEvaluations.ladderId, careerLadders.id))
      .leftJoin(users, eq(careerEvaluations.employeeUserId, users.id))
      .where(
        isAdminOrOwner(role)
          ? eq(careerEvaluations.orgId, session.orgId)
          : eq(careerEvaluations.employeeUserId, session.user.id),
      )
      .orderBy(desc(careerEvaluations.createdAt));

    return ok(rows);
  });
}

export async function POST(req: NextRequest) {
  return withAuth(async (session) => {
    const role = session.user.role as string;
    if (!isAdminOrOwner(role)) return err("Forbidden", 403);

    const body = createSchema.parse(await req.json());

    const [evaluation] = await db
      .insert(careerEvaluations)
      .values({
        orgId: session.orgId,
        employeeUserId: body.employeeUserId,
        evaluatorUserId: session.user.id,
        ladderId: body.ladderId ?? null,
        level: body.level ?? null,
        readinessStatus: body.readinessStatus,
        strengths: body.strengths ?? null,
        areasToGrow: body.areasToGrow ?? null,
        notes: body.notes ?? null,
        evaluatedAt: new Date(),
      })
      .returning();

    await db.insert(careerAuditLogs).values({
      orgId: session.orgId,
      actorUserId: session.user.id,
      targetUserId: body.employeeUserId,
      action: "CREATE_EVALUATION",
      entity: "career_evaluations",
      entityId: evaluation.id,
      changes: { readinessStatus: body.readinessStatus },
    });

    return ok(evaluation, 201);
  });
}
