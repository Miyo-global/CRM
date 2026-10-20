import { hasFullAccess, isAdminOrOwner } from "@/lib/constants/roles";

/**
 * Separation of duties for money requests (loans, expenses, reimbursements),
 * QA-AUTH-04. Nobody decides their own request, and a request from HR, Admin
 * or Super Admin staff is decided only by an Admin or the Super Admin, so HR
 * cannot approve a colleague's claim. Payroll already had the self rule.
 *
 * Pure so the API routes and the buttons apply the same rule.
 */
const STAFF_ROLES: readonly string[] = ["CEO", "ADMIN", "HR"];

type Person = { id: string | null | undefined; role: string | null | undefined };

export type DutyCheck = { allowed: true } | { allowed: false; message: string };

export function canDecideRequest(actor: Person, owner: Person): DutyCheck {
  if (!isAdminOrOwner(actor.role)) {
    return { allowed: false, message: "Only HR, an Admin or the Super Admin can decide this request." };
  }
  if (!actor.id || actor.id === owner.id) {
    return { allowed: false, message: "You cannot decide your own request. Another Admin or the Super Admin has to." };
  }
  if (!hasFullAccess(actor.role) && !!owner.role && STAFF_ROLES.includes(owner.role)) {
    return { allowed: false, message: "Requests from HR or Admin staff are decided by an Admin or the Super Admin." };
  }
  return { allowed: true };
}

/** Deleting payroll drafts and HR documents is for an Admin or the Super Admin only. */
export function canDeleteHrRecord(role: string | null | undefined): boolean {
  return hasFullAccess(role);
}
