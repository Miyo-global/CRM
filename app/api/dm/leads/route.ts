import { type NextRequest } from "next/server";
import { withAuth, ok, err, toNumber } from "@/lib/api/helpers";
import { getDmLeads } from "@/server/queries/dm";
import { db } from "@/lib/db";
import { dmLeads, crmCampaigns } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

const createSchema = z.object({
  name: z.string().min(1),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  whatsappNumber: z.string().optional(),
  sourcePlatform: z.string(),
  campaignId: z.number().optional(),
  campaignType: z.string().optional(),
  leadQuality: z.string().default("warm"),
  notes: z.string().optional(),
  landingPageUrl: z.string().optional(),
});

export async function GET(req: NextRequest) {
  return withAuth(async (session) => {
    try {
      const params = req.nextUrl.searchParams;
      const status = params.get("status") as
        | "pending_review"
        | "verified"
        | "sent_to_hr"
        | "imported_to_pipeline"
        | null;
      const platform = params.get("platform") ?? undefined;
      const search = params.get("search") ?? undefined;
      const page = toNumber(params.get("page")) ?? 1;
      const limit = toNumber(params.get("limit")) ?? 25;

      const data = await getDmLeads(session.orgId, {
        status: status ?? undefined,
        platform,
        search,
        page,
        limit,
      });
      return ok(data);
    } catch {
      return err("Failed to load DM leads", 500);
    }
  });
}

export async function POST(req: NextRequest) {
  return withAuth(async (session) => {
    try {
      const body = await req.json();
      const input = createSchema.parse(body);

      if (input.campaignId !== undefined) {
        const campaign = await db.query.crmCampaigns.findFirst({
          where: and(
            eq(crmCampaigns.id, input.campaignId),
            eq(crmCampaigns.orgId, session.orgId)
          ),
          columns: { id: true },
        });
        if (!campaign) {
          return err("Campaign not found", 404);
        }
      }

      const [lead] = await db
        .insert(dmLeads)
        .values({
          orgId: session.orgId,
          name: input.name,
          phone: input.phone,
          email: input.email,
          whatsappNumber: input.whatsappNumber,
          sourcePlatform: input.sourcePlatform,
          campaignId: input.campaignId,
          campaignType: input.campaignType,
          leadQuality: input.leadQuality,
          notes: input.notes,
          landingPageUrl: input.landingPageUrl,
          createdBy: session.user.id,
        })
        .returning();

      return ok(lead, 201);
    } catch {
      return err("Failed to create DM lead", 500);
    }
  });
}
