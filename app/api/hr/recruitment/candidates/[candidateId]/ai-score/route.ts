import { withAuth, ok, err } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { candidates, jobPostings, candidateApplications } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { google } from "@ai-sdk/google";
import { generateText } from "ai";
import { trackAiUsage } from "@/lib/ai/usage-tracker";
import { isRecruitmentHr } from "@/lib/constants/roles";
import type { NextRequest } from "next/server";

const SCORING_DIMENSIONS = [
  "technicalSkills",
  "experience",
  "communication",
  "cultureFit",
  "leadership",
] as const;

type ScoringDimension = (typeof SCORING_DIMENSIONS)[number];

interface AiScoreResult {
  overall: number;
  breakdown: Record<ScoringDimension, number>;
  summary: string;
}

function clampScore(n: number): number {
  return Math.min(100, Math.max(0, Math.round(n)));
}

function safeParseJson(text: string): unknown {
  const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/) ?? text.match(/(\{[\s\S]*\})/);
  try {
    return JSON.parse(jsonMatch ? jsonMatch[1] : text);
  } catch {
    return null;
  }
}

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ candidateId: string }> }
) {
  return withAuth(async (session) => {
    if (!isRecruitmentHr(session.user.role)) {
      return err("Forbidden", 403);
    }

    const { candidateId: rawId } = await params;
    const candidateId = Number(rawId);
    if (!candidateId || isNaN(candidateId)) return err("Invalid candidate ID.", 400);

    const candidate = await db.query.candidates.findFirst({
      where: and(eq(candidates.id, candidateId), eq(candidates.orgId, session.orgId)),
    });
    if (!candidate) return err("Candidate not found.", 404);

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

    const profileLines: string[] = [];
    profileLines.push(`Name: ${candidate.firstName} ${candidate.lastName}`);
    if (candidate.currentRole) profileLines.push(`Current Role: ${candidate.currentRole}`);
    if (candidate.currentCompany) profileLines.push(`Current Company: ${candidate.currentCompany}`);
    if (candidate.experienceYears) profileLines.push(`Years of Experience: ${candidate.experienceYears}`);
    if (candidate.skills?.length) profileLines.push(`Skills: ${candidate.skills.join(", ")}`);
    if (candidate.resumeText) profileLines.push(`\nResume Text:\n${candidate.resumeText.slice(0, 3000)}`);

    const candidateProfile = profileLines.join("\n");

    const prompt = `You are an expert HR recruiter evaluating a candidate for the position of "${jobTitle}".

Job Requirements:
${jobRequirements || "Not specified."}

Candidate Profile:
${candidateProfile}

Score this candidate on the following dimensions (0-100 each):
- technicalSkills: Technical ability relevant to the role
- experience: Relevant work experience and background
- communication: Written communication quality from their profile
- cultureFit: Potential fit based on background and role
- leadership: Leadership indicators based on experience

Respond ONLY with valid JSON in this exact format (no other text):
{
  "overall": <0-100>,
  "breakdown": {
    "technicalSkills": <0-100>,
    "experience": <0-100>,
    "communication": <0-100>,
    "cultureFit": <0-100>,
    "leadership": <0-100>
  },
  "summary": "<2-3 sentence assessment of the candidate>"
}`;

    let scoreResult: AiScoreResult;

    try {
      const response = await generateText({
        model: google("gemini-2.0-flash"),
        prompt,
        maxOutputTokens: 500,
      });

      void trackAiUsage({
        orgId: session.orgId,
        userId: session.user.id,
        feature: "candidate_scoring",
        model: "gemini-2.0-flash",
        promptTokens: response.usage.inputTokens,
        completionTokens: response.usage.outputTokens,
      });

      const parsed = safeParseJson(response.text) as AiScoreResult | null;

      if (!parsed || typeof parsed.overall !== "number" || !parsed.breakdown) {
        return err("AI returned an unexpected response format. Please try again.", 500);
      }

      scoreResult = {
        overall: clampScore(parsed.overall),
        breakdown: {
          technicalSkills: clampScore(parsed.breakdown.technicalSkills ?? 50),
          experience: clampScore(parsed.breakdown.experience ?? 50),
          communication: clampScore(parsed.breakdown.communication ?? 50),
          cultureFit: clampScore(parsed.breakdown.cultureFit ?? 50),
          leadership: clampScore(parsed.breakdown.leadership ?? 50),
        },
        summary: typeof parsed.summary === "string" ? parsed.summary : "",
      };
    } catch {
      return err("AI scoring failed. Please check your AI API configuration.", 500);
    }

    await db
      .update(candidates)
      .set({
        aiScore: scoreResult.overall,
        aiScoreBreakdown: scoreResult.breakdown,
        aiScoreGeneratedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(candidates.id, candidateId));

    return ok(scoreResult);
  });
}
