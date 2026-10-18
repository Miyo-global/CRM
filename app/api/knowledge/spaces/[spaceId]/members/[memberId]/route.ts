import type { NextRequest } from "next/server";
import { and, eq } from "drizzle-orm";

import { err, ok, withAuth } from "@/lib/api/helpers";
import { createAuditLog } from "@/lib/audit-log";
import { db } from "@/lib/db";
import { kbSpaceMembers, kbSpaces } from "@/lib/db/schema";
import { kbContext } from "@/lib/knowledge/actor";
import { decideSpaceAccess, isKbAdmin } from "@/lib/knowledge/authorization";
import { kbNotFound } from "@/lib/knowledge/errors";
import { resolveSpaceRole } from "@/lib/knowledge/space-access";
import { bumpSpaceAclRevision } from "@/lib/knowledge/spaces";

/**
 * KB-0037: give up a seat.
 *
 * The last admin cannot be removed. A space with no admin is unmanageable by
 * anyone but an org admin, and the person doing the removing usually has not
 * noticed they were the last one.
 */
export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ spaceId: string; memberId: string }> },
) {
  const { spaceId, memberId } = await context.params;
  return withAuth(async (session) => {
    const ctx = await kbContext(session);
    if ("response" in ctx) return ctx.response;

    const id = Number(spaceId);
    const seatId = Number(memberId);
    if (!Number.isSafeInteger(id) || id <= 0) return kbNotFound();
    if (!Number.isSafeInteger(seatId) || seatId <= 0) return kbNotFound();

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
      "manage",
    );
    if (decision.outcome === "notFound") return kbNotFound();
    if (decision.outcome === "denied") {
      return err("Managing members needs a space admin.", 403);
    }

    const seats = await db
      .select({ id: kbSpaceMembers.id, spaceRole: kbSpaceMembers.spaceRole })
      .from(kbSpaceMembers)
      .where(and(eq(kbSpaceMembers.orgId, session.orgId), eq(kbSpaceMembers.spaceId, id)));

    const seat = seats.find((row) => row.id === seatId);
    if (!seat) return kbNotFound();

    const admins = seats.filter((row) => row.spaceRole === "admin");
    if (seat.spaceRole === "admin" && admins.length <= 1) {
      return err("This is the space's last admin. Add another before removing this one.", 409);
    }

    await db
      .delete(kbSpaceMembers)
      .where(
        and(
          eq(kbSpaceMembers.orgId, session.orgId),
          eq(kbSpaceMembers.spaceId, id),
          eq(kbSpaceMembers.id, seatId),
        ),
      );

    await bumpSpaceAclRevision(session.orgId);
    await createAuditLog({
      action: "kb.member.removed",
      userId: session.user.id,
      orgId: session.orgId,
      targetId: String(id),
      targetType: "kb_space",
      metadata: { memberId: seatId, spaceRole: seat.spaceRole },
    });

    return ok({ id: seatId, removed: true });
  }, req);
}
