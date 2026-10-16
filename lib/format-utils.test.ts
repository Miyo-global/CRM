import { describe, expect, it } from "vitest";
import { formatFileSize, plural } from "./format-utils";
describe("formatFileSize (QA-0046)", () => {
  it("shows a dash for an unknown or empty size", () => {
    expect(formatFileSize(null)).toBe("—");
    expect(formatFileSize(undefined)).toBe("—");
    expect(formatFileSize(0)).toBe("—");
  });

  it("formats real sizes", () => {
    expect(formatFileSize(512)).toBe("512 B");
    expect(formatFileSize(2048)).toBe("2.0 KB");
    expect(formatFileSize(11 * 1024 * 1024)).toBe("11.0 MB");
  });
});

describe("plural (QA-D009)", () => {
  it("uses the singular for one", () => {
    expect(plural(1, "item")).toBe("1 item");
    expect(plural(1, "version")).toBe("1 version");
  });

  it("uses the plural otherwise", () => {
    expect(plural(0, "item")).toBe("0 items");
    expect(plural(3, "review")).toBe("3 reviews");
  });

  it("takes an irregular plural", () => {
    expect(plural(2, "person", "people")).toBe("2 people");
  });
});
