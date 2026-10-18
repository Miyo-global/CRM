import type { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { z, ZodError } from "zod";

import { err, ok, parseBody, withAuth } from "@/lib/api/helpers";
import { createAuditLog } from "@/lib/audit-log";
import { db } from "@/lib/db";
import { kbSpaceMembers, kbSpaces, organizationMembers, users } from "@/lib/db/schema";
import { kbContext } from "@/lib/knowledge/actor";
import { decideSpaceAccess, isKbAdmin } from "@/lib/knowledge/authorization";
import { kbNotFound } from "@/lib/knowledge/errors";
import { resolveSpaceRole } from "@/lib/knowledge/space-access";
import { bumpSpaceAclRevision } from "@/lib/knowledge/spaces";
import { SYSTEM_ROLES } from "@/lib/rbac/permissions";

/** A seat names a person or a role, never both and never neither. */
const addSchema = z
  .object({
    userId: z.string().trim().min(1).max(64).optional(),
    role: z.enum(SYSTEM_ROLES).optional(),
    team: z.string().trim().max(120).optional(),
    spaceRole: z.enum(["viewer", "commenter", "editor", "publisher", "admin"]).default("viewer"),
  })
  .strict()
  .refine((body) => !!body.userId !== !!body.role, {
    message: "Name either a person or a role.",
  });

type SpaceGuard =
  | { response: NextResponse<never> }
  | { space: { id: number; orgId: string; deletedAt: Date | null; createdById: string | null } };

async function requireSpaceManage(
  orgId: string,
  spaceId: number,
  actor: Parameters<typeof resolveSpaceRole>[0],
): Promise<SpaceGuard> {
  if (!Number.isSafeInteger(spaceId) || spaceId <= 0) return { response: kbNotFound() };

  const space = await db.query.kbSpaces.findFirst({
    where: and(eq(kbSpaces.id, spaceId), eq(kbSpaces.orgId, orgId)),
    columns: { id: true, orgId: true, deletedAt: true, createdById: true },
  });

  const decision = decideSpaceAccess(
    {
      actor,
      space: space ?? null,
      spaceRole: space ? await resolveSpaceRole(actor, space.id) : null,
      isKbAdmin: isKbAdmin(actor),
      canViewOrgWide: (actor.permissions ?? []).includes("kb:spaces:view"),
    },
    "manage",
  );

  if (decision.outcome === "notFound") return { response: kbNotFound() };
  if (decision.outcome === "denied") {
    return { response: err("Managing members needs a space admin.", 403) };
  }
  return { space: space as NonNullable<typeof space> };
}

/** KB-0037: who is in this space. */
export async function GET(req: NextRequest, context: { params: Promise<{ spaceId: string }> }) {
  const { spaceId } = await context.params;
  return withAuth(async (session) => {
    const ctx = await kbContext(session);
    if ("response" in ctx) return ctx.response;

    const id = Number(spaceId);
    if (!Number.isSafeInteger(id) || id <= 0) return kbNotFound();

    const space = await db.query.kbSpaces.findFirst({
      where: and(eq(kbSpaces.id, id), eq(kbSpaces.orgId, session.orgId)),
      columns: { id: true, orgId: true, deletedAt: true, createdById: true },
    });
    const decision = decideSpaceAccess(
      {
        actor: ctx.actor,
        space: space ?? null,
        spaceRole: space ? await resolveSpaceRole(ctx.actor, space.id) : null,
        isKbAdmin: isKbAdmin(ctx.actor),
        canViewOrgWide: (ctx.actor.permissions ?? []).includes("kb:spaces:view"),
      },
      "view",
    );
    if (decision.outcome !== "allowed") return kbNotFound();

    const rows = await db
      .select({
        id: kbSpaceMembers.id,
        userId: kbSpaceMembers.userId,
        role: kbSpaceMembers.role,
        team: kbSpaceMembers.team,
        spaceRole: kbSpaceMembers.spaceRole,
        createdAt: kbSpaceMembers.createdAt,
        userName: users.name,
      })
      .from(kbSpaceMembers)
      .leftJoin(users, eq(users.id, kbSpaceMembers.userId))
      .where(
        and(eq(kbSpaceMembers.orgId, session.orgId), eq(kbSpaceMembers.spaceId, id)),
      );

    return ok(rows);
  }, req);
}

export async function POST(req: NextRequest, context: { params: Promise<{ spaceId: string }> }) {
  const { spaceId } = await context.params;
  return withAuth(async (session) => {
    const ctx = await kbContext(session);
    if ("response" in ctx) return ctx.response;

    const guard = await requireSpaceManage(session.orgId, Number(spaceId), ctx.actor);
    if ("response" in guard) return guard.response;

    try {
      const body = await parseBody(req, addSchema);

      // A person from another org has no business holding a seat here.
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
        .insert(kbSpaceMembers)
        .values({
          orgId: session.orgId,
          spaceId: guard.space.id,
          userId: body.userId ?? null,
          role: body.role ?? null,
          team: body.team ?? null,
          spaceRole: body.spaceRole,
        })
        .onConflictDoNothing()
        .returning();

      const created = inserted[0];
      if (!created) return err("That person or role already has a seat in this space.", 409);

      await bumpSpaceAclRevision(session.orgId);
      await createAuditLog({
        action: "kb.member.added",
        userId: session.user.id,
        orgId: session.orgId,
        targetId: String(guard.space.id),
        targetType: "kb_space",
        metadata: { memberId: created.id, userId: body.userId, role: body.role, spaceRole: body.spaceRole },
      });

      return ok(created, 201);
    } catch (error) {
      if (error instanceof ZodError) return err(error.issues[0]?.message ?? "Invalid member.", 400);
      throw error;
    }
  }, req);
}
