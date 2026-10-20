import { describe, expect, it } from "vitest";
import { canDecideRequest, canDeleteHrRecord } from "./separation-of-duties";

const hr = { id: "hr-1", role: "HR" };
const hr2 = { id: "hr-2", role: "HR" };
const admin = { id: "admin-1", role: "ADMIN" };
const ceo = { id: "ceo-1", role: "CEO" };
const eng = { id: "eng-1", role: "ENGINEERING" };

describe("canDecideRequest (QA-AUTH-04)", () => {
  it("lets HR decide an employee's request", () => {
    expect(canDecideRequest(hr, eng).allowed).toBe(true);
  });

  it("stops anyone deciding their own request", () => {
    for (const p of [hr, admin, ceo]) expect(canDecideRequest(p, p).allowed).toBe(false);
  });

  it("stops HR deciding another HR, Admin or Super Admin request", () => {
    for (const owner of [hr2, admin, ceo]) expect(canDecideRequest(hr, owner).allowed).toBe(false);
  });

  it("lets an Admin or the Super Admin decide HR and Admin requests", () => {
    expect(canDecideRequest(admin, hr).allowed).toBe(true);
    expect(canDecideRequest(ceo, admin).allowed).toBe(true);
    expect(canDecideRequest(admin, ceo).allowed).toBe(true);
  });

  it("stops employees deciding anything", () => {
    expect(canDecideRequest(eng, { id: "eng-2", role: "ENGINEERING" }).allowed).toBe(false);
  });
});

describe("canDeleteHrRecord", () => {
  it("is Admin and Super Admin only", () => {
    expect(canDeleteHrRecord("CEO")).toBe(true);
    expect(canDeleteHrRecord("ADMIN")).toBe(true);
    expect(canDeleteHrRecord("HR")).toBe(false);
    expect(canDeleteHrRecord("ENGINEERING")).toBe(false);
  });
});
