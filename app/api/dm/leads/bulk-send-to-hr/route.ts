import { withAuth, ok, err, parseBody } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { leads, organizationMembers } from "@/lib/db/schema";
import { eq, and, inArray } from "drizzle-orm";
import { z } from "zod";
import type { NextRequest } from "next/server";

const ALLOWED_ROLES = new Set(["SALES", "CEO", "ADMIN"]);

const schema = z.object({
  leadIds: z.array(z.number().int().positive()).min(1).max(500),
  assignedToId: z.string().optional(),
});

export async function POST(req: NextRequest) {
  return withAuth(async (session) => {
    const role = session.user.role;
    if (!role || !ALLOWED_ROLES.has(role)) {
      return err("Forbidden", 403);
    }

    const { leadIds, assignedToId } = await parseBody(req, schema);

    if (assignedToId) {
      const member = await db.query.organizationMembers.findFirst({
        where: and(
          eq(organizationMembers.userId, assignedToId),
          eq(organizationMembers.orgId, session.orgId)
        ),
        columns: { id: true },
      });
      if (!member) {
        return err("Assigned user is not a member of this organization", 400);
      }
    }

    const result = await db
      .update(leads)
      .set({
        status: "CONTACTED",
        assignedToId: assignedToId ?? session.user.id,
        assignedById: session.user.id,
        assignedAt: new Date(),
      })
      .where(
        and(
          eq(leads.orgId, session.orgId),
          inArray(leads.id, leadIds),
          eq(leads.status, "NEW")
        )
      )
      .returning({ id: leads.id });

    return ok({ updated: result.length });
  });
}
