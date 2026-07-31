import { type NextRequest } from "next/server";
import { withAuth, withAdmin, ok, err, parseBody } from "@/lib/api/helpers";
import { getDeal } from "@/server/queries/crm";
import { db } from "@/lib/db";
import { deals, dealActivities, chatChannels, chatChannelMembers, users, commissions, dealApprovals } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { isAdminOrOwner } from "@/lib/auth/helpers";
import { z } from "zod";
import { invalidateSalesKpiCache } from "@/server/queries/sales-dashboard";
import { createAuditLog } from "@/lib/audit-log";
import { sendDealStageChangeEmail } from "@/lib/email";
import { logger } from "@/lib/logger";

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  value: z.coerce.number().min(0).optional(),
  stage: z.enum(["LEAD", "CONTACTED", "PROPOSAL", "NEGOTIATION", "WON", "LOST"]).optional(),
  probability: z.number().min(0).max(100).optional(),
  contactPerson: z.string().optional(),
  contactEmail: z.string().optional(),
  contactPhone: z.string().optional(),
  assignedToId: z.string().optional(),
  expectedCloseDate: z.preprocess((v) => (v === "" ? null : v), z.string().date().nullable().optional()),
  actualCloseDate: z.preprocess((v) => (v === "" ? null : v), z.string().date().nullable().optional()),
  lostReason: z.string().optional(),
  notes: z.string().optional(),
  version: z.string().datetime().optional(),
});

type Ctx = { params: Promise<{ dealId: string }> };

export async function GET(_req: NextRequest, ctx: Ctx) {
  const { dealId: id } = await ctx.params;
  const dealId = Number(id);
  if (!Number.isFinite(dealId)) return err("Invalid deal id", 400);

  return withAuth(async (session) => {
    const deal = await getDeal(session.orgId!, dealId);
    if (!deal) return err("Deal not found", 404);
    return ok(deal);
  });
}

