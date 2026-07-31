

import { type NextRequest } from "next/server";
import { withAuth, ok, err } from "@/lib/api/helpers";
import { pollMessages } from "@/server/queries/chat";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ channelId: string }> }
) {
  return withAuth(async (session) => {
    const { channelId: id } = await params;
    const channelId = Number(id);
    if (!Number.isFinite(channelId)) return err("Invalid channel id", 400);

    const since = req.nextUrl.searchParams.get("since");
    if (!since) return err("Missing required query param: since", 400);

    if (isNaN(new Date(since).getTime())) {
      return err("Invalid 'since' timestamp", 400);
    }

    try {
      const messages = await pollMessages(channelId, since, session.user.id);
      return ok(messages);
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code === "FORBIDDEN") {
        return err("You are not a member of this channel", 403);
      }
      throw e;
    }
  });
}
