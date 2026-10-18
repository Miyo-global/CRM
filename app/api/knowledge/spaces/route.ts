import type { NextRequest } from "next/server";
import { z, ZodError } from "zod";

import { err, ok, parseBody, withAuth } from "@/lib/api/helpers";
import { createAuditLog } from "@/lib/audit-log";
import { db } from "@/lib/db";
import { kbSpaceMembers, kbSpaces } from "@/lib/db/schema";
import { kbContext, requireKbPermission } from "@/lib/knowledge/actor";
import { bumpSpaceAclRevision, listVisibleSpaces, uniqueSpaceSlug } from "@/lib/knowledge/spaces";

const createSchema = z
  .object({
    name: z.string().trim().min(1, "Name the space.").max(120),
    slug: z
      .string()
      .trim()
      .regex(/^[a-z0-9-]+$/, "A slug is lower-case letters, numbers and dashes.")
      .max(120)
      .optional(),
    description: z.string().trim().max(2000).optional(),
    type: z.enum(["private", "team", "company", "module", "support", "project"]).default("team"),
    audience: z.enum(["internal", "public", "mixed"]).default("internal"),
    icon: z.string().trim().max(60).optional(),
    color: z.string().trim().max(32).optional(),
    defaultVisibility: z.enum(["private", "org", "public"]).default("org"),
  })
  .strict();

/** KB-0035: spaces the caller can see, with member and page counts. */
export async function GET(req: NextRequest) {
  return withAuth(async (session) => {
    const ctx = await kbContext(session);
    if ("response" in ctx) return ctx.response;
    return ok(await listVisibleSpaces(ctx.actor));
  }, req);
}

export async function POST(req: NextRequest) {
  return withAuth(async (session) => {
    const ctx = await kbContext(session);
    if ("response" in ctx) return ctx.response;

    const denied = requireKbPermission(ctx.actor, "kb:spaces:manage");
    if (denied) return denied;

    try {
      const body = await parseBody(req, createSchema);
      const slug = body.slug ?? (await uniqueSpaceSlug(session.orgId, body.name));

      const [created] = await db
        .insert(kbSpaces)
        .values({
          orgId: session.orgId,
          name: body.name,
          slug,
          description: body.description ?? null,
          type: body.type,
          audience: body.audience,
          icon: body.icon ?? null,
          color: body.color ?? null,
          defaultVisibility: body.defaultVisibility,
          createdById: session.user.id,
        })
        .onConflictDoNothing()
        .returning();

      // The slug unique is partial on live rows, so a clash means a space with
      // that slug is already there; an explicit slug is the caller's to fix.
      if (!created) return err("A space with that slug already exists.", 409);

      // Whoever makes a space administers it, or nobody could add the first member.
      await db
        .insert(kbSpaceMembers)
        .values({
          orgId: session.orgId,
          spaceId: created.id,
          userId: session.user.id,
          spaceRole: "admin",
        })
        .onConflictDoNothing();

      await bumpSpaceAclRevision(session.orgId);
      await createAuditLog({
        action: "kb.space.created",
        userId: session.user.id,
        orgId: session.orgId,
        targetId: String(created.id),
        targetType: "kb_space",
        metadata: { name: created.name, slug: created.slug, type: created.type },
      });

      return ok(created, 201);
    } catch (error) {
      if (error instanceof ZodError) return err(error.issues[0]?.message ?? "Invalid space.", 400);
      throw error;
    }
  }, req);
}
