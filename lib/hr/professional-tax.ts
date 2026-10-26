import "server-only";

import { db } from "@/lib/db";
import { createAuditLog } from "@/lib/audit-log";
import { checkPermission } from "@/lib/rbac/middleware";
import { canEditOwnProfessionalTax } from "@/lib/constants/roles";

export const PT_VIEW_PERMISSION = "hr:payroll:pt:view";
export const PT_EDIT_PERMISSION = "hr:payroll:pt:edit";

type PtValue = number | string | null | undefined;

function toPaise(value: PtValue): number | null {
  if (value == null || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? Math.round(n * 100) : null;
}

/** Null and "not applicable" are the same; amounts compare to the paisa. */
export function sameProfessionalTax(a: PtValue, b: PtValue): boolean {
  return toPaise(a) === toPaise(b);
}

function formatPt(value: PtValue): string {
  const paise = toPaise(value);
  if (paise == null) return "N/A";
  return `₹${(paise / 100).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/** "PT ₹200.00 → ₹250.00", the diff the Audit Log page shows. */
export function professionalTaxDiffSummary(oldValue: PtValue, newValue: PtValue): string {
  return `PT ${formatPt(oldValue)} → ${formatPt(newValue)}`;
}

/** Decimal column value for a validated PT (null stays null). */
export function professionalTaxColumn(value: number | null): string | null {
  return value == null ? null : value.toFixed(2);
}

/**
 * Why this actor may not set the target's PT, or null when they may.
 * Needs hr:payroll:pt:edit; changing your own PT is Super Admin only.
 */
export async function professionalTaxEditError(opts: {
  orgId: string;
  actorId: string;
  actorRole: string | null | undefined;
  targetUserId: string;
}): Promise<{ message: string; status: 403 } | null> {
  const allowed = await checkPermission(
    db,
    opts.actorId,
    opts.orgId,
    opts.actorRole ?? undefined,
    PT_EDIT_PERMISSION,
  );
  if (!allowed) return { message: "You don't have permission to change professional tax.", status: 403 };
  if (opts.actorId === opts.targetUserId && !canEditOwnProfessionalTax(opts.actorRole)) {
    return { message: "Only the Super Admin can change their own professional tax.", status: 403 };
  }
  return null;
}

/**
 * EMPLOYEE_PT_SET on create (oldValue undefined), EMPLOYEE_PT_UPDATED on a
 * real change, nothing when the value is unchanged.
 */
export async function auditProfessionalTax(opts: {
  orgId: string;
  actorId: string;
  actorRole: string | null | undefined;
  employeeId: string;
  employeeName?: string | null;
  oldValue: PtValue;
  newValue: number | null;
  isCreate?: boolean;
}): Promise<void> {
  if (!opts.isCreate && sameProfessionalTax(opts.oldValue, opts.newValue)) return;
  const asStored = (v: PtValue) => {
    const paise = toPaise(v);
    return paise == null ? null : (paise / 100).toFixed(2);
  };
  await createAuditLog({
    action: opts.isCreate ? "EMPLOYEE_PT_SET" : "EMPLOYEE_PT_UPDATED",
    userId: opts.actorId,
    orgId: opts.orgId,
    targetId: opts.employeeId,
    targetType: "employee",
    metadata: {
      employeeId: opts.employeeId,
      employeeName: opts.employeeName ?? undefined,
      ...(opts.isCreate ? {} : { oldValue: asStored(opts.oldValue) }),
      newValue: asStored(opts.newValue),
      actorId: opts.actorId,
      actorRole: opts.actorRole ?? null,
      timestamp: new Date().toISOString(),
      summary: opts.isCreate
        ? `PT set to ${formatPt(opts.newValue)}`
        : professionalTaxDiffSummary(opts.oldValue, opts.newValue),
    },
  });
}
