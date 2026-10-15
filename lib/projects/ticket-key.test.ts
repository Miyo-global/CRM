import { describe, expect, it } from "vitest";
import { parseTicketKey } from "./ticket-key";

describe("parseTicketKey", () => {
  it("accepts KEY-123 for the matching project", () => {
    expect(parseTicketKey("WEB-42", "WEB")).toBe(42);
    expect(parseTicketKey("web-42", "WEB")).toBe(42);
  });

  it("accepts keys that contain a hyphen", () => {
    expect(parseTicketKey("ACM-042-7", "ACM-042")).toBe(7);
  });

  it("accepts a bare number", () => {
    expect(parseTicketKey("7", "WEB")).toBe(7);
  });

  it("rejects another project's key", () => {
    expect(parseTicketKey("API-42", "WEB")).toBeNull();
  });

  it("rejects malformed input", () => {
    for (const bad of ["", "WEB-", "WEB-0", "WEB-abc", "WEB-1.5", "-3", "WEB-9999999999"]) {
      expect(parseTicketKey(bad, "WEB")).toBeNull();
    }
  });
});
