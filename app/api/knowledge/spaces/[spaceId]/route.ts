import type { NextRequest } from "next/server";
import { and, eq, isNull } from "drizzle-orm";
import { z, ZodError } from "zod";

import { err, ok, parseBody, withAuth } from "@/lib/api/helpers";
import { createAuditLog, diffFields } from "@/lib/audit-log";
import { db } from "@/lib/db";
import { kbSpaces } from "@/lib/db/schema";
import { kbContext, requireKbPermission } from "@/lib/knowledge/actor";
import { decideSpaceAccess, isKbAdmin } from "@/lib/knowledge/authorization";
import { kbNotFound } from "@/lib/knowledge/errors";
import { bumpSpaceAclRevision, countSpacePages } from "@/lib/knowledge/spaces";
import { resolveSpaceRole } from "@/lib/knowledge/space-access";

const patchSchema = z
  .object({
    name: z.string().trim().min(1).max(120).optional(),
    description: z.string().trim().max(2000).nullable().optional(),
    audience: z.enum(["internal", "public", "mixed"]).optional(),
    icon: z.string().trim().max(60).nullable().optional(),
    color: z.string().trim().max(32).nullable().optional(),
    defaultVisibility: z.enum(["private", "org", "public"]).optional(),
    isPublicHelpCenter: z.boolean().optional(),
  })
  .strict();

async function loadSpace(orgId: string, spaceId: number) {
  if (!Number.isSafeInteger(spaceId) || spaceId <= 0) return null;
  return (
    (await db.query.kbSpaces.findFirst({
      where: and(eq(kbSpaces.id, spaceId), eq(kbSpaces.orgId, orgId)),
    })) ?? null
  );
}

export async function GET(req: NextRequest, context: { params: Promise<{ spaceId: string }> }) {
  const { spaceId } = await context.params;
  return withAuth(async (session) => {
    const ctx = await kbContext(session);
    if ("response" in ctx) return ctx.response;

    const space = await loadSpace(session.orgId, Number(spaceId));
    const decision = decideSpaceAccess(
      {
        actor: ctx.actor,
        space,
        spaceRole: space ? await resolveSpaceRole(ctx.actor, space.id) : null,
        isKbAdmin: isKbAdmin(ctx.actor),
        canViewOrgWide: (ctx.actor.permissions ?? []).includes("kb:spaces:view"),
      },
      "view",
    );
    if (decision.outcome === "notFound") return kbNotFound();
    if (decision.outcome === "denied") return err("You do not have access to this space.", 403);

    return ok({
      ...space,
      counts: await countSpacePages(session.orgId, space!.id),
      myAccess: decision.scope.action,
      via: decision.scope.via,
    });
  }, req);
}

export async function PATCH(req: NextRequest, context: { params: Promise<{ spaceId: string }> }) {
  const { spaceId } = await context.params;
  return withAuth(async (session) => {
    const ctx = await kbContext(session);
    if ("response" in ctx) return ctx.response;

    const space = await loadSpace(session.orgId, Number(spaceId));
    if (!space || space.deletedAt) return kbNotFound();

    const decision = decideSpaceAccess(
      {
        actor: ctx.actor,
        space,
        spaceRole: await resolveSpaceRole(ctx.actor, space.id),
        isKbAdmin: isKbAdmin(ctx.actor),
        canViewOrgWide: (ctx.actor.permissions ?? []).includes("kb:spaces:view"),
      },
      "manage",
    );
    if (decision.outcome === "notFound") return kbNotFound();
    if (decision.outcome === "denied") return err("Managing this space needs a space admin.", 403);

    try {
      const body = await parseBody(req, patchSchema);
      if (Object.keys(body).length === 0) return err("Nothing to change.", 400);

      const [updated] = await db
        .update(kbSpaces)
        .set({ ...body, updatedAt: new Date() })
        .where(and(eq(kbSpaces.id, space.id), eq(kbSpaces.orgId, session.orgId)))
        .returning();

      // Audience and default visibility decide who may read what, so the chunk
      // ACL snapshots have to be told.
      if (body.audience !== undefined || body.defaultVisibility !== undefined) {
        await bumpSpaceAclRevision(session.orgId);
      }

      // R3-ADM-09: only values that really changed, with old and new.
      const changes = diffFields(space, body);
      if (Object.keys(changes).length > 0) {
        await createAuditLog({
          action: "kb.space.updated",
          userId: session.user.id,
          orgId: session.orgId,
          targetId: String(space.id),
          targetType: "kb_space",
          metadata: { changedFields: Object.keys(changes), changes },
        });
      }

      return ok(updated);
    } catch (error) {
      if (error instanceof ZodError) return err(error.issues[0]?.message ?? "Invalid space.", 400);
      throw error;
    }
  }, req);
}

/** Soft delete. The pages stay, so a mistaken delete is recoverable. */
export async function DELETE(req: NextRequest, context: { params: Promise<{ spaceId: string }> }) {
  const { spaceId } = await context.params;
  return withAuth(async (session) => {
    const ctx = await kbContext(session);
    if ("response" in ctx) return ctx.response;

    const denied = requireKbPermission(ctx.actor, "kb:spaces:manage");
    if (denied) return denied;

    const space = await loadSpace(session.orgId, Number(spaceId));
    if (!space || space.deletedAt) return kbNotFound();

    const counts = await countSpacePages(session.orgId, space.id);
    if (counts.pages > 0) {
      return err(
        `This space still holds ${counts.pages} page(s). Archive it instead, or move them first.`,
        409,
      );
    }

    await db
      .update(kbSpaces)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(
        and(
          eq(kbSpaces.id, space.id),
          eq(kbSpaces.orgId, session.orgId),
          isNull(kbSpaces.deletedAt),
        ),
      );

    await bumpSpaceAclRevision(session.orgId);
    await createAuditLog({
      action: "kb.space.archived",
      userId: session.user.id,
      orgId: session.orgId,
      targetId: String(space.id),
      targetType: "kb_space",
      metadata: { deleted: true },
    });

    return ok({ id: space.id, deleted: true });
  }, req);
}
