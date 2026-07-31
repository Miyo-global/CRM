import { type NextRequest } from "next/server";
import { withAuth, ok, err, parseBody } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { leads, notifications, auditLogs, users, organizationMembers } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { sendEmail } from "@/lib/email";
import { appUrl } from "@/lib/app-url";
import { logger } from "@/lib/logger";
import { generateSmartNotification } from "@/lib/ai/smart-notification";
import { escapeHtml } from "@/lib/email-templates/base";
import { z } from "zod";

const schema = z.object({ assignedToId: z.string() });

type Ctx = { params: Promise<{ leadId: string }> };

export async function PATCH(req: NextRequest, ctx: Ctx) {
  const { leadId: id } = await ctx.params;
  const leadId = Number(id);
  if (!Number.isFinite(leadId)) return err("Invalid lead id", 400);

  return withAuth(async (session) => {
    const role = session.user.role;
    if (role !== "CEO" && role !== "ADMIN" && role !== "HR") {
      return err("Forbidden: Manager or Admin role required", 403);
    }

    const { assignedToId } = await parseBody(req, schema);
    const orgId = session.orgId!;

    const member = await db.query.organizationMembers.findFirst({
      where: and(eq(organizationMembers.userId, assignedToId), eq(organizationMembers.orgId, orgId)),
    });
    if (!member) return err("Assigned user is not a member of this organization", 400);

    const existingLead = await db.query.leads.findFirst({
      where: and(eq(leads.id, leadId), eq(leads.orgId, orgId)),
      columns: { assignedToId: true },
    });
    if (!existingLead) return err("Lead not found", 404);
    const previousAssignee = existingLead.assignedToId;

    const [updated] = await db.update(leads)
      .set({
        assignedToId,
        assignedById: session.user.id,
        assignedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(and(eq(leads.id, leadId), eq(leads.orgId, orgId)))
      .returning();

    if (!updated) return err("Lead not found", 404);

    try {
      await db.insert(auditLogs).values({
        action: "lead.assigned",
        userId: session.user.id,
        orgId,
        targetId: String(leadId),
        targetType: "lead",
        metadata: {
          previousAssignee,
          newAssignee: assignedToId,
          leadName: updated.name,
        },
      });
    } catch (auditErr) {
      logger.error("Failed to write lead assignment audit log", { leadId, error: auditErr });
    }

    const notifContent = await generateSmartNotification({
      event: "LEAD_ASSIGNED",
      defaultTitle: "Lead Assigned to You",
      defaultMessage: `You have been assigned lead: ${updated.name}`,
      context: {
        leadName: updated.name,
        priority: updated.priority ?? undefined,
        source: updated.source ?? undefined,
        company: updated.company ?? undefined,
        potentialValue: updated.potentialValue ?? undefined,
        notes: updated.notes ?? undefined,
      },
    }).catch(() => ({
      title: "Lead Assigned to You",
      message: `You have been assigned lead: ${updated.name}`,
      enriched: false,
    }));

    await db.insert(notifications).values({
      orgId,
      userId: assignedToId,
      type: "INFO",
      title: notifContent.title,
      message: notifContent.message,
      link: `/crm/leads/${updated.id}`,
    });

    try {
      const [assignee, assigner] = await Promise.all([
        db.query.users.findFirst({ where: eq(users.id, assignedToId), columns: { email: true, name: true } }),
        db.query.users.findFirst({ where: eq(users.id, session.user.id), columns: { name: true } }),
      ]);
      if (assignee?.email) {
        const sAssigneeName = escapeHtml(assignee.name || "Team Member");
        const sAssignerName = escapeHtml(assigner?.name || "A manager");
        const sLeadName = escapeHtml(updated.name);
        await sendEmail({
          to: assignee.email,
          subject: `Lead Assigned: ${updated.name} — Miyo Global`,
          html: `<!DOCTYPE html><html><body style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;"><div style="background:linear-gradient(135deg,#0f2b7f,#1e40af);padding:24px;text-align:center;border-radius:10px 10px 0 0;"><h1 style="color:#bd882c;margin:0;font-size:22px;">Miyo Global</h1></div><div style="background:#fff;padding:24px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 10px 10px;"><h2 style="color:#1e40af;margin-top:0;">New Lead Assigned to You</h2><p>Hi <strong>${sAssigneeName}</strong>,</p><p><strong>${sAssignerName}</strong> has assigned you the lead: <strong>${sLeadName}</strong>.</p><div style="text-align:center;margin:24px 0;"><a href="${appUrl}/crm/leads/${updated.id}" style="background:#0f2b7f;color:#bd882c;padding:12px 28px;text-decoration:none;border-radius:6px;font-weight:bold;">View Lead</a></div></div></body></html>`,
        });
      }
    } catch (emailErr) {
      logger.error("Failed to send lead assignment email", { leadId: updated.id, error: emailErr });
    }

    return ok(updated);
  });
}
