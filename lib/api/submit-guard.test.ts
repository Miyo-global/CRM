import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db", () => ({ db: {} }));
vi.mock("@/lib/api/helpers", () => ({ err: () => null }));

import { submitKey } from "./submit-guard";

describe("submitKey (R3-0008)", () => {
  it("is the same for the same person and body, different otherwise", () => {
    const a = submitKey("loan", "u1", { amount: 500, reason: "x" });
    expect(submitKey("loan", "u1", { amount: 500, reason: "x" })).toBe(a);
    expect(submitKey("loan", "u2", { amount: 500, reason: "x" })).not.toBe(a);
    expect(submitKey("loan", "u1", { amount: 501, reason: "x" })).not.toBe(a);
    expect(submitKey("holiday", "u1", { amount: 500, reason: "x" })).not.toBe(a);
  });
});
