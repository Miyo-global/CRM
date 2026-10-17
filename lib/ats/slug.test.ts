import { describe, it, expect } from "vitest";

import { slugify, uniqueSlug } from "./slug";

describe("slugify", () => {
  it("makes a URL out of a title", () => {
    expect(slugify("Senior Backend Engineer (Go)")).toBe("senior-backend-engineer-go");
  });

  it("never leaves a trailing dash", () => {
    expect(slugify("Designer — ")).toBe("designer");
  });
});

describe("uniqueSlug", () => {
  it("keeps the plain slug when it is free", () => {
    expect(uniqueSlug("Backend Engineer", [])).toBe("backend-engineer");
  });

  it("counts up past the ones in use", () => {
    expect(uniqueSlug("Backend Engineer", ["backend-engineer", "backend-engineer-2"])).toBe(
      "backend-engineer-3",
    );
  });

  it("falls back to a name for a title with nothing usable in it", () => {
    expect(uniqueSlug("—", [])).toBe("job");
  });
});
