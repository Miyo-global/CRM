import { describe, expect, it } from "vitest";
import {
  AUTO_EMPLOYEE_ID_PREFIX,
  buildAutoEmployeeId,
  parseAutoSequence,
  normalizeEmployeeIdInput,
} from "./employee-id-format";

describe("employee-id-format", () => {
  it("parses VC year sequence suffix", () => {
    expect(parseAutoSequence("VC25003", "25")).toBe(3);
    expect(parseAutoSequence("VC26022", "26")).toBe(22);
    expect(parseAutoSequence("VC25ABC", "25")).toBeNull();
    expect(parseAutoSequence("XX25003", "25")).toBeNull();
  });

  it("builds padded IDs", () => {
    const d = new Date("2025-06-01");
    expect(buildAutoEmployeeId(d, 4)).toBe(`${AUTO_EMPLOYEE_ID_PREFIX}25004`);
  });

  it("normalizes blank input to undefined", () => {
    expect(normalizeEmployeeIdInput("")).toBeUndefined();
    expect(normalizeEmployeeIdInput("  ")).toBeUndefined();
    expect(normalizeEmployeeIdInput("VC25001")).toBe("VC25001");
  });
});
