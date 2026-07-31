import { withAuth, withAdmin, ok, err } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { feedbackRequests } from "@/lib/db/schema";
import { and, eq, or, desc } from "drizzle-orm";
import { z } from "zod";
import type { NextRequest } from "next/server";

const createSchema = z.object({
  subjectUserId: z.string().min(1),
  reviewerUserId: z.string().min(1),
  type: z.enum(["SELF", "PEER", "MANAGER", "SKIP_LEVEL"]),
  cycleId: z.number().int().positive().optional(),
});

export async function GET() {
  return withAuth(async (session) => {
    const data = await db
      .select()
      .from(feedbackRequests)
      .where(
        and(
          eq(feedbackRequests.orgId, session.orgId),
          or(
            eq(feedbackRequests.subjectUserId, session.user.id),
            eq(feedbackRequests.reviewerUserId, session.user.id)
          )
        )
      )
      .orderBy(desc(feedbackRequests.createdAt))
      .limit(100);

    return ok(data);
  });
}

export async function POST(req: NextRequest) {
  return withAdmin(async (session) => {
    const body = createSchema.parse(await req.json());

    if (body.subjectUserId === body.reviewerUserId && body.type !== "SELF") {
      return err("Subject and reviewer cannot be the same person for non-self feedback.", 400);
    }

    const [record] = await db
      .insert(feedbackRequests)
      .values({
        orgId: session.orgId,
        subjectUserId: body.subjectUserId,
        reviewerUserId: body.reviewerUserId,
        type: body.type,
        cycleId: body.cycleId ?? null,
      })
      .returning();

    return ok(record, 201);
  });
}
