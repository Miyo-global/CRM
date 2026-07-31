import { type NextRequest } from "next/server";
import { withAuth, ok, err, parseBody } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { chatUserPresence } from "@/lib/db/schema";
import { z } from "zod";

const statusSchema = z.object({
  status: z.enum(["ONLINE", "AWAY", "OFFLINE"]),
});

export async function PUT(req: NextRequest) {
  return withAuth(async (session) => {
    let body: z.infer<typeof statusSchema>;
    try {
      body = await parseBody(req, statusSchema);
    } catch {
      return err("Invalid request body", 400);
    }

    await db
      .insert(chatUserPresence)
      .values({
        userId: session.user.id,
        orgId: session.orgId,
        status: body.status,
        lastSeenAt: new Date(),
      })
      .onConflictDoUpdate({
        target: chatUserPresence.userId,
        set: { status: body.status, lastSeenAt: new Date() },
      });

    return ok({ ok: true });
  });
}
