import { withAuth, ok, err } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { feedbackRequests } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import type { NextRequest } from "next/server";

const ratingSchema = z.object({
  category: z.string().min(1),
  score: z.number().min(1).max(5),
  comment: z.string().optional(),
});

const patchSchema = z.object({
  ratings: z.array(ratingSchema).min(1),
  strengths: z.string().optional(),
  improvements: z.string().optional(),
  overallRating: z.number().int().min(1).max(5).optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ feedbackId: string }> }
) {
  return withAuth(async (session) => {
    const { feedbackId: id } = await params;
    const feedbackId = Number(id);
    if (isNaN(feedbackId)) return err("Invalid feedback ID.", 400);

    const body = patchSchema.parse(await req.json());

    const [existing] = await db
      .select()
      .from(feedbackRequests)
      .where(
        and(
          eq(feedbackRequests.id, feedbackId),
          eq(feedbackRequests.reviewerUserId, session.user.id)
        )
      );

    if (!existing) return err("Feedback request not found.", 404);
    if (existing.isCompleted) return err("Feedback already submitted.", 400);

    const [updated] = await db
      .update(feedbackRequests)
      .set({
        ratings: body.ratings,
        strengths: body.strengths ?? null,
        improvements: body.improvements ?? null,
        overallRating: body.overallRating ?? null,
        isCompleted: true,
        completedAt: new Date(),
      })
      .where(eq(feedbackRequests.id, feedbackId))
      .returning();

    return ok(updated);
  });
}
