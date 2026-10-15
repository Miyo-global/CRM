import { describe, expect, it, vi } from "vitest";
import { mergeMutationOptions } from "../mutation-options";

describe("mergeMutationOptions (A40)", () => {
  it("runs the hook's invalidation and then the caller's callback", () => {
    const calls: string[] = [];
    const base = { onSuccess: () => calls.push("invalidate") };
    const merged = mergeMutationOptions(base, { onSuccess: () => calls.push("caller") });

    merged.onSuccess();
    expect(calls).toEqual(["invalidate", "caller"]);
  });

  it("keeps the hook's callback when the caller has none", () => {
    const own = vi.fn();
    const merged = mergeMutationOptions({ onSuccess: own }, { onError: () => {} });
    merged.onSuccess();
    expect(own).toHaveBeenCalledOnce();
  });

  it("returns the base untouched without options", () => {
    const base = { onSuccess: () => {} };
    expect(mergeMutationOptions(base, undefined)).toBe(base);
  });
});
