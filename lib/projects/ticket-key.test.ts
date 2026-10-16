import { describe, expect, it } from "vitest";
import { ticketKey } from "./ticket-key";

describe("ticketKey (QA-D011)", () => {
  it("scopes the number with the project key", () => {
    expect(ticketKey("QUP", 2)).toBe("QUP-2");
    expect(ticketKey("qup ", "12")).toBe("qup-12");
  });

  it("falls back to the bare number without a project key", () => {
    expect(ticketKey(null, 2)).toBe("#2");
    expect(ticketKey("", 2)).toBe("#2");
  });

  it("returns nothing without a number", () => {
    expect(ticketKey("QUP", null)).toBe("");
  });
});
