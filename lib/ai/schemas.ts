import { z } from "zod";

export const CandidateScoreSchema = z.object({
  score: z.number().min(0).max(100),
  fitLevel: z.enum(["excellent", "good", "average", "poor"]),
  reasoning: z.string(),
  strengths: z.array(z.string()),
  concerns: z.array(z.string()),
  suggestedQuestions: z.array(z.string()).describe("3-5 interview questions to validate the candidate"),
});
export type CandidateScoreResult = z.infer<typeof CandidateScoreSchema>;

export const ReviewRatingItemSchema = z.object({
  category: z.string(),
  score: z.number().min(1).max(5),
  comment: z.string(),
});

export const ReviewDraftSchema = z.object({
  overallRating: z.number().min(1).max(5),
  strengths: z.string().describe("2-3 sentences highlighting strengths"),
  improvements: z.string().describe("2-3 sentences on areas for growth"),
  comments: z.string().describe("1-2 sentences overall summary"),
  ratings: z.array(ReviewRatingItemSchema).describe("Ratings per category (5 categories)"),
});
export type ReviewDraftResult = z.infer<typeof ReviewDraftSchema>;

export const HelpdeskReplySchema = z.object({
  suggestedReply: z.string().describe("Professional reply text, max 100 words"),
  category: z.string().describe("Inferred category: Leave / Payroll / IT / Benefits / Policy / Other"),
  estimatedResolutionTime: z.string().describe("e.g. 24 hours, 2-3 business days"),
  followUpActions: z.array(z.string()),
});
export type HelpdeskReplyResult = z.infer<typeof HelpdeskReplySchema>;

export const AttritionRiskSchema = z.object({
  attritionRiskScore: z.number().min(0).max(100),
  riskLevel: z.enum(["low", "medium", "high", "critical"]),
  reasoning: z.string(),
  riskFactors: z.array(z.string()),
  retentionActions: z.array(z.string()),
});
export type AttritionRiskResult = z.infer<typeof AttritionRiskSchema>;
