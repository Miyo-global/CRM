import { type NextRequest } from "next/server";
import { withAuth, ok, err, parseBody } from "@/lib/api/helpers";
import { predictDealOutcome } from "@/lib/ai/deal-prediction";
import { isOpenAIConfigured } from "@/lib/ai/openai";
import { z } from "zod";

const schema = z.object({
  dealId: z.number().int().positive(),
});

export async function POST(req: NextRequest) {
  return withAuth(async (session) => {
    if (!isOpenAIConfigured()) {
      return err("AI prediction is not configured. Set OPENAI_API_KEY.", 503);
    }

    const { dealId } = await parseBody(req, schema);
    const result = await predictDealOutcome(session.orgId, dealId);

    if (!result) {
      return err("Deal not found or prediction failed", 404);
    }

    return ok(result);
  });
}
