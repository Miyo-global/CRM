import { describe, it, expect } from "vitest";

import { requisitionBodySchema, requisitionDecisionSchema } from "./ats-requisition";

const base = { title: "Backend engineer", openings: 2 };

describe("requisitionBodySchema", () => {
  it("fills in the defaults a form does not send", () => {
    const parsed = requisitionBodySchema.parse(base);
    expect(parsed.employmentType).toBe("FULL_TIME");
    expect(parsed.currency).toBe("INR");
  });

  it("refuses a salary range that runs backwards", () => {
    const result = requisitionBodySchema.safeParse({
      ...base,
      salaryMin: "120000",
      salaryMax: "80000",
    });
    expect(result.success).toBe(false);
  });

  it("accepts one end of the range on its own", () => {
    expect(requisitionBodySchema.parse({ ...base, salaryMin: "80000" }).salaryMin).toBe(80000);
  });

  it("needs at least one opening", () => {
    expect(requisitionBodySchema.safeParse({ ...base, openings: 0 }).success).toBe(false);
  });
});

describe("requisitionDecisionSchema", () => {
  it("takes only approve or reject", () => {
    expect(requisitionDecisionSchema.safeParse({ decision: "MAYBE" }).success).toBe(false);
    expect(requisitionDecisionSchema.parse({ decision: "APPROVED" }).comment).toBeUndefined();
  });
});
