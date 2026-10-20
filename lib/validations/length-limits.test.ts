import { describe, expect, it } from "vitest";
import { LEAVE_REASON_MAX, leaveReasonSchema } from "./leave-request";
import { TICKET_TITLE_MAX, ticketTitleSchema } from "./project";

describe("length limits (QA-BUG-22)", () => {
  it("caps a leave reason at 1000", () => {
    expect(leaveReasonSchema.safeParse("a".repeat(LEAVE_REASON_MAX)).success).toBe(true);
    expect(leaveReasonSchema.safeParse("a".repeat(LEAVE_REASON_MAX + 1)).success).toBe(false);
  });

  it("caps a ticket title at 200", () => {
    expect(ticketTitleSchema.safeParse("a".repeat(TICKET_TITLE_MAX)).success).toBe(true);
    expect(ticketTitleSchema.safeParse("a".repeat(TICKET_TITLE_MAX + 1)).success).toBe(false);
    expect(ticketTitleSchema.safeParse("   ").success).toBe(false);
  });
});
