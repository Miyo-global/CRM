import { type NextRequest } from "next/server";
import { withAuth, ok, err, parseBody } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import {
  leads, deals, projects, tickets, clients, clientAccounts,
  notifications, organizationMembers, users,
} from "@/lib/db/schema";
import { eq, and, count, sql, isNull } from "drizzle-orm";
import { z } from "zod";
import { createAuditLog } from "@/lib/audit-log";
import { sendNotification } from "@/lib/notifications/send";
import { logger } from "@/lib/logger";
import { isAdminOrOwner } from "@/lib/auth/role-guards";

const schema = z.object({
  status: z.enum(["NEW", "CONTACTED", "INTERESTED", "QUALIFIED", "CONVERTED", "LOST"]),
  expectedStatus: z.enum(["NEW", "CONTACTED", "INTERESTED", "QUALIFIED", "CONVERTED", "LOST"]).optional(),
  lostReason: z.string().optional(),
  estimatedInvestment: z.string().optional(),
  conversionNotes: z.string().optional(),
});

type Ctx = { params: Promise<{ leadId: string }> };


async function getNextCrmAssignee(orgId: string): Promise<string | null> {
  const csMembers = await db
    .select({ userId: organizationMembers.userId })
    .from(organizationMembers)
    .where(
      and(
        eq(organizationMembers.orgId, orgId),
        eq(organizationMembers.role, "CUSTOMER_SUPPORT")
      )
    );

  if (csMembers.length === 0) return null;

  const grouped = await db
    .select({
      userId: clientAccounts.assignedCrmId,
      count: count(),
    })
    .from(clientAccounts)
    .where(
      and(
        eq(clientAccounts.orgId, orgId),
        sql`${clientAccounts.status} != 'INVESTED'`,
        sql`${clientAccounts.assignedCrmId} IS NOT NULL`
      )
    )
    .groupBy(clientAccounts.assignedCrmId);

  const counts = new Map<string, number>();
  for (const m of csMembers) counts.set(m.userId, 0);
  for (const row of grouped) {
    if (row.userId) counts.set(row.userId, row.count);
  }

  let minCount = Infinity;
  let assignee: string | null = null;
  for (const m of csMembers) {
    const c = counts.get(m.userId) ?? 0;
    if (c < minCount) {
      minCount = c;
      assignee = m.userId;
    }
  }

  return assignee;
}

