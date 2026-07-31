

import { type NextRequest } from "next/server";
import { withAuth, ok, err } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { chatChannelMembers } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ channelId: string }> }
) {
  return withAuth(async (session) => {
    const { channelId: id } = await params;
    const channelId = Number(id);
    if (!Number.isFinite(channelId)) return err("Invalid channel id", 400);

    const member = await db.query.chatChannelMembers.findFirst({
      where: and(
        eq(chatChannelMembers.channelId, channelId),
        eq(chatChannelMembers.userId, session.user.id)
      ),
    });
    if (!member) return err("Channel not found", 404);

    await db
      .update(chatChannelMembers)
      .set({ lastReadAt: new Date() })
      .where(
        and(
          eq(chatChannelMembers.channelId, channelId),
          eq(chatChannelMembers.userId, session.user.id)
        )
      );

    return ok({ ok: true });
  });
}
