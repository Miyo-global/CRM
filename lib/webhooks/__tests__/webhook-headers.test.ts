import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db", () => ({ db: {} }));


const { webhookHeaders } = await import("../deliver");

describe("webhookHeaders", () => {
  it("builds headers fetch accepts, with X-Miyo-Signature", () => {
    const headers = new Headers(webhookHeaders("deal.created", "abc123"));
    expect(headers.get("X-Miyo-Signature")).toBe("sha256=abc123");
    expect(headers.get("X-Webhook-Event")).toBe("deal.created");
  });
});
