import { describe, expect, it } from "vitest";
import { ALL_ROLES } from "./roles";
import { SYSTEM_ROLES } from "@/lib/rbac/permissions";
import { canAccessRoute } from "@/lib/auth/route-access";

describe("branch roles removed", () => {
  it("BRANCH_MANAGER and BRANCH_HR are no longer roles", () => {
    for (const list of [ALL_ROLES, SYSTEM_ROLES as readonly string[]]) {
      expect(list).not.toContain("BRANCH_MANAGER");
      expect(list).not.toContain("BRANCH_HR");
    }
  });

  it("a stale branch role gets no HR route access", () => {
    expect(canAccessRoute("/hr/payroll", "BRANCH_HR")).toBe(false);
    expect(canAccessRoute("/hr/onboarding", "BRANCH_MANAGER")).toBe(false);
  });
});
