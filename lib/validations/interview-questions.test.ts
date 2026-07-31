import { describe, expect, it } from "vitest";
import {
  interviewQuestionTextSchema,
  interviewQuestionTagSchema,
  parseInterviewQuestionTagsField,
} from "./interview-questions";

describe("interviewQuestionTextSchema", () => {
  it("accepts a valid question", () => {
    expect(
      interviewQuestionTextSchema.safeParse("Tell me about a time you resolved a team conflict.").success,
    ).toBe(true);
  });

  it("rejects numbers only", () => {
    expect(interviewQuestionTextSchema.safeParse("12345678").success).toBe(false);
  });

  it("rejects special characters only", () => {
    expect(interviewQuestionTextSchema.safeParse("@@@###").success).toBe(false);
  });

  it("rejects consecutive spaces", () => {
    expect(interviewQuestionTextSchema.safeParse("What is  your approach?").success).toBe(false);
  });
});

describe("interviewQuestionTagSchema", () => {
  it("accepts hyphenated tags", () => {
    expect(interviewQuestionTagSchema.safeParse("problem-solving").success).toBe(true);
  });

  it("rejects special characters", () => {
    expect(interviewQuestionTagSchema.safeParse("fa@tag").success).toBe(false);
    expect(interviewQuestionTagSchema.safeParse("###").success).toBe(false);
  });

  it("rejects numbers only", () => {
    expect(interviewQuestionTagSchema.safeParse("123").success).toBe(false);
  });
});

describe("parseInterviewQuestionTagsField", () => {
  it("parses comma-separated tags", () => {
    const result = parseInterviewQuestionTagsField("leadership, problem-solving");
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value).toEqual(["leadership", "problem-solving"]);
  });

  it("rejects invalid tag in list", () => {
    const result = parseInterviewQuestionTagsField("good, bad@tag");
    expect(result.ok).toBe(false);
  });
});