export async function PATCH(req: NextRequest, ctx: Ctx) {
  const { dealId: id } = await ctx.params;
  const dealId = Number(id);
  if (!Number.isFinite(dealId)) return err("Invalid deal id", 400);

  return withAuth(async (session) => {
    const input = await parseBody(req, updateSchema);
    const updateData: Record<string, unknown> = { updatedAt: new Date() };

    const existing = await db.query.deals.findFirst({
      where: and(eq(deals.id, dealId), eq(deals.orgId, session.orgId!)),
      columns: { stage: true, updatedAt: true, assignedToId: true },
    });
    if (!existing) return err("Deal not found", 404);

    if (!isAdminOrOwner(session.user.role) && existing.assignedToId !== session.user.id) {
      return err("You do not have permission to update this deal.", 403);
    }

    if (input.version && existing.updatedAt) {
      const clientVersion = new Date(input.version).getTime();
      const serverVersion = new Date(existing.updatedAt).getTime();
      if (clientVersion < serverVersion) {
        return err("Conflict: deal was updated by another request. Please refresh.", 409);
      }
    }

    const previousStage = existing.stage;

    const mutableFields = [
      "name",
      "value",
      "stage",
      "probability",
      "contactPerson",
      "contactEmail",
      "contactPhone",
      "assignedToId",
      "expectedCloseDate",
      "actualCloseDate",
      "lostReason",
      "notes",
    ] as const;

    for (const key of mutableFields) {
      const val = (input as Record<string, unknown>)[key];
      if (val !== undefined) {
        updateData[key] = key === "value" ? String(val) : val;
      }
    }

    if (input.stage !== undefined) {
      if (input.stage === "WON") {
        updateData.actualCloseDate = new Date().toISOString().split("T")[0];
        updateData.probability = 100;
      } else if (input.stage === "LOST") {
        updateData.actualCloseDate = new Date().toISOString().split("T")[0];
        updateData.probability = 0;
      }
    }

    const updated = await db.transaction(async (tx) => {
      if (input.stage !== undefined && existing.stage !== input.stage) {
        await tx.insert(dealActivities).values({
          orgId: session.orgId!,
          dealId,
          type: "stage_change",
          previousValue: existing.stage,
          newValue: input.stage,
          subject: `Stage changed from ${existing.stage} to ${input.stage}`,
          userId: session.user.id,
        });

        if (input.stage === "NEGOTIATION") {
          const alreadyLinked = await tx.query.chatChannels.findFirst({
            where: eq(chatChannels.linkedDealId, dealId),
            columns: { id: true },
          });

          if (!alreadyLinked) {
            const dealRow = await tx.query.deals.findFirst({
              where: and(eq(deals.id, dealId), eq(deals.orgId, session.orgId!)),
              columns: { name: true, assignedToId: true },
            });

            const channelName = dealRow
              ? `Deal: ${dealRow.name}`
              : `Deal #${dealId}`;

            const [newChannel] = await tx
              .insert(chatChannels)
              .values({
                orgId: session.orgId!,
                name: channelName,
                type: "GROUP",
                description: `Auto-created channel for deal #${dealId} entering Negotiation`,
                createdBy: session.user.id,
                linkedDealId: dealId,
              })
              .returning({ id: chatChannels.id });

            const memberIds = [session.user.id];
            if (dealRow?.assignedToId && dealRow.assignedToId !== session.user.id) {
              memberIds.push(dealRow.assignedToId);
            }

            await tx.insert(chatChannelMembers).values(
              memberIds.map((uid) => ({
                channelId: newChannel.id,
                userId: uid,
                role: uid === session.user.id ? ("ADMIN" as const) : ("MEMBER" as const),
              }))
            );
          }
        }
      }

      const [row] = await tx.update(deals)
        .set(updateData)
        .where(and(eq(deals.id, dealId), eq(deals.orgId, session.orgId!)))
        .returning();
      return row;
    });

    if (!updated) return err("Deal not found", 404);

    if (input.stage !== undefined) {
      void invalidateSalesKpiCache(session.orgId!).catch(() => undefined);
    }

    if (input.stage === "WON") {
      void import("@/lib/inngest/dispatch-webhook").then(({ dispatchWebhook }) =>
        dispatchWebhook(session.orgId!, "deal.won", {
          id: updated.id,
          name: updated.name,
          value: updated.value,
          assignedToId: updated.assignedToId,
        })
      );
    }

    if (input.stage !== undefined && updated.assignedToId) {
      try {
        const assignee = await db.query.users.findFirst({
          where: eq(users.id, updated.assignedToId),
          columns: { email: true, name: true },
        });
        if (assignee?.email) {
          await sendDealStageChangeEmail(
            assignee.email,
            assignee.name ?? "Team Member",
            updated.name,
            previousStage ?? "Unknown",
            input.stage,
            updated.value,
            session.user.name ?? "Team Member",
            dealId
          );
        }
      } catch (emailError) {
        logger.error("DEAL_STAGE_CHANGE_EMAIL_FAILED", { dealId, error: emailError });
      }
    }

    try {
      await createAuditLog({
        action: input.stage !== undefined ? "deal.stage_changed" : "deal.updated",
        userId: session.user.id,
        orgId: session.orgId,
        targetId: String(dealId),
        targetType: "deal",
        metadata: { changedFields: Object.keys(input), newStage: input.stage },
      });
    } catch {  }

    return ok(updated);
  });
}

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  const { dealId: id } = await ctx.params;
  const dealId = Number(id);
  if (!Number.isFinite(dealId)) return err("Invalid deal id", 400);

  return withAdmin(async (session) => {
    await db.transaction(async (tx) => {
      await tx.delete(commissions)
        .where(and(eq(commissions.dealId, dealId), eq(commissions.orgId, session.orgId!)));
      await tx.delete(dealApprovals)
        .where(and(eq(dealApprovals.dealId, dealId), eq(dealApprovals.orgId, session.orgId!)));
      await tx.delete(deals)
        .where(and(eq(deals.id, dealId), eq(deals.orgId, session.orgId!)));
    });

    void createAuditLog({
      action: "deal.deleted",
      userId: session.user.id,
      orgId: session.orgId,
      targetId: String(dealId),
      targetType: "deal",
    }).catch(() => {});

    return ok({ success: true });
  });
}
