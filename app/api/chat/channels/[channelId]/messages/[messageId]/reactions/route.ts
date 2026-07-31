import { type NextRequest } from "next/server";
import Ably from "ably";
import { withAuth, ok, err, parseBody } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { chatMessages, chatChannelMembers } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";

const reactionSchema = z.object({
  emoji: z.string().min(1).max(4),
});

type Ctx = { params: Promise<{ channelId: string; messageId: string }> };

export async function POST(req: NextRequest, ctx: Ctx) {
  return withAuth(async (session) => {
    const { channelId: chId, messageId: msgId } = await ctx.params;
    const channelId = Number(chId);
    const messageId = Number(msgId);

    if (!Number.isFinite(channelId)) return err("Invalid channel id", 400);
    if (!Number.isFinite(messageId)) return err("Invalid message id", 400);

    const membership = await db.query.chatChannelMembers.findFirst({
      where: and(
        eq(chatChannelMembers.channelId, channelId),
        eq(chatChannelMembers.userId, session.user.id)
      ),
    });
    if (!membership) return err("You are not a member of this channel", 403);

    let body: z.infer<typeof reactionSchema>;
    try {
      body = await parseBody(req, reactionSchema);
    } catch {
      return err("Invalid request body", 400);
    }

    const { emoji } = body;
    const userId = session.user.id;

    const result = await db.transaction(async (tx) => {
      const [message] = await tx
        .select({ id: chatMessages.id, reactions: chatMessages.reactions })
        .from(chatMessages)
        .where(
          and(
            eq(chatMessages.id, messageId),
            eq(chatMessages.channelId, channelId),
            eq(chatMessages.isDeleted, false)
          )
        )
        .for("update")
        .limit(1);

      if (!message) return null;

      const current: Record<string, string[]> = (message.reactions ?? {}) as Record<string, string[]>;

      const withUserRemoved: Record<string, string[]> = {};
      for (const [e, ids] of Object.entries(current)) {
        const filtered = ids.filter((id) => id !== userId);
        if (filtered.length > 0) {
          withUserRemoved[e] = filtered;
        }
      }

      const alreadyReactedWithThis = (current[emoji] ?? []).includes(userId);

      let next: Record<string, string[]>;
      if (alreadyReactedWithThis) {
        next = withUserRemoved;
      } else {
        const existing = withUserRemoved[emoji] ?? [];
        next = { ...withUserRemoved, [emoji]: [...existing, userId] };
      }

      await tx
        .update(chatMessages)
        .set({ reactions: next, updatedAt: new Date() })
        .where(eq(chatMessages.id, messageId));

      return next;
    });

    if (!result) return err("Message not found", 404);
    const updated = result;

    if (process.env.ABLY_API_KEY) {
      try {
        const rest = new Ably.Rest(process.env.ABLY_API_KEY);
        const channelName = `chat:${session.orgId}:${channelId}`;
        rest.channels
          .get(channelName)
          .publish("reaction-updated", {
            channelId,
            messageId,
            reactions: updated,
          })
          .catch(() => {});
      } catch {
      }
    }

    return ok({ reactions: updated });
  });
}
