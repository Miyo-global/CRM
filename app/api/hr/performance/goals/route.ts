import { withAuth, ok, err, parseBody } from "@/lib/api/helpers";
import { getGoals } from "@/server/queries/hr";
import { db } from "@/lib/db";
import { goals, organizationMembers } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { isAdminOrOwner } from "@/lib/auth/helpers";
import { formatDateOnly } from "@/lib/date-utils";
import { z } from "zod";
import type { NextRequest } from "next/server";

const createGoalSchema = z
  .object({
    userId: z.string().min(1),
    title: z.string().min(1).max(120),
    description: z.string().max(2000).optional(),
    type: z.string().optional(),
    targetValue: z.number().min(0).max(9_999_999_999, "Target value can have at most 10 digits").optional(),
    currentValue: z.number().min(0),
    unit: z.string().optional(),
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    parentGoalId: z.number().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.endDate < data.startDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "endDate must be on or after startDate.",
        path: ["endDate"],
      });
    }
  });

const updateGoalSchema = z.object({
  goalId: z.number(),
  title: z.string().optional(),
  description: z.string().optional(),
  targetValue: z.number().optional(),
  currentValue: z.number().optional(),
  status: z.enum(["IN_PROGRESS", "COMPLETED", "CANCELLED"]).optional(),
  progress: z.number().min(0).max(100).optional(),
});

export async function GET(req: NextRequest) {
  return withAuth(async (session) => {
    const { searchParams } = req.nextUrl;
    const isAdmin = isAdminOrOwner(session.user.role);
    const filterUserId = searchParams.get("userId") ?? undefined;

    if (filterUserId && filterUserId !== session.user.id && !isAdmin) {
      return err("Not authorized.", 403);
    }

    const data = await getGoals(
      session.orgId,
      session.user.id,
      isAdmin,
      filterUserId
    );
    return ok(data);
  });
}

export async function POST(req: NextRequest) {
  return withAuth(async (session) => {
    if (!isAdminOrOwner(session.user.role)) {
      return err("Only admins can create goals.", 403);
    }

    const body = await parseBody(req, createGoalSchema);

    if (!body.userId || !body.title || !body.startDate || !body.endDate) {
      return err("userId, title, startDate, and endDate are required.", 400);
    }

    const membership = await db.query.organizationMembers.findFirst({
      where: and(
        eq(organizationMembers.userId, body.userId),
        eq(organizationMembers.orgId, session.orgId)
      ),
    });
    if (!membership) return err("Employee not found.", 404);

    const [goal] = await db
      .insert(goals)
      .values({
        orgId: session.orgId,
        userId: body.userId,
        title: body.title,
        description: body.description,
        type: body.type,
        targetValue: body.targetValue?.toString(),
        currentValue: (body.currentValue ?? 0).toString(),
        unit: body.unit,
        startDate: formatDateOnly(new Date(body.startDate)),
        endDate: formatDateOnly(new Date(body.endDate)),
        status: "IN_PROGRESS",
        progress: 0,
        parentGoalId: body.parentGoalId,
      })
      .returning();

    return ok(goal, 201);
  });
}

export async function PATCH(req: NextRequest) {
  return withAuth(async (session) => {
    if (!isAdminOrOwner(session.user.role)) {
      return err("Only admins can update goals.", 403);
    }

    const body = await parseBody(req, updateGoalSchema);

    if (!body.goalId) return err("goalId is required.", 400);

    await db
      .update(goals)
      .set({
        ...(body.title !== undefined && { title: body.title }),
        ...(body.description !== undefined && { description: body.description }),
        ...(body.targetValue !== undefined && {
          targetValue: body.targetValue.toString(),
        }),
        ...(body.currentValue !== undefined && {
          currentValue: body.currentValue.toString(),
        }),
        ...(body.status !== undefined && { status: body.status }),
        ...(body.progress !== undefined && { progress: body.progress }),
        updatedAt: new Date(),
      })
      .where(
        and(eq(goals.id, body.goalId), eq(goals.orgId, session.orgId))
      );

    return ok({ success: true });
  });
}
