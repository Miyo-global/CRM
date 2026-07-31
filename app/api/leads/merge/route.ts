import { withAuth, ok, err, parseBody } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { leads, leadActivities, leadNotes, leadEmails, leadTasks } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import { writeAuditLog } from "@/lib/db/audit";
import type { NextRequest } from "next/server";

const mergeSchema = z.object({
  winnerId: z.number().int().positive(),
  loserId: z.number().int().positive(),
  overrides: z
    .object({
      name: z.enum(["winner", "loser"]).optional(),
      email: z.enum(["winner", "loser"]).optional(),
      phone: z.enum(["winner", "loser"]).optional(),
      company: z.enum(["winner", "loser"]).optional(),
      city: z.enum(["winner", "loser"]).optional(),
      source: z.enum(["winner", "loser"]).optional(),
      notes: z.enum(["winner", "loser"]).optional(),
      priority: z.enum(["winner", "loser"]).optional(),
      assignedToId: z.enum(["winner", "loser"]).optional(),
      tags: z.enum(["winner", "loser"]).optional(),
    })
    .default({}),
});

export async function POST(req: NextRequest) {
  return withAuth(async (session) => {
    const role = session.user.role;
    if (role !== "CEO" && role !== "ADMIN" && role !== "HR") {
      return err("Forbidden: Manager or Admin role required", 403);
    }

    const body = await parseBody(req, mergeSchema);
    const { winnerId, loserId, overrides } = body;

    if (winnerId === loserId) {
      return err("Cannot merge a lead with itself", 400);
    }

    const [winner, loser] = await Promise.all([
      db.query.leads.findFirst({
        where: and(eq(leads.id, winnerId), eq(leads.orgId, session.orgId)),
      }),
      db.query.leads.findFirst({
        where: and(eq(leads.id, loserId), eq(leads.orgId, session.orgId)),
      }),
    ]);

    if (!winner) return err("Winner lead not found", 404);
    if (!loser) return err("Loser lead not found", 404);

    const pick = <T>(field: keyof typeof overrides, winVal: T, loseVal: T): T =>
      overrides[field] === "loser" ? loseVal : winVal;

    const mergedFields: Partial<typeof leads.$inferInsert> = {
      name: pick("name", winner.name, loser.name),
      email: pick("email", winner.email, loser.email),
      phone: pick("phone", winner.phone, loser.phone),
      company: pick("company", winner.company, loser.company),
      city: pick("city", winner.city, loser.city),
      source: pick("source", winner.source, loser.source),
      notes: pick("notes", winner.notes, loser.notes),
      priority: pick("priority", winner.priority, loser.priority),
      assignedToId: pick("assignedToId", winner.assignedToId, loser.assignedToId),
      tags: pick("tags", winner.tags, loser.tags),
      updatedAt: new Date(),
    };

    if (loser.score != null && (winner.score ?? 0) < loser.score) {
      mergedFields.score = loser.score;
    }

    await db.transaction(async (tx) => {
      await tx
        .update(leads)
        .set(mergedFields)
        .where(eq(leads.id, winnerId));

      await tx
        .update(leads)
        .set({ deletedAt: new Date(), mergedIntoId: winnerId, updatedAt: new Date() })
        .where(eq(leads.id, loserId));

      await tx
        .update(leadActivities)
        .set({ leadId: winnerId })
        .where(eq(leadActivities.leadId, loserId));

      await tx
        .update(leadNotes)
        .set({ leadId: winnerId })
        .where(eq(leadNotes.leadId, loserId));

      await tx
        .update(leadEmails)
        .set({ leadId: winnerId })
        .where(eq(leadEmails.leadId, loserId));

      await tx
        .update(leadTasks)
        .set({ leadId: winnerId })
        .where(eq(leadTasks.leadId, loserId));
    });

    void writeAuditLog({
      action: "LEAD_MERGED",
      userId: session.user.id,
      orgId: session.orgId,
      targetId: String(winnerId),
      targetType: "lead",
      metadata: {
        winnerId,
        loserId,
        winnerName: winner.name,
        loserName: loser.name,
        overrides,
      },
    }).catch(() => undefined);

    const updatedWinner = await db.query.leads.findFirst({
      where: eq(leads.id, winnerId),
    });

    return ok({ merged: true, winner: updatedWinner });
  });
}
