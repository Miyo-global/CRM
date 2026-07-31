import { type NextRequest } from "next/server";
import { withAuth, ok, err, parseBody } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import {
  chatChannelMembers,
  chatChannels,
  organizationMembers,
} from "@/lib/db/schema";
import { eq, and, inArray } from "drizzle-orm";
import { z } from "zod";
import Ably from "ably";

const addMembersSchema = z.object({
  userIds: z.array(z.string().min(1)).min(1).max(50),
});

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ channelId: string }> }
) {
  return withAuth(async (session) => {
    const { channelId: id } = await params;
    const channelId = Number(id);
    if (!Number.isFinite(channelId)) return err("Invalid channel id", 400);

    const channel = await db.query.chatChannels.findFirst({
      where: eq(chatChannels.id, channelId),
      columns: { id: true, orgId: true },
    });
    if (!channel) return err("Channel not found", 404);
    if (channel.orgId !== session.orgId) return err("Forbidden", 403);

    const requesterMembership = await db.query.chatChannelMembers.findFirst({
      where: and(
        eq(chatChannelMembers.channelId, channelId),
        eq(chatChannelMembers.userId, session.user.id)
      ),
    });

    if (!requesterMembership) {
      return err("You are not a member of this channel", 403);
    }

    const members = await db.query.chatChannelMembers.findMany({
      where: eq(chatChannelMembers.channelId, channelId),
      with: {
        user: {
          columns: { id: true, name: true, image: true, email: true, role: true },
        },
      },
    });

    return ok(members);
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

    const channel = await db.query.chatChannels.findFirst({
      where: eq(chatChannels.id, channelId),
    });
    if (!channel) return err("Channel not found", 404);
    if (channel.orgId !== session.orgId) return err("Forbidden", 403);
    if (channel.type === "DIRECT") {
      return err("Cannot add members to a direct message", 400);
    }

    const requester = await db.query.chatChannelMembers.findFirst({
      where: and(
        eq(chatChannelMembers.channelId, channelId),
        eq(chatChannelMembers.userId, session.user.id)
      ),
    });
    if (!requester) return err("You are not a member of this channel", 403);
    if (requester.role !== "ADMIN") {
      return err("Only channel admins can add members", 403);
    }

    let body: z.infer<typeof addMembersSchema>;
    try {
      body = await parseBody(req, addMembersSchema);
    } catch {
      return err("Invalid request body", 400);
    }

    const uniqueIds = Array.from(new Set(body.userIds));

    const orgMembers = await db.query.organizationMembers.findMany({
      where: and(
        eq(organizationMembers.orgId, session.orgId),
        inArray(organizationMembers.userId, uniqueIds)
      ),
      columns: { userId: true },
    });
    const orgUserIds = new Set(orgMembers.map((m) => m.userId));
    const invalidCount = uniqueIds.filter((u) => !orgUserIds.has(u)).length;
    if (invalidCount > 0) {
      return err(
        `${invalidCount} user(s) could not be added because they are not members of this organization`,
        400
      );
    }

    const existing = await db
      .select({ userId: chatChannelMembers.userId })
      .from(chatChannelMembers)
      .where(
        and(
          eq(chatChannelMembers.channelId, channelId),
          inArray(chatChannelMembers.userId, uniqueIds)
        )
      );
    const existingIds = new Set(existing.map((r) => r.userId));
    const toInsert = uniqueIds.filter((u) => !existingIds.has(u));

    if (toInsert.length === 0) {
      return ok({ added: 0, skipped: uniqueIds.length });
    }

    await db.insert(chatChannelMembers).values(
      toInsert.map((userId) => ({
        channelId,
        userId,
        role: "MEMBER",
      }))
    );

    if (process.env.ABLY_API_KEY) {
      try {
        const rest = new Ably.Rest(process.env.ABLY_API_KEY);
        const channelName = `chat:${session.orgId}:${channelId}`;
        rest.channels
          .get(channelName)
          .publish("member_added", {
            userIds: toInsert,
            addedBy: session.user.id,
          })
          .catch(() => {});
      } catch {
        // ignore ably errors
      }
    }

    return ok({
      added: toInsert.length,
      skipped: uniqueIds.length - toInsert.length,
    });
  });
}
