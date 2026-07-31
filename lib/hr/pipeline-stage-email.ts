import type { CandidateStatus } from "@/types/hr";

export type PipelineStageEmailKind = "shortlisted" | "offer" | "rejected";

export function getCandidateEmailKindForGlobalStage(
  stage: CandidateStatus,
): PipelineStageEmailKind | null {
  if (stage === "SCREENING") return "shortlisted";
  if (stage === "REJECTED") return "rejected";
  return null;
}

export function getCandidateEmailKindForJobStage(stage: string): PipelineStageEmailKind | null {
  if (stage === "SHORTLISTED") return "shortlisted";
  if (stage === "OFFER") return "offer";
  if (stage === "REJECTED") return "rejected";
  return null;
}

export function getPipelineStageEmailDescription(kind: PipelineStageEmailKind): string {
  switch (kind) {
    case "shortlisted":
      return "You can notify the candidate that they have been shortlisted for this role.";
    case "offer":
      return "You can notify the candidate that they have moved to the offer stage.";
    case "rejected":
      return "You can notify the candidate about this rejection.";
  }
}
