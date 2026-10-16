import { describe, expect, it } from "vitest";
import {
  getWelcomeEmailTemplate,
  getPasswordChangeConfirmationEmailTemplate,
} from "./auth";

describe("account set-up email", () => {
  const html = getWelcomeEmailTemplate("Qa Alpha", "qa@example.com", "https://crm/setup?token=x", {
    designation: "Software Engineer",
    joiningDate: "20 Oct 2026",
    managerName: "Qa Manager",
    linkExpiresAt: "23 Oct 2026, 2:30 pm IST",
  });

  it("names the first day, the manager and the real expiry", () => {
    expect(html).toMatch(/First day:/);
    expect(html).toMatch(/20 Oct 2026/);
    expect(html).toMatch(/Reporting to:/);
    expect(html).toMatch(/Qa Manager/);
    expect(html).toMatch(/23 Oct 2026, 2:30 pm IST/);
    expect(html).not.toMatch(/expires in 7 days/);
  });

  it("drops the filler copy", () => {
    expect(html).not.toMatch(/excited to have you on board/i);
  });
});

describe("password-changed email", () => {
  const html = getPasswordChangeConfirmationEmailTemplate("Qa Alpha", "16 Oct 2026, 6:10 pm IST");

  it("states when it happened and links to settings", () => {
    expect(html).toMatch(/16 Oct 2026, 6:10 pm IST/);
    expect(html).toMatch(/\/settings"/);
  });

  it("drops the security-tips list", () => {
    expect(html).not.toMatch(/Security Tips/i);
  });
});
