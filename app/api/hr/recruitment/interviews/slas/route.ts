import { withAuth, ok, err, parseBody } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { interviewSlas } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import type { NextRequest } from "next/server";

const upsertSlaSchema = z.object({
  stage: z.string().min(1),
  maxHours: z.number().int().positive(),
  warningHours: z.number().int().positive(),
});

export async function GET(_req: NextRequest) {
  return withAuth(async (session) => {
    const data = await db.query.interviewSlas.findMany({
      where: eq(interviewSlas.orgId, session.orgId),
      orderBy: (t, { asc }) => [asc(t.stage)],
    });

    return ok(data);
  });
}

export async function PUT(req: NextRequest) {
  return withAuth(async (session) => {
    const role = session.user.role;
    if (role !== "CEO" && role !== "HR" && role !== "ADMIN") {
      return err("Forbidden", 403);
    }

    const body = await parseBody(req, upsertSlaSchema);

    if (body.warningHours >= body.maxHours) {
      return err("warningHours must be less than maxHours", 400);
    }

    const [upserted] = await db
      .insert(interviewSlas)
      .values({
        orgId: session.orgId,
        stage: body.stage,
        maxHours: body.maxHours,
        warningHours: body.warningHours,
      })
      .onConflictDoUpdate({
        target: [interviewSlas.orgId, interviewSlas.stage],
        set: {
          maxHours: body.maxHours,
          warningHours: body.warningHours,
        },
      })
      .returning();

    return ok(upserted);
  });
}
