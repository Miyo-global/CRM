import { withAuth, withAdmin, ok, err } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { employeeCareerProfiles, careerLadders, users } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { z } from "zod";
import type { NextRequest } from "next/server";
import { isAdminOrOwner } from "@/lib/constants/roles";

const createSchema = z.object({
  userId: z.string().min(1),
  ladderId: z.number().int().positive().optional().nullable(),
  currentLevel: z.number().int().positive().max(20).optional().nullable(),
  notes: z.string().max(1000).trim().optional().nullable(),
});

export async function GET() {
  return withAuth(async (session) => {
    const role = session.user.role as string;

    if (isAdminOrOwner(role)) {
      const rows = await db
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
        .where(eq(employeeCareerProfiles.orgId, session.orgId))
        .orderBy(desc(employeeCareerProfiles.updatedAt));

      return ok(rows) as ReturnType<typeof ok>;
    }

    const [own] = await db
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
      .where(eq(employeeCareerProfiles.userId, session.user.id));

    return ok(own ?? null);
  });
}

export async function POST(req: NextRequest) {
  return withAdmin(async (session) => {
    const body = createSchema.parse(await req.json());

    const [existing] = await db
      .select({ id: employeeCareerProfiles.id })
      .from(employeeCareerProfiles)
      .where(eq(employeeCareerProfiles.userId, body.userId));

    if (existing) return err("Employee already has a career profile. Use PATCH to update.", 409);

    const [profile] = await db
      .insert(employeeCareerProfiles)
      .values({
        orgId: session.orgId,
        userId: body.userId,
        ladderId: body.ladderId ?? null,
        currentLevel: body.currentLevel ?? 1,
        assignedBy: session.user.id,
        assignedAt: new Date(),
        notes: body.notes ?? null,
      })
      .returning();

    return ok(profile, 201);
  });
}
