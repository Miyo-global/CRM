import { type NextRequest } from "next/server";
import { withAuth, ok, err } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { chatChannelMembers, chatChannels } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import Ably from "ably";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ channelId: string; userId: string }> }
) {
  return withAuth(async (session) => {
    const { channelId: cid, userId: targetUserId } = await params;
    const channelId = Number(cid);
    if (!Number.isFinite(channelId)) return err("Invalid channel id", 400);
    if (!targetUserId) return err("Invalid user id", 400);

    const channel = await db.query.chatChannels.findFirst({
      where: eq(chatChannels.id, channelId),
    });
    if (!channel) return err("Channel not found", 404);
    if (channel.orgId !== session.orgId) return err("Forbidden", 403);
    if (channel.type === "DIRECT") {
      return err("Cannot modify members of a direct message", 400);
    }

    const requester = await db.query.chatChannelMembers.findFirst({
      where: and(
        eq(chatChannelMembers.channelId, channelId),
        eq(chatChannelMembers.userId, session.user.id)
      ),
    });
    if (!requester) return err("You are not a member of this channel", 403);

    const isSelfLeave = targetUserId === session.user.id;
    if (!isSelfLeave && requester.role !== "ADMIN") {
      return err("Only channel admins can remove members", 403);
    }

    const target = await db.query.chatChannelMembers.findFirst({
      where: and(
        eq(chatChannelMembers.channelId, channelId),
        eq(chatChannelMembers.userId, targetUserId)
      ),
    });
    if (!target) return err("User is not a member of this channel", 404);

    try {
      await db.transaction(async (tx) => {
        if (target.role === "ADMIN") {
          const admins = await tx.query.chatChannelMembers.findMany({
            where: and(
              eq(chatChannelMembers.channelId, channelId),
              eq(chatChannelMembers.role, "ADMIN")
            ),
            columns: { id: true },
          });
          if (admins.length <= 1) {
            throw Object.assign(new Error("LAST_ADMIN"), {
              isSelfLeave,
              statusCode: 400,
            });
          }
        }

        await tx
          .delete(chatChannelMembers)
          .where(
            and(
              eq(chatChannelMembers.channelId, channelId),
              eq(chatChannelMembers.userId, targetUserId)
            )
          );
      });
    } catch (e) {
      const typed = e as { statusCode?: number; isSelfLeave?: boolean };
      if (typed.statusCode === 400) {
        return err(
          typed.isSelfLeave
            ? "You are the only admin of this group. Promote another member to admin before leaving."
            : "Cannot remove the last admin of the channel",
          400
        );
      }
      throw e;
    }

    if (process.env.ABLY_API_KEY) {
      try {
        const rest = new Ably.Rest(process.env.ABLY_API_KEY);
        const channelName = `chat:${session.orgId}:${channelId}`;
        rest.channels
          .get(channelName)
          .publish("member_removed", {
            userId: targetUserId,
            removedBy: session.user.id,
          })
          .catch(() => {});
      } catch {
        // ignore ably errors
      }
    }

    return ok({ removed: true });
  });
}
