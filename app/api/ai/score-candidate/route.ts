import { type NextRequest } from "next/server";
import { withAuth, ok, err, parseBody } from "@/lib/api/helpers";
import { aiScoreCandidate } from "@/lib/ai/candidate-scoring";
import { isOpenAIConfigured } from "@/lib/ai/openai";
import { isAdminOrOwner } from "@/lib/auth/helpers";
import { z } from "zod";

const schema = z.object({
  candidateId: z.number().int().positive(),
  jobId: z.number().int().positive().optional(),
});

export async function POST(req: NextRequest) {
  return withAuth(async (session) => {
    if (!isOpenAIConfigured()) {
      return err("AI scoring is not configured. Set OPENAI_API_KEY.", 503);
    }

    if (!isAdminOrOwner(session.user.role)) {
      return err("Only admins/managers can score candidates", 403);
    }

    const { candidateId, jobId } = await parseBody(req, schema);
    const result = await aiScoreCandidate(session.orgId, candidateId, jobId);

    if (!result) {
      return err("Candidate not found or scoring failed", 404);
    }

    return ok(result);
  });
}
