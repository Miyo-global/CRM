import type { NextRequest } from "next/server";
import { desc, eq } from "drizzle-orm";
import { z, ZodError } from "zod";

import { err, ok, parseBody, withAuth } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { kbPageTemplates } from "@/lib/db/schema";
import { kbContext, requireKbPermission } from "@/lib/knowledge/actor";
import { STARTER_TEMPLATES } from "@/lib/knowledge/starter-templates";

const createSchema = z
  .object({
    name: z.string().trim().min(1, "Name the template.").max(120),
    description: z.string().trim().max(1000).optional(),
    icon: z.string().trim().max(60).optional(),
    content: z.unknown().optional(),
  })
  .strict();

/**
 * KB-0055, KB-0056: the org's templates, most-used first, with the fifteen
 * starters alongside them.
 *
 * The starters are not rows: a new org gets something to start from without a
 * seeded table it then has to curate, and they cannot be edited or deleted,
 * only used.
 */
export async function GET(req: NextRequest) {
  return withAuth(async (session) => {
    const ctx = await kbContext(session);
    if ("response" in ctx) return ctx.response;

    const rows = await db
      .select({
        id: kbPageTemplates.id,
        name: kbPageTemplates.name,
        description: kbPageTemplates.description,
        icon: kbPageTemplates.icon,
        useCount: kbPageTemplates.useCount,
        lastUsedAt: kbPageTemplates.lastUsedAt,
      })
      .from(kbPageTemplates)
      .where(eq(kbPageTemplates.orgId, session.orgId))
      .orderBy(desc(kbPageTemplates.useCount), desc(kbPageTemplates.lastUsedAt))
      .limit(100);

    return ok({
      items: rows,
      starters: STARTER_TEMPLATES.map((template) => ({
        key: template.key,
        name: template.name,
        description: template.description,
        category: template.category,
        icon: template.icon,
      })),
    });
  }, req);
}

export async function POST(req: NextRequest) {
  return withAuth(async (session) => {
    const ctx = await kbContext(session);
    if ("response" in ctx) return ctx.response;

    const denied = requireKbPermission(ctx.actor, "kb:templates:manage");
    if (denied) return denied;

    try {
      const body = await parseBody(req, createSchema);

      const inserted = await db
        .insert(kbPageTemplates)
        .values({
          orgId: session.orgId,
          name: body.name,
          description: body.description ?? null,
          icon: body.icon ?? null,
          content: (body.content ?? null) as never,
          createdById: session.user.id,
        })
        .onConflictDoNothing()
        .returning();

      const created = inserted[0];
      if (!created) return err("A template with that name already exists.", 409);

      return ok(created, 201);
    } catch (error) {
      if (error instanceof ZodError) return err(error.issues[0]?.message ?? "Invalid template.", 400);
      throw error;
    }
  }, req);
}
