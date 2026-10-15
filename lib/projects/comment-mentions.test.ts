import { describe, expect, it } from "vitest";
import { mentionsToPlainText, parseMentionIds } from "./comment-mentions";

describe("parseMentionIds", () => {
  it("extracts unique user ids", () => {
    expect(parseMentionIds("Hi @[Asha K](u_1) and @[Ravi](u-2), cc @[Asha K](u_1)")).toEqual(["u_1", "u-2"]);
  });

  it("ignores plain @ text and malformed tokens", () => {
    expect(parseMentionIds("email me@x.io or @Asha or @[Bad](has space)")).toEqual([]);
  });

  it("caps the number of mentions", () => {
    const content = Array.from({ length: 30 }, (_, i) => `@[U${i}](u${i})`).join(" ");
    expect(parseMentionIds(content)).toHaveLength(20);
  });
});

describe("mentionsToPlainText", () => {
  it("replaces tokens with readable names", () => {
    expect(mentionsToPlainText("Thanks @[Asha K](u_1)!")).toBe("Thanks @Asha K!");
  });
});
