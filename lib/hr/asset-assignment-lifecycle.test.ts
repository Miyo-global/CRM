import { describe, expect, it } from "vitest";
import {
  needsAssetReassignmentReason,
  validateReassignmentReason,
} from "./asset-assignment-lifecycle";

describe("needsAssetReassignmentReason", () => {
  it("does not require a reason on the first assignment", () => {
    expect(
      needsAssetReassignmentReason({
        priorAssignmentCount: 0,
        previousAssigneeId: null,
        nextAssigneeId: "user_1",
      }),
    ).toBe(false);
  });

  it("requires a reason when reassigning directly to another employee", () => {
    expect(
      needsAssetReassignmentReason({
        priorAssignmentCount: 0,
        previousAssigneeId: "user_1",
        nextAssigneeId: "user_2",
      }),
    ).toBe(true);
  });

  it("requires a reason when assigning again after prior assignment history", () => {
    expect(
      needsAssetReassignmentReason({
        priorAssignmentCount: 1,
        previousAssigneeId: null,
        nextAssigneeId: "user_2",
      }),
    ).toBe(true);
  });
});

describe("validateReassignmentReason", () => {
  it("accepts a valid reason when required", () => {
    expect(
      validateReassignmentReason("Employee transferred to another team", true),
    ).toBeNull();
  });

  it("rejects empty reason when required", () => {
    expect(validateReassignmentReason("", true)).toMatch(/required/i);
  });
});
