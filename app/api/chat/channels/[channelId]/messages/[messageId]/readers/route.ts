import { type NextRequest } from "next/server";
import { withAuth, ok, err } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { chatChannelMembers, chatChannels, chatMessages, users } from "@/lib/db/schema";
import { and, eq, gte, ne } from "drizzle-orm";
import { assertChannelMember } from "@/server/queries/chat";

export async function GET(
  _req: NextRequest,
  {
    params,
  }: { params: Promise<{ channelId: string; messageId: string }> }
) {
  return withAuth(async (session) => {
    const { channelId: chId, messageId: mid } = await params;
    const channelId = Number(chId);
    const messageId = Number(mid);
    if (!Number.isFinite(channelId) || !Number.isFinite(messageId)) {
      return err("Invalid id", 400);
    }

    const channel = await db.query.chatChannels.findFirst({
      where: eq(chatChannels.id, channelId),
      columns: { id: true, orgId: true },
    });
    if (!channel) return err("Channel not found", 404);
    if (channel.orgId !== session.orgId) return err("Forbidden", 403);

    try {
      await assertChannelMember(channelId, session.user.id);
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code === "FORBIDDEN") {
        return err("You are not a member of this channel", 403);
      }
      throw e;
    }

    const message = await db.query.chatMessages.findFirst({
      where: and(
        eq(chatMessages.id, messageId),
        eq(chatMessages.channelId, channelId)
      ),
      columns: { id: true, senderId: true, createdAt: true },
    });
    if (!message?.createdAt) return err("Message not found", 404);

    const rows = await db
      .select({ name: users.name, userId: chatChannelMembers.userId })
      .from(chatChannelMembers)
      .innerJoin(users, eq(users.id, chatChannelMembers.userId))
      .where(
        and(
          eq(chatChannelMembers.channelId, channelId),
          ne(chatChannelMembers.userId, message.senderId),
          gte(chatChannelMembers.lastReadAt, message.createdAt)
        )
      );

    const names = rows
      .map((r) => r.name?.trim() || "Member")
      .filter((n, i, a) => a.indexOf(n) === i);

    return ok({ readerNames: names, readerCount: rows.length });
  });
}
