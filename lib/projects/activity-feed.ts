import { and, desc, eq, lt, type SQL } from "drizzle-orm";
import { db } from "@/lib/db";
import { ticketActivity, tickets, users } from "@/lib/db/schema";
import { toNumber } from "@/lib/api/helpers";

export function pageParams(searchParams: URLSearchParams) {
  const limit = Math.min(100, Math.max(1, Math.floor(toNumber(searchParams.get("limit")) ?? 50)));
  const cursorRaw = toNumber(searchParams.get("cursor"));
  const cursor = cursorRaw !== undefined && Number.isSafeInteger(cursorRaw) && cursorRaw > 0 ? cursorRaw : undefined;
  return { limit, cursor };
}

export async function loadActivityPage(scope: SQL, page: { limit: number; cursor?: number }) {
  const where = page.cursor ? and(scope, lt(ticketActivity.id, page.cursor)) : scope;
  const rows = await db
    .select({
      id: ticketActivity.id,
      ticketId: ticketActivity.ticketId,
      action: ticketActivity.action,
      field: ticketActivity.field,
      fromValue: ticketActivity.fromValue,
      toValue: ticketActivity.toValue,
      createdAt: ticketActivity.createdAt,
      ticketTitle: tickets.title,
      ticketNumber: tickets.ticketNumber,
      actor: { id: users.id, name: users.name, firstName: users.firstName, lastName: users.lastName, image: users.image },
    })
    .from(ticketActivity)
    .innerJoin(tickets, eq(tickets.id, ticketActivity.ticketId))
    .leftJoin(users, eq(users.id, ticketActivity.actorId))
    .where(where)
    .orderBy(desc(ticketActivity.id))
    .limit(page.limit + 1);

  const hasMore = rows.length > page.limit;
  const data = hasMore ? rows.slice(0, page.limit) : rows;
  return { data, nextCursor: hasMore ? data[data.length - 1].id : null };
}
