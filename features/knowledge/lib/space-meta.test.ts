import { describe, expect, it } from "vitest";

import {
  KB_SPACE_COLORS,
  KB_SPACE_TYPES,
  slugifySpaceName,
  spaceColorTone,
  spaceTypeLabel,
} from "./space-meta";

describe("KB-0084: space metadata", () => {
  it("names all six space types", () => {
    expect(KB_SPACE_TYPES).toHaveLength(6);
    expect(spaceTypeLabel("support")).toBe("Support");
    expect(spaceTypeLabel(null)).toBe("Team");
  });

  it("keeps colours inside the tone palette, so no gradient or stray hex gets in", () => {
    expect(KB_SPACE_COLORS.length).toBeGreaterThan(0);
    expect(spaceColorTone("#ff0000")).toBe("neutral");
    expect(spaceColorTone("linear-gradient(red, blue)")).toBe("neutral");
    expect(spaceColorTone(KB_SPACE_COLORS[0])).toBe(KB_SPACE_COLORS[0]);
  });

  it("suggests a usable slug", () => {
    expect(slugifySpaceName("  Engineering & Ops  ")).toBe("engineering-ops");
    expect(slugifySpaceName("Q3/2026 Plans")).toBe("q3-2026-plans");
    expect(slugifySpaceName("!!!")).toBe("");
  });

  it("caps the slug length", () => {
    expect(slugifySpaceName("a".repeat(120))).toHaveLength(50);
  });
});
