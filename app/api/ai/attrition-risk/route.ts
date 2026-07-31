import { type NextRequest } from "next/server";
import { withAuth, ok, err, parseBody } from "@/lib/api/helpers";
import { aiAnalyzeAttritionRisk } from "@/lib/ai/attrition-risk";
import { isOpenAIConfigured } from "@/lib/ai/openai";
import { isAdminOrOwner } from "@/lib/auth/helpers";
import { z } from "zod";

const schema = z.object({
  userId: z.string().min(1, "User ID is required"),
});

export async function POST(req: NextRequest) {
  return withAuth(async (session) => {
    if (!isOpenAIConfigured()) {
      return err("AI is not configured. Set OPENAI_API_KEY.", 503);
    }

    if (!isAdminOrOwner(session.user.role)) {
      return err("Only admins can analyze attrition risk", 403);
    }

    const { userId } = await parseBody(req, schema);
    const result = await aiAnalyzeAttritionRisk(session.orgId, userId);

    if (!result) {
      return err("Employee not found or analysis failed", 404);
    }

    return ok(result);
  });
}
