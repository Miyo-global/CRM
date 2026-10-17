import { describe, expect, it } from "vitest";
import { pluralise } from "./format-utils";

describe("pluralise", () => {
  it("keeps the singular for exactly one", () => {
    expect(pluralise(1, "item")).toBe("1 item");
    expect(pluralise(1, "entry", "entries")).toBe("1 entry");
  });

  it("pluralises everything else, zero included", () => {
    expect(pluralise(0, "item")).toBe("0 items");
    expect(pluralise(3, "item")).toBe("3 items");
    expect(pluralise(3, "entry", "entries")).toBe("3 entries");
  });
});
