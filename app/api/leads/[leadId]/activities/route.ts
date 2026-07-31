import { type NextRequest } from "next/server";
import { withAuth, ok, err, parseBody } from "@/lib/api/helpers";
import { getLeadActivities } from "@/server/queries/leads";
import { db } from "@/lib/db";
import { leadActivities, leads } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";

const logSchema = z.object({
  type: z.enum(["call", "email", "whatsapp", "meeting", "site_visit"]),
  date: z.string().datetime(),
  duration: z.number().optional(),
  subject: z.string().optional(),
  location: z.string().optional(),
  locationLink: z.string().optional(),
  messageSummary: z.string().optional(),
  notes: z.string().optional(),
  outcome: z.string().optional(),
});

type Ctx = { params: Promise<{ leadId: string }> };

export async function GET(req: NextRequest, ctx: Ctx) {
  const { leadId: id } = await ctx.params;
  const leadId = Number(id);
  if (!Number.isFinite(leadId)) return err("Invalid lead id", 400);

  return withAuth(async (session) => {
    const limit = z.coerce.number().min(1).max(100).catch(20).parse(req.nextUrl.searchParams.get("limit") ?? "20");
    const activities = await getLeadActivities(session.orgId!, leadId, limit);
    return ok(activities);
  });
}

export async function POST(req: NextRequest, ctx: Ctx) {
  const { leadId: id } = await ctx.params;
  const leadId = Number(id);
  if (!Number.isFinite(leadId)) return err("Invalid lead id", 400);

  return withAuth(async (session) => {
    const input = await parseBody(req, logSchema);

    const activityDate = new Date(input.date);
    if (Number.isNaN(activityDate.getTime())) return err("Invalid activity date", 400);
    if (activityDate.getTime() > Date.now()) return err("Activity date cannot be in the future", 400);

    const lead = await db.query.leads.findFirst({
      where: and(eq(leads.id, leadId), eq(leads.orgId, session.orgId!)),
      columns: { id: true },
    });
    if (!lead) return err("Lead not found", 404);

    const [activity] = await db.insert(leadActivities).values({
      orgId: session.orgId!,
      leadId,
      type: input.type,
      date: activityDate,
      duration: input.duration,
      subject: input.subject,
      location: input.location,
      locationLink: input.locationLink,
      messageSummary: input.messageSummary,
      notes: input.notes,
      outcome: input.outcome,
      userId: session.user.id,
    }).returning();

    return ok(activity, 201);
  });
}
