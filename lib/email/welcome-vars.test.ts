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
