import { withAuth, withAdmin, ok, err } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { employeeCareerProfiles, careerLadders, users, careerAuditLogs } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import type { NextRequest } from "next/server";
import { isAdminOrOwner } from "@/lib/constants/roles";

const updateSchema = z.object({
  ladderId: z.number().int().positive().optional().nullable(),
  currentLevel: z.number().int().positive().max(20).optional().nullable(),
  notes: z.string().max(1000).trim().optional().nullable(),
});

export async function GET(_req: NextRequest, { params }: { params: Promise<{ employeeId: string }> }) {
  return withAuth(async (session) => {
    const { employeeId } = await params;
    const role = session.user.role as string;

    if (!isAdminOrOwner(role) && session.user.id !== employeeId) {
      return err("Forbidden", 403);
    }

    const [profile] = await db
      .select({
        id: employeeCareerProfiles.id,
        orgId: employeeCareerProfiles.orgId,
        userId: employeeCareerProfiles.userId,
        ladderId: employeeCareerProfiles.ladderId,
        currentLevel: employeeCareerProfiles.currentLevel,
        assignedBy: employeeCareerProfiles.assignedBy,
        assignedAt: employeeCareerProfiles.assignedAt,
        notes: employeeCareerProfiles.notes,
        createdAt: employeeCareerProfiles.createdAt,
        updatedAt: employeeCareerProfiles.updatedAt,
        ladderTitle: careerLadders.title,
        employeeName: users.name,
        employeeEmail: users.email,
      })
      .from(employeeCareerProfiles)
      .leftJoin(careerLadders, eq(employeeCareerProfiles.ladderId, careerLadders.id))
      .leftJoin(users, eq(employeeCareerProfiles.userId, users.id))
      .where(
        and(
          eq(employeeCareerProfiles.userId, employeeId),
          eq(employeeCareerProfiles.orgId, session.orgId),
        ),
      );

    if (!profile) return err("Not found", 404);
    return ok(profile);
  });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ employeeId: string }> }) {
  return withAdmin(async (session) => {
    const { employeeId } = await params;
    const body = updateSchema.parse(await req.json());

    const [existing] = await db
      .select()
      .from(employeeCareerProfiles)
      .where(
        and(
          eq(employeeCareerProfiles.userId, employeeId),
          eq(employeeCareerProfiles.orgId, session.orgId),
        ),
      );

    if (!existing) return err("Career profile not found", 404);

    const payload: Record<string, unknown> = { updatedAt: new Date(), assignedBy: session.user.id, assignedAt: new Date() };
    if (body.ladderId !== undefined) payload.ladderId = body.ladderId;
    if (body.currentLevel !== undefined) payload.currentLevel = body.currentLevel;
    if (body.notes !== undefined) payload.notes = body.notes;

    const [updated] = await db
      .update(employeeCareerProfiles)
      .set(payload)
      .where(eq(employeeCareerProfiles.id, existing.id))
      .returning();

    await db.insert(careerAuditLogs).values({
      orgId: session.orgId,
      actorUserId: session.user.id,
      targetUserId: employeeId,
      action: "UPDATE_CAREER_PROFILE",
      entity: "employee_career_profiles",
      entityId: existing.id,
      changes: { before: { ladderId: existing.ladderId, currentLevel: existing.currentLevel }, after: payload },
    });

    return ok(updated);
  });
}
