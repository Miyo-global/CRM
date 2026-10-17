import { describe, expect, it } from "vitest";
import { PASSWORD_REGEX, PASSWORD_ZOD_SCHEMA } from "./password-validation";
describe("special characters (QA-0067)", () => {
  it("accepts common punctuation and a space", () => {
    for (const pw of ["QaUser#2026Pw", "QaUser_2026Pw", "QaUser-2026Pw", "Qa User 2026Pw"]) {
      expect(PASSWORD_ZOD_SCHEMA.safeParse(pw).success).toBe(true);
    }
  });

  it("accepts the MIYO-0093 examples on both the schema and the form regex", () => {
    for (const pw of ["Abcdef1#", "Abcdef1_"]) {
      expect(PASSWORD_ZOD_SCHEMA.safeParse(pw).success).toBe(true);
      expect(PASSWORD_REGEX.test(pw)).toBe(true);
    }
  });

  it("still requires eight characters and a symbol", () => {
    expect(PASSWORD_ZOD_SCHEMA.safeParse("Ab1#").success).toBe(false);
    expect(PASSWORD_ZOD_SCHEMA.safeParse("QaUser2026Pwd").success).toBe(false);
    expect(PASSWORD_REGEX.test("QaUser2026Pwd")).toBe(false);
  });
});
