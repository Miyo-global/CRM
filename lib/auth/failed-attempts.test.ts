import { describe, expect, it } from "vitest";
import { cooldownMinutesFor, isLocked, lockAfterAttempt, FAILED_ATTEMPT_LOCK_THRESHOLD } from "./failed-attempts-policy";

describe("failed-attempt cooldown", () => {
  it("escalates with the number of attempts", () => {
    expect(FAILED_ATTEMPT_LOCK_THRESHOLD).toBe(5);
    expect(cooldownMinutesFor(5)).toBe(1);
    expect(cooldownMinutesFor(7)).toBe(5);
    expect(cooldownMinutesFor(12)).toBe(15);
  });

  it("locks only from the threshold", () => {
    expect(lockAfterAttempt(4)).toBeNull();
    expect(lockAfterAttempt(5)).toBeInstanceOf(Date);
  });

  it("treats a past or missing lock as unlocked", () => {
    expect(isLocked(null)).toBe(false);
    expect(isLocked(new Date(Date.now() - 1000))).toBe(false);
    expect(isLocked(new Date(Date.now() + 60_000))).toBe(true);
  });
});
