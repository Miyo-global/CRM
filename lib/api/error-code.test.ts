import { describe, expect, it } from "vitest";
import { errorCode } from "./error-code";

describe("errorCode", () => {
  it("maps known statuses and falls back by class", () => {
    expect(errorCode(404)).toBe("NOT_FOUND");
    expect(errorCode(429)).toBe("RATE_LIMITED");
    expect(errorCode(418)).toBe("BAD_REQUEST");
    expect(errorCode(502)).toBe("INTERNAL_ERROR");
  });
});
