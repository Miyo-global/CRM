import type { NextRequest } from "next/server";
import { and, eq, isNull } from "drizzle-orm";
import { z, ZodError } from "zod";

import { err, ok, parseBody, withAuth } from "@/lib/api/helpers";
import { createAuditLog } from "@/lib/audit-log";
import { db } from "@/lib/db";
import { kbPageGrants, organizationMembers, users } from "@/lib/db/schema";
import { kbContext } from "@/lib/knowledge/actor";
import { resolvePageAccess } from "@/lib/knowledge/authorization";
import { kbDenied, kbNotFound } from "@/lib/knowledge/errors";
import { SYSTEM_ROLES } from "@/lib/rbac/permissions";

const createSchema = z
  .object({
    userId: z.string().trim().min(1).max(64).optional(),
    role: z.enum(SYSTEM_ROLES).optional(),
    access: z.enum(["view", "comment", "edit", "manage"]).default("view"),
  })
  .strict()
  .refine((body) => !!body.userId !== !!body.role, {
    message: "Grant to either a person or a role.",
  });

/** KB-0049: who has been given access to this page beyond its visibility. */
export async function GET(req: NextRequest, context: { params: Promise<{ pageId: string }> }) {
  const { pageId } = await context.params;
  return withAuth(async (session) => {
    const ctx = await kbContext(session);
    if ("response" in ctx) return ctx.response;

    const id = Number(pageId);
    const decision = await resolvePageAccess(ctx.actor, id, "manage");
    if (decision.outcome === "notFound") return kbNotFound();
    if (decision.outcome === "denied") return kbDenied();

    const rows = await db
      .select({
        id: kbPageGrants.id,
        userId: kbPageGrants.userId,
        userName: users.name,
        role: kbPageGrants.role,
        access: kbPageGrants.access,
        grantedById: kbPageGrants.grantedById,
        createdAt: kbPageGrants.createdAt,
      })
      .from(kbPageGrants)
      .leftJoin(users, eq(users.id, kbPageGrants.userId))
      .where(
        and(
          eq(kbPageGrants.orgId, session.orgId),
          eq(kbPageGrants.pageId, id),
          isNull(kbPageGrants.revokedAt),
        ),
      );

    return ok({ items: rows });
  }, req);
}

export async function POST(req: NextRequest, context: { params: Promise<{ pageId: string }> }) {
  const { pageId } = await context.params;
  return withAuth(async (session) => {
    const ctx = await kbContext(session);
    if ("response" in ctx) return ctx.response;

    const id = Number(pageId);
    const decision = await resolvePageAccess(ctx.actor, id, "manage");
    if (decision.outcome === "notFound") return kbNotFound();
    if (decision.outcome === "denied") return kbDenied();

    try {
      const body = await parseBody(req, createSchema);

      if (body.userId) {
        const membership = await db.query.organizationMembers.findFirst({
          where: and(
            eq(organizationMembers.userId, body.userId),
            eq(organizationMembers.orgId, session.orgId),
          ),
          columns: { id: true },
        });
        if (!membership) return kbNotFound();
      }

      const inserted = await db
        .insert(kbPageGrants)
        .values({
          orgId: session.orgId,
          pageId: id,
          userId: body.userId ?? null,
          role: body.role ?? null,
          access: body.access,
          grantedById: session.user.id,
        })
        .onConflictDoNothing()
        .returning();

      const created = inserted[0];
      // The live uniques are partial, so a clash means a grant is already there.
      if (!created) {
        return err("That person or role already has a grant on this page.", 409);
      }

      await createAuditLog({
        action: "kb.grant.created",
        userId: session.user.id,
        orgId: session.orgId,
        targetId: String(id),
        targetType: "kb_page",
        metadata: { grantId: created.id, userId: body.userId, role: body.role, access: body.access },
      });

      return ok(created, 201);
    } catch (error) {
      if (error instanceof ZodError) return err(error.issues[0]?.message ?? "Invalid grant.", 400);
      throw error;
    }
  }, req);
}
