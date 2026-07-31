import "server-only";

import { aiInvoke, isOpenAIConfigured } from "./openai";
import { candidateScoringPrompt, type CandidateScoringInput } from "./prompts";
import { CandidateScoreSchema, type CandidateScoreResult } from "./schemas";
import { db } from "@/lib/db";
import { candidates, jobPostings } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { logger } from "@/lib/logger";

export async function aiScoreCandidate(
  orgId: string,
  candidateId: number,
  jobId?: number,
): Promise<CandidateScoreResult | null> {
  if (!isOpenAIConfigured()) {
    logger.warn("[ai-score-candidate] OpenAI not configured");
    return null;
  }

  const [candidate] = await db
    .select()
    .from(candidates)
    .where(and(eq(candidates.id, candidateId), eq(candidates.orgId, orgId)));

  if (!candidate) return null;

  let job: { title: string; description: string | null; requirements: string | null } | null = null;
  if (jobId) {
    const [jobRecord] = await db
      .select({
        title: jobPostings.title,
        description: jobPostings.description,
        requirements: jobPostings.requirements,
      })
      .from(jobPostings)
      .where(and(eq(jobPostings.id, jobId), eq(jobPostings.orgId, orgId)));
    if (jobRecord) job = jobRecord;
  }

  const input: CandidateScoringInput = {
    firstName: candidate.firstName,
    lastName: candidate.lastName,
    email: candidate.email,
    currentCompany: candidate.currentCompany,
    currentRole: candidate.currentRole,
    experienceYears: candidate.experienceYears,
    skills: candidate.skills,
    source: candidate.source,
    notes: candidate.notes,
    jobTitle: job?.title,
    jobDescription: job?.description,
    jobRequiredSkills: job?.requirements
      ? job.requirements
          .split(/[\n,;•·]+/)
          .map((token) => token.replace(/^[-*\s]+/, "").trim())
          .filter((token) => token.length > 0)
      : null,
  };

  const prompt = candidateScoringPrompt(input);

  const result = await aiInvoke({
    model: "fast",
    schema: CandidateScoreSchema,
    schemaName: "candidate_score",
    system: prompt.system,
    user: prompt.user,
  });

  result.score = Math.max(0, Math.min(100, Math.round(result.score)));

  const ratingFiveScale = Math.round((result.score / 100) * 5);
  await db
    .update(candidates)
    .set({ rating: ratingFiveScale, updatedAt: new Date() })
    .where(and(eq(candidates.id, candidateId), eq(candidates.orgId, orgId)));

  return result;
}
