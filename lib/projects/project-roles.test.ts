import { describe, expect, it } from "vitest";
import { canArchiveTicket } from "./project-roles";

describe("canArchiveTicket", () => {
  it("lets owners and managers archive any ticket, a contributor only their own", () => {
    expect(canArchiveTicket("OWNER", "x", "u")).toBe(true);
    expect(canArchiveTicket("MANAGER", null, "u")).toBe(true);
    expect(canArchiveTicket("CONTRIBUTOR", "u", "u")).toBe(true);
    expect(canArchiveTicket("CONTRIBUTOR", "x", "u")).toBe(false);
    expect(canArchiveTicket("CONTRIBUTOR", null, "u")).toBe(false);
    expect(canArchiveTicket("VIEWER", "u", "u")).toBe(false);
  });
});
