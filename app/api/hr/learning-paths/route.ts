import { withAuth, ok, err } from "@/lib/api/helpers";
import { isAdminOrOwner } from "@/lib/auth/helpers";
import { db } from "@/lib/db";
import { learningPaths } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { z } from "zod";
import type { NextRequest } from "next/server";

const createSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  targetRole: z.string().max(100).optional(),
  steps: z.array(z.object({
    order: z.number().int().min(1),
    type: z.enum(["training", "assessment", "certification"]),
    referenceId: z.number().int().positive(),
    title: z.string().min(1),
  })).min(1),
});

export async function GET() {
  return withAuth(async (session) => {
    const data = await db.query.learningPaths.findMany({
      where: eq(learningPaths.orgId, session.orgId),
      orderBy: [desc(learningPaths.createdAt)],
    });
    return ok(data);
  });
}

export async function POST(req: NextRequest) {
  return withAuth(async (session) => {
    if (!isAdminOrOwner(session.user.role)) return err("Only admins can create learning paths.", 403);
    const body = createSchema.parse(await req.json());
    const [path] = await db.insert(learningPaths).values({
      orgId: session.orgId,
      title: body.title,
      description: body.description,
      targetRole: body.targetRole,
      steps: body.steps,
      createdBy: session.user.id,
    }).returning();
    return ok(path, 201);
  });
}
