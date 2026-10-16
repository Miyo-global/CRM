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
    expect(permissionForRoute("/api/hr/leaves/12/approve", "PUT")).toBe("hr:leaves:approve");
    expect(permissionForRoute("/api/hr/employees/abc-123", "DELETE")).toBe("hr:employees:delete");
    expect(permissionForRoute("/api/hr/employees/onboard", "POST")).toBe("hr:employees:create");
  });

  it("leaves an unmapped route alone", () => {
    expect(permissionForRoute("/api/hr/assets", "POST")).toBeNull();
  });
});
