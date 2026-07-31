import { withAuth, withAdmin, ok, err } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { territories } from "@/lib/db/schema/crm";
import { eq } from "drizzle-orm";
import { NextRequest } from "next/server";
import { z } from "zod";

const createSchema = z.object({
  name: z.string().min(1, "Name is required"),
  states: z.array(z.string()).optional().default([]),
  cities: z.array(z.string()).optional().default([]),
  assignedReps: z.array(z.number()).optional().default([]),
  description: z.string().optional(),
  isActive: z.boolean().optional().default(true),
});

export async function GET() {
  return withAuth(async (session) => {
    const rows = await db
      .select()
      .from(territories)
      .where(eq(territories.orgId, session.orgId))
      .orderBy(territories.name);

    return ok(rows);
  });
}

export async function POST(req: NextRequest) {
  return withAdmin(async (session) => {
    const body = await req.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return err(parsed.error.issues[0]?.message ?? "Validation failed");
    }

    const { name, states, cities, assignedReps, description, isActive } = parsed.data;

    const [created] = await db
      .insert(territories)
      .values({
        orgId: session.orgId,
        name,
        states,
        cities,
        assignedReps,
        description: description ?? null,
        isActive,
        createdBy: session.user.id,
      })
      .returning();

    return ok(created, 201);
  });
}
