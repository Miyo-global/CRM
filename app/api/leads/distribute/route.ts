import { type NextRequest } from "next/server";
import { withAuth, ok, err, parseBody } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import {
  leads,
  users,
  organizationMembers,
  leaveRequests,
  notifications,
} from "@/lib/db/schema";
import { eq, and, lte, gte, inArray, isNull } from "drizzle-orm";
import { sendEmail } from "@/lib/email";
import { escapeHtml } from "@/lib/email-templates/base";
import { appUrl } from "@/lib/app-url";
import { logger } from "@/lib/logger";
import { z } from "zod";

const schema = z.object({
  leadIds: z.array(z.number()).min(1),
  skipAbsent: z.boolean().default(true),
});

export async function POST(req: NextRequest) {
  return withAuth(async (session) => {
    const role = session.user.role ?? "";
    if (!["CEO", "HR"].includes(role)) {
      return err("Only CEO or HR can distribute leads", 403);
    }

    const input = await parseBody(req, schema);
    const orgId = session.orgId!;

    const orgMembers = await db.query.organizationMembers.findMany({
      where: eq(organizationMembers.orgId, orgId),
      columns: { userId: true },
    });
    const orgMemberIds = orgMembers.map((m) => m.userId);
    if (orgMemberIds.length === 0) {
      return err("No organization members found", 400);
    }

    const salesPeople = await db.query.users.findMany({
      where: and(
        inArray(users.id, orgMemberIds),
        eq(users.isActive, true),
        eq(users.hasDashboardAccess, true),
        inArray(users.role, ["SALES"])
      ),
      columns: { id: true, name: true, email: true },
    });

    if (salesPeople.length === 0) {
      return err("No active sales team members found.", 400);
    }

    const today = new Date().toISOString().split("T")[0]!;
    const approvedLeaves = await db.query.leaveRequests.findMany({
      where: and(
        eq(leaveRequests.orgId, orgId),
        eq(leaveRequests.status, "APPROVED"),
        lte(leaveRequests.startDate, today),
        gte(leaveRequests.endDate, today)
      ),
      columns: { userId: true },
    });
    const absentUserIds = new Set(approvedLeaves.map((l) => l.userId));
    const absentSalesPeople = salesPeople.filter((sp) => absentUserIds.has(sp.id));

    let availableSalesPeople = salesPeople;
    if (input.skipAbsent && absentSalesPeople.length > 0) {
      availableSalesPeople = salesPeople.filter((sp) => !absentUserIds.has(sp.id));
      if (availableSalesPeople.length === 0) {
        return err("All sales team members are on leave today.", 400);
      }
    }

    const leadsToDistribute = await db.query.leads.findMany({
      where: and(inArray(leads.id, input.leadIds), eq(leads.orgId, orgId), isNull(leads.deletedAt)),
    });

    if (leadsToDistribute.length === 0) {
      return err("No valid leads found to distribute", 404);
    }

    const assignments = new Map<string, typeof leadsToDistribute>();
    for (const sp of availableSalesPeople) assignments.set(sp.id, []);

    for (let i = 0; i < leadsToDistribute.length; i++) {
      const sp = availableSalesPeople[i % availableSalesPeople.length];
      assignments.get(sp.id)!.push(leadsToDistribute[i]);
    }

    const now = new Date();
    await db.transaction(async (tx) => {
      for (const [salesPersonId, assignedLeads] of assignments) {
        if (assignedLeads.length === 0) continue;
        const leadIds = assignedLeads.map((l) => l.id);
        await tx.update(leads)
          .set({ assignedToId: salesPersonId, assignedById: session.user.id, assignedAt: now, updatedAt: now })
          .where(and(inArray(leads.id, leadIds), eq(leads.orgId, orgId)));
      }
    });

    const baseUrl = appUrl;
    const assignerName = escapeHtml(session.user.name || "A manager");

    for (const sp of salesPeople) {
      const assignedLeads = assignments.get(sp.id) || [];
      if (assignedLeads.length === 0 || !sp.email) continue;
      try {
        const leadRows = assignedLeads
          .map(
            (l) =>
              `<tr><td style="padding:8px;border-bottom:1px solid #e5e7eb;">${escapeHtml(l.name)}</td><td style="padding:8px;border-bottom:1px solid #e5e7eb;">${escapeHtml(l.company || "N/A")}</td><td style="padding:8px;border-bottom:1px solid #e5e7eb;">${escapeHtml(l.status)}</td></tr>`
          )
          .join("");
        await sendEmail({
          to: sp.email,
          subject: `${assignedLeads.length} New Lead${assignedLeads.length > 1 ? "s" : ""} Assigned — Miyo Global`,
          html: `<!DOCTYPE html><html><body style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;"><div style="background:linear-gradient(135deg,#0f2b7f,#1e40af);padding:24px;text-align:center;border-radius:10px 10px 0 0;"><h1 style="color:#bd882c;margin:0;font-size:22px;">Miyo Global</h1></div><div style="background:#fff;padding:24px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 10px 10px;"><h2 style="color:#1e40af;margin-top:0;">New Leads Assigned to You</h2><p>Hi <strong>${escapeHtml(sp.name || "Team Member")}</strong>,</p><p><strong>${assignerName}</strong> has distributed <strong>${assignedLeads.length}</strong> lead${assignedLeads.length > 1 ? "s" : ""} to you:</p><table style="width:100%;border-collapse:collapse;margin:16px 0;"><tr style="background:#f3f4f6;"><th style="padding:8px;text-align:left;">Name</th><th style="padding:8px;text-align:left;">Company</th><th style="padding:8px;text-align:left;">Status</th></tr>${leadRows}</table><div style="text-align:center;margin:24px 0;"><a href="${baseUrl}/crm/leads" style="background:#0f2b7f;color:#bd882c;padding:12px 28px;text-decoration:none;border-radius:6px;font-weight:bold;">View Leads</a></div></div></body></html>`,
        });
      } catch (emailErr) {
        logger.error("Failed to send lead distribution email", { salesPersonId: sp.id, error: emailErr });
      }
    }

    return ok({
      distributed: leadsToDistribute.length,
      salesPeople: availableSalesPeople.length,
      totalSalesPeople: salesPeople.length,
      absentCount: absentSalesPeople.length,
      absentNames: absentSalesPeople.map((sp) => sp.name || "Unknown"),
      summary: [...assignments.entries()].map(([userId, assignedLeads]) => ({
        userId,
        name: availableSalesPeople.find((sp) => sp.id === userId)?.name || "Unknown",
        count: assignedLeads.length,
      })),
    });
  });
}
