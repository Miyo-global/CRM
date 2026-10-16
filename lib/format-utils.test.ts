import { describe, expect, it } from "vitest";
import { formatFileSize } from "./format-utils";
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
