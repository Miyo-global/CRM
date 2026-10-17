import { describe, expect, it } from "vitest";
import { blocksCategory } from "./preference-rules";

describe("blocksCategory", () => {
  it("lets the mail through when nothing was switched off", () => {
    expect(blocksCategory({ emailEnabled: true, categories: {} }, "leaves")).toBe(false);
    expect(blocksCategory({ emailEnabled: null, categories: null }, "leaves")).toBe(false);
  });

  it("blocks the one category that was switched off", () => {
    expect(blocksCategory({ emailEnabled: true, categories: { leaves: false } }, "leaves")).toBe(true);
    expect(blocksCategory({ emailEnabled: true, categories: { leaves: false } }, "payroll")).toBe(false);
  });

  it("blocks everything when email is off", () => {
    expect(blocksCategory({ emailEnabled: false, categories: { leaves: true } }, "leaves")).toBe(true);
  });
});
