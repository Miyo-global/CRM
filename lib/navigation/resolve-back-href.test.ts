import { describe, expect, it } from "vitest";
import { resolveBackHref } from "./resolve-back-href";

describe("resolveBackHref", () => {
  it("returns fallback when returnTo is missing or unsafe", () => {
    expect(resolveBackHref(null, "/hr/recruitment")).toBe("/hr/recruitment");
    expect(resolveBackHref("", "/hr/recruitment")).toBe("/hr/recruitment");
    expect(resolveBackHref("//evil.com", "/hr/recruitment")).toBe("/hr/recruitment");
    expect(resolveBackHref("https://evil.com", "/hr/recruitment")).toBe("/hr/recruitment");
    expect(resolveBackHref("/settings", "/hr/recruitment")).toBe("/hr/recruitment");
  });

  it("returns returnTo when it is a safe in-app HR path", () => {
    expect(resolveBackHref("/hr/recruitment/jobs/new", "/hr/recruitment")).toBe(
      "/hr/recruitment/jobs/new",
    );
  });
});
