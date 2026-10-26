import { describe, expect, it, vi } from "vitest";
import { clockOutErrorToastOptions } from "./clock-out-error";

describe("clockOutErrorToastOptions (FR1-030)", () => {
  it("offers the work log when clock-out is blocked on it", () => {
    const open = vi.fn();
    const opts = clockOutErrorToastOptions("Please finish and save today's work log before clocking out.", open);
    expect(opts?.action.label).toBe("Open work log");
    opts?.action.onClick();
    expect(open).toHaveBeenCalled();
  });

  it("adds nothing to other errors", () => {
    expect(clockOutErrorToastOptions("Network error", () => {})).toBeUndefined();
  });
});
