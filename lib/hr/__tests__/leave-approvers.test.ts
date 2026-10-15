import { describe, expect, it } from "vitest";
import { canActOnLeave, countActionableLeaves, leaveApproverRolesFor } from "../leave-approvers";

const pending = (
  user: { id: string; role: string; reportingTo?: string | null },
  approverId?: string,
) => ({ status: "PENDING", approverId: approverId ?? null, user });

describe("leave approver chain (A27)", () => {
  it("sends an employee's leave to HR, the CEO or an admin", () => {
    expect(leaveApproverRolesFor("ENGINEERING")).toEqual(["HR", "CEO", "ADMIN"]);
  });

  it("sends HR and Admin leave to the CEO", () => {
    expect(leaveApproverRolesFor("HR")).toEqual(["CEO"]);
    expect(leaveApproverRolesFor("ADMIN")).toEqual(["CEO"]);
  });

  it("sends the CEO's own leave to an admin", () => {
    expect(leaveApproverRolesFor("CEO")).toEqual(["ADMIN"]);
  });
});

describe("canActOnLeave", () => {
  const admin = { id: "admin-1", role: "ADMIN" };
  const ceo = { id: "ceo-1", role: "CEO" };

  it("never lets anyone approve their own leave", () => {
    expect(canActOnLeave(admin, pending({ id: "admin-1", role: "ADMIN" }))).toBe(false);
  });

  it("gives the admin's own request to the CEO", () => {
    const request = pending({ id: "admin-1", role: "ADMIN" });
    expect(canActOnLeave(ceo, request)).toBe(true);
    expect(canActOnLeave({ id: "hr-1", role: "HR" }, request)).toBe(false);
  });

  it("lets the requester's manager act", () => {
    const request = pending({ id: "e1", role: "ENGINEERING", reportingTo: "mgr-1" });
    expect(canActOnLeave({ id: "mgr-1", role: "ENGINEERING" }, request)).toBe(true);
  });

  it("honours a named approver", () => {
    const request = pending({ id: "e1", role: "ENGINEERING" }, "hr-2");
    expect(canActOnLeave({ id: "hr-1", role: "HR" }, request)).toBe(false);
    expect(canActOnLeave({ id: "hr-2", role: "HR" }, request)).toBe(true);
  });

  it("ignores requests that are not pending", () => {
    expect(
      canActOnLeave(ceo, { ...pending({ id: "e1", role: "HR" }), status: "APPROVED" }),
    ).toBe(false);
  });

  it("counts only what the viewer can act on (A28)", () => {
    const requests = [
      pending({ id: "admin-1", role: "ADMIN" }),
      pending({ id: "e1", role: "ENGINEERING" }),
    ];
    expect(countActionableLeaves(requests, admin)).toBe(1);
    expect(countActionableLeaves(requests, ceo)).toBe(2);
  });
});
