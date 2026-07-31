

import { NextRequest } from "next/server";
import { withAuth, ok, err, parseBody, toNumber } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { intakeItems, projects } from "@/lib/db/schema";
import { eq, and, desc, count } from "drizzle-orm";
import { z } from "zod";

const createIntakeSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.unknown().optional(),
  source: z.enum(["manual", "web_form", "email"]).default("manual"),
  submitterEmail: z.string().email().optional(),
});

type RouteParams = { params: Promise<{ projectId: string }> };

export async function GET(req: NextRequest, { params }: RouteParams) {
  return withAuth(async (session) => {
    const { projectId: id } = await params;
    const projectId = Number(id);
    if (!projectId) return err("Invalid project id", 400);

    const { searchParams } = req.nextUrl;
    const status = searchParams.get("status") ?? undefined;
    const limit = toNumber(searchParams.get("limit")) ?? 50;
    const offset = toNumber(searchParams.get("offset")) ?? 0;

    const conditions = [
      eq(intakeItems.projectId, projectId),
      eq(intakeItems.orgId, session.orgId!),
    ];

    if (status) {
      conditions.push(
        eq(
          intakeItems.status,
          status as "pending" | "accepted" | "declined" | "duplicate"
        )
      );
    }

    const [totalResult] = await db
      .select({ count: count() })
      .from(intakeItems)
      .where(and(...conditions));

    const items = await db
      .select()
      .from(intakeItems)
      .where(and(...conditions))
      .orderBy(desc(intakeItems.createdAt))
      .limit(limit)
      .offset(offset);

    return ok({ items, total: Number(totalResult?.count ?? 0) });
  });
}

export async function POST(req: NextRequest, { params }: RouteParams) {
  return withAuth(async (session) => {
    const { projectId: id } = await params;
    const projectId = Number(id);
    if (!projectId) return err("Invalid project id", 400);

    const project = await db.query.projects.findFirst({
      where: and(eq(projects.id, projectId), eq(projects.orgId, session.orgId!)),
      columns: { id: true },
    });
    if (!project) return err("Project not found", 404);

    const body = await parseBody(req, createIntakeSchema);

    const [item] = await db
      .insert(intakeItems)
      .values({
        projectId,
        orgId: session.orgId!,
        title: body.title,
        description: body.description ?? null,
        source: body.source,
        submitterEmail: body.submitterEmail,
      })
      .returning();

    return ok(item, 201);
  });
}
