import { describe, expect, it } from "vitest";
import {
  attendancePunchSchema,
  parseAttendancePunchBody,
  resolvePunchDate,
  punchLocationSchema,
} from "./attendance";

describe("punchLocationSchema", () => {
  it("accepts real coordinates", () => {
    expect(punchLocationSchema.parse({ lat: 17.385, lng: 78.4867 })).toEqual({
      lat: 17.385,
      lng: 78.4867,
    });
  });

  it("rejects out-of-range coordinates", () => {
    expect(() => punchLocationSchema.parse({ lat: 91, lng: 0 })).toThrow();
    expect(() => punchLocationSchema.parse({ lat: 0, lng: 181 })).toThrow();
  });

  it("rejects non-finite coordinates", () => {
    expect(() => punchLocationSchema.parse({ lat: Number.NaN, lng: 0 })).toThrow();
  });

  it("caps the free-text address so it cannot bloat the jsonb column", () => {
    expect(() =>
      punchLocationSchema.parse({ lat: 0, lng: 0, address: "x".repeat(301) }),
    ).toThrow();
  });
});

describe("attendancePunchSchema", () => {
  it("accepts an empty body — both punch routes allow a bodyless POST", () => {
    expect(parseAttendancePunchBody({})).toEqual({});
    expect(parseAttendancePunchBody(undefined)).toEqual({});
  });

  it("strips unknown keys instead of rejecting them", () => {
    const parsed = attendancePunchSchema.parse({
      localDate: "2026-09-05",
      attackerControlled: { huge: "payload" },
    });
    expect(parsed).toEqual({ localDate: "2026-09-05" });
    expect(parsed).not.toHaveProperty("attackerControlled");
  });

  it("rejects a malformed localDate", () => {
    expect(() => attendancePunchSchema.parse({ localDate: "05-09-2026" })).toThrow();
    expect(() => attendancePunchSchema.parse({ localDate: "not-a-date" })).toThrow();
  });

  it("allows location to be null or omitted", () => {
    expect(attendancePunchSchema.parse({ location: null }).location).toBeNull();
    expect(attendancePunchSchema.parse({}).location).toBeUndefined();
  });

  it("rejects a location that is not an object", () => {
    expect(() => attendancePunchSchema.parse({ location: "somewhere" })).toThrow();
  });
});

describe("resolvePunchDate", () => {
  const SERVER_TODAY = "2026-09-05";

  it("falls back to the server date when the client sends nothing", () => {
    expect(resolvePunchDate(undefined, SERVER_TODAY)).toBe(SERVER_TODAY);
  });

  it("accepts the client date on either side of the server's date", () => {
    expect(resolvePunchDate("2026-09-04", SERVER_TODAY)).toBe("2026-09-04");
    expect(resolvePunchDate("2026-09-06", SERVER_TODAY)).toBe("2026-09-06");
    expect(resolvePunchDate(SERVER_TODAY, SERVER_TODAY)).toBe(SERVER_TODAY);
  });

  it("ignores a date further than a day away rather than back-dating the punch", () => {
    expect(resolvePunchDate("2026-01-01", SERVER_TODAY)).toBe(SERVER_TODAY);
    expect(resolvePunchDate("2027-09-05", SERVER_TODAY)).toBe(SERVER_TODAY);
  });

  it("ignores a malformed date", () => {
    expect(resolvePunchDate("garbage", SERVER_TODAY)).toBe(SERVER_TODAY);
    expect(resolvePunchDate("", SERVER_TODAY)).toBe(SERVER_TODAY);
  });
});
