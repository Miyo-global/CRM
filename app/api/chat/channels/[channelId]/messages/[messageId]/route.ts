

import { type NextRequest } from "next/server";
import Ably from "ably";
import { withAuth, ok, err, parseBody } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { chatMessages, chatChannels } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";

function publishAbly(orgId: string, channelId: number, event: string, data: unknown) {
  if (!process.env.ABLY_API_KEY) return;
  try {
    const rest = new Ably.Rest(process.env.ABLY_API_KEY);
    rest.channels.get(`chat:${orgId}:${channelId}`).publish(event, data).catch(() => {});
  } catch { /* noop */ }
}

const editMessageSchema = z.object({
  content: z.string().min(1).max(10000),
});

const EDIT_WINDOW_MS =
  Number(process.env.CHAT_MESSAGE_EDIT_WINDOW_MS) ||
  Number(process.env.NEXT_PUBLIC_CHAT_MESSAGE_EDIT_WINDOW_MS) ||
  3_600_000;

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ channelId: string; messageId: string }> }
) {
  return withAuth(async (session) => {
    const { channelId, messageId } = await params;
    const channelIdNum = Number(channelId);
    const msgId = Number(messageId);
    if (!Number.isFinite(channelIdNum) || !Number.isFinite(msgId)) {
      return err("Invalid message id", 400);
    }

    let body: z.infer<typeof editMessageSchema>;
    try {
      body = await parseBody(req, editMessageSchema);
    } catch {
      return err("Invalid request body", 400);
    }

    const [existing] = await db
      .select({
        id: chatMessages.id,
        senderId: chatMessages.senderId,
        createdAt: chatMessages.createdAt,
      })
      .from(chatMessages)
      .where(
        and(
          eq(chatMessages.id, msgId),
          eq(chatMessages.channelId, channelIdNum)
        )
      )
      .limit(1);

    if (!existing) return err("Message not found", 404);
    if (existing.senderId !== session.user.id) {
      return err("You can only edit your own messages", 403);
    }

    const createdMs = existing.createdAt
      ? new Date(existing.createdAt).getTime()
      : 0;
    if (Date.now() - createdMs > EDIT_WINDOW_MS) {
      return err("Edit window has expired for this message", 400);
    }

    const newContent = body.content.trim();
    await db
      .update(chatMessages)
      .set({ content: newContent, isEdited: true, updatedAt: new Date() })
      .where(
        and(
          eq(chatMessages.id, msgId),
          eq(chatMessages.channelId, channelIdNum),
          eq(chatMessages.senderId, session.user.id)
        )
      );

    publishAbly(session.orgId, channelIdNum, "message-edited", { messageId: msgId, content: newContent });

    return ok({ ok: true });
  });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ channelId: string; messageId: string }> }
) {
  return withAuth(async (session) => {
    const { channelId, messageId } = await params;
    const channelIdNum = Number(channelId);
    const msgId = Number(messageId);
    if (!Number.isFinite(channelIdNum) || !Number.isFinite(msgId)) {
      return err("Invalid message id", 400);
    }

    const channel = await db.query.chatChannels.findFirst({
      where: and(
        eq(chatChannels.id, channelIdNum),
        eq(chatChannels.orgId, session.orgId)
      ),
      columns: { id: true },
    });
    if (!channel) return err("Channel not found", 404);

    const role = session.user.role;
    const isAdmin = role === "CEO" || role === "HR" || role === "ADMIN";

    const conditions = [
      eq(chatMessages.id, msgId),
      eq(chatMessages.channelId, channelIdNum),
    ];
    if (!isAdmin) {
      conditions.push(eq(chatMessages.senderId, session.user.id));
    }

    await db
      .update(chatMessages)
      .set({ isDeleted: true, content: null, updatedAt: new Date() })
      .where(and(...conditions));

    publishAbly(session.orgId, channelIdNum, "message-deleted", { messageId: msgId, channelId: channelIdNum });

    return ok({ ok: true });
  });
}
