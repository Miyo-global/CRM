import { type NextRequest } from "next/server";
import { z } from "zod";
import { withAuth, ok, err } from "@/lib/api/helpers";
import { isOpenAIConfigured, aiInvoke } from "@/lib/ai/openai";

const InputSchema = z.object({
  topic: z.string().min(1).max(500),
  targetAudience: z.string().max(200).optional(),
  contentType: z.enum(["blog", "email", "whitepaper", "social", "video"]).optional(),
  keywords: z.string().max(300).optional(),
});

const CONTENT_BRIEF_ROLES = new Set(["CEO", "ADMIN", "DIGITAL_MARKETING"]);

const ContentBriefSchema = z.object({
  title: z.string(),
  outline: z.array(z.string()),
  keyPoints: z.array(z.string()),
  seoKeywords: z.array(z.string()),
  callToAction: z.string(),
  estimatedWordCount: z.number(),
  targetAudienceInsights: z.string(),
});


export async function POST(req: NextRequest) {
  return withAuth(async (session) => {
    if (!CONTENT_BRIEF_ROLES.has(session.user.role ?? "")) {
      return err("You do not have access to content brief generation.", 403);
    }
    if (!isOpenAIConfigured()) {
      return err("AI features are not configured. Set OPENAI_API_KEY.", 503);
    }

    const body = await req.json();
    const { topic, targetAudience, contentType, keywords } = InputSchema.parse(body);

    const contentTypeLabel: Record<string, string> = {
      blog: "Blog Post",
      email: "Email Newsletter",
      whitepaper: "Whitepaper",
      social: "Social Media Post",
      video: "Video Script",
    };

    const userPrompt = [
      `Topic: ${topic}`,
      targetAudience ? `Target Audience: ${targetAudience}` : null,
      contentType ? `Content Type: ${contentTypeLabel[contentType] ?? contentType}` : null,
      keywords ? `Seed Keywords: ${keywords}` : null,
    ]
      .filter(Boolean)
      .join("\n");

    const brief = await aiInvoke({
      model: "standard",
      schema: ContentBriefSchema,
      schemaName: "content_brief",
      system:
        "You are a B2B content strategist specializing in financial services content for the Indian market. Generate structured content briefs that are specific, actionable, and SEO-optimized. The outline should have 5-8 sections. Provide 4-6 key points, 6-10 SEO keywords, and a compelling call to action.",
      user: userPrompt,
    });

    return ok(brief);
  });
}
