import { describe, expect, it } from "vitest";
import {
  getCandidateEmailKindForGlobalStage,
  getCandidateEmailKindForJobStage,
} from "./pipeline-stage-email";

describe("pipeline-stage-email", () => {
  it("maps global stages that notify candidates", () => {
    expect(getCandidateEmailKindForGlobalStage("SCREENING")).toBe("shortlisted");
    expect(getCandidateEmailKindForGlobalStage("REJECTED")).toBe("rejected");
    expect(getCandidateEmailKindForGlobalStage("INTERVIEW")).toBeNull();
  });

  it("maps job pipeline stages that notify candidates", () => {
    expect(getCandidateEmailKindForJobStage("SHORTLISTED")).toBe("shortlisted");
    expect(getCandidateEmailKindForJobStage("OFFER")).toBe("offer");
    expect(getCandidateEmailKindForJobStage("REJECTED")).toBe("rejected");
    expect(getCandidateEmailKindForJobStage("ROUND_1")).toBeNull();
  });
});
