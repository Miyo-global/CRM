import { withAuth, ok, err, parseBody } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { employeeSkills } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { isAdminOrOwner } from "@/lib/auth/helpers";
import { z } from "zod";
import type { NextRequest } from "next/server";
import { invalidateCache } from "@/lib/cache";
import { dateOnlyNullableSchema } from "@/lib/validations/date";

type RouteParams = { params: Promise<{ skillId: string }> };

const updateSchema = z.object({
  level: z.number().int().min(1).max(5).optional(),
  certifiedAt: dateOnlyNullableSchema,
  validUntil: dateOnlyNullableSchema,
});

function toTimestamp(value: string | null | undefined): Date | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

async function resolveSkill(orgId: string, skillId: number) {
  return db.query.employeeSkills.findFirst({
    where: and(eq(employeeSkills.id, skillId), eq(employeeSkills.orgId, orgId)),
  });
}

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  return withAuth(async (session) => {
    const { skillId } = await params;
    const id = Number(skillId);
    if (!id) return err("Invalid skill ID", 400);

    const existing = await resolveSkill(session.orgId, id);
    if (!existing) return err("Skill not found", 404);

    if (existing.userId !== session.user.id && !isAdminOrOwner(session.user.role)) {
      return err("Not authorized to edit this skill", 403);
    }

    const body = await parseBody(req, updateSchema);

    if (
      body.certifiedAt &&
      body.validUntil &&
      body.validUntil < body.certifiedAt
    ) {
      return err("Valid-until date cannot be before the certified-on date", 422);
    }

    const [updated] = await db
      .update(employeeSkills)
      .set({
        ...(body.level !== undefined ? { level: body.level } : {}),
        ...(body.certifiedAt !== undefined ? { certifiedAt: toTimestamp(body.certifiedAt) } : {}),
        ...(body.validUntil !== undefined ? { validUntil: body.validUntil } : {}),
      })
      .where(eq(employeeSkills.id, id))
      .returning();

    await invalidateCache(`hr:skills-matrix:${session.orgId}`);
    return ok(updated);
  });
}

export async function DELETE(_req: NextRequest, { params }: RouteParams) {
  return withAuth(async (session) => {
    const { skillId } = await params;
    const id = Number(skillId);
    if (!id) return err("Invalid skill ID", 400);

    const existing = await resolveSkill(session.orgId, id);
    if (!existing) return err("Skill not found", 404);

    if (existing.userId !== session.user.id && !isAdminOrOwner(session.user.role)) {
      return err("Not authorized to delete this skill", 403);
    }

    await db.delete(employeeSkills).where(eq(employeeSkills.id, id));
    await invalidateCache(`hr:skills-matrix:${session.orgId}`);
    return ok({ success: true });
  });
}
