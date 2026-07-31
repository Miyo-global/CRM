import { type NextRequest } from "next/server";
import { withAuth, ok, err, parseBody, parseQuery } from "@/lib/api/helpers";
import { cached, invalidateCache, CACHE_KEYS, CACHE_TTL } from "@/lib/cache";
import { db } from "@/lib/db";
import { dealApprovals, dealApprovalRules, deals, users } from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { ADMIN_ROLES } from "@/lib/constants/roles";
import { createNotification } from "@/server/actions/create-notification";
import { z } from "zod";

const listSchema = z.object({
  status: z.enum(["pending", "approved", "rejected"]).optional(),
  limit: z.coerce.number().min(1).max(50).optional(),
});

const VALID_STAGES = ["LEAD", "CONTACTED", "PROPOSAL", "NEGOTIATION", "WON", "LOST"] as const;

const requestSchema = z.object({
  dealId: z.number().int().positive(),
  requestedStage: z.enum(VALID_STAGES),
});

const resolveSchema = z.object({
  approvalId: z.number().int().positive(),
  action: z.enum(["approve", "reject"]),
  rejectionReason: z.string().optional(),
});

export async function GET(req: NextRequest) {
  return withAuth(async (session) => {
    const { status, limit } = parseQuery(req, listSchema);

    const data = await cached(
      CACHE_KEYS.approvalsList(session.orgId),
      async () => {
        const conditions = [eq(dealApprovals.orgId, session.orgId)];
        if (status) conditions.push(eq(dealApprovals.status, status));

        return db
          .select({
            id: dealApprovals.id,
            dealId: dealApprovals.dealId,
            dealName: deals.name,
            dealValue: deals.value,
            requestedBy: dealApprovals.requestedBy,
            requesterName: users.name,
            requestedStage: dealApprovals.requestedStage,
            status: dealApprovals.status,
            rejectionReason: dealApprovals.rejectionReason,
            createdAt: dealApprovals.createdAt,
            resolvedAt: dealApprovals.resolvedAt,
          })
          .from(dealApprovals)
          .leftJoin(deals, eq(dealApprovals.dealId, deals.id))
          .leftJoin(users, eq(dealApprovals.requestedBy, users.id))
          .where(and(...conditions))
          .orderBy(desc(dealApprovals.createdAt))
          .limit(limit ?? 20);
      },
      { ttlSeconds: CACHE_TTL.MEDIUM },
    );

    return ok(data);
  });
}

export async function POST(req: NextRequest) {
  return withAuth<unknown>(async (session) => {
    const body = await req.json();

    if (body.approvalId) {
      const { approvalId, action, rejectionReason } = resolveSchema.parse(body);
      const role = session.user.role ?? "";

      const [approval] = await db
        .select()
        .from(dealApprovals)
        .where(and(eq(dealApprovals.id, approvalId), eq(dealApprovals.orgId, session.orgId)));
      if (!approval) return err("Approval not found", 404);
      if (approval.status !== "pending") return err("Approval already resolved", 409);

      const [targetDeal] = await db
        .select({ value: deals.value })
        .from(deals)
        .where(and(eq(deals.id, approval.dealId), eq(deals.orgId, session.orgId)));
      if (!targetDeal) return err("Deal not found", 404);

      const activeRules = await db
        .select()
        .from(dealApprovalRules)
        .where(and(eq(dealApprovalRules.orgId, session.orgId), eq(dealApprovalRules.isActive, true)));

      const matchingRules = activeRules
        .filter((r) => Number(targetDeal.value ?? 0) >= Number(r.minValue))
        .sort((a, b) => Number(b.minValue) - Number(a.minValue));
      const bindingRule = matchingRules[0];

      if (bindingRule) {
        if (role !== bindingRule.approverRole && !ADMIN_ROLES.includes(role)) {
          return err(`Only ${bindingRule.approverRole} can resolve this approval`, 403);
        }
      } else if (!ADMIN_ROLES.includes(role)) {
        return err("Only admins can resolve approvals", 403);
      }

      const updated = await db.transaction(async (tx) => {
        const [row] = await tx
          .update(dealApprovals)
          .set({
            status: action === "approve" ? "approved" : "rejected",
            approvedBy: session.user.id,
            rejectionReason: action === "reject" ? rejectionReason : null,
            resolvedAt: new Date(),
          })
          .where(and(eq(dealApprovals.id, approvalId), eq(dealApprovals.orgId, session.orgId)))
          .returning();

        if (action === "approve" && row) {
          await tx
            .update(deals)
            .set({ stage: row.requestedStage as (typeof VALID_STAGES)[number], updatedAt: new Date() })
            .where(and(eq(deals.id, row.dealId), eq(deals.orgId, session.orgId)));
        }

        return row;
      });

      if (!updated) return err("Approval not found", 404);

      await createNotification({
        orgId: session.orgId,
        userId: updated.requestedBy,
        type: "INFO",
        title: action === "approve" ? "Deal approved" : "Deal approval rejected",
        message: action === "approve"
          ? `Your deal has been approved to move to ${updated.requestedStage}`
          : `Your deal approval was rejected: ${rejectionReason || "No reason given"}`,
        link: `/crm/deals/${updated.dealId}`,
      });

      await invalidateCache(CACHE_KEYS.approvalsList(session.orgId));
      return ok(updated);
    }

    const { dealId, requestedStage } = requestSchema.parse(body);

    const [deal] = await db.select().from(deals).where(and(eq(deals.id, dealId), eq(deals.orgId, session.orgId)));
    if (!deal) return err("Deal not found", 404);

    const requesterRole = session.user.role ?? "";
    const isOwner = deal.assignedToId === session.user.id;
    if (!isOwner && !ADMIN_ROLES.includes(requesterRole)) {
      return err("You do not have permission to change this deal's stage", 403);
    }

    const rules = await db
      .select()
      .from(dealApprovalRules)
      .where(and(eq(dealApprovalRules.orgId, session.orgId), eq(dealApprovalRules.isActive, true)));

    const needsApproval = rules.some(r => Number(deal.value ?? 0) >= Number(r.minValue));

    if (!needsApproval) {
      await db
        .update(deals)
        .set({ stage: requestedStage as typeof deals.$inferSelect.stage, updatedAt: new Date() })
        .where(and(eq(deals.id, dealId), eq(deals.orgId, session.orgId)));
      return ok({ approved: true, directUpdate: true });
    }

    const [approval] = await db
      .insert(dealApprovals)
      .values({
        orgId: session.orgId,
        dealId,
        requestedBy: session.user.id,
        requestedStage,
      })
      .returning();

    await invalidateCache(CACHE_KEYS.approvalsList(session.orgId));
    return ok(approval, 201);
  });
}
