import { describe, expect, it } from "vitest";
import { getPasswordChangeConfirmationEmailTemplate } from "./auth";
import { renderEmail } from "./render";

// MIYO-0159: the set-up mail is the auth-welcome-set-password template now.
describe("account set-up email", () => {
  const mail = renderEmail("auth-welcome-set-password", {
    first_name: "Qa",
    email: "qa@example.com",
    setup_url: "https://crm/setup?token=x",
    joining_date: "20 Oct 2026",
    manager_name: "Qa Manager",
    link_expires_at: "23 Oct 2026, 2:30 pm IST",
  });

  it("names the first day, the manager and the real expiry", () => {
    expect(mail.html).toMatch(/20 Oct 2026/);
    expect(mail.html).toMatch(/Qa Manager/);
    expect(mail.html).toMatch(/23 Oct 2026, 2:30 pm IST/);
    expect(mail.html).not.toMatch(/expires in 7 days/);
  });

  it("leaves no placeholder unfilled and keeps the link", () => {
    expect(mail.html).not.toMatch(/\{\{/);
    expect(mail.text).not.toMatch(/\{\{/);
    expect(mail.html).toContain("https://crm/setup?token=x");
  });

  it("drops the filler copy and the emoji", () => {
    expect(mail.html).not.toMatch(/excited to have you on board/i);
    expect(mail.html).not.toMatch(/\u{1F680}/u);
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
