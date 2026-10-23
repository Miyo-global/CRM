import { db } from "./db";
import { auditLogs } from "./db/schema";
import { logger } from "./logger";

export type AuditAction =
  | "user.login"
  | "user.logout"
  | "user.signup"
  | "user.password_reset"
  | "user.deactivated"
  | "org.created"
  | "org.member_invited"
  | "org.member_removed"
  | "org.member_role_changed"
  | "hr.employee_added"
  | "hr.employee_updated"
  | "hr.employee_terminated"
  | "hr.termination_refused"
  | "hr.employee_onboarded"
  | "hr.salary_changed"
  | "hr.salary_revised"
  | "hr.leave_approved"
  | "hr.leave_rejected"
  | "hr.leave_cancelled"
  | "hr.payroll_generated"
  | "hr.payroll_recalculated"
  | "hr.payroll_auto_generated"
  | "hr.payroll_approved"
  | "hr.payroll_paid"
  | "hr.payroll_deleted"
  | "hr.payroll_schedule_updated"
  | "hr.document_uploaded"
  | "project.created"
  | "project.updated"
  | "project.deleted"
  | "project.restored"
  | "project.created_from_deal"
  | "expense.created"
  | "expense.updated"
  | "expense.approved"
  | "expense.rejected"
  | "expense.paid"
  | "settings.updated"
  | "file.upload"
  | "file.download"
  | "target.created"
  | "target.updated"
  | "target.deleted"
  | "security_settings.updated"
  | "deal.created"
  | "deal.updated"
  | "deal.deleted"
  | "deal.stage_changed"
  | "lead.created"
  | "lead.updated"
  | "lead.deleted"
  | "lead.assigned"
  | "lead.status_changed"
  | "LEAD_MERGED"
  | "client.updated"
  | "client.status_changed"
  | "document.generated"
  | "CANDIDATE_STAGE_CHANGED"
  | "DOWNLOAD"
  | "VIEW"
  | "role.changed"
  | "leave_policy.updated"
  | "role.created"
  | "role.updated"
  | "submit_lead"
  | "document.signed"
  | "document.viewed"
  | "document.declined"
  | "quote.created"
  | "quote.updated"
  | "quote.deleted"
  | "quote.sent"
  | "quote.accepted"
  | "quote.rejected"
  | "quote.exported"
  | "onboarding.reminder_sent"
  | "worklog.exported"
  | "expense.exported"
  | "expense.deleted"
  | "hr.document_deleted"
  | "branch.created"
  | "branch.updated"
  | "branch.deleted"
  | "hr.bonus_paid"
  | "hr.assets_exported"
  | "role.deleted"
  // MIYO-0681: the ATS actions worth answering for later.
  | "ats.offer_created"
  | "ats.offer_sent"
  | "ats.offer_answered"
  | "ats.stage_moved"
  | "ats.candidate_erased"
  | "ats.candidate_exported"
  | "ats.retention_run"
  // KB-0009: the Knowledge Base actions worth answering for later.
  | "kb.page.created"
  | "kb.page.updated"
  | "kb.page.moved"
  | "kb.page.deleted"
  | "kb.page.restored"
  | "kb.page.purged"
  | "kb.page.published"
  | "kb.page.archived"
  | "kb.page.verified"
  | "kb.page.visibility_changed"
  | "kb.page.locked"
  | "kb.version.restored"
  | "kb.grant.created"
  | "kb.grant.revoked"
  | "kb.space.created"
  | "kb.space.updated"
  | "kb.space.archived"
  | "kb.space.restored"
  | "kb.member.added"
  | "kb.member.removed"
  | "kb.import.started"
  | "kb.export.started"
  | "kb.settings.updated"
  | "kb.share_link.created"
  | "kb.share_link.revoked";

interface AuditLogEntry {
  action: AuditAction;
  userId: string;
  orgId?: string;
  targetId?: string;
  targetType?: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
}

export async function createAuditLog(entry: AuditLogEntry): Promise<void> {
  try {
    await db.insert(auditLogs).values({
      action: entry.action,
      userId: entry.userId,
      orgId: entry.orgId ?? null,
      targetId: entry.targetId ?? null,
      targetType: entry.targetType ?? null,
      metadata: entry.metadata ?? null,
      ipAddress: entry.ipAddress ?? null,
    });
  } catch (error) {

    logger.error("AUDIT_FAILURE: Failed to create audit log — investigate immediately", {
      action: entry.action,
      userId: entry.userId,
      targetId: entry.targetId,
      error,
    });
  }
}
