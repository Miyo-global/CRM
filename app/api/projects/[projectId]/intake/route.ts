

import { NextRequest } from "next/server";
import { withAuth, ok, parseBody, toNumber } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { intakeItems } from "@/lib/db/schema";
import { eq, and, desc, count } from "drizzle-orm";
import { z } from "zod";
import { requireProjectAccess } from "@/lib/projects/require-project-access";

const INTAKE_STATUSES = new Set(["pending", "accepted", "declined", "duplicate"]);

const createIntakeSchema = z.object({
  title: z.string().trim().min(1).max(200),
  description: z.unknown().optional(),
  source: z.enum(["manual", "web_form", "email"]).default("manual"),
  submitterEmail: z.string().email().optional(),
});

type RouteParams = { params: Promise<{ projectId: string }> };

export async function GET(req: NextRequest, { params }: RouteParams) {
  return withAuth(async (session) => {
    const { projectId: rawProjectId } = await params;
    const guard = await requireProjectAccess(session, rawProjectId, "view");
    if (!guard.ok) return guard.response;
    const { projectId } = guard;

    const { searchParams } = req.nextUrl;
    const rawStatus = searchParams.get("status");
    const status = rawStatus && INTAKE_STATUSES.has(rawStatus) ? rawStatus : undefined;
    const limit = Math.min(100, Math.max(1, Math.floor(toNumber(searchParams.get("limit")) ?? 50)));
    const offset = Math.max(0, Math.floor(toNumber(searchParams.get("offset")) ?? 0));

    const conditions = [
      eq(intakeItems.projectId, projectId),
      eq(intakeItems.orgId, session.orgId),
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
    const { projectId: rawProjectId } = await params;
    const guard = await requireProjectAccess(session, rawProjectId, "contribute");
    if (!guard.ok) return guard.response;
    const { projectId } = guard;

    const body = await parseBody(req, createIntakeSchema);

    const [item] = await db
      .insert(intakeItems)
      .values({
        projectId,
        orgId: session.orgId,
        title: body.title,
        description: body.description ?? null,
        source: body.source,
        submitterEmail: body.submitterEmail,
      })
      .returning();

    return ok(item, 201);
  });
}
