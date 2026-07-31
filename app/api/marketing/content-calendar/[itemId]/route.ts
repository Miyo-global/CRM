import { withAuth, ok, err } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { contentCalendarItems } from "@/lib/db/schema/marketing";
import { eq, and } from "drizzle-orm";
import { NextRequest } from "next/server";
import { z } from "zod";

const updateSchema = z.object({
  title: z.string().min(1).optional(),
  contentType: z.enum(["blog", "email", "social", "video", "webinar", "whitepaper"]).optional(),
  channel: z.string().optional().nullable(),
  status: z.enum(["idea", "in_progress", "review", "scheduled", "published", "cancelled"]).optional(),
  scheduledDate: z.string().optional().nullable(),
  publishedDate: z.string().optional().nullable(),
  assignedTo: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  tags: z.array(z.string()).optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ itemId: string }> }
) {
  const { itemId } = await params;
  const id = Number(itemId);
  return withAuth(async (session) => {
    if (!Number.isFinite(id)) return err("Invalid id", 400);
    const body = await req.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return err(parsed.error.issues[0]?.message ?? "Validation failed");
    }

    const [existing] = await db
      .select()
      .from(contentCalendarItems)
      .where(and(eq(contentCalendarItems.id, id), eq(contentCalendarItems.orgId, session.orgId)));

    if (!existing) return err("Item not found", 404);

    const [updated] = await db
      .update(contentCalendarItems)
      .set({ ...parsed.data, updatedAt: new Date() })
      .where(eq(contentCalendarItems.id, id))
      .returning();

    return ok(updated);
  });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ itemId: string }> }
) {
  const { itemId } = await params;
  const id = Number(itemId);
  return withAuth(async (session) => {
    if (!Number.isFinite(id)) return err("Invalid id", 400);
    const [existing] = await db
      .select()
      .from(contentCalendarItems)
      .where(and(eq(contentCalendarItems.id, id), eq(contentCalendarItems.orgId, session.orgId)));

    if (!existing) return err("Item not found", 404);

    await db.delete(contentCalendarItems).where(eq(contentCalendarItems.id, id));
    return ok({ success: true });
  });
}
