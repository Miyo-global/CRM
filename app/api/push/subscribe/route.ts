import { type NextRequest } from "next/server";
import { withAuth, ok, err, parseBody } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { pushSubscriptions } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

const subscribeSchema = z.object({
  endpoint: z.string().url(),
  p256dh: z.string(),
  auth: z.string(),
  userAgent: z.string().optional(),
});

export async function POST(req: NextRequest) {
  return withAuth(async (session) => {
    const body = await parseBody(req, subscribeSchema);
    await db
      .insert(pushSubscriptions)
      .values({ userId: session.user.id, orgId: session.orgId, ...body })
      .onConflictDoUpdate({
        target: pushSubscriptions.endpoint,
        set: {
          userId: session.user.id,
          orgId: session.orgId,
          p256dh: body.p256dh,
          auth: body.auth,
        },
      });
    return ok({ success: true });
  });
}

export async function DELETE(req: NextRequest) {
  return withAuth(async (session) => {
    const { searchParams } = req.nextUrl;
    const endpoint = searchParams.get("endpoint");
    if (!endpoint) return err("Missing endpoint", 400);
    await db
      .delete(pushSubscriptions)
      .where(
        and(
          eq(pushSubscriptions.endpoint, endpoint),
          eq(pushSubscriptions.userId, session.user.id)
        )
      );
    return ok({ success: true });
  });
}
