import { headers } from "next/headers";
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
  | "hr.employee_rehired"
  // R3-ADM-12: lifecycle and admin changes that were not logged.
  | "hr.resignation_submitted"
  | "hr.resignation_reviewed"
  | "hr.resignation_signed_off"
  | "hr.resignation_withdrawn"
  | "hr.termination_updated"
  | "hr.termination_deleted"
  | "hr.termination_cancelled"
  | "hr.job_role_created"
  | "hr.job_role_updated"
  | "hr.job_role_deleted"
  | "org.invitation_resent"
  | "org.invitation_revoked"
  | "webhook.created"
  | "webhook.updated"
  | "webhook.deleted"
  | "user.login_blocked"
  | "hr.employee_onboarded"
  | "hr.salary_changed"
  | "hr.salary_revised"
  | "EMPLOYEE_PT_SET"
  | "EMPLOYEE_PT_UPDATED"
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
  | "email.test_sent"
  | "file.upload"
  | "file.download"
  | "security_settings.updated"
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

/**
 * R3-ADM-12: listed in the audit-log Action filter even before the first
 * event of that kind exists, so a reviewer can see they are tracked.
 */
export const ALWAYS_LISTED_AUDIT_ACTIONS: readonly AuditAction[] = [
  "hr.resignation_submitted",
  "hr.resignation_reviewed",
  "hr.resignation_signed_off",
  "hr.resignation_withdrawn",
  "hr.termination_updated",
  "hr.termination_deleted",
  "hr.termination_cancelled",
  "hr.job_role_created",
  "hr.job_role_updated",
  "hr.job_role_deleted",
  "org.invitation_resent",
  "org.invitation_revoked",
  "webhook.created",
  "webhook.updated",
  "webhook.deleted",
  "user.deactivated",
  "EMPLOYEE_PT_SET",
  "EMPLOYEE_PT_UPDATED",
  "email.test_sent",
];

/**
 * Only the fields whose value really changed, with old and new values
 * (R3-ADM-12). Values of keys that look secret are redacted.
 */
export function diffFields(
  before: Record<string, unknown>,
  after: Record<string, unknown>,
): Record<string, { from: unknown; to: unknown }> {
  const changes: Record<string, { from: unknown; to: unknown }> = {};
  for (const key of Object.keys(after)) {
    if (after[key] === undefined) continue;
    const from = before[key] ?? null;
    const to = after[key] ?? null;
    if (JSON.stringify(from) === JSON.stringify(to)) continue;
    changes[key] = /secret|password|token|key$/i.test(key)
      ? { from: "[redacted]", to: "[redacted]" }
      : { from, to };
  }
  return changes;
}

interface AuditLogEntry {
  action: AuditAction;
  userId: string;
  orgId?: string;
  targetId?: string;
  targetType?: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
}

/**
 * The caller's IP from the proxy headers, so no route has to pass it
 * (R2-SYS-04). Null outside a request (cron, scripts) or when no proxy set it.
 */
export async function requestIp(): Promise<string | null> {
  try {
    const h = await headers();
    return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || null;
  } catch {
    return null;
  }
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
      ipAddress: entry.ipAddress ?? (await requestIp()),
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
