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
  | "hr.employee_onboarded"
  | "hr.salary_changed"
  | "hr.salary_revised"
  | "hr.leave_approved"
  | "hr.leave_rejected"
  | "hr.leave_cancelled"
  | "hr.payroll_generated"
  | "hr.payroll_auto_generated"
  | "hr.payroll_approved"
  | "hr.payroll_paid"
  | "hr.payroll_deleted"
  | "hr.payroll_schedule_updated"
  | "hr.document_uploaded"
  | "project.created"
  | "project.updated"
  | "project.deleted"
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
  | "mfa.reset"
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
  | "hr.bonus_paid";

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
