import { type NextRequest } from "next/server";
import { withAuth, ok, parseBody, parseQuery } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { crmCampaigns } from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { z } from "zod";

const listSchema = z.object({
  status: z.enum(["active", "paused", "completed"]).optional(),
  limit: z.coerce.number().min(1).max(50).optional(),
  offset: z.coerce.number().min(0).optional(),
});

const createSchema = z.object({
  name: z.string().min(1, "Campaign name is required").max(200),
  status: z.enum(["active", "paused", "completed"]).default("active"),
  channel: z.string().optional(),
  description: z.string().optional(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}/, "Invalid date").optional(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}/, "Invalid date").optional(),
  targetAudience: z.string().optional(),
  budgetAllocated: z
    .string()
    .regex(/^\d+(\.\d{1,2})?$/, "Must be a non-negative amount with up to 2 decimals")
    .refine((v) => Number.isFinite(Number(v)) && Number(v) >= 0 && Number(v) <= 1_000_000_000, "Amount out of range")
    .optional(),
}).refine(
  (v) => !v.startDate || !v.endDate || new Date(v.endDate) >= new Date(v.startDate),
  { message: "endDate must be on or after startDate", path: ["endDate"] },
);

export async function GET(req: NextRequest) {
  return withAuth(async (session) => {
    const { status, limit, offset } = parseQuery(req, listSchema);

    const conditions = [eq(crmCampaigns.orgId, session.orgId)];
    if (status) conditions.push(eq(crmCampaigns.status, status));

    const campaigns = await db
      .select()
      .from(crmCampaigns)
      .where(and(...conditions))
      .orderBy(desc(crmCampaigns.createdAt))
      .limit(limit ?? 25)
      .offset(offset ?? 0);

    return ok(campaigns);
  });
}

export async function POST(req: NextRequest) {
  return withAuth(async (session) => {
    const input = await parseBody(req, createSchema);

    const [campaign] = await db
      .insert(crmCampaigns)
      .values({
        orgId: session.orgId,
        name: input.name,
        status: input.status,
        channel: input.channel ?? null,
        description: input.description ?? null,
        startDate: input.startDate ?? null,
        endDate: input.endDate ?? null,
        targetAudience: input.targetAudience ?? null,
        budgetAllocated: input.budgetAllocated ?? null,
        ownerId: session.user.id,
      })
      .returning();

    return ok(campaign, 201);
  });
}
