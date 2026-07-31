import { type NextRequest } from "next/server";
import { withAuth, ok, parseBody, parseQuery } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { emailCampaigns } from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { z } from "zod";

const listSchema = z.object({
  status: z.enum(["draft", "scheduled", "sending", "sent"]).optional(),
  limit: z.coerce.number().min(1).max(50).optional(),
});

const createSchema = z.object({
  name: z.string().min(1, "Campaign name is required"),
  subject: z.string().min(1, "Subject is required"),
  body: z.string().min(1, "Body is required"),
  templateId: z.number().optional(),
  recipientFilter: z.object({
    status: z.string().optional(),
    source: z.string().optional(),
    priority: z.string().optional(),
    tags: z.array(z.string()).optional(),
  }).optional(),
  scheduledAt: z.string().optional(),
});

export async function GET(req: NextRequest) {
  return withAuth(async (session) => {
    const { status, limit } = parseQuery(req, listSchema);
    const conditions = [eq(emailCampaigns.orgId, session.orgId)];
    if (status) conditions.push(eq(emailCampaigns.status, status));

    const campaigns = await db
      .select()
      .from(emailCampaigns)
      .where(and(...conditions))
      .orderBy(desc(emailCampaigns.createdAt))
      .limit(limit ?? 25);

    return ok(campaigns);
  });
}

export async function POST(req: NextRequest) {
  return withAuth(async (session) => {
    const input = await parseBody(req, createSchema);

    const [campaign] = await db.insert(emailCampaigns).values({
      orgId: session.orgId,
      name: input.name,
      subject: input.subject,
      body: input.body,
      templateId: input.templateId ?? null,
      recipientFilter: input.recipientFilter ?? null,
      scheduledAt: input.scheduledAt ? new Date(input.scheduledAt) : null,
      createdBy: session.user.id,
    }).returning();

    return ok(campaign, 201);
  });
}
