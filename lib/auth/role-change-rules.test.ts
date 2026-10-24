import { describe, expect, it } from "vitest";
import { canGrantRole, canManage, roleHasPermission } from "./role-change-rules";
import { PERMISSIONS, ROLE_DEFAULT_PERMISSIONS } from "@/lib/rbac/permissions";

describe("canGrantRole per actor role (R3-HR-02)", () => {
  const grantable = (actor: string | null) =>
    ["CEO", "ADMIN", "HR", "EMPLOYEE", "QA_CUSTOM", "SALES"].filter((r) => canGrantRole(actor, r));

  it("Super Admin grants Admin, HR, Employee and custom roles, never Super Admin or a retired title", () => {
    expect(grantable("CEO")).toEqual(["ADMIN", "HR", "EMPLOYEE", "QA_CUSTOM"]);
  });
  it("Admin grants Employee only", () => expect(grantable("ADMIN")).toEqual(["EMPLOYEE"]));
  it("HR grants Employee only", () => expect(grantable("HR")).toEqual(["EMPLOYEE"]));
  it("Employee and anonymous grant nothing", () => {
    expect(grantable("EMPLOYEE")).toEqual([]);
    expect(grantable(null)).toEqual([]);
  });
});

describe("canManage per actor role (R3-ADM-08)", () => {
  const ceo = { userId: "o", role: "CEO" };
  const admin = { userId: "a", role: "ADMIN" };
  const hr = { userId: "h", role: "HR" };

  it("Super Admin manages Admin, HR and Employee, not self", () => {
    expect(canManage(ceo, { userId: "a2", role: "ADMIN" })).toBe(true);
    expect(canManage(ceo, { userId: "h2", role: "HR" })).toBe(true);
    expect(canManage(ceo, { userId: "e", role: "EMPLOYEE" })).toBe(true);
    expect(canManage(ceo, { userId: "o", role: "CEO" })).toBe(false);
  });
  it("Admin and HR manage Employees only", () => {
    for (const actor of [admin, hr]) {
      expect(canManage(actor, { userId: "e", role: "EMPLOYEE" })).toBe(true);
      expect(canManage(actor, { userId: "a2", role: "ADMIN" })).toBe(false);
      expect(canManage(actor, { userId: "h2", role: "HR" })).toBe(false);
      expect(canManage(actor, { userId: "o", role: "CEO" })).toBe(false);
      expect(canManage(actor, { userId: actor.userId, role: "EMPLOYEE" })).toBe(false);
    }
  });
  it("Employee manages nobody", () => {
    expect(canManage({ userId: "e", role: "EMPLOYEE" }, { userId: "x", role: "EMPLOYEE" })).toBe(false);
  });
});

describe("Super-Admin-only actions are explicit permissions (R3-ROLE-01)", () => {
  it("only the Super Admin holds roles:manage and hr:termination:approve", () => {
    for (const perm of ["roles:manage", "hr:termination:approve"]) {
      expect(roleHasPermission("CEO", perm)).toBe(true);
      for (const role of ["ADMIN", "HR", "EMPLOYEE"]) expect(roleHasPermission(role, perm)).toBe(false);
    }
  });
  it("Super Admin, Admin and HR complete terminations; Employee does not", () => {
    for (const role of ["CEO", "ADMIN", "HR"]) expect(roleHasPermission(role, "hr:termination:complete")).toBe(true);
    expect(roleHasPermission("EMPLOYEE", "hr:termination:complete")).toBe(false);
  });
  it("the matrix no longer shows Super Admin and Admin with the same count", () => {
    expect(ROLE_DEFAULT_PERMISSIONS.CEO).toHaveLength(PERMISSIONS.length);
    expect(ROLE_DEFAULT_PERMISSIONS.ADMIN.length).toBe(PERMISSIONS.length - 2);
  });
});
