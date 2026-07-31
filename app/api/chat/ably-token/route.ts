

import { type NextRequest, NextResponse } from "next/server";
import Ably from "ably";
import { withAuth, err } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { chatChannelMembers, chatChannels } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

export async function GET(_req: NextRequest) {
  if (!process.env.ABLY_API_KEY) {
    return NextResponse.json(
      { error: "Ably is not configured" },
      { status: 503 }
    );
  }

  const rest = new Ably.Rest(process.env.ABLY_API_KEY);

  return withAuth(async (session) => {
    try {
      const memberships = await db
        .select({ channelId: chatChannelMembers.channelId })
        .from(chatChannelMembers)
        .innerJoin(
          chatChannels,
          eq(chatChannels.id, chatChannelMembers.channelId)
        )
        .where(
          and(
            eq(chatChannelMembers.userId, session.user.id),
            eq(chatChannels.orgId, session.orgId)
          )
        );

      const capability: Record<string, string[]> = {
        [`chat:${session.orgId}:inbox`]: ["subscribe", "history"],
      };
      for (const m of memberships) {
        capability[`chat:${session.orgId}:${m.channelId}`] = [
          "subscribe",
          "history",
        ];
      }

      const tokenRequest = await rest.auth.createTokenRequest({
        clientId: session.user.id,
        capability: JSON.stringify(capability),
        ttl: 3_600 * 1_000,
      });
      return NextResponse.json(tokenRequest);
    } catch {
      return err("Failed to create Ably token", 500);
    }
  });
}
