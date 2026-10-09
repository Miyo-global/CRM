import { afterEach, describe, expect, it } from "vitest";
import { isSignupEnabled } from "./signup-enabled";

const original = process.env.NEXT_PUBLIC_SIGNUP_ENABLED;
afterEach(() => {
  if (original === undefined) delete process.env.NEXT_PUBLIC_SIGNUP_ENABLED;
  else process.env.NEXT_PUBLIC_SIGNUP_ENABLED = original;
});

describe("isSignupEnabled", () => {
  it("is off when unset", () => {
    delete process.env.NEXT_PUBLIC_SIGNUP_ENABLED;
    expect(isSignupEnabled()).toBe(false);
  });

  it.each(["false", "1", "TRUE", "yes", ""])("is off for %j", (value) => {
    process.env.NEXT_PUBLIC_SIGNUP_ENABLED = value;
    expect(isSignupEnabled()).toBe(false);
  });

  it("is on only for the exact string true", () => {
    process.env.NEXT_PUBLIC_SIGNUP_ENABLED = "true";
    expect(isSignupEnabled()).toBe(true);
  });
});
