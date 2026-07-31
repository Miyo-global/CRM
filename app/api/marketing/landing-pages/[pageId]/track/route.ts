import { type NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { landingPages, pageViews } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";

const trackSchema = z.object({
  referrer: z.string().optional(),
  country: z.string().optional(),
  city: z.string().optional(),
  deviceType: z.enum(["desktop", "mobile", "tablet"]).optional(),
  utmSource: z.string().optional(),
  utmMedium: z.string().optional(),
  utmCampaign: z.string().optional(),
  abVariant: z.string().optional(),
});

type Ctx = { params: Promise<{ pageId: string }> };


export async function POST(req: NextRequest, ctx: Ctx) {
  const { pageId: id } = await ctx.params;
  const pageId = Number(id);
  if (!Number.isFinite(pageId)) {
    return NextResponse.json({ error: "Invalid page id" }, { status: 400 });
  }

  const page = await db.query.landingPages.findFirst({
    where: eq(landingPages.id, pageId),
    columns: { id: true, orgId: true, isActive: true },
  });

  if (!page || !page.isActive) {
    return NextResponse.json({ error: "Page not found" }, { status: 404 });
  }

  let input: z.infer<typeof trackSchema> = {};
  try {
    const body = await req.json();
    const parsed = trackSchema.safeParse(body);
    if (parsed.success) input = parsed.data;
  } catch {
  }

  await db.insert(pageViews).values({
    pageId,
    orgId: page.orgId,
    referrer: input.referrer ?? null,
    country: input.country ?? null,
    city: input.city ?? null,
    deviceType: input.deviceType ?? null,
    utmSource: input.utmSource ?? null,
    utmMedium: input.utmMedium ?? null,
    utmCampaign: input.utmCampaign ?? null,
    abVariant: input.abVariant ?? null,
  });

  return NextResponse.json({ success: true });
}
