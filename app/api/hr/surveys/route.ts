import { withAuth, ok, err } from "@/lib/api/helpers";
import { isAdminOrOwner } from "@/lib/auth/helpers";
import { db } from "@/lib/db";
import { pulseSurveys, surveyResponses } from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { z } from "zod";
import type { NextRequest } from "next/server";

const createSurveySchema = z.object({
  title: z.string().min(1).max(200),
  questions: z.array(z.object({
    id: z.string().min(1),
    text: z.string().min(1),
    type: z.enum(["rating", "text", "choice"]),
    options: z.array(z.string()).optional(),
  })).min(1),
  isAnonymous: z.boolean().optional().default(true),
  closesAt: z.string().optional(),
});

const submitResponseSchema = z.object({
  surveyId: z.number().int().positive(),
  answers: z.array(z.object({
    questionId: z.string().min(1),
    value: z.union([z.string(), z.number()]),
  })),
});

export async function GET() {
  return withAuth(async (session) => {
    const data = await db.query.pulseSurveys.findMany({
      where: eq(pulseSurveys.orgId, session.orgId),
      with: { responses: true },
      orderBy: [desc(pulseSurveys.createdAt)],
    });
    return ok(data);
  });
}

export async function POST(req: NextRequest) {
  return withAuth<unknown>(async (session) => {
    const contentType = req.headers.get("x-action");

    if (contentType === "respond") {
      const body = submitResponseSchema.parse(await req.json());
      const survey = await db.query.pulseSurveys.findFirst({
        where: and(eq(pulseSurveys.id, body.surveyId), eq(pulseSurveys.orgId, session.orgId)),
      });
      if (!survey) return err("Survey not found.", 404);
      if (survey.status !== "ACTIVE") return err("Survey is not active.", 400);

      const [response] = await db.insert(surveyResponses).values({
        surveyId: body.surveyId,
        userId: survey.isAnonymous ? null : session.user.id,
        answers: body.answers,
      }).returning();
      return ok(response, 201);
    }

    if (!isAdminOrOwner(session.user.role)) return err("Only admins can create surveys.", 403);
    const body = createSurveySchema.parse(await req.json());
    const [survey] = await db.insert(pulseSurveys).values({
      orgId: session.orgId,
      title: body.title,
      questions: body.questions,
      isAnonymous: body.isAnonymous,
      closesAt: body.closesAt ? new Date(body.closesAt) : undefined,
      status: "DRAFT",
      createdBy: session.user.id,
    }).returning();
    return ok(survey, 201);
  });
}
