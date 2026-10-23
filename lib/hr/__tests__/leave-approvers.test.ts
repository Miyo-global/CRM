import { describe, expect, it } from "vitest";
import {
  autoApprovesUnroutedLeave,
  canActOnLeave,
  countActionableLeaves,
  leaveApproverRolesFor,
} from "../leave-approvers";

const pending = (
  user: { id: string; role: string; reportingTo?: string | null },
  approverId?: string,
) => ({ status: "PENDING", approverId: approverId ?? null, user });

describe("leave approver chain (A27)", () => {
  it("sends an employee's leave to HR, the CEO or an admin", () => {
    expect(leaveApproverRolesFor("ENGINEERING")).toEqual(["HR", "CEO", "ADMIN"]);
  });

  it("sends HR and Admin leave to the CEO or another Admin (QA-AUTH-05)", () => {
    expect(leaveApproverRolesFor("HR")).toEqual(["CEO", "ADMIN"]);
    expect(leaveApproverRolesFor("ADMIN")).toEqual(["CEO", "ADMIN"]);
  });

  it("sends the CEO's own leave to an admin", () => {
    expect(leaveApproverRolesFor("CEO")).toEqual(["ADMIN"]);
  });
});

describe("autoApprovesUnroutedLeave (QA-AUTH-05)", () => {
  it("never auto-approves an Admin's or HR's own leave", () => {
    expect(autoApprovesUnroutedLeave("ADMIN", false)).toBe(false);
    expect(autoApprovesUnroutedLeave("HR", false)).toBe(false);
    expect(autoApprovesUnroutedLeave("ENGINEERING", false)).toBe(false);
  });

  it("auto-approves the Super Admin's leave only with no other Admin", () => {
    expect(autoApprovesUnroutedLeave("CEO", false)).toBe(true);
    expect(autoApprovesUnroutedLeave("CEO", true)).toBe(false);
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
    expect(canActOnLeave({ id: "admin-2", role: "ADMIN" }, request)).toBe(true);
    expect(canActOnLeave({ id: "hr-1", role: "HR" }, request)).toBe(false);
  });

  it("lets the requester's manager act", () => {
    const request = pending({ id: "e1", role: "ENGINEERING", reportingTo: "mgr-1" });
    expect(canActOnLeave({ id: "mgr-1", role: "ENGINEERING" }, request)).toBe(true);
  });

  it("lets a named approver act even without an approver role", () => {
    const request = pending({ id: "e1", role: "ENGINEERING" }, "lead-1");
    expect(canActOnLeave({ id: "lead-1", role: "ENGINEERING" }, request)).toBe(true);
    expect(canActOnLeave({ id: "e2", role: "ENGINEERING" }, request)).toBe(false);
  });

  it("lets Admin, HR and the CEO act on a request routed to someone else (R2-LV-01)", () => {
    const request = pending({ id: "e1", role: "ENGINEERING" }, "hr-2");
    expect(canActOnLeave(admin, request)).toBe(true);
    expect(canActOnLeave(ceo, request)).toBe(true);
    expect(canActOnLeave({ id: "hr-1", role: "HR" }, request)).toBe(true);
    expect(canActOnLeave({ id: "hr-2", role: "HR" }, request)).toBe(true);
  });

  it("still keeps HR off an Admin's request routed to the CEO", () => {
    const request = pending({ id: "admin-1", role: "ADMIN" }, "ceo-1");
    expect(canActOnLeave({ id: "hr-1", role: "HR" }, request)).toBe(false);
  });

  it("lets the manager act even when the request names another approver (V5-0003)", () => {
    const request = pending({ id: "e1", role: "ENGINEERING", reportingTo: "mgr-1" }, "hr-2");
    expect(canActOnLeave({ id: "mgr-1", role: "ENGINEERING" }, request)).toBe(true);
  });

  it("hands a deactivated approver's request back to the approver roles (V5-0002)", () => {
    const request = { ...pending({ id: "e1", role: "ENGINEERING" }, "hr-gone"), approver: { isActive: false } };
    expect(canActOnLeave({ id: "hr-1", role: "HR" }, request)).toBe(true);
    expect(canActOnLeave({ id: "hr-gone", role: "HR" }, request)).toBe(true);
    expect(canActOnLeave({ id: "e2", role: "ENGINEERING" }, request)).toBe(false);
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
