import { describe, expect, it } from "vitest";
import { isOnboardingManager, ONBOARDING_MANAGER_ROLES } from "./roles";

describe("isOnboardingManager", () => {
  it("lets CEO, HR and ADMIN manage onboarding", () => {
    for (const role of ["CEO", "HR", "ADMIN"]) {
      expect(isOnboardingManager(role)).toBe(true);
    }
  });

  it("keeps everyone else on the self-service onboarding view", () => {
    for (const role of ["BRANCH_HR", "BRANCH_MANAGER", "ENGINEERING", "SALES", undefined, null, ""]) {
      expect(isOnboardingManager(role)).toBe(false);
    }
  });

  it("matches the roles withAdmin lets through on the onboarding APIs", () => {
    expect([...ONBOARDING_MANAGER_ROLES].sort()).toEqual(["ADMIN", "CEO", "HR"]);
  });
});
