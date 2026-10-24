import { describe, expect, it } from "vitest";
import { webhookEventsSchema, webhookUrlSchema } from "@/lib/webhooks/events";

describe("webhook schemas (R3-ADM-10)", () => {
  it("rejects an empty event list with a plain message", () => {
    const r = webhookEventsSchema.safeParse([]);
    expect(r.success).toBe(false);
    expect(r.error?.issues[0].message).toBe("Select at least one event");
  });

  it("accepts a known event", () => {
    expect(webhookEventsSchema.safeParse(["leave.approved"]).success).toBe(true);
  });

  it("words a malformed URL for people", () => {
    const r = webhookUrlSchema.safeParse("not a url");
    expect(r.error?.issues[0].message).toBe("Enter a valid URL, for example https://example.com/hook");
  });

  it("refuses http and private hosts", () => {
    expect(webhookUrlSchema.safeParse("http://example.com/hook").success).toBe(false);
    expect(webhookUrlSchema.safeParse("https://localhost/hook").success).toBe(false);
    expect(webhookUrlSchema.safeParse("https://example.com/hook").success).toBe(true);
  });
});
