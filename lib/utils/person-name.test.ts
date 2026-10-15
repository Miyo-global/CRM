import { describe, expect, it } from "vitest";
import {
  isPersonNameInputCharValid,
  normalizePersonNameInput,
  PERSON_NAME_PATTERN,
} from "./person-name";

describe("person names round-trip as typed (A18)", () => {
  it.each(["QA", "O'Brien-Test", "Anne-Marie", "A. Kumar", "Ravi Kumar"])(
    "keeps %s unchanged",
    (name) => {
      expect(isPersonNameInputCharValid(name)).toBe(true);
      expect(normalizePersonNameInput(name)).toBe(name);
      expect(PERSON_NAME_PATTERN.test(name)).toBe(true);
    },
  );

  it("collapses double spaces and leading space only", () => {
    expect(normalizePersonNameInput("  Ravi   Kumar")).toBe("Ravi Kumar");
  });

  it("lets digits be typed but rejects them in validation", () => {
    expect(isPersonNameInputCharValid("Test1")).toBe(true);
    expect(PERSON_NAME_PATTERN.test("Test1")).toBe(false);
  });
});
