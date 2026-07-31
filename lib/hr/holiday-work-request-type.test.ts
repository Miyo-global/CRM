import { describe, it, expect } from "vitest";
import { resolveHolidayWorkRequestType } from "./holiday-work-request-type";

describe("resolveHolidayWorkRequestType", () => {
  it("classifies a plain Sunday as SUNDAY", () => {

    const r = resolveHolidayWorkRequestType("2026-05-10", null);
    expect(r).toEqual({ ok: true, type: "SUNDAY", isHrHoliday: false });
  });

  it("classifies a plain Saturday as SATURDAY", () => {

    const r = resolveHolidayWorkRequestType("2026-05-09", null);
    expect(r).toEqual({ ok: true, type: "SATURDAY", isHrHoliday: false });
  });

  it("rejects a regular weekday with no HR holiday", () => {

    const r = resolveHolidayWorkRequestType("2026-05-12", null);
    expect(r).toEqual({ ok: false, reason: "not_a_non_working_day" });
  });

  it("classifies a weekday HR-added holiday as HOLIDAY", () => {

    const r = resolveHolidayWorkRequestType("2026-05-12", { id: 42 });
    expect(r).toEqual({ ok: true, type: "HOLIDAY", isHrHoliday: true });
  });

  it("HR-added holiday on a Sunday wins over weekend (e.g. Diwali falling on Sunday)", () => {

    const r = resolveHolidayWorkRequestType("2026-05-10", { id: 99 });
    expect(r).toEqual({ ok: true, type: "HOLIDAY", isHrHoliday: true });
  });

  it("HR-added holiday on a Saturday wins over weekend", () => {

    const r = resolveHolidayWorkRequestType("2026-05-09", { id: 7 });
    expect(r).toEqual({ ok: true, type: "HOLIDAY", isHrHoliday: true });
  });

  it("undefined holiday arg behaves like no match", () => {

    const r = resolveHolidayWorkRequestType("2026-05-12", undefined);
    expect(r).toEqual({ ok: false, reason: "not_a_non_working_day" });
  });
});
