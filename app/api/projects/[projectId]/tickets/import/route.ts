import { type NextRequest } from "next/server";
import { withAuth, ok, err, parseBody } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { organizationMembers, projectStatuses, users } from "@/lib/db/schema";
import { and, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { requireProjectAccess } from "@/lib/projects/require-project-access";
import { readTicketCsv } from "@/lib/projects/import-tickets";
import { createTicket } from "@/lib/projects/create-ticket";

/**
 * MIYO-0121: import tickets from CSV. A dry run reports every row without
 * writing anything; the real run creates the rows that passed.
 */
const importSchema = z.object({
  csv: z.string().min(1).max(2_000_000),
  dryRun: z.boolean().default(true),
}).strict();

const MAX_ROWS = 500;

type RouteContext = { params: Promise<{ projectId: string }> };

export async function POST(req: NextRequest, ctx: RouteContext) {
  return withAuth(async (session) => {
    const { projectId: rawProjectId } = await ctx.params;
    const guard = await requireProjectAccess(session, rawProjectId, "manage");
    if (!guard.ok) return guard.response;

    const body = await parseBody(req, importSchema);

    const statuses = await db
      .select({ name: projectStatuses.name })
      .from(projectStatuses)
      .where(eq(projectStatuses.projectId, guard.projectId));

    const { headers, rows } = readTicketCsv(body.csv, {
      statuses: statuses.length > 0
        ? statuses.map((s) => s.name.toUpperCase().replace(/\s+/g, "_"))
        : undefined,
    });

    if (rows.length === 0) return err("The file has no rows under its header.", 400);
    if (rows.length > MAX_ROWS) return err(`Import at most ${MAX_ROWS} rows at a time.`, 400);

    // Assignees are matched by email, and only inside this organization.
    const emails = [...new Set(rows.map((r) => r.assigneeEmail).filter(Boolean) as string[])];
    const members = emails.length
      ? await db
          .select({ id: users.id, email: users.email })
          .from(users)
          .innerJoin(organizationMembers, eq(organizationMembers.userId, users.id))
          .where(and(eq(organizationMembers.orgId, session.orgId), inArray(users.email, emails)))
      : [];
    const byEmail = new Map(members.map((m) => [m.email.toLowerCase(), m.id]));

    const checked = rows.map((row) => {
      if (row.ok && row.assigneeEmail && !byEmail.has(row.assigneeEmail)) {
        return {
          ...row,
          ok: false,
          error: `No member of this organization has the email ${row.assigneeEmail}.`,
        };
      }
      return row;
    });

    const valid = checked.filter((r) => r.ok);

    if (body.dryRun) {
      return ok({
        dryRun: true,
        headers,
        total: checked.length,
        valid: valid.length,
        rows: checked.map(({ line, ok: rowOk, error, title }) => ({ line, ok: rowOk, error, title })),
        created: 0,
      });
    }

    let created = 0;
    for (const row of valid) {
      await createTicket(
        {
          orgId: session.orgId,
          projectId: guard.projectId,
          actorId: session.user.id,
          notify: false,
        },
        {
          ...row.input!,
          assigneeId: row.assigneeEmail ? byEmail.get(row.assigneeEmail) : undefined,
        },
      );
      created++;
    }

    return ok({
      dryRun: false,
      headers,
      total: checked.length,
      valid: valid.length,
      rows: checked.map(({ line, ok: rowOk, error, title }) => ({ line, ok: rowOk, error, title })),
      created,
    });
  });
}
