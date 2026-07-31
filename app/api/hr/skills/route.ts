import { withAuth, ok, err, parseBody } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { employeeSkills, organizationMembers } from "@/lib/db/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import { isAdminOrOwner } from "@/lib/auth/helpers";
import { z } from "zod";
import type { NextRequest } from "next/server";
import { isPlausibleSkillLabel, canonicalizeSkill } from "@/lib/hr/skills-catalog";
import { invalidateCache } from "@/lib/cache";
import { dateOnlyNullableSchema } from "@/lib/validations/date";

const createSchema = z.object({
  userId: z.string().min(1).optional(),
  skillName: z.string().min(1).max(100),
  level: z.number().int().min(1).max(5).optional().default(1),
  certifiedAt: dateOnlyNullableSchema,
  validUntil: dateOnlyNullableSchema,
});

function toTimestamp(value: string | null | undefined): Date | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export async function GET(req: NextRequest) {
  return withAuth(async (session) => {
    const userId = req.nextUrl.searchParams.get("userId");
    if (userId && userId !== session.user.id && !isAdminOrOwner(session.user.role)) {
      return err("Not authorized to view other users' skills.", 403);
    }
    const conditions = [eq(employeeSkills.orgId, session.orgId)];
    if (userId) conditions.push(eq(employeeSkills.userId, userId));

    const data = await db.query.employeeSkills.findMany({
      where: and(...conditions),
      with: { user: true },
      orderBy: [desc(employeeSkills.createdAt)],
    });
    return ok(data);
  });
}

export async function POST(req: NextRequest) {
  return withAuth(async (session) => {
    const body = await parseBody(req, createSchema);
    const targetUserId = body.userId ?? session.user.id;

    if (targetUserId !== session.user.id) {
      if (!isAdminOrOwner(session.user.role)) {
        return err("Not authorized to manage other users' skills.", 403);
      }
      const membership = await db.query.organizationMembers.findFirst({
        where: and(
          eq(organizationMembers.userId, targetUserId),
          eq(organizationMembers.orgId, session.orgId)
        ),
      });
      if (!membership) return err("Employee not found.", 404);
    }

    const rawName = body.skillName.trim();
    if (!isPlausibleSkillLabel(rawName)) {
      return err("Skill name contains invalid characters or is not a valid skill label", 422);
    }

    const canonicalResult = canonicalizeSkill(rawName);
    const canonicalName = canonicalResult?.canonical ?? rawName;

    const existing = await db.query.employeeSkills.findFirst({
      where: and(
        eq(employeeSkills.orgId, session.orgId),
        eq(employeeSkills.userId, targetUserId),
        eq(sql`lower(${employeeSkills.skillName})`, canonicalName.toLowerCase()),
      ),
    });

    const certifiedAt = toTimestamp(body.certifiedAt);
    const validUntil = body.validUntil;

    if (certifiedAt && validUntil && validUntil < body.certifiedAt!) {
      return err("Valid-until date cannot be before the certified-on date", 422);
    }

    if (existing) {
      const [updated] = await db.update(employeeSkills)
        .set({
          level: body.level,
          ...(certifiedAt !== undefined ? { certifiedAt } : {}),
          ...(validUntil !== undefined ? { validUntil } : {}),
        })
        .where(eq(employeeSkills.id, existing.id))
        .returning();
      await invalidateCache(`hr:skills-matrix:${session.orgId}`);
      return ok(updated, 200);
    }

    const [skill] = await db.insert(employeeSkills).values({
      orgId: session.orgId,
      userId: targetUserId,
      skillName: canonicalName,
      level: body.level,
      certifiedAt: certifiedAt ?? null,
      validUntil: validUntil ?? null,
    }).returning();
    await invalidateCache(`hr:skills-matrix:${session.orgId}`);
    return ok(skill, 201);
  });
}
