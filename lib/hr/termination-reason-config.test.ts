import { describe, expect, it } from "vitest";
import {
  activeTerminationReasonLabels,
  isAllowedTerminationReason,
  isDuplicateTerminationReasonLabel,
  OTHER_TERMINATION_REASON,
} from "@/lib/hr/termination-reason-config";

describe("activeTerminationReasonLabels", () => {
  it("includes active labels and always adds Other", () => {
    const labels = activeTerminationReasonLabels([
      { label: "Performance Issues", isActive: true },
      { label: "Old reason", isActive: false },
    ]);
    expect(labels).toEqual(["Performance Issues", OTHER_TERMINATION_REASON]);
  });
});

describe("isAllowedTerminationReason", () => {
  it("allows active configured reasons and Other", () => {
    const rows = [{ label: "Misconduct", isActive: true }];
    expect(isAllowedTerminationReason("Misconduct", rows)).toBe(true);
    expect(isAllowedTerminationReason(OTHER_TERMINATION_REASON, rows)).toBe(true);
    expect(isAllowedTerminationReason("Inactive", [{ label: "Inactive", isActive: false }])).toBe(false);
  });
});

describe("isDuplicateTerminationReasonLabel", () => {
  it("detects case-insensitive duplicates", () => {
    const rows = [{ label: "Policy Violations", isActive: true }];
    expect(isDuplicateTerminationReasonLabel("policy violations", rows)).toBe(true);
    expect(isDuplicateTerminationReasonLabel("Attendance", rows)).toBe(false);
  });
});
