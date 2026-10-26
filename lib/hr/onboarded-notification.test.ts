import { describe, expect, it } from "vitest";
import { onboardedNotification } from "./onboarded-notification";

const hire = { firstName: "QA-TEST FR1", lastName: "Emp1", designation: "QA-TEST Engineer", joiningDate: "2026-10-26" };

describe("onboarded notification", () => {
  it("names the employee in the subject (FR1-028)", () => {
    expect(onboardedNotification(hire).title).toBe("New employee onboarded: QA-TEST FR1 Emp1");
  });
});
