import { type NextRequest } from "next/server";
import { withAuth, ok, parseQuery } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { clients } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";

const listSchema = z.object({
  limit: z.coerce.number().int().min(1).max(500).optional().default(200),
  offset: z.coerce.number().int().min(0).optional().default(0),
});

export async function GET(req: NextRequest) {
  return withAuth(async (session) => {
    const { limit, offset } = parseQuery(req, listSchema);
    const rows = await db
      .select({ id: clients.id, name: clients.name })
      .from(clients)
      .where(eq(clients.orgId, session.orgId))
      .orderBy(clients.name)
      .limit(limit)
      .offset(offset);
    return ok(rows);
  });
}
