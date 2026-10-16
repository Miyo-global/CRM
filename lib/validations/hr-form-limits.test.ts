import { describe, expect, it } from "vitest";
import { createOneOnOneSchema, createGoalInputSchema } from "./hr";
import { assetCreateBodySchema } from "./hr-assets";

describe("HR form server validation (QA-0045)", () => {
  it("rejects a 1-on-1 scheduled in the past", () => {
    const past = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const res = createOneOnOneSchema.safeParse({ employeeId: "u1", scheduledAt: past });
    expect(res.success).toBe(false);
  });

  it("accepts a 1-on-1 scheduled later today", () => {
    const soon = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    expect(createOneOnOneSchema.safeParse({ employeeId: "u1", scheduledAt: soon }).success).toBe(true);
  });

  it("rejects a goal that ends before it starts", () => {
    const res = createGoalInputSchema.safeParse({
      userId: "u1",
      title: "Ship",
      startDate: new Date("2026-10-10"),
      endDate: new Date("2026-10-01"),
    });
    expect(res.success).toBe(false);
  });

  it("rejects a negative goal target", () => {
    const res = createGoalInputSchema.safeParse({
      userId: "u1",
      title: "Ship",
      targetValue: -5,
      startDate: new Date("2026-10-01"),
      endDate: new Date("2026-10-10"),
    });
    expect(res.success).toBe(false);
  });

  it("rejects an asset purchased in the future", () => {
    const future = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const base = {
      name: "QA Laptop",
      type: "Laptop",
      serialNumber: "QA-1234",
      brand: "Dell",
      model: "Latitude 7420",
      purchaseCost: 60000,
    };
    expect(assetCreateBodySchema.safeParse({ ...base, purchaseDate: future }).success).toBe(false);
    expect(assetCreateBodySchema.safeParse({ ...base, purchaseDate: "2025-11-05" }).success).toBe(true);
  });
});
