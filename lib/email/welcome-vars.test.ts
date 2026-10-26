import { describe, expect, it, vi } from "vitest";

vi.mock("./sender", () => ({ sendEmail: vi.fn(), sendTemplateEmail: vi.fn(), baseUrl: "https://crm.test" }));
const { welcomeEmailVars } = await import("./auth");

describe("welcome email greeting (FR1-020)", () => {
  it("greets with the full first name, not its first word", () => {
    const vars = welcomeEmailVars("a@x.com", "QA-TEST FR1 Admin", "https://x", { firstName: "QA-TEST FR1" });
    expect(vars.first_name).toBe("QA-TEST FR1");
  });

  it("falls back to the first word when no first name is known", () => {
    expect(welcomeEmailVars("a@x.com", "Ravi Kumar", "https://x").first_name).toBe("Ravi");
  });
});

describe("welcome email employee ID (FR1-021)", () => {
  it("is shown when known and left out otherwise", async () => {
    const { renderEmail } = await import("@/lib/email-templates/render");
    const withId = renderEmail("auth-welcome-set-password", welcomeEmailVars("a@x.com", "A B", "https://x", { employeeId: "VC26019" }));
    expect(withId.text).toContain("Employee ID:   VC26019");
    expect(withId.html).toContain("VC26019");
    const without = renderEmail("auth-welcome-set-password", welcomeEmailVars("a@x.com", "A B", "https://x"));
    expect(without.text).not.toContain("Employee ID");
  });
});
