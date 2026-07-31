import { withAuth, ok, err, parseBody } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { employeeSkills } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { isAdminOrOwner } from "@/lib/auth/helpers";
import { invalidateCache } from "@/lib/cache";
import { z } from "zod";
import type { NextRequest } from "next/server";

const verifySchema = z.object({
  skillId: z.number().int().positive(),
  verified: z.boolean(),
});

export async function POST(req: NextRequest) {
  return withAuth(async (session) => {
    if (!isAdminOrOwner(session.user.role)) {
      return err("Only admins can verify skills.", 403);
    }

    const { skillId, verified } = await parseBody(req, verifySchema);

    const skill = await db.query.employeeSkills.findFirst({
      where: and(eq(employeeSkills.id, skillId), eq(employeeSkills.orgId, session.orgId)),
      columns: { id: true },
    });
    if (!skill) return err("Skill not found.", 404);

    const [updated] = await db
      .update(employeeSkills)
      .set(
        verified
          ? { verifiedBy: session.user.id, verifiedAt: new Date() }
          : { verifiedBy: null, verifiedAt: null },
      )
      .where(eq(employeeSkills.id, skillId))
      .returning();

    await invalidateCache(`hr:skills-matrix:${session.orgId}`);

    return ok(updated, 200);
  });
}
