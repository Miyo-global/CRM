import { type NextRequest, NextResponse } from "next/server";
import { withAuth, ok, err, parseBody } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { interviewQuestions } from "@/lib/db/schema";
import { eq, and, ilike, ne } from "drizzle-orm";
import { isAdminOrOwner } from "@/lib/auth/helpers";
import { z } from "zod";
import { interviewQuestionTextSchema, interviewQuestionTagSchema } from "@/lib/validations/interview-questions";
import { redis } from "@/lib/redis";
import { logger } from "@/lib/logger";

const IQ_CACHE_KEY = (orgId: string) => `org:${orgId}:interview-questions`;

const updateSchema = z.object({
  question: interviewQuestionTextSchema.optional(),
  category: z.string().min(1).max(100).optional(),
  role: z.string().max(100).nullable().optional(),
  difficulty: z.enum(["EASY", "MEDIUM", "HARD"]).optional(),
  tags: z.array(interviewQuestionTagSchema).optional(),
  sampleAnswer: z.string().max(5000).nullable().optional(),
  keywords: z.array(interviewQuestionTagSchema).optional(),
  isActive: z.boolean().optional(),
});

type RouteParams = { params: Promise<{ questionId: string }> };

async function getQuestion(orgId: string, questionId: number) {
  return db.query.interviewQuestions.findFirst({
    where: and(eq(interviewQuestions.id, questionId), eq(interviewQuestions.orgId, orgId)),
  });
}

async function invalidateCache(orgId: string) {
  if (!redis) return;
  try {
    await redis.del(IQ_CACHE_KEY(orgId));
  } catch (e) {
    logger.error("interview-questions: cache invalidation failed", { orgId, error: e });
  }
}

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  return withAuth(async (session) => {
    if (!isAdminOrOwner(session.user.role)) {
      return err("Only Admin or HR can manage question bank", 403);
    }

    const { questionId: id } = await params;
    const questionId = Number(id);
    if (!Number.isFinite(questionId)) return err("Invalid ID", 400);

    const existing = await getQuestion(session.orgId, questionId);
    if (!existing) return err("Question not found", 404);

    let input: z.infer<typeof updateSchema>;
    try {
      input = await parseBody(req, updateSchema);
    } catch (e) {
      if (e instanceof z.ZodError) {
        const detail = e.issues.map((i) => `${String(i.path.join?.(".") ?? "body")}: ${i.message}`).join("; ");
        return err(`Validation failed: ${detail}`, 422);
      }
      throw e;
    }

    if (input.question) {
      const duplicate = await db.query.interviewQuestions.findFirst({
        where: and(
          eq(interviewQuestions.orgId, session.orgId),
          eq(interviewQuestions.isActive, true),
          ilike(interviewQuestions.question, input.question.trim()),
          ne(interviewQuestions.id, questionId),
        ),
        columns: { id: true },
      });
      if (duplicate) return err("A similar question already exists in the bank", 409);
    }

    if (input.tags) {
      const normalized = input.tags.map((t) => t.trim().toLowerCase()).filter(Boolean);
      const unique = [...new Set(normalized)];
      if (unique.length !== normalized.length) {
        return err("Duplicate tag names are not allowed", 422);
      }
    }

    const update: Record<string, unknown> = { ...input, updatedAt: new Date() };
    if (input.tags) {
      update.tags = [...new Set(input.tags.map((t) => t.trim().toLowerCase()).filter(Boolean))];
    }
    if (input.keywords) {
      update.keywords = [...new Set(input.keywords.map((k) => k.trim().toLowerCase()).filter(Boolean))];
    }

    const [updated] = await db
      .update(interviewQuestions)
      .set(update)
      .where(and(eq(interviewQuestions.id, questionId), eq(interviewQuestions.orgId, session.orgId)))
      .returning();

    await invalidateCache(session.orgId);

    return ok(updated);
  });
}

export async function DELETE(_req: NextRequest, { params }: RouteParams) {
  return withAuth(async (session) => {
    if (!isAdminOrOwner(session.user.role)) {
      return err("Only Admin or HR can manage question bank", 403);
    }

    const { questionId: id } = await params;
    const questionId = Number(id);
    if (!Number.isFinite(questionId)) return err("Invalid ID", 400);

    await db
      .delete(interviewQuestions)
      .where(and(eq(interviewQuestions.id, questionId), eq(interviewQuestions.orgId, session.orgId)));

    await invalidateCache(session.orgId);

    return new NextResponse(null, { status: 204 });
  });
}
