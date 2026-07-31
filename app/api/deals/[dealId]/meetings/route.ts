import { withAuth, ok, err } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { dealMeetings, deals } from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { z } from "zod";
import type { NextRequest } from "next/server";

const createSchema = z.object({
  title: z.string().min(1).max(200),
  scheduledAt: z.string().datetime(),
  durationMinutes: z.number().int().min(5).max(480).optional().default(30),
  attendees: z.array(z.string()).optional().default([]),
  agenda: z.string().max(2000).optional(),
  notes: z.string().max(5000).optional(),
  actionItems: z.string().max(2000).optional(),
  recordingLink: z.string().url().optional().or(z.literal("")),
  status: z.enum(["scheduled", "completed", "cancelled"]).optional().default("scheduled"),
});

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ dealId: string }> }
) {
  return withAuth(async (session) => {
    const { dealId: dealIdStr } = await params;
    const dealId = Number(dealIdStr);
    if (!Number.isFinite(dealId) || dealId <= 0) return err("Invalid deal ID.", 400);

    const deal = await db.query.deals.findFirst({
      where: and(eq(deals.id, dealId), eq(deals.orgId, session.orgId)),
      columns: { id: true },
    });
    if (!deal) return err("Deal not found.", 404);

    const meetings = await db.query.dealMeetings.findMany({
      where: and(eq(dealMeetings.dealId, dealId), eq(dealMeetings.orgId, session.orgId)),
      with: { creator: { columns: { id: true, name: true } } },
      orderBy: [desc(dealMeetings.scheduledAt)],
    });

    return ok(meetings);
  });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ dealId: string }> }
) {
  return withAuth(async (session) => {
    const { dealId: dealIdStr } = await params;
    const dealId = Number(dealIdStr);
    if (!Number.isFinite(dealId) || dealId <= 0) return err("Invalid deal ID.", 400);

    const deal = await db.query.deals.findFirst({
      where: and(eq(deals.id, dealId), eq(deals.orgId, session.orgId)),
      columns: { id: true },
    });
    if (!deal) return err("Deal not found.", 404);

    const body = createSchema.parse(await req.json());

    const [meeting] = await db.insert(dealMeetings).values({
      orgId: session.orgId,
      dealId,
      title: body.title,
      scheduledAt: new Date(body.scheduledAt),
      durationMinutes: body.durationMinutes,
      attendees: body.attendees,
      agenda: body.agenda ?? null,
      notes: body.notes ?? null,
      actionItems: body.actionItems ?? null,
      recordingLink: body.recordingLink || null,
      status: body.status,
      createdBy: session.user.id,
    }).returning();

    return ok(meeting, 201);
  });
}