export async function PATCH(req: NextRequest, ctx: Ctx) {
  const { leadId: id } = await ctx.params;
  const leadId = Number(id);
  if (!Number.isFinite(leadId)) return err("Invalid lead id", 400);

  return withAuth(async (session) => {
    const orgId = session.orgId!;
    const input = await parseBody(req, schema);

    const existing = await db.query.leads.findFirst({
      where: and(eq(leads.id, leadId), eq(leads.orgId, orgId), isNull(leads.deletedAt)),
      columns: { status: true, assignedToId: true },
    });
    if (!existing) return err("Lead not found.", 404);

    if (input.status === "CONVERTED" || input.status === "LOST") {
      const isOwner = existing.assignedToId === session.user.id;
      if (!isOwner && !isAdminOrOwner(session.user.role)) {
        return err("Forbidden: only the assigned owner or an admin can convert or mark a lead as lost.", 403);
      }
    }

    const allowedTransitions: Record<string, string[]> = {
      NEW: ["CONTACTED", "LOST"],
      CONTACTED: ["INTERESTED", "LOST"],
      INTERESTED: ["QUALIFIED", "LOST"],
      QUALIFIED: ["CONVERTED", "LOST"],
      CONVERTED: [],
      LOST: ["NEW", "CONTACTED"],
    };
    if (existing.status !== input.status && !allowedTransitions[existing.status]?.includes(input.status)) {
      return err(`Cannot transition lead from ${existing.status} to ${input.status}.`, 400);
    }

    if (input.status === "CONVERTED" && existing.status === "CONVERTED") {
      return err("Lead has already been converted", 409);
    }

    const updateData: Record<string, unknown> = {
      status: input.status,
      updatedAt: new Date(),
    };
    if (input.status === "CONVERTED") updateData.convertedAt = new Date();
    if (input.status === "LOST" && input.lostReason) updateData.lostReason = input.lostReason;
    if (input.status !== "LOST") updateData.lostReason = null;

    const conditions = [eq(leads.id, leadId), eq(leads.orgId, orgId), isNull(leads.deletedAt)];
    if (input.expectedStatus) conditions.push(eq(leads.status, input.expectedStatus));

    const [updated] = await db.update(leads)
      .set(updateData)
      .where(and(...conditions))
      .returning();

    if (!updated) {
      return err("Lead status has been updated by someone else, or lead not found. Please refresh.", 409);
    }

    if (input.status === "INTERESTED" || input.status === "QUALIFIED") {
      const rawValue = updated.potentialValue || updated.investmentInterest || "0";
      const parsedValue = Number(rawValue);
      const dealValue = Number.isFinite(parsedValue) && parsedValue > 0 ? parsedValue.toFixed(2) : "0.00";
      await db.transaction(async (tx) => {
        const existingDeal = await tx.query.deals.findFirst({
          where: and(eq(deals.leadId, updated.id), eq(deals.orgId, orgId)),
        });
        if (!existingDeal) {
          await tx.insert(deals).values({
            orgId,
            leadId: updated.id,
            name: `${updated.name}${updated.company ? " - " + updated.company : ""}`,
            value: dealValue,
            stage: "LEAD",
            contactPerson: updated.name,
            contactEmail: updated.email,
            contactPhone: updated.phone,
            assignedToId: null,
          });
        }
      });
    }

    if (input.status === "CONVERTED") {
      const crmAssigneeId = await getNextCrmAssignee(orgId);
      const resolvedEstimatedInvestment =
        input.estimatedInvestment ||
        updated.potentialValue ||
        updated.investmentInterest ||
        null;

      await db.transaction(async (tx) => {
        const existingClient = await tx.query.clients.findFirst({
          where: and(eq(clients.leadId, updated.id), eq(clients.orgId, orgId)),
        });
        if (!existingClient) {
          await tx.insert(clients).values({
            orgId,
            leadId: updated.id,
            name: updated.name,
            email: updated.email,
            phone: updated.phone,
            company: updated.company,
            designation: updated.designation,
            city: updated.city,
            investmentValue: updated.potentialValue,
            accountManagerId: updated.assignedToId,
            status: "active",
          });
        }

        const existingClientAccount = await tx.query.clientAccounts.findFirst({
          where: and(eq(clientAccounts.leadId, updated.id), eq(clientAccounts.orgId, orgId)),
        });
        if (!existingClientAccount) {
          await tx.insert(clientAccounts).values({
            orgId,
            leadId: updated.id,
            salesRepId: updated.assignedToId ?? session.user.id,
            assignedCrmId: crmAssigneeId,
            clientName: updated.name,
            clientEmail: updated.email,
            clientPhone: updated.phone,
            clientWhatsapp: updated.whatsappNumber,
            estimatedInvestment: resolvedEstimatedInvestment,
            status: "ACCOUNT_OPENING",
            convertedAt: new Date(),
          });
        }

        if (input.conversionNotes || input.estimatedInvestment) {
          await tx.update(leads)
            .set({
              ...(input.conversionNotes ? { notes: input.conversionNotes } : {}),
              ...(input.estimatedInvestment ? { potentialValue: input.estimatedInvestment, investmentInterest: input.estimatedInvestment } : {}),
            })
            .where(eq(leads.id, updated.id));
        }
      });

      void (async () => {
        try {
          const firstProject = await db.query.projects.findFirst({
            where: eq(projects.orgId, orgId),
          });
          if (firstProject) {
            const ticketCountResult = await db
              .select({ count: count() })
              .from(tickets)
              .where(eq(tickets.projectId, firstProject.id));
            const nextTicketNumber = (ticketCountResult[0]?.count ?? 0) + 1;

            await db.insert(tickets).values({
              orgId,
              title: `Onboard converted lead: ${updated.name}`,
              description: `Lead "${updated.name}" has been converted.\nCompany: ${updated.company || "N/A"}\nEmail: ${updated.email || "N/A"}\nPhone: ${updated.phone || "N/A"}`,
              type: "TASK",
              status: "TODO",
              priority: "HIGH",
              projectId: firstProject.id,
              ticketNumber: nextTicketNumber,
              reporterId: session.user.id,
            });
          }

          await db.insert(notifications).values({
            orgId,
            userId: updated.assignedToId || session.user.id,
            type: "SUCCESS",
            title: "Lead Converted",
            message: `Lead "${updated.name}" has been converted to a client.${crmAssigneeId ? " A CRM executive has been assigned." : ""}`,
            link: `/crm/clients`,
          });

          if (crmAssigneeId) {
            await db.insert(notifications).values({
              orgId,
              userId: crmAssigneeId,
              type: "INFO",
              title: "New Client Assigned",
              message: `Client "${updated.name}" has been assigned to you for onboarding. Estimated investment: ${resolvedEstimatedInvestment ?? "N/A"}.`,
              link: `/crm/clients`,
            });
          }

          const salesRep = await db.query.users.findFirst({
            where: eq(users.id, updated.assignedToId || session.user.id),
            columns: { email: true, name: true },
          });
          if (salesRep?.email) {
            await sendNotification({
              orgId,
              userId: updated.assignedToId || session.user.id,
              type: "SUCCESS",
              title: "Lead Converted",
              message: `Lead "${updated.name}" has been converted to a client.`,
              link: `/crm/clients`,
              channel: "email",
              recipientEmail: salesRep.email,
            });
          }

          if (crmAssigneeId) {
            const crmUser = await db.query.users.findFirst({
              where: eq(users.id, crmAssigneeId),
              columns: { email: true, name: true },
            });
            if (crmUser?.email) {
              await sendNotification({
                orgId,
                userId: crmAssigneeId,
                type: "INFO",
                title: "New Client Assigned",
                message: `Client "${updated.name}" has been assigned to you for onboarding.`,
                link: `/crm/clients`,
                channel: "email",
                recipientEmail: crmUser.email,
              });
            }
          }
        } catch (postConversionErr) {
          logger.error("Failed lead conversion onboarding/notification", { leadId, error: postConversionErr });
        }
      })();
    }

    void createAuditLog({
      action: "lead.status_changed",
      userId: session.user.id,
      orgId: session.orgId,
      targetId: String(leadId),
      targetType: "lead",
      metadata: { newStatus: input.status, lostReason: input.lostReason },
    }).catch(() => {});

    return ok(updated);
  });
}
