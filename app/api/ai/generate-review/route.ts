import { type NextRequest } from "next/server";
import { withAuth, ok, err, parseBody } from "@/lib/api/helpers";
import { aiGenerateReview } from "@/lib/ai/review-draft";
import { isOpenAIConfigured } from "@/lib/ai/openai";
import { isAdminOrOwner } from "@/lib/auth/helpers";
import { z } from "zod";

const schema = z.object({
  userId: z.string().min(1, "User ID is required"),
  periodStart: z.string().min(1, "Period start required"),
  periodEnd: z.string().min(1, "Period end required"),
});

export async function POST(req: NextRequest) {
  return withAuth(async (session) => {
    if (!isOpenAIConfigured()) {
      return err("AI is not configured. Set OPENAI_API_KEY.", 503);
    }

    if (!isAdminOrOwner(session.user.role)) {
      return err("Only admins/managers can generate reviews", 403);
    }

    const { userId, periodStart, periodEnd } = await parseBody(req, schema);
    const result = await aiGenerateReview(session.orgId, userId, periodStart, periodEnd);

    if (!result) {
      return err("Employee not found or review generation failed", 404);
    }

    return ok(result);
  });
}
