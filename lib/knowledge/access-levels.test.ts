import { describe, it, expect } from "vitest";

import {
  accessLevelsSatisfying,
  accessSatisfies,
  allowed,
  denied,
  KB_ACCESS_ROUTES,
  KB_PAGE_ACTIONS,
  notFound,
} from "./access-levels";

describe("accessSatisfies", () => {
  const expected: Record<string, string[]> = {
    view: ["view", "comment", "edit", "manage"],
    comment: ["comment", "edit", "manage"],
    edit: ["edit", "manage"],
    manage: ["manage"],
  };

  it("covers every rank pair", () => {
    for (const required of KB_PAGE_ACTIONS) {
      for (const held of KB_PAGE_ACTIONS) {
        expect(accessSatisfies(held, required), `${held} vs ${required}`).toBe(
          expected[required].includes(held),
        );
      }
    }
  });
});

describe("accessLevelsSatisfying", () => {
  it("lists the levels at or above the one asked for, strongest last", () => {
    expect(accessLevelsSatisfying("view")).toEqual(["view", "comment", "edit", "manage"]);
    expect(accessLevelsSatisfying("edit")).toEqual(["edit", "manage"]);
    expect(accessLevelsSatisfying("manage")).toEqual(["manage"]);
  });
});

describe("access decisions", () => {
  it("tags each outcome", () => {
    const scope = { orgId: "o1", pageId: "p1", action: "edit" as const, via: "space" as const };
    expect(allowed(scope)).toEqual({ outcome: "allowed", scope });
    expect(notFound()).toEqual({ outcome: "notFound" });
    expect(denied("no grant")).toEqual({ outcome: "denied", reason: "no grant" });
  });

  it("keeps the eight access routes", () => {
    expect(KB_ACCESS_ROUTES).toEqual([
      "owner",
      "admin",
      "creator",
      "organization",
      "public",
      "space",
      "project",
      "grant",
    ]);
  });
});
