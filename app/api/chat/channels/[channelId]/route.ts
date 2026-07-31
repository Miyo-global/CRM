import { type NextRequest } from "next/server";
import { withAuth, ok, err, parseBody } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import {
  chatChannels,
  chatChannelMembers,
  chatMessages,
} from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { addDays } from "date-fns";
import { getChannel } from "@/server/queries/chat";
import { z } from "zod";
import Ably from "ably";

const updateChannelSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  avatarUrl: z.string().optional(),
  pinForDays: z.union([z.literal(1), z.literal(7), z.literal(14), z.literal(30)]).optional(),
  unpin: z.boolean().optional(),
});

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ channelId: string }> }
) {
  return withAuth(async (session) => {
    const { channelId: id } = await params;
    const channelId = Number(id);
    if (!Number.isFinite(channelId)) return err("Invalid channel id", 400);

    try {
      const channel = await getChannel(channelId, session.user.id);
      if (!channel) return err("Channel not found", 404);
      return ok(channel);
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code === "FORBIDDEN") {
        return err("You are not a member of this channel", 403);
      }
      throw e;
    }
  });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ channelId: string }> }
) {
  return withAuth(async (session) => {
    const { channelId: id } = await params;
    const channelId = Number(id);
    if (!Number.isFinite(channelId)) return err("Invalid channel id", 400);

    const channel = await db.query.chatChannels.findFirst({
      where: eq(chatChannels.id, channelId),
    });
    if (!channel) return err("Channel not found", 404);
    if (channel.orgId !== session.orgId) return err("Forbidden", 403);

    const membership = await db.query.chatChannelMembers.findFirst({
      where: and(
        eq(chatChannelMembers.channelId, channelId),
        eq(chatChannelMembers.userId, session.user.id)
      ),
    });

    if (!membership) return err("You are not a member of this channel", 403);
    if (membership.role !== "ADMIN") {
      return err("Only channel admins can update channel details", 403);
    }

    let body: z.infer<typeof updateChannelSchema>;
    try {
      body = await parseBody(req, updateChannelSchema);
    } catch {
      return err("Invalid request body", 400);
    }

    const updateData: Record<string, unknown> = { updatedAt: new Date() };
    if (body.name !== undefined) updateData.name = body.name;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.avatarUrl !== undefined) updateData.avatarUrl = body.avatarUrl;

    if (body.unpin) {
      updateData.isPinned = false;
      updateData.pinnedAt = null;
      updateData.pinnedUntil = null;
    } else if (body.pinForDays !== undefined) {
      const now = new Date();
      updateData.isPinned = true;
      updateData.pinnedAt = now;
      updateData.pinnedUntil = addDays(now, body.pinForDays);
    }

    await db
      .update(chatChannels)
      .set(updateData)
      .where(eq(chatChannels.id, channelId));

    return ok({ ok: true });
  });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ channelId: string }> }
) {
  return withAuth(async (session) => {
    const { channelId: id } = await params;
    const channelId = Number(id);
    if (!Number.isFinite(channelId)) return err("Invalid channel id", 400);

    const mode = req.nextUrl.searchParams.get("mode");

    const channel = await db.query.chatChannels.findFirst({
      where: eq(chatChannels.id, channelId),
    });
    if (!channel) return err("Channel not found", 404);
    if (channel.orgId !== session.orgId) return err("Forbidden", 403);

    const membership = await db.query.chatChannelMembers.findFirst({
      where: and(
        eq(chatChannelMembers.channelId, channelId),
        eq(chatChannelMembers.userId, session.user.id)
      ),
    });
    if (!membership) return err("You are not a member of this channel", 403);

    if (mode === "delete") {
      if (channel.type === "DIRECT") {
        return err("Cannot hard-delete a direct conversation", 400);
      }
      if (membership.role !== "ADMIN") {
        return err("Only channel admins can delete the group", 403);
      }

      await db.delete(chatChannels).where(eq(chatChannels.id, channelId));

      if (process.env.ABLY_API_KEY) {
        try {
          const rest = new Ably.Rest(process.env.ABLY_API_KEY);
          const channelName = `chat:${session.orgId}:${channelId}`;
          rest.channels
            .get(channelName)
            .publish("channel_deleted", { channelId, deletedBy: session.user.id })
            .catch(() => {});
        } catch {
          // ignore ably errors
        }
      }

      return ok({ deleted: true, left: false });
    }

    const leaverName =
      session.user.name ??
      session.user.email ??
      "Someone";

    let systemMessage: { id: number; content: string | null; createdAt: Date | null } | null = null;
    try {
      systemMessage = await db.transaction(async (tx) => {
        if (channel.type === "GROUP" && membership.role === "ADMIN") {
          const admins = await tx.query.chatChannelMembers.findMany({
            where: and(
              eq(chatChannelMembers.channelId, channelId),
              eq(chatChannelMembers.role, "ADMIN")
            ),
            columns: { id: true },
          });
          if (admins.length <= 1) {
            throw Object.assign(new Error("LAST_ADMIN"), { statusCode: 400 });
          }
        }

        const [msg] = channel.type === "GROUP"
          ? await tx
              .insert(chatMessages)
              .values({
                channelId,
                senderId: session.user.id,
                content: `${leaverName} left the group`,
                messageType: "system",
              })
              .returning()
          : [null];

        await tx
          .delete(chatChannelMembers)
          .where(
            and(
              eq(chatChannelMembers.channelId, channelId),
              eq(chatChannelMembers.userId, session.user.id)
            )
          );

        return msg ?? null;
      });
    } catch (e) {
      const code = (e as { statusCode?: number }).statusCode;
      if (code === 400) {
        return err(
          "You are the only admin of this group. Promote another member to admin before leaving.",
          400
        );
      }
      throw e;
    }

    if (systemMessage) {
      await db
        .update(chatChannels)
        .set({ lastMessageAt: new Date(), updatedAt: new Date() })
        .where(eq(chatChannels.id, channelId));

      if (process.env.ABLY_API_KEY) {
        try {
          const rest = new Ably.Rest(process.env.ABLY_API_KEY);
          const channelName = `chat:${session.orgId}:${channelId}`;
          rest.channels
            .get(channelName)
            .publish("message", {
              id: systemMessage.id,
              channelId,
              senderId: session.user.id,
              senderName: leaverName,
              content: systemMessage.content,
              createdAt: systemMessage.createdAt,
              messageType: "system",
            })
            .catch(() => {});
          rest.channels
            .get(channelName)
            .publish("member_removed", {
              userId: session.user.id,
              removedBy: session.user.id,
              left: true,
            })
            .catch(() => {});
        } catch {
          // ignore ably errors
        }
      }
    }

    return ok({ left: true, deleted: false });
  });
}
