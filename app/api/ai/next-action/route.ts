import { type NextRequest } from "next/server";
import { withAuth, ok, err, parseBody } from "@/lib/api/helpers";
import { getNextBestAction } from "@/lib/ai/next-action";
import { isOpenAIConfigured } from "@/lib/ai/openai";
import { z } from "zod";

const schema = z.object({
  leadId: z.number().int().positive(),
});

export async function POST(req: NextRequest) {
  return withAuth(async (session) => {
    if (!isOpenAIConfigured()) {
      return err("AI is not configured. Set OPENAI_API_KEY.", 503);
    }

    const { leadId } = await parseBody(req, schema);
    const result = await getNextBestAction(session.orgId, leadId);

    if (!result) {
      return err("Lead not found or suggestion failed", 404);
    }

    return ok(result);
  });
}
