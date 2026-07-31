import { describe, expect, it } from "vitest";
import { isUnpaidLeaveType } from "@/lib/leave-policy";
import {
  calculateLeaveWorkingDays,
  createLeaveRequestSchema,
  createWfhRequestSchema,
} from "./leave-request";

const baseLeave = {
  leaveTypeId: "1",
  halfDay: false,
  priority: "MEDIUM" as const,
  reason: "Personal",
  attachments: [] as string[],
};

describe("calculateLeaveWorkingDays", () => {
  it("counts a weekday (Thu 18 Jun 2026)", () => {
    expect(
      calculateLeaveWorkingDays({
        startDate: "2026-06-18",
        endDate: "2026-06-18",
        isHalfDay: false,
      }),
    ).toBe(1);
  });

  it("returns 0 when end date is missing (do not treat as weekend)", () => {
    expect(
      calculateLeaveWorkingDays({
        startDate: "2026-06-18",
        endDate: "",
        isHalfDay: false,
      }),
    ).toBe(0);
  });

  it("returns 0 for a Sunday-only range", () => {
    expect(
      calculateLeaveWorkingDays({
        startDate: "2026-06-21",
        endDate: "2026-06-21",
        isHalfDay: false,
      }),
    ).toBe(0);
  });
});

describe("isUnpaidLeaveType", () => {
  it("matches Unpaid Leave", () => {
    expect(isUnpaidLeaveType("Unpaid Leave")).toBe(true);
  });

  it("does not match Casual Leave", () => {
    expect(isUnpaidLeaveType("Casual Leave")).toBe(false);
  });
});

describe("createLeaveRequestSchema balance", () => {
  const validDates = {
    startDate: "2026-06-18",
    endDate: "2026-06-18",
  };

  it("rejects paid leave when available balance is 0", () => {
    const schema = createLeaveRequestSchema({
      getAvailableBalance: () => 0,
    });
    const result = schema.safeParse({ ...baseLeave, ...validDates });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(
        result.error.issues.some((i) => i.message.includes("Insufficient balance")),
      ).toBe(true);
    }
  });

  it("allows leave when balance check is skipped (unpaid)", () => {
    const schema = createLeaveRequestSchema({
      getAvailableBalance: () => null,
    });
    const result = schema.safeParse({ ...baseLeave, ...validDates });
    expect(result.success).toBe(true);
  });
});

describe("createWfhRequestSchema", () => {
  const baseWfh = {
    reason: "Health / Medical",
    notes: "",
  };

  it("rejects start date in the past", () => {
    const schema = createWfhRequestSchema({ minStartDate: "2026-06-19" });
    const result = schema.safeParse({
      ...baseWfh,
      startDate: "2020-01-01",
      endDate: "2026-06-19",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => i.path[0] === "startDate")).toBe(true);
    }
  });

  it("rejects end date in the past", () => {
    const schema = createWfhRequestSchema({ minStartDate: "2026-06-19" });
    const result = schema.safeParse({
      ...baseWfh,
      startDate: "2026-06-19",
      endDate: "2020-01-01",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => i.path[0] === "endDate")).toBe(true);
    }
  });

  it("rejects end date before start date", () => {
    const schema = createWfhRequestSchema({ minStartDate: "2026-06-19" });
    const result = schema.safeParse({
      ...baseWfh,
      startDate: "2026-06-20",
      endDate: "2026-06-18",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(
        result.error.issues.some((i) =>
          i.path[0] === "endDate" && i.message.includes("before start"),
        ),
      ).toBe(true);
    }
  });

  it("rejects ranges that include a past working day", () => {
    const schema = createWfhRequestSchema({ minStartDate: "2026-06-19" });
    const result = schema.safeParse({
      ...baseWfh,
      startDate: "2026-06-17",
      endDate: "2026-06-20",
    });
    expect(result.success).toBe(false);
  });

  it("requires tomorrow when minStartDate is tomorrow", () => {
    const schema = createWfhRequestSchema({ minStartDate: "2026-06-20" });
    const result = schema.safeParse({
      ...baseWfh,
      startDate: "2026-06-19",
      endDate: "2026-06-19",
    });
    expect(result.success).toBe(false);
  });

  it("rejects WFH before joining date", () => {
    const schema = createWfhRequestSchema({
      minStartDate: "2026-06-19",
      joiningDate: "2026-06-20",
    });
    const result = schema.safeParse({
      ...baseWfh,
      startDate: "2026-06-19",
      endDate: "2026-06-19",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(
        result.error.issues.some((i) =>
          i.message.includes("joining date"),
        ),
      ).toBe(true);
    }
  });

  it("rejects WFH ranges that include a day before joining date", () => {
    const schema = createWfhRequestSchema({
      minStartDate: "2026-06-19",
      joiningDate: "2026-06-22",
    });
    const result = schema.safeParse({
      ...baseWfh,
      startDate: "2026-06-22",
      endDate: "2026-06-25",
    });
    expect(result.success).toBe(true);

    const invalid = schema.safeParse({
      ...baseWfh,
      startDate: "2026-06-20",
      endDate: "2026-06-25",
    });
    expect(invalid.success).toBe(false);
  });

  it("requires notes when reason is Other", () => {
    const schema = createWfhRequestSchema({ minStartDate: "2026-06-19" });
    const missingNotes = schema.safeParse({
      ...baseWfh,
      reason: "Other",
      startDate: "2026-06-19",
      endDate: "2026-06-19",
      notes: "",
    });
    expect(missingNotes.success).toBe(false);
    if (!missingNotes.success) {
      expect(missingNotes.error.issues.some((i) => i.path[0] === "notes")).toBe(true);
    }

    const shortNotes = schema.safeParse({
      ...baseWfh,
      reason: "Other",
      startDate: "2026-06-19",
      endDate: "2026-06-19",
      notes: "too short",
    });
    expect(shortNotes.success).toBe(false);

    const valid = schema.safeParse({
      ...baseWfh,
      reason: "Other",
      startDate: "2026-06-19",
      endDate: "2026-06-19",
      notes: "Need to work from home due to a family emergency",
    });
    expect(valid.success).toBe(true);
  });
});

describe("createLeaveRequestSchema", () => {
  const schema = createLeaveRequestSchema();

  it("does not flag weekend when only start date is set", () => {
    const result = schema.safeParse({
      ...baseLeave,
      startDate: "2026-06-18",
      endDate: "",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const weekendOnStart = result.error.issues.some(
        (i) =>
          i.path.join(".") === "startDate" &&
          i.message.includes("weekend"),
      );
      expect(weekendOnStart).toBe(false);
    }
  });

  it("accepts a weekday single-day leave", () => {
    const result = schema.safeParse({
      ...baseLeave,
      startDate: "2026-06-18",
      endDate: "2026-06-18",
    });
    expect(result.success).toBe(true);
  });

  it("rejects a Sunday-only leave", () => {
    const result = schema.safeParse({
      ...baseLeave,
      startDate: "2026-06-21",
      endDate: "2026-06-21",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(
        result.error.issues.some((i) => i.message.includes("weekend")),
      ).toBe(true);
    }
  });
});
