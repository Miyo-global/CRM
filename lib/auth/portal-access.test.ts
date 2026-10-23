import { describe, expect, it } from "vitest";
import { isPortalAccessBlocked } from "./portal-access";

describe("isPortalAccessBlocked", () => {
  it("blocks an employee whose portal access is off", () => {
    expect(isPortalAccessBlocked("EMPLOYEE", false)).toBe(true);
  });

  it("lets an employee with access on, or never set, through", () => {
    expect(isPortalAccessBlocked("EMPLOYEE", true)).toBe(false);
    expect(isPortalAccessBlocked("EMPLOYEE", null)).toBe(false);
    expect(isPortalAccessBlocked("EMPLOYEE", undefined)).toBe(false);
  });

  it("never blocks the admin roles", () => {
    for (const role of ["CEO", "ADMIN", "HR"]) {
      expect(isPortalAccessBlocked(role, false)).toBe(false);
    }
  });
});
