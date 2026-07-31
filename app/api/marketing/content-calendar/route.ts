import { withAuth, ok, err } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { contentCalendarItems } from "@/lib/db/schema/marketing";
import { organizationMembers } from "@/lib/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { NextRequest } from "next/server";
import { z } from "zod";

const createSchema = z.object({
  title: z.string().min(1, "Title is required"),
  contentType: z.enum(["blog", "email", "social", "video", "webinar", "whitepaper"]).default("blog"),
  channel: z.string().optional().nullable(),
  status: z.enum(["idea", "in_progress", "review", "scheduled", "published", "cancelled"]).default("idea"),
  scheduledDate: z.string().optional().nullable(),
  assignedTo: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  tags: z.array(z.string()).optional().default([]),
});

export async function GET(req: NextRequest) {
  return withAuth(async (session) => {
    const { searchParams } = new URL(req.url);
    const month = searchParams.get("month");

    const limitParam = Number(searchParams.get("limit"));
    const limit = Number.isFinite(limitParam) && limitParam > 0 ? Math.min(limitParam, 200) : 100;
    const pageParam = Number(searchParams.get("page"));
    const page = Number.isFinite(pageParam) && pageParam > 0 ? Math.floor(pageParam) : 1;
    const offset = (page - 1) * limit;

    let query = db
      .select()
      .from(contentCalendarItems)
      .where(eq(contentCalendarItems.orgId, session.orgId))
      .$dynamic();

    if (month) {
      query = query.where(
        and(
          eq(contentCalendarItems.orgId, session.orgId),
          sql`to_char(${contentCalendarItems.scheduledDate}, 'YYYY-MM') = ${month}`
        )
      );
    }

    const rows = await query
      .orderBy(contentCalendarItems.scheduledDate)
      .limit(limit)
      .offset(offset);
    return ok(rows);
  });
}

export async function POST(req: NextRequest) {
  return withAuth(async (session) => {
    const body = await req.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return err(parsed.error.issues[0]?.message ?? "Validation failed");
    }

    const { title, contentType, channel, status, scheduledDate, assignedTo, description, tags } = parsed.data;

    if (assignedTo) {
      const [member] = await db
        .select({ userId: organizationMembers.userId })
        .from(organizationMembers)
        .where(
          and(
            eq(organizationMembers.orgId, session.orgId),
            eq(organizationMembers.userId, assignedTo),
          ),
        );
      if (!member) {
        return err("Assigned user does not belong to this organization", 400);
      }
    }

    const [created] = await db
      .insert(contentCalendarItems)
      .values({
        orgId: session.orgId,
        title,
        contentType,
        channel: channel ?? null,
        status,
        scheduledDate: scheduledDate ?? null,
        assignedTo: assignedTo ?? null,
        description: description ?? null,
        tags: tags ?? [],
        createdBy: session.user.id,
      })
      .returning();

    return ok(created, 201);
  });
}
