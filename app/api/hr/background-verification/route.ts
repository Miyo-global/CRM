import { withAuth, ok, err } from "@/lib/api/helpers";
import { isAdminOrOwner } from "@/lib/auth/helpers";
import { db } from "@/lib/db";
import { backgroundVerifications, organizationMembers } from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { z } from "zod";
import type { NextRequest } from "next/server";

const createSchema = z.object({
  userId: z.string().min(1),
  type: z.string().min(1, "Verification type is required"),
  provider: z.string().optional(),
  referenceNumber: z.string().optional(),
  notes: z.string().max(1000).optional(),
});

const updateSchema = z.object({
  id: z.number().int().positive(),
  status: z.enum(["PENDING", "IN_PROGRESS", "PASSED", "FAILED"]).optional(),
  result: z.string().max(500).optional(),
  notes: z.string().max(1000).optional(),
});

export async function GET() {
  return withAuth(async (session) => {
    const data = await db.query.backgroundVerifications.findMany({
      where: eq(backgroundVerifications.orgId, session.orgId),
      with: { user: true },
      orderBy: [desc(backgroundVerifications.createdAt)],
    });
    return ok(data);
  });
}

export async function POST(req: NextRequest) {
  return withAuth(async (session) => {
    if (!isAdminOrOwner(session.user.role)) return err("Only admins can initiate verifications.", 403);
    const body = createSchema.parse(await req.json());

    const membership = await db.query.organizationMembers.findFirst({
      where: and(
        eq(organizationMembers.userId, body.userId),
        eq(organizationMembers.orgId, session.orgId)
      ),
    });
    if (!membership) return err("Employee not found.", 404);

    const [bgv] = await db.insert(backgroundVerifications).values({
      orgId: session.orgId,
      userId: body.userId,
      type: body.type,
      provider: body.provider,
      referenceNumber: body.referenceNumber,
      notes: body.notes,
      status: "PENDING",
    }).returning();
    return ok(bgv, 201);
  });
}

export async function PATCH(req: NextRequest) {
  return withAuth(async (session) => {
    if (!isAdminOrOwner(session.user.role)) return err("Only admins can update verifications.", 403);
    const body = updateSchema.parse(await req.json());

    const existing = await db.query.backgroundVerifications.findFirst({
      where: and(eq(backgroundVerifications.id, body.id), eq(backgroundVerifications.orgId, session.orgId)),
    });
    if (!existing) return err("Verification not found.", 404);

    await db.update(backgroundVerifications).set({
      ...(body.status && { status: body.status }),
      ...(body.result && { result: body.result }),
      ...(body.notes !== undefined && { notes: body.notes }),
      ...(body.status === "PASSED" || body.status === "FAILED" ? { completedAt: new Date() } : {}),
      updatedAt: new Date(),
    }).where(eq(backgroundVerifications.id, body.id));

    return ok({ success: true });
  });
}
