import { describe, expect, it } from "vitest";
import { MANAGEMENT_ROLES, hasRole, ROLES } from "@/lib/constants/roles";
import { canActOnLeave } from "@/lib/hr/leave-approvers";

/**
 * A44/A28: the sidebar shows the pending-approvals badge to the same roles that
 * can actually act on a request. The old check was CEO/HR only, so an ADMIN
 * who could approve never saw the badge.
 */
describe("sidebar leave badge audience", () => {
  const pendingFromEmployee = {
    status: "PENDING",
    approverId: null,
    user: { id: "emp-1", role: ROLES.EMPLOYEE, reportingTo: null },
  };

  for (const role of [ROLES.CEO, ROLES.ADMIN, ROLES.HR]) {
    it(`${role} sees the badge and can act`, () => {
      expect(hasRole(role, MANAGEMENT_ROLES)).toBe(true);
      expect(canActOnLeave({ id: `${role}-1`, role }, pendingFromEmployee)).toBe(true);
    });
  }

  it("a plain employee neither sees the badge nor can act", () => {
    expect(hasRole(ROLES.EMPLOYEE, MANAGEMENT_ROLES)).toBe(false);
    expect(
      canActOnLeave({ id: "emp-2", role: ROLES.EMPLOYEE }, pendingFromEmployee),
    ).toBe(false);
  });
});
