import { beforeEach, describe, expect, it, vi } from "vitest";

const sent: Array<{ email: string; name: string; url: string; details: Record<string, unknown> }> = [];
const managers: Record<string, { name: string }> = {};

vi.mock("@/lib/email", () => ({
  sendWelcomeEmail: async (email: string, name: string, url: string, details: Record<string, unknown>) => {
    sent.push({ email, name, url, details });
  },
}));
vi.mock("@/lib/db", () => {
  const tx = {
    delete: () => ({ where: async () => undefined }),
    insert: () => ({ values: async () => undefined }),
  };
  return {
    db: {
      transaction: async (fn: (t: typeof tx) => Promise<unknown>) => fn(tx),
      query: { users: { findFirst: async () => managers.current } },
    },
  };
});

const { sendSetupLink } = await import("./setup-link");
const { renderEmail } = await import("@/lib/email-templates/render");

beforeEach(() => {
  sent.length = 0;
  delete managers.current;
});

describe("welcome / set-up email", () => {
  it("states the expiry once, with a single IST (FR1-023)", async () => {
    await sendSetupLink({ email: "a@example.com", name: "QA-TEST FR1 Admin" });
    const expires = String(sent[0].details.linkExpiresAt);
    const { text } = renderEmail("auth-welcome-set-password", { link_expires_at: expires });
    expect(text).toMatch(/expires on .+ IST\./);
    expect(text).not.toContain("IST IST");
  });
});

describe("manager line (FR1-022)", () => {
  it("is left out when no manager is set", async () => {
    await sendSetupLink({ email: "a@example.com", name: "QA-TEST FR1 Emp1" });
    const { text, html } = renderEmail("auth-welcome-set-password", {
      manager_name: sent[0].details.managerName as string | null,
    });
    expect(text).not.toContain("Reporting to");
    expect(text).not.toContain("your manager");
    expect(html).not.toContain("Reporting to");
  });

  it("names the manager when one is set", async () => {
    managers.current = { name: "Priya Rao" };
    await sendSetupLink({ email: "a@example.com", name: "QA-TEST FR1 Emp1", reportingTo: "m1" });
    const { text } = renderEmail("auth-welcome-set-password", {
      manager_name: sent[0].details.managerName as string,
    });
    expect(text).toContain("Reporting to:  Priya Rao");
  });
});
