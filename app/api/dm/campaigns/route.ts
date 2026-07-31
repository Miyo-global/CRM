import { type NextRequest } from "next/server";
import { withAuth, ok, err, toNumber } from "@/lib/api/helpers";
import { getDmCampaigns } from "@/server/queries/dm";
import { db } from "@/lib/db";
import { crmCampaigns } from "@/lib/db/schema";
import { z } from "zod";

const budgetField = z
  .string()
  .regex(/^\d+(\.\d{1,2})?$/, "Must be a non-negative amount with up to 2 decimals")
  .refine((v) => Number.isFinite(Number(v)) && Number(v) >= 0 && Number(v) <= 1_000_000_000, "Amount out of range")
  .optional();

const createSchema = z
  .object({
    name: z.string().min(1),
    status: z.enum(["active", "paused", "completed"]).default("active"),
    budgetAllocated: budgetField,
    budgetSpent: budgetField,
  })
  .superRefine((data, ctx) => {
    if (data.budgetAllocated !== undefined && data.budgetSpent !== undefined) {
      if (Number(data.budgetSpent) > Number(data.budgetAllocated)) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Budget spent cannot exceed allocated", path: ["budgetSpent"] });
      }
    }
  });

export async function GET(req: NextRequest) {
  return withAuth(async (session) => {
    try {
      const params = req.nextUrl.searchParams;
      const status = params.get("status") ?? undefined;
      const page = toNumber(params.get("page")) ?? 1;
      const limit = toNumber(params.get("limit")) ?? 25;

      const data = await getDmCampaigns(session.orgId, {
        status,
        page,
        limit,
      });
      return ok(data);
    } catch (error) {
      return err(
        error instanceof Error ? error.message : "Failed to load DM campaigns",
        500
      );
    }
  });
}

export async function POST(req: NextRequest) {
  return withAuth(async (session) => {
    try {
      const body = await req.json();
      const input = createSchema.parse(body);

      const [campaign] = await db
        .insert(crmCampaigns)
        .values({
          orgId: session.orgId,
          ...input,
        })
        .returning();

      return ok(campaign, 201);
    } catch (error) {
      return err(
        error instanceof Error ? error.message : "Failed to create DM campaign",
        500
      );
    }
  });
}
