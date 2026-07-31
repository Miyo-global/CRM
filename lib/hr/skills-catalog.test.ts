import { describe, expect, it } from "vitest";
import {
  normalizeSkill,
  canonicalizeSkill,
  isRecognizedSkill,
  getAcceptableNorms,
  skillMatchesQuery,
  getRelatedSkills,
  buildSuggestions,
  isPlausibleSkillLabel,
} from "./skills-catalog";

describe("canonicalizeSkill", () => {
  it("collapses spelling variants to one canonical name", () => {
    for (const v of ["React", "react js", "React Js", "reactjs", "react.js"]) {
      expect(canonicalizeSkill(v)?.canonical).toBe("React");
    }
    for (const v of ["Node.js", "nodejs", "node js", "node"]) {
      expect(canonicalizeSkill(v)?.canonical).toBe("Node.js");
    }
    expect(canonicalizeSkill("JS")?.canonical).toBe("JavaScript");
  });

  it("marks unknown skills as unrecognized and title-cases them", () => {
    const r = canonicalizeSkill("Reactdfdwfwf");
    expect(r?.recognized).toBe(false);
    expect(r?.canonical).toBe("Reactdfdwfwf");
  });

  it("title-cases unknown skills consistently for dedupe", () => {
    expect(canonicalizeSkill("foo bar")?.canonical).toBe("Foo Bar");
    expect(canonicalizeSkill("FOO BAR")?.canonical).toBe("Foo Bar");
  });

  it("returns null for empty input", () => {
    expect(canonicalizeSkill("   ")).toBeNull();
  });
});

describe("isRecognizedSkill", () => {
  it("recognizes catalog skills and aliases, rejects typos", () => {
    expect(isRecognizedSkill("react js")).toBe(true);
    expect(isRecognizedSkill("Node.js")).toBe(true);
    expect(isRecognizedSkill("Reactdfdwfwf")).toBe(false);
  });
});

describe("skillMatchesQuery", () => {
  it("matches a recognized query only against the same canonical skill", () => {
    expect(skillMatchesQuery("React Js", "React")).toBe(true);
    expect(skillMatchesQuery("reactjs", "react")).toBe(true);
    expect(skillMatchesQuery("Reactdfdwfwf", "React")).toBe(false);
    expect(skillMatchesQuery("Node.js", "React")).toBe(false);
  });

  it("falls back to substring matching for unrecognized queries", () => {
    expect(skillMatchesQuery("Internal Tooling", "tooling")).toBe(true);
    expect(skillMatchesQuery("Internal Tooling", "finance")).toBe(false);
  });
});

describe("getAcceptableNorms", () => {
  it("includes the canonical and all alias norms", () => {
    const norms = getAcceptableNorms("JavaScript");
    expect(norms).toContain("javascript");
    expect(norms).toContain("js");
  });
});

describe("getRelatedSkills", () => {
  it("returns related skills for a canonical name", () => {
    expect(getRelatedSkills("React")).toContain("Next.js");
  });
});

describe("isPlausibleSkillLabel", () => {
  it("accepts normal technical skill labels", () => {
    expect(isPlausibleSkillLabel("React")).toBe(true);
    expect(isPlausibleSkillLabel("C++")).toBe(true);
    expect(isPlausibleSkillLabel("C#")).toBe(true);
    expect(isPlausibleSkillLabel("Node.js")).toBe(true);
    expect(isPlausibleSkillLabel("UI/UX Design")).toBe(true);
  });

  it("rejects empty, too long, or non-letter garbage", () => {
    expect(isPlausibleSkillLabel("")).toBe(false);
    expect(isPlausibleSkillLabel("   ")).toBe(false);
    expect(isPlausibleSkillLabel("12345")).toBe(false);
    expect(isPlausibleSkillLabel("@@@@")).toBe(false);
    expect(isPlausibleSkillLabel("a".repeat(120))).toBe(false);
  });
});

describe("buildSuggestions", () => {
  it("merges spelling variants and ranks by count", () => {
    const suggestions = buildSuggestions(
      [
        { skill: "React", count: 3 },
        { skill: "react js", count: 2 },
        { skill: "Node.js", count: 4 },
      ],
      ""
    );
    const react = suggestions.find((s) => s.skill === "React");
    expect(react?.count).toBe(5);
    expect(suggestions[0]!.skill).toBe("React");
  });

  it("filters by query and matches aliases", () => {
    const suggestions = buildSuggestions(
      [
        { skill: "JavaScript", count: 2 },
        { skill: "Node.js", count: 1 },
      ],
      "js"
    );
    expect(suggestions.some((s) => s.skill === "JavaScript")).toBe(true);
    expect(suggestions.some((s) => s.skill === "Node.js")).toBe(false);
  });
});
