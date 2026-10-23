import { describe, expect, it } from "vitest";
import { normalizePersonNameInput, PERSON_NAME_PATTERN } from "./person-name";

describe("person names round-trip as typed (A18)", () => {
  it.each(["QA", "O'Brien-Test", "Anne-Marie", "A. Kumar", "Ravi Kumar", "R2 Emp", "John 2"])(
    "keeps %s unchanged",
    (name) => {
      expect(normalizePersonNameInput(name)).toBe(name);
      expect(PERSON_NAME_PATTERN.test(name)).toBe(true);
    },
  );

  it("collapses double spaces and leading space only", () => {
    expect(normalizePersonNameInput("  Ravi   Kumar")).toBe("Ravi Kumar");
  });

  it("leaves markup in place so validation rejects it with a message (R2-LC-05)", () => {
    expect(normalizePersonNameInput("<b>QA-TEST</b>")).toBe("<b>QA-TEST</b>");
    expect(PERSON_NAME_PATTERN.test("<b>QA-TEST</b>")).toBe(false);
  });

  it("must start with a letter", () => {
    expect(PERSON_NAME_PATTERN.test("2Pac")).toBe(false);
  });
});
