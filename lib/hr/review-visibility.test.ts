import { describe, expect, it } from "vitest";
import { canReadReview } from "./review-visibility";

const review = (status: string) => ({ userId: "emp", reviewerId: "mgr", status });

describe("canReadReview", () => {
  it("lets the reviewee read only a released review", () => {
    expect(canReadReview(review("COMPLETED"), { id: "emp", role: "EMPLOYEE" })).toBe(true);
    expect(canReadReview(review("ARCHIVED"), { id: "emp", role: "EMPLOYEE" })).toBe(true);
    expect(canReadReview(review("DRAFT"), { id: "emp", role: "EMPLOYEE" })).toBe(false);
    expect(canReadReview(review("IN_PROGRESS"), { id: "emp", role: "EMPLOYEE" })).toBe(false);
  });

  it("lets the reviewer and HR read drafts, nobody else", () => {
    expect(canReadReview(review("DRAFT"), { id: "mgr", role: "EMPLOYEE" })).toBe(true);
    expect(canReadReview(review("DRAFT"), { id: "hr", role: "HR" })).toBe(true);
    expect(canReadReview(review("COMPLETED"), { id: "other", role: "EMPLOYEE" })).toBe(false);
  });
});
