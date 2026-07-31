import { withAuth, ok, err } from "@/lib/api/helpers";
import { isAdminOrOwner } from "@/lib/auth/helpers";
import { db } from "@/lib/db";
import { trainingPrograms } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import type { NextRequest } from "next/server";

const updateSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional(),
  category: z.string().max(100).optional(),
  status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ programId: string }> }
) {
  return withAuth(async (session) => {
    if (!isAdminOrOwner(session.user.role)) return err("Forbidden.", 403);
    const { programId: id } = await params;
    const programId = Number(id);
    if (!programId) return err("Invalid program ID.", 400);

    const existing = await db.query.trainingPrograms.findFirst({
      where: and(eq(trainingPrograms.id, programId), eq(trainingPrograms.orgId, session.orgId)),
    });
    if (!existing) return err("Program not found.", 404);

    const body = updateSchema.parse(await req.json());
    await db
      .update(trainingPrograms)
      .set({ ...body, updatedAt: new Date() })
      .where(and(eq(trainingPrograms.id, programId), eq(trainingPrograms.orgId, session.orgId)));
    return ok({ success: true });
  });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ programId: string }> }
) {
  return withAuth(async (session) => {
    if (!isAdminOrOwner(session.user.role)) return err("Forbidden.", 403);
    const { programId: id } = await params;
    const programId = Number(id);
    if (!programId) return err("Invalid program ID.", 400);

    await db.delete(trainingPrograms).where(
      and(eq(trainingPrograms.id, programId), eq(trainingPrograms.orgId, session.orgId))
    );
    return ok({ success: true });
  });
}
