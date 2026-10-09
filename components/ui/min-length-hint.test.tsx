import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { MinLengthHint } from "./min-length-hint";

const html = (value: string, min?: number) => renderToStaticMarkup(<MinLengthHint id="h" value={value} min={min} />);

describe("MinLengthHint", () => {
  it("stays screen-reader only for an empty value", () => {
    expect(html("")).toContain("sr-only");
  });

  it("ignores whitespace when counting", () => {
    expect(html("   ")).toContain("sr-only");
    expect(html(" a ")).not.toContain("sr-only");
  });

  it("is visible while the value is too short", () => {
    expect(html("ab")).not.toContain("sr-only");
    expect(html("abcd", 5)).toContain("Type at least 5 characters");
  });

  it("hides again once the minimum is reached", () => {
    expect(html("abc")).toContain("sr-only");
  });

  it("is always present for aria-describedby", () => {
    expect(html("abc")).toContain('id="h"');
  });
});
