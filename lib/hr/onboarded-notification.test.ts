import { describe, expect, it } from "vitest";
import { ONBOARDED_NOTIFY_ROLES, hireJoinedNotification, onboardedNotification } from "./onboarded-notification";

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

describe("hire identification (P0-no-admin-notify-on-new-onboard)", () => {
  it("names the employee ID in both the hire and joined notices", () => {
    const withId = { ...hire, employeeId: "VC26022" };
    expect(onboardedNotification(withId).message).toBe(
      "QA-TEST FR1 Emp1 (VC26022, QA-TEST Engineer) has been onboarded, joining 26 Oct 2026.",
    );
    const joined = hireJoinedNotification(withId);
    expect(joined.title).toBe("New employee joined the portal: QA-TEST FR1 Emp1");
    expect(joined.message).toContain("(VC26022, QA-TEST Engineer) has set up their account");
  });

  it("drops the brackets when there is no ID or designation", () => {
    expect(hireJoinedNotification({ firstName: "A", lastName: "B" }).message).toBe("A B has set up their account.");
  });
});

describe("ONBOARDED_NOTIFY_ROLES (FR1-037)", () => {
  it("tells the Super Admin, Admins and HR", () => {
    expect([...ONBOARDED_NOTIFY_ROLES].sort()).toEqual(["ADMIN", "CEO", "HR"]);
  });
});
