import { withAuth, ok, err } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import {
  candidates,
  candidateApplications,
  interviews,
  interviewScorecards,
} from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { google } from "@ai-sdk/google";
import { generateObject } from "ai";
import { z } from "zod";
import { trackAiUsage } from "@/lib/ai/usage-tracker";
import type { NextRequest } from "next/server";

export type CompositeVerdict = "STRONG_HIRE" | "HIRE" | "ON_FENCE" | "NO_HIRE";

export interface RoundSummary {
  interviewType: string;
  scheduledAt: string;
  recommendation: string;
  overallRating: number | null;
  keyNotes: string;
}

export interface CompositeScoreResult {
  verdict: CompositeVerdict;
  overall: number;
  reasoning: string;
  strengthsAcrossRounds: string[];
  concernsAcrossRounds: string[];
  roundSummaries: RoundSummary[];
}

const compositeSchema = z.object({
  verdict: z.enum(["STRONG_HIRE", "HIRE", "ON_FENCE", "NO_HIRE"]),
  overall: z.number().min(0).max(100),
  reasoning: z.string(),
  strengthsAcrossRounds: z.array(z.string()),
  concernsAcrossRounds: z.array(z.string()),
  roundSummaries: z.array(z.object({
    interviewType: z.string(),
    scheduledAt: z.string(),
    recommendation: z.string(),
    overallRating: z.number().min(0).max(100).nullable(),
    keyNotes: z.string(),
  })),
});

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ candidateId: string }> }
) {
  return withAuth(async (session) => {
    const role = session.user.role;
    if (role !== "CEO" && role !== "HR" && role !== "ADMIN") {
      return err("Forbidden", 403);
    }

    const { candidateId: rawId } = await params;
    const candidateId = Number(rawId);
    if (!candidateId || isNaN(candidateId)) return err("Invalid candidate ID.", 400);

    const candidate = await db.query.candidates.findFirst({
      where: and(eq(candidates.id, candidateId), eq(candidates.orgId, session.orgId)),
    });
    if (!candidate) return err("Candidate not found.", 404);

    const candidateInterviews = await db.query.interviews.findMany({
      where: and(
        eq(interviews.candidateId, candidateId),
        eq(interviews.orgId, session.orgId)
      ),
      with: {
        scorecards: {
          where: (sc, { isNotNull }) => isNotNull(sc.submittedAt),
        },
      },
      orderBy: (t, { asc }) => [asc(t.scheduledAt)],
    });

    const submittedScorecards = candidateInterviews.flatMap((iv) => iv.scorecards ?? []);
    if (submittedScorecards.length === 0) {
      return err("No submitted scorecards found. At least one scorecard must be submitted before generating a composite score.", 400);
    }

    const application = await db.query.candidateApplications.findFirst({
      where: and(
        eq(candidateApplications.candidateId, candidateId),
        eq(candidateApplications.orgId, session.orgId)
      ),
      with: { jobPosting: true },
      orderBy: (t, { desc }) => [desc(t.appliedAt)],
    });

    const jobTitle = application?.jobPosting?.title ?? "an unspecified position";
    const jobRequirements = application?.jobPosting?.requirements ?? "";

    const roundBlocks = candidateInterviews
      .filter((iv) => (iv.scorecards ?? []).some((sc) => sc.submittedAt != null))
      .map((iv, i) => {
        const scs = (iv.scorecards ?? []).filter((sc) => sc.submittedAt != null);
        const avgRatings = scs.length > 0
          ? Object.values(scs.reduce<Record<string, number[]>>((acc, sc) => {
              for (const [key, val] of Object.entries(sc.ratings ?? {})) {
                if (!acc[key]) acc[key] = [];
                acc[key].push(val as number);
              }
              return acc;
            }, {})).map((vals) => vals.reduce((a, b) => a + b, 0) / vals.length)
          : [];
        const avgScore = avgRatings.length > 0
          ? avgRatings.reduce((a, b) => a + b, 0) / avgRatings.length
          : null;
        const recommendations = scs.map((sc) => sc.recommendation).join(", ");
        const notes = scs.map((sc) => sc.notes).filter(Boolean).join(" | ");
        return `Round ${i + 1} (${iv.type}) — ${iv.scheduledAt.toISOString().split("T")[0]}:
  Recommendations: ${recommendations}
  Avg Score: ${avgScore != null ? avgScore.toFixed(1) : "N/A"}
  Notes: ${notes || "None"}`;
      })
      .join("\n\n");

    const candidateProfile = [
      `Name: ${candidate.firstName} ${candidate.lastName}`,
      candidate.currentRole ? `Current Role: ${candidate.currentRole}` : null,
      candidate.currentCompany ? `Current Company: ${candidate.currentCompany}` : null,
      candidate.experienceYears ? `Years of Experience: ${candidate.experienceYears}` : null,
      candidate.skills?.length ? `Skills: ${candidate.skills.join(", ")}` : null,
      candidate.resumeText ? `\nResume Summary:\n${candidate.resumeText.slice(0, 2000)}` : null,
    ]
      .filter(Boolean)
      .join("\n");

    const prompt = `You are a senior talent acquisition expert generating a composite hire/no-hire recommendation.

Job Title: ${jobTitle}
Job Requirements:
${jobRequirements || "Not specified."}

Candidate Profile:
${candidateProfile}

Interview Scorecard Data:
${roundBlocks}

Based on ALL interview rounds above, provide a holistic composite evaluation with a verdict, overall score (0-100), reasoning, strengths, concerns, and per-round summaries.`;

    try {
      const response = await generateObject({
        model: google("gemini-2.0-flash"),
        schema: compositeSchema,
        prompt,
      });

      void trackAiUsage({
        orgId: session.orgId,
        userId: session.user.id,
        feature: "composite_scorecard",
        model: "gemini-2.0-flash",
        promptTokens: response.usage.inputTokens,
        completionTokens: response.usage.outputTokens,
      });

      return ok(response.object as CompositeScoreResult);
    } catch {
      return err("AI composite scoring failed. Please check your AI API configuration.", 500);
    }
  });
}
