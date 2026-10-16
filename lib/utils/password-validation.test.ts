import { describe, expect, it } from "vitest";
import { PASSWORD_ZOD_SCHEMA } from "./password-validation";
describe("special characters (QA-0067)", () => {
  it("accepts common punctuation and a space", () => {
    for (const pw of ["QaUser#2026Pw", "QaUser_2026Pw", "QaUser-2026Pw", "Qa User 2026Pw"]) {
      expect(PASSWORD_ZOD_SCHEMA.safeParse(pw).success).toBe(true);
    }
  });

  it("still requires twelve characters and a special character", () => {
    expect(PASSWORD_ZOD_SCHEMA.safeParse("Qa#2026").success).toBe(false);
    expect(PASSWORD_ZOD_SCHEMA.safeParse("QaUser2026Pwd").success).toBe(false);
  });
});
