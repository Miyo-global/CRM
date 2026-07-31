import { type NextRequest, NextResponse } from "next/server";
import { withAuth, ok, err, parseBody } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { interviewQuestions } from "@/lib/db/schema";
import { eq, and, ilike, inArray, or, sql } from "drizzle-orm";
import { isAdminOrOwner } from "@/lib/auth/helpers";
import { z } from "zod";
import { interviewQuestionTextSchema, interviewQuestionTagSchema } from "@/lib/validations/interview-questions";
import { redis } from "@/lib/redis";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";
const IQ_CACHE_KEY = (orgId: string) => `org:${orgId}:interview-questions`;
const IQ_CACHE_TTL = 300;

/** Upstash may return a parsed array or a JSON string; ignore other shapes so we never return non-array bodies. */
function normalizeCachedInterviewQuestionsList(raw: unknown): unknown[] | null {
  if (raw == null) return null;
  if (Array.isArray(raw)) return raw;
  if (typeof raw === "string") {
    try {
      const parsed: unknown = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : null;
    } catch {
      return null;
    }
  }
  return null;
}

const RL_KEY = (orgId: string) => `rl:interview-questions:create:${orgId}`;
const RL_LIMIT = 20;
const RL_WINDOW = 60;

const createSchema = z.object({
  question: interviewQuestionTextSchema,
  category: z.string().min(1).max(100).default("GENERAL"),
  role: z.string().max(100).optional(),
  difficulty: z.enum(["EASY", "MEDIUM", "HARD"]).default("MEDIUM"),
  tags: z.array(interviewQuestionTagSchema).default([]),
  sampleAnswer: z.string().max(5000).nullable().optional(),
  keywords: z.array(interviewQuestionTagSchema).default([]),
});

const bulkDeleteSchema = z.object({
  ids: z.array(z.number().int().positive()).min(1).max(100),
});

export async function GET(req: NextRequest) {
  return withAuth(async (session) => {
    const { searchParams } = new URL(req.url);
    const category = searchParams.get("category");
    const role = searchParams.get("role");
    const difficulty = searchParams.get("difficulty");
    const q = searchParams.get("q");

    const hasDynamicFilters = !!(category || role || difficulty || q);

    if (!hasDynamicFilters && redis) {
      try {
        const cacheKey = IQ_CACHE_KEY(session.orgId);
        const cachedRaw = await redis.get(cacheKey);
        const cached = normalizeCachedInterviewQuestionsList(cachedRaw);
        if (cachedRaw != null && cached === null) {
          try {
            await redis.del(cacheKey);
          } catch (delErr) {
            logger.error("interview-questions GET: dropped invalid cache (delete failed)", { error: delErr });
          }
        }
        if (cached !== null) return ok(cached);
      } catch (e) {
        logger.error("interview-questions GET: cache read failed", { error: e });
      }
    }

    const conditions = [
      eq(interviewQuestions.orgId, session.orgId),
      eq(interviewQuestions.isActive, true),
    ];

    if (category) conditions.push(eq(interviewQuestions.category, category));
    if (role) conditions.push(eq(interviewQuestions.role, role));
    if (difficulty) conditions.push(eq(interviewQuestions.difficulty, difficulty));
    if (q) {
      const pattern = `%${q}%`;
      conditions.push(
        or(
          ilike(interviewQuestions.question, pattern),
          ilike(interviewQuestions.role, pattern),
          ilike(interviewQuestions.category, pattern),
          ilike(interviewQuestions.difficulty, pattern),
          sql`array_to_string(${interviewQuestions.tags}, ',') ILIKE ${pattern}`,
          sql`array_to_string(${interviewQuestions.keywords}, ',') ILIKE ${pattern}`,
        )!
      );
    }

    let questions;
    try {
      questions = await db.query.interviewQuestions.findMany({
        where: and(...conditions),
        orderBy: (t, { desc }) => [desc(t.createdAt)],
        limit: 200,
      });
    } catch (e) {
      logger.error("interview-questions GET: database query failed", { orgId: session.orgId, error: e });
      return err("Could not load interview questions", 500);
    }

    if (!hasDynamicFilters && redis) {
      try {
        await redis.set(IQ_CACHE_KEY(session.orgId), questions, { ex: IQ_CACHE_TTL });
      } catch (e) {
        logger.error("interview-questions GET: cache write failed", { error: e });
      }
    }

    return ok(questions);
  });
}

