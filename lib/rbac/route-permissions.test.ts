import { describe, expect, it } from "vitest";
import { permissionForRoute } from "./route-permissions";

describe("permissionForRoute", () => {
  it("maps leave apply to hr:leaves:create", () => {
    expect(permissionForRoute("/api/hr/leaves", "POST")).toBe("hr:leaves:create");
  });

  it("ignores methods a rule does not cover", () => {
    expect(permissionForRoute("/api/hr/leaves", "GET")).toBeNull();
  });

  it("matches an id segment and prefers the longer pattern", () => {
    expect(permissionForRoute("/api/hr/payrolls/12/approve", "PUT")).toBe("hr:payroll:approve");
    expect(permissionForRoute("/api/hr/employees/abc-123", "DELETE")).toBe("hr:employees:delete");
    expect(permissionForRoute("/api/hr/employees/onboard", "POST")).toBe("hr:employees:create");
  });

  it("maps payroll routes to permissions that exist (R3-0002)", async () => {
    const { PERMISSIONS } = await import("./permissions");
    const names = new Set(PERMISSIONS.map((p) => p.name));
    for (const [path, method] of [["/api/hr/payrolls", "POST"], ["/api/hr/payrolls/7/approve", "PATCH"], ["/api/hr/payrolls/7/paid", "PATCH"]]) {
      expect(names.has(permissionForRoute(path, method)!)).toBe(true);
    }
  });

  it("leaves leave approval to the approver chain (MIYO-0084)", () => {
    expect(permissionForRoute("/api/hr/leaves/12/approve", "PUT")).toBeNull();
    expect(permissionForRoute("/api/hr/leaves/12/reject", "PATCH")).toBeNull();
  });

  it("leaves an unmapped route alone", () => {
    expect(permissionForRoute("/api/hr/assets", "POST")).toBeNull();
  });
});
