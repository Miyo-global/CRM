import { withAuth, withAdmin, ok, err } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { careerLadders } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import type { NextRequest } from "next/server";
import { updateCareerLadderSchema } from "@/lib/validations/career-ladder";
import { isAdminOrOwner } from "@/lib/auth/role-guards";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ ladderId: string }> }) {
  return withAuth(async (session) => {
    const { ladderId } = await params;
    const id = parseInt(ladderId, 10);
    if (isNaN(id)) return err("Invalid ladder id", 400);

    const [ladder] = await db
      .select()
      .from(careerLadders)
      .where(and(eq(careerLadders.id, id), eq(careerLadders.orgId, session.orgId)));

    if (!ladder) return err("Not found", 404);

    const isAdmin = isAdminOrOwner(session.user.role);
    if (!isAdmin && (ladder.status !== "active" || ladder.visibility === "admin")) {
      return err("Not found", 404);
    }

    return ok(ladder);
  });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ ladderId: string }> }) {
  return withAdmin(async (session) => {
    const { ladderId } = await params;
    const id = parseInt(ladderId, 10);
    if (isNaN(id)) return err("Invalid ladder id", 400);

    const body = updateCareerLadderSchema.parse(await req.json());

    const [existing] = await db
      .select({ id: careerLadders.id })
      .from(careerLadders)
      .where(and(eq(careerLadders.id, id), eq(careerLadders.orgId, session.orgId)));

    if (!existing) return err("Not found", 404);

    const payload: Record<string, unknown> = {};
    if (body.title !== undefined) payload.title = body.title;
    if (body.department !== undefined) payload.department = body.department;
    if (body.description !== undefined) payload.description = body.description;
    if (body.status !== undefined) payload.status = body.status;
    if (body.trackType !== undefined) payload.trackType = body.trackType;
    if (body.visibility !== undefined) payload.visibility = body.visibility;
    if (body.levels !== undefined) payload.levels = body.levels;

    const [updated] = await db
      .update(careerLadders)
      .set(payload)
      .where(eq(careerLadders.id, id))
      .returning();

    return ok(updated);
  });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ ladderId: string }> }) {
  return withAdmin(async (session) => {
    const { ladderId } = await params;
    const id = parseInt(ladderId, 10);
    if (isNaN(id)) return err("Invalid ladder id", 400);

    const [existing] = await db
      .select({ id: careerLadders.id })
      .from(careerLadders)
      .where(and(eq(careerLadders.id, id), eq(careerLadders.orgId, session.orgId)));

    if (!existing) return err("Not found", 404);

    await db.delete(careerLadders).where(eq(careerLadders.id, id));
    return ok({ success: true });
  });
}
