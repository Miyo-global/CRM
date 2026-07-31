import { withAuth, withAdmin, ok, err } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { territories } from "@/lib/db/schema/crm";
import { eq, and } from "drizzle-orm";
import { NextRequest } from "next/server";
import { z } from "zod";

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  states: z.array(z.string()).optional(),
  cities: z.array(z.string()).optional(),
  assignedReps: z.array(z.number()).optional(),
  description: z.string().nullable().optional(),
  isActive: z.boolean().optional(),
});

interface Params {
  params: Promise<{ territoryId: string }>;
}

export async function GET(_req: NextRequest, { params }: Params) {
  const { territoryId } = await params;
  const id = Number(territoryId);
  if (isNaN(id)) return err("Invalid territory ID");

  return withAuth(async (session) => {
    const [row] = await db
      .select()
      .from(territories)
      .where(and(eq(territories.id, id), eq(territories.orgId, session.orgId)));

    if (!row) return err("Territory not found", 404);
    return ok(row);
  });
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const { territoryId } = await params;
  const id = Number(territoryId);
  if (isNaN(id)) return err("Invalid territory ID");

  return withAdmin(async (session) => {
    const body = await req.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return err(parsed.error.issues[0]?.message ?? "Validation failed");
    }

    const [existing] = await db
      .select({ id: territories.id })
      .from(territories)
      .where(and(eq(territories.id, id), eq(territories.orgId, session.orgId)));

    if (!existing) return err("Territory not found", 404);

    const [updated] = await db
      .update(territories)
      .set({ ...parsed.data, updatedAt: new Date() })
      .where(and(eq(territories.id, id), eq(territories.orgId, session.orgId)))
      .returning();

    return ok(updated);
  });
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { territoryId } = await params;
  const id = Number(territoryId);
  if (isNaN(id)) return err("Invalid territory ID");

  return withAdmin(async (session) => {
    const [existing] = await db
      .select({ id: territories.id })
      .from(territories)
      .where(and(eq(territories.id, id), eq(territories.orgId, session.orgId)));

    if (!existing) return err("Territory not found", 404);

    await db
      .delete(territories)
      .where(and(eq(territories.id, id), eq(territories.orgId, session.orgId)));
    return ok({ success: true });
  });
}
