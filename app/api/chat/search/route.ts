

import { type NextRequest } from "next/server";
import { withAuth, ok, err, toNumber } from "@/lib/api/helpers";
import { searchMessages } from "@/server/queries/chat";

export async function GET(req: NextRequest) {
  return withAuth(async (session) => {
    const { searchParams } = req.nextUrl;
    const query = searchParams.get("query") ?? "";
    const channelId = toNumber(searchParams.get("channelId"));
    const limit = toNumber(searchParams.get("limit")) ?? 20;

    if (query.length < 2) {
      return err("Query must be at least 2 characters", 400);
    }

    const results = await searchMessages(session.user.id, query, channelId, limit);
    return ok(results);
  });
}
