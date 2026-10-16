import { describe, expect, it } from "vitest";
import { intakeDescriptionText } from "./intake-text";

describe("intakeDescriptionText", () => {
  it("reads plain strings", () => {
    expect(intakeDescriptionText("hello")).toBe("hello");
    expect(intakeDescriptionText("")).toBeUndefined();
    expect(intakeDescriptionText(null)).toBeUndefined();
  });

  it("flattens a rich text document into paragraphs", () => {
    const doc = {
      type: "doc",
      content: [
        { type: "paragraph", content: [{ type: "text", text: "First" }] },
        { type: "paragraph", content: [{ type: "text", text: "Second " }, { type: "text", text: "line" }] },
      ],
    };
    expect(intakeDescriptionText(doc)).toBe("First\nSecond line");
  });
});
