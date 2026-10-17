import { describe, expect, it } from "vitest";
import { escapeLike, likePattern } from "./escape-like";

describe("escapeLike (MIYO-0081)", () => {
  it("escapes wildcards and the escape character", () => {
    expect(escapeLike("100%")).toBe("100\\%");
    expect(escapeLike("a_b")).toBe("a\\_b");
    expect(escapeLike("c:\\x")).toBe("c:\\\\x");
  });
  it("wraps a contains-search", () => {
    expect(likePattern("%")).toBe("%\\%%");
  });
});
