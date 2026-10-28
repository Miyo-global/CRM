import { describe, it, expect, vi } from "vitest";

vi.mock("@/lib/db", () => ({
  get db() {
    throw new Error("database down");
  },
}));

import { recordEmailQueued, recordEmailOutcome } from "./delivery-log";

describe("email delivery log", () => {
  it("never throws when the database is unavailable", async () => {
    await expect(recordEmailQueued({ to: ["a@x.com"], subject: "Hi", orgId: "org" })).resolves.toBeNull();
    await expect(recordEmailOutcome(1, { status: "sent" })).resolves.toBeUndefined();
  });
});
