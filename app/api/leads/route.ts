import { type NextRequest } from "next/server";
import { withAuth, ok, err, parseQuery, parseBody } from "@/lib/api/helpers";
import { invalidateCachePattern } from "@/lib/cache";
import { getLeads } from "@/server/queries/leads";
import { db } from "@/lib/db";
import { leads, notifications, users, organizationMembers } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { evaluateAssignmentRules, recalculateLeadScore, applySlaPolicy } from "@/server/lib/lead-triggers";
import { logger } from "@/lib/logger";
import { createAuditLog } from "@/lib/audit-log";
import { z } from "zod";
import { sendLeadAssignedEmail } from "@/lib/email";
import { notifyByRoles } from "@/server/actions/create-notification";
import { ROLES } from "@/lib/constants/roles";

const listSchema = z.object({
  status: z.enum(["NEW", "CONTACTED", "INTERESTED", "QUALIFIED", "CONVERTED", "LOST"]).optional(),
  priority: z.enum(["HOT", "WARM", "COLD"]).optional(),
  source: z.enum(["referral", "campaign", "cold_call", "website", "social_media", "walk_in", "other"]).optional(),
  assignedToId: z.string().optional(),
  search: z.string().optional(),
  sortBy: z.enum(["name", "email", "company", "status", "priority", "source", "score", "potentialValue", "createdAt"]).optional(),
  sortOrder: z.enum(["asc", "desc"]).optional(),
  page: z.coerce.number().min(1).optional(),
  limit: z.coerce.number().min(1).max(100).optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
});

const createSchema = z.object({
  name: z.string().min(1),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional(),
  whatsappNumber: z.string().optional(),
  source: z.enum(["referral", "campaign", "cold_call", "website", "social_media", "walk_in", "other"]).default("other"),
  campaignId: z.number().optional(),
  investmentInterest: z.string().optional(),
  potentialValue: z.string().regex(/^\d+(\.\d+)?$/, "Must be a non-negative number").optional(),
  notes: z.string().optional(),
  company: z.string().optional(),
  designation: z.string().optional(),
  city: z.string().optional(),
  referredBy: z.string().optional(),
  tags: z.array(z.string()).optional(),
  assignedToId: z.string().optional(),
  priority: z.enum(["HOT", "WARM", "COLD"]).default("WARM"),
});

export async function GET(req: NextRequest) {
  return withAuth(async (session) => {
    const filters = parseQuery(req, listSchema);
    const data = await getLeads(session.orgId!, {
      ...filters,
      role: session.user.role ?? undefined,
      userId: session.user.id,
      branch: {
        role: session.user.role ?? "",
        branchId: session.branchId,
        userId: session.user.id,
      },
    });
    return ok(data);
  });
}

export async function POST(req: NextRequest) {
  return withAuth(async (session) => {
    const input = await parseBody(req, createSchema);
    const orgId = session.orgId!;
    const userId = session.user.id;

    if (input.assignedToId) {
      const member = await db.query.organizationMembers.findFirst({
        where: and(
          eq(organizationMembers.userId, input.assignedToId),
          eq(organizationMembers.orgId, orgId)
        ),
      });
      if (!member) return err("Assigned user is not a member of this organization", 400);
    }

    const [newLead] = await db.insert(leads).values({
      orgId,
      name: input.name,
      email: input.email || null,
      phone: input.phone,
      whatsappNumber: input.whatsappNumber,
      source: input.source,
      campaignId: input.campaignId,
      priority: input.priority,
      investmentInterest: input.investmentInterest,
      potentialValue: input.potentialValue,
      notes: input.notes,
      company: input.company,
      designation: input.designation,
      city: input.city,
      referredBy: input.referredBy,
      tags: input.tags,
      assignedToId: input.assignedToId || null,
      assignedById: input.assignedToId ? userId : null,
      assignedAt: input.assignedToId ? new Date() : null,
    }).returning();

    if (input.assignedToId) {
      await db.insert(notifications).values({
        orgId,
        userId: input.assignedToId,
        type: "INFO",
        title: "New Lead Assigned",
        message: `You have been assigned a new lead: ${input.name}`,
        link: `/crm/leads`,
      });

      void (async () => {
        const rep = await db.query.users.findFirst({
          where: eq(users.id, input.assignedToId!),
          columns: { email: true, name: true },
        });
        if (rep?.email) {
          await sendLeadAssignedEmail(
            rep.email,
            rep.name ?? "Team Member",
            input.name,
            input.source,
            input.priority,
            session.user.name ?? "Manager"
          );
        }
      })().catch((e) => {
        logger.error("Lead assignment email failed", { leadId: newLead.id, assignedToId: input.assignedToId, error: e });
      });
    }

    if (!input.assignedToId) {
      try {
        await evaluateAssignmentRules(db, orgId, newLead.id);
      } catch (err) {
        logger.error("Auto-trigger: assignment rules failed", { leadId: newLead.id, error: err });
      }
    }

    try { await recalculateLeadScore(db, orgId, newLead.id); } catch (e) {
      logger.error("Auto-trigger: lead scoring failed", { leadId: newLead.id, error: e });
    }

    try { await applySlaPolicy(db, orgId, newLead.id); } catch (e) {
      logger.error("Auto-trigger: SLA policy failed", { leadId: newLead.id, error: e });
    }

    void notifyByRoles(orgId, [ROLES.CEO, ROLES.HR], {
      type: "INFO",
      title: "New Lead Created",
      message: `New lead "${input.name}" (${input.source}) was added.`,
      link: "/crm/leads",
      metadata: { leadId: newLead.id },
      excludeUserId: session.user.id,
      email: false,
    }).catch(() => {});

    await invalidateCachePattern(`leads:*:${orgId}:*`);

    void import("@/lib/inngest/dispatch-webhook").then(({ dispatchWebhook }) =>
      dispatchWebhook(orgId, "lead.created", {
        id: newLead.id,
        name: newLead.name,
        email: newLead.email,
        source: newLead.source,
        assignedToId: newLead.assignedToId,
      })
    );

    void createAuditLog({
      action: "lead.created",
      userId: session.user.id,
      orgId: session.orgId,
      targetId: String(newLead.id),
      targetType: "lead",
      metadata: { name: newLead.name, source: newLead.source, assignedToId: newLead.assignedToId },
    }).catch(() => {});

    return ok(newLead, 201);
  });
}
