

import { type NextRequest } from "next/server";
import Ably from "ably";
import { withAuth, ok, err, parseBody, toNumber } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import {
  chatMessages,
  chatAttachments,
  chatChannels,
  chatChannelMembers,
} from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { getMessages } from "@/server/queries/chat";
import { sendPushToChannelMembers } from "@/lib/web-push";
import { DOCUMENT_UPLOAD_MIME_TYPES, DOCUMENT_UPLOAD_MAX_BYTES } from "@/lib/validations/files";
import { z } from "zod";

const CHAT_ATTACHMENT_MIME_TYPES = [
  ...DOCUMENT_UPLOAD_MIME_TYPES,
  "image/gif",
  "image/webp",
] as const;

const sendMessageSchema = z.object({
  content: z.string().max(10000, "Message is too long").optional(),
  replyToId: z.number().optional(),
  attachments: z
    .array(
      z.object({
        fileName: z.string().max(255),
        fileUrl: z.string().max(2000),
        fileKey: z.string().max(1000),
        fileSize: z.number().int().positive().max(DOCUMENT_UPLOAD_MAX_BYTES, "Attachment is too large"),
        mimeType: z
          .string()
          .refine((m) => (CHAT_ATTACHMENT_MIME_TYPES as readonly string[]).includes(m), "Unsupported attachment type"),
      })
    )
    .max(10, "Too many attachments")
    .optional(),
});

async function assertMember(channelId: number, userId: string, orgId: string) {
  const channel = await db.query.chatChannels.findFirst({
    where: and(eq(chatChannels.id, channelId), eq(chatChannels.orgId, orgId)),
    columns: { id: true },
  });
  if (!channel) return false;
  const m = await db.query.chatChannelMembers.findFirst({
    where: and(
      eq(chatChannelMembers.channelId, channelId),
      eq(chatChannelMembers.userId, userId)
    ),
  });
  return !!m;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ channelId: string }> }
) {
  return withAuth(async (session) => {
    const { channelId: id } = await params;
    const channelId = Number(id);
    if (!Number.isFinite(channelId)) return err("Invalid channel id", 400);

    const isMember = await assertMember(channelId, session.user.id, session.orgId);
    if (!isMember) return err("You are not a member of this channel", 403);

    const { searchParams } = req.nextUrl;
    const cursor = toNumber(searchParams.get("cursor"));
    const limit = toNumber(searchParams.get("limit")) ?? 50;

    const result = await getMessages(channelId, cursor, limit);
    return ok(result);
  });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ channelId: string }> }
) {
  return withAuth(async (session) => {
    const { channelId: id } = await params;
    const channelId = Number(id);
    if (!Number.isFinite(channelId)) return err("Invalid channel id", 400);

    const isMember = await assertMember(channelId, session.user.id, session.orgId);
    if (!isMember) return err("You are not a member of this channel", 403);

    let body: z.infer<typeof sendMessageSchema>;
    try {
      body = await parseBody(req, sendMessageSchema);
    } catch {
      return err("Invalid request body", 400);
    }

    if (!body.content?.trim() && (!body.attachments || body.attachments.length === 0)) {
      return err("Message must have content or attachments", 400);
    }

    if (body.replyToId !== undefined) {
      const parent = await db.query.chatMessages.findFirst({
        where: and(
          eq(chatMessages.id, body.replyToId),
          eq(chatMessages.channelId, channelId),
          eq(chatMessages.isDeleted, false)
        ),
        columns: { id: true },
      });
      if (!parent) return err("Reply target not found in this channel", 400);
    }

    const message = await db.transaction(async (tx) => {
      const [inserted] = await tx
        .insert(chatMessages)
        .values({
          channelId,
          senderId: session.user.id,
          content: body.content?.trim() || null,
          replyToId: body.replyToId,
        })
        .returning();

      if (body.attachments && body.attachments.length > 0) {
        await tx.insert(chatAttachments).values(
          body.attachments.map((a) => ({
            messageId: inserted.id,
            fileName: a.fileName,
            fileUrl: a.fileUrl,
            fileKey: a.fileKey,
            fileSize: a.fileSize,
            mimeType: a.mimeType,
          }))
        );
      }

      await tx
        .update(chatChannels)
        .set({ lastMessageAt: new Date(), updatedAt: new Date() })
        .where(eq(chatChannels.id, channelId));

      return inserted;
    });

    if (process.env.ABLY_API_KEY) {
      try {
        const rest = new Ably.Rest(process.env.ABLY_API_KEY);
        const channelName = `chat:${session.orgId}:${channelId}`;

        rest.channels.get(channelName).publish("message", {
          id: message.id,
          channelId: message.channelId,
          senderId: message.senderId,
          senderName: session.user.name ?? null,
          content: message.content,
          createdAt: message.createdAt,
          replyToId: message.replyToId,
        }).catch(() => {});

        const inboxChannel = `chat:${session.orgId}:inbox`;
        rest.channels
          .get(inboxChannel)
          .publish("channel_message", {
            channelId: message.channelId,
            messageId: message.id,
            senderId: message.senderId,
          })
          .catch(() => {});
      } catch {

      }
    }

    sendPushToChannelMembers(channelId, session.user.id, {
      title: session.user.name ?? "New message",
      body: message.content?.slice(0, 80) ?? "Sent an attachment",
      url: `/chat?channel=${channelId}`,
    }).catch(() => {});

    return ok(message, 201);
  });
}
