import { describe, expect, it } from "vitest";
import { SIGN_IN_RATE_LIMITED, signInThrownMessage } from "./sign-in-error";

describe("signInThrownMessage", () => {
  it("names a rate-limited sign-in instead of the raw URL error", () => {
    expect(signInThrownMessage(new TypeError("Failed to construct 'URL': Invalid URL"))).toBe(
      SIGN_IN_RATE_LIMITED,
    );
  });

  it("keeps the offline message for a failed fetch", () => {
    expect(signInThrownMessage(new TypeError("Failed to fetch"))).toMatch(/No internet/);
  });

  it("leaves other errors alone", () => {
    expect(signInThrownMessage(new Error("Invalid email or password."))).toBeNull();
    expect(signInThrownMessage(new TypeError("x is not a function"))).toBeNull();
  });
});
