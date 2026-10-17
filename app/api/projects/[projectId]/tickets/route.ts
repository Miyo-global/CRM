import { NextRequest } from "next/server";
import { withAuth, ok, err, parseBody, toNumber } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { tickets } from "@/lib/db/schema";
import { eq, and, desc, or, sql, count, isNull } from "drizzle-orm";
import { requireProjectAccess } from "@/lib/projects/require-project-access";
import { createTicket, createTicketSchema, ticketAssigneeIds } from "@/lib/projects/create-ticket";
import { allOrgMembers } from "@/lib/projects/assignable-users";
import { userColumns } from "@/lib/projects/ticket-columns";
import { likePattern } from "@/lib/db/escape-like";

type RouteParams = { params: Promise<{ projectId: string }> };

export async function GET(req: NextRequest, { params }: RouteParams) {
  return withAuth(async (session) => {
    const { projectId: rawProjectId } = await params;
    const guard = await requireProjectAccess(session, rawProjectId, "view");
    if (!guard.ok) return guard.response;
    const { projectId } = guard;

    const { searchParams } = req.nextUrl;
    const page = Math.max(1, Math.floor(toNumber(searchParams.get("page")) ?? 1));
    const limit = Math.min(100, Math.max(1, Math.floor(toNumber(searchParams.get("limit")) ?? 20)));
    const search = searchParams.get("search") ?? undefined;
    const offset = (page - 1) * limit;

    const baseConditions = [
      eq(tickets.orgId, session.orgId),
      eq(tickets.projectId, projectId),
      isNull(tickets.deletedAt),
    ];

    const searchConditions = search
      ? [
          ...baseConditions,
          or(
            sql`${tickets.title} ILIKE ${likePattern(search)}`,
            sql`${tickets.description} ILIKE ${likePattern(search)}`
          )!,
        ]
      : baseConditions;

    const [dataResult, countResult] = await Promise.all([
      db.query.tickets.findMany({
        where: and(...searchConditions),
        with: {
          assignee: { columns: userColumns },
          reporter: { columns: userColumns },
          assignees: { with: { user: { columns: userColumns } } },
          labels: { with: { label: true } },
        },
        orderBy: [desc(tickets.updatedAt)],
        limit,
        offset,
      }),
      db.select({ total: count() }).from(tickets).where(and(...searchConditions)),
    ]);

    const total = countResult[0]?.total ?? 0;

    return ok({
      data: dataResult,
      total: Number(total),
      page,
      limit,
      totalPages: Math.ceil(Number(total) / limit),
    });
  });
}

export async function POST(req: NextRequest, { params }: RouteParams) {
  return withAuth(async (session) => {
    const { projectId: rawProjectId } = await params;
    const guard = await requireProjectAccess(session, rawProjectId, "contribute");
    if (!guard.ok) return guard.response;

    const body = await parseBody(req, createTicketSchema);
    const people = ticketAssigneeIds(body);
    if (body.reporterId) people.add(body.reporterId);
    if (!(await allOrgMembers(session.orgId, people))) {
      return err("Assignee must be a member of this organization", 400);
    }

    const ticket = await createTicket({ orgId: session.orgId, projectId: guard.projectId, actorId: session.user.id }, body);
    return ok(ticket, 201);
  });
}
