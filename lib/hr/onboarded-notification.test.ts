import { describe, expect, it } from "vitest";
import { ONBOARDED_NOTIFY_ROLES, onboardedNotification } from "./onboarded-notification";

const hire = { firstName: "QA-TEST FR1", lastName: "Emp1", designation: "QA-TEST Engineer", joiningDate: "2026-10-26" };

describe("onboarded notification", () => {
  it("names the employee in the subject (FR1-028)", () => {
    expect(onboardedNotification(hire).title).toBe("New employee onboarded: QA-TEST FR1 Emp1");
  });

  it("writes the joining date like the welcome mail does (FR1-026)", () => {
    const { message } = onboardedNotification(hire);
    expect(message).toContain("joining 26 Oct 2026");
    expect(message).not.toContain("2026-10-26");
  });
});

describe("ONBOARDED_NOTIFY_ROLES (FR1-037)", () => {
  it("tells the Super Admin, Admins and HR", () => {
    expect([...ONBOARDED_NOTIFY_ROLES].sort()).toEqual(["ADMIN", "CEO", "HR"]);
  });
});
