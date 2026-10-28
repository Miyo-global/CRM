import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db", () => ({ db: {} }));

import { ACCOUNT_ACTIVATION_TASK_TITLE, isAccountActivationTask } from "./onboarding-auto-complete";

describe("isAccountActivationTask (P2-onboarding-checklist-stuck-0-of-7)", () => {
  it("matches the default item and common template wording", () => {
    for (const t of [
      ACCOUNT_ACTIVATION_TASK_TITLE,
      "Account activation",
      "Activate your account",
      "Set up password",
      "Set your password",
      "First login",
      "First sign-in to the portal",
      "Portal access",
    ]) expect(isAccountActivationTask(t), t).toBe(true);
  });

  it("leaves the manual items manual", () => {
    for (const t of [
      "IT Setup",
      "HR Orientation",
      "Department Intro",
      "Policy Review",
      "Manager Introduction",
      "POSH Training Acknowledgement",
      "Code of Conduct Sign-Off",
      "Bank account details",
      "Laptop login and VPN setup by IT",
    ]) expect(isAccountActivationTask(t), t).toBe(false);
  });
});