export async function POST(req: NextRequest) {
  return withAuth(async (session) => {
    if (!isAdminOrOwner(session.user.role)) {
      return err("Only Admin or HR can manage question bank", 403);
    }

    if (redis) {
      try {
        const count = await redis.incr(RL_KEY(session.orgId));
        if (count === 1) await redis.expire(RL_KEY(session.orgId), RL_WINDOW);
        if (count > RL_LIMIT) return err("Too many requests, please try again later", 429);
      } catch (e) {
        logger.error("interview-questions POST: rate limit check failed (skipping)", { error: e });
      }
    }

    let input: z.infer<typeof createSchema>;
    try {
      input = await parseBody(req, createSchema);
    } catch (e) {
      if (e instanceof z.ZodError) {
        const detail = e.issues.map((i) => `${String(i.path.join?.(".") ?? "body")}: ${i.message}`).join("; ");
        return err(`Validation failed: ${detail}`, 422);
      }
      throw e;
    }

    const duplicate = await db.query.interviewQuestions.findFirst({
      where: and(
        eq(interviewQuestions.orgId, session.orgId),
        eq(interviewQuestions.isActive, true),
        ilike(interviewQuestions.question, input.question.trim()),
      ),
    });
    if (duplicate) return err("A similar question already exists in the bank", 409);

    const rawTags = input.tags.map((t) => t.trim().toLowerCase()).filter(Boolean);
    if (rawTags.length !== new Set(rawTags).size) {
      return err("Duplicate tag names are not allowed", 422);
    }
    const normalizedTags = [...new Set(rawTags)];
    const normalizedKeywords = [...new Set(
      (input.keywords ?? []).map((k) => k.trim().toLowerCase()).filter(Boolean),
    )];

    const [created] = await db
      .insert(interviewQuestions)
      .values({
        orgId: session.orgId,
        question: input.question.trim(),
        category: input.category,
        role: input.role?.trim() || null,
        difficulty: input.difficulty,
        tags: normalizedTags,
        sampleAnswer: input.sampleAnswer?.trim() || null,
        keywords: normalizedKeywords,
        createdBy: session.user.id,
      })
      .returning();

    if (redis) {
      try {
        await redis.del(IQ_CACHE_KEY(session.orgId));
      } catch (e) {
        logger.error("interview-questions POST: cache invalidation failed", { error: e });
      }
    }

    return ok(created, 201);
  });
}

export async function DELETE(req: NextRequest) {
  return withAuth(async (session) => {
    if (!isAdminOrOwner(session.user.role)) {
      return err("Only Admin or HR can manage question bank", 403);
    }

    let input: z.infer<typeof bulkDeleteSchema>;
    try {
      input = await parseBody(req, bulkDeleteSchema);
    } catch (e) {
      if (e instanceof z.ZodError) {
        return err("ids must be a non-empty array of integers (max 100)", 422);
      }
      throw e;
    }

    await db
      .delete(interviewQuestions)
      .where(
        and(
          eq(interviewQuestions.orgId, session.orgId),
          inArray(interviewQuestions.id, input.ids),
        )
      );

    if (redis) {
      try {
        await redis.del(IQ_CACHE_KEY(session.orgId));
      } catch (e) {
        logger.error("interview-questions DELETE: cache invalidation failed", { error: e });
      }
    }

    return new NextResponse(null, { status: 204 });
  });
}
