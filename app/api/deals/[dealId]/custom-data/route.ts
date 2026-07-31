import { type NextRequest } from "next/server";
import { withAuth, ok, err } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { deals } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";

const patchSchema = z.object({
  customData: z
    .record(z.string().max(128), z.unknown())
    .refine((obj) => Object.keys(obj).length <= 100, {
      message: "customData exceeds maximum of 100 keys",
    })
    .refine((obj) => JSON.stringify(obj).length <= 64000, {
      message: "customData payload too large",
    }),
});

type Ctx = { params: Promise<{ dealId: string }> };

export async function PATCH(req: NextRequest, ctx: Ctx) {
  const { dealId: rawId } = await ctx.params;
  const dealId = Number(rawId);
  if (!Number.isFinite(dealId)) return err("Invalid deal id", 400);

  let data: z.infer<typeof patchSchema>;
  try {
    const body = await req.json();
    data = patchSchema.parse(body);
  } catch (e) {
    if (e instanceof z.ZodError) {
      return err(e.issues.map((i) => i.message).join("; "), 400);
    }
    return err("Invalid request body", 400);
  }

  return withAuth(async (session) => {
    const [existing] = await db
      .select({ id: deals.id })
      .from(deals)
      .where(and(eq(deals.id, dealId), eq(deals.orgId, session.orgId)))
      .limit(1);

    if (!existing) return err("Deal not found", 404);

    const [updated] = await db
      .update(deals)
      .set({ customData: data.customData, updatedAt: new Date() })
      .where(and(eq(deals.id, dealId), eq(deals.orgId, session.orgId)))
      .returning();

    if (!updated) return err("Deal not found", 404);

    return ok({ customData: updated.customData });
  });
}
