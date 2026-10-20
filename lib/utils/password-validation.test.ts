import { describe, expect, it } from "vitest";
import { getPasswordStrength } from "@/lib/password-utils";
import { PASSWORD_REGEX, PASSWORD_ZOD_SCHEMA, passwordChecks } from "./password-validation";
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

describe("client checklist and server agree (QA-BUG-03)", () => {
  it("treats ! and - as symbols everywhere", () => {
    for (const pw of ["QaUser!2026", "QaUser-2026", "Qa€User2026"]) {
      expect(Object.values(passwordChecks(pw)).every(Boolean)).toBe(true);
      expect(getPasswordStrength(pw).level).toBe("strong");
      expect(PASSWORD_REGEX.test(pw)).toBe(true);
      expect(PASSWORD_ZOD_SCHEMA.safeParse(pw).success).toBe(true);
    }
  });

  it("a green checklist always means the server accepts", () => {
    for (const pw of ["abc", "ABCDEFGH1!", "Abcdefgh!", "Abcdefg1", "A".repeat(130) + "a1!"]) {
      const allGreen = Object.values(passwordChecks(pw)).every(Boolean);
      expect(PASSWORD_ZOD_SCHEMA.safeParse(pw).success).toBe(allGreen);
      expect(PASSWORD_REGEX.test(pw)).toBe(allGreen);
    }
  });
});
