import { withAuth, ok, err } from "@/lib/api/helpers";
import { isAdminOrOwner } from "@/lib/auth/helpers";
import { db } from "@/lib/db";
import { pulseSurveys } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import type { NextRequest } from "next/server";

const updateSchema = z.object({
  status: z.enum(["DRAFT", "ACTIVE", "CLOSED"]).optional(),
  title: z.string().min(1).max(200).optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ surveyId: string }> }
) {
  return withAuth(async (session) => {
    if (!isAdminOrOwner(session.user.role)) return err("Forbidden.", 403);
    const { surveyId: id } = await params;
    const surveyId = Number(id);
    if (!surveyId) return err("Invalid ID.", 400);

    const body = updateSchema.parse(await req.json());
    await db.update(pulseSurveys).set(body).where(
      and(eq(pulseSurveys.id, surveyId), eq(pulseSurveys.orgId, session.orgId))
    );
    return ok({ success: true });
  });
}
