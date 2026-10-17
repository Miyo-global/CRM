import { describe, it, expect } from "vitest";

import { normalisePhone } from "./phone";

describe("normalisePhone", () => {
  it("matches the same number written three ways", () => {
    const forms = ["+91 98765 43210", "09876543210", "9876543210"];
    expect(new Set(forms.map(normalisePhone)).size).toBe(1);
    expect(normalisePhone(forms[0])).toBe("9876543210");
  });

  it("ignores something too short to be a number", () => {
    expect(normalisePhone("12345")).toBeNull();
    expect(normalisePhone("")).toBeNull();
  });
});
