import { describe, expect, it } from "vitest";
import { attendanceExportEmailSchema } from "./attendance-export-filters";

const base = {
  startDate: "2026-06-01",
  endDate: "2026-06-08",
};

describe("attendanceExportEmailSchema", () => {
  it("accepts a To list and normalises emails (trim + lowercase)", () => {
    const parsed = attendanceExportEmailSchema.parse({
      ...base,
      to: ["  Jane@Example.com "],
    });
    expect(parsed.to).toEqual(["jane@example.com"]);
    expect(parsed.cc).toEqual([]);
    expect(parsed.bcc).toEqual([]);
  });

  it("requires at least one To recipient", () => {
    const res = attendanceExportEmailSchema.safeParse({ ...base, to: [] });
    expect(res.success).toBe(false);
  });

  it("rejects an invalid email address", () => {
    const res = attendanceExportEmailSchema.safeParse({ ...base, to: ["not-an-email"] });
    expect(res.success).toBe(false);
  });

  it("rejects the same email across To and CC (case-insensitive)", () => {
    const res = attendanceExportEmailSchema.safeParse({
      ...base,
      to: ["hr@example.com"],
      cc: ["HR@example.com"],
    });
    expect(res.success).toBe(false);
    if (!res.success) {
      expect(res.error.issues[0]?.message).toContain("more than one recipient field");
    }
  });

  it("rejects the same email across CC and BCC", () => {
    const res = attendanceExportEmailSchema.safeParse({
      ...base,
      to: ["ceo@example.com"],
      cc: ["audit@example.com"],
      bcc: ["audit@example.com"],
    });
    expect(res.success).toBe(false);
  });

  it("accepts distinct To, CC, and BCC recipients", () => {
    const res = attendanceExportEmailSchema.safeParse({
      ...base,
      to: ["ceo@example.com"],
      cc: ["hr@example.com"],
      bcc: ["audit@example.com"],
    });
    expect(res.success).toBe(true);
  });
});
