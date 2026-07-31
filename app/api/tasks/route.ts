import { type NextRequest } from "next/server";
import { withAuth, ok, err, parseQuery, parseBody } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { tasks, users } from "@/lib/db/schema";
import { eq, and, desc, asc, count } from "drizzle-orm";
import { z } from "zod";
import { sendTaskAssignedEmail } from "@/lib/email";


const listSchema = z.object({
  assigneeId: z.string().optional(),
  status: z.enum(["pending", "completed", "cancelled"]).optional(),
  type: z.enum(["CALL", "EMAIL", "MEETING", "CUSTOM"]).optional(),
  entityType: z.enum(["LEAD", "DEAL", "CONTACT", "PROJECT"]).optional(),
  entityId: z.string().optional(),
  limit: z.string().optional().transform((v) => (v ? Math.min(Number(v), 100) : 50)),
  page: z.string().optional().transform((v) => (v ? Math.max(Number(v), 1) : 1)),
});


const createSchema = z.object({
  title: z.string().min(1).max(255),
  notes: z.string().optional(),
  entityType: z.enum(["LEAD", "DEAL", "CONTACT", "PROJECT"]).optional(),
  entityId: z.number().int().positive().optional(),
  type: z.enum(["CALL", "EMAIL", "MEETING", "CUSTOM"]).default("CUSTOM"),
  assigneeId: z.string().optional(),
  dueDate: z.string().datetime({ offset: true }).optional(),
  remindAt: z.string().datetime({ offset: true }).optional(),
  timezone: z.string().optional(),
});


export async function GET(req: NextRequest) {
  return withAuth(async (session) => {
    const query = parseQuery(req, listSchema);
    const offset = (query.page - 1) * query.limit;

    const resolvedAssigneeId =
      query.assigneeId === "me" ? session.user.id : query.assigneeId;

    const conditions = [eq(tasks.orgId, session.orgId)];

    if (resolvedAssigneeId) {
      conditions.push(eq(tasks.assigneeId, resolvedAssigneeId));
    }
    if (query.status) {
      conditions.push(eq(tasks.status, query.status));
    }
    if (query.type) {
      conditions.push(eq(tasks.type, query.type));
    }
    if (query.entityType) {
      conditions.push(eq(tasks.entityType, query.entityType));
    }
    if (query.entityId) {
      conditions.push(eq(tasks.entityId, Number(query.entityId)));
    }

    const rows = await db
      .select()
      .from(tasks)
      .where(and(...conditions))
      .orderBy(asc(tasks.dueDate), desc(tasks.createdAt))
      .limit(query.limit)
      .offset(offset);

    const [{ c: total }] = await db
      .select({ c: count() })
      .from(tasks)
      .where(and(...conditions));

    return ok({ tasks: rows, total, page: query.page, limit: query.limit });
  });
}


export async function POST(req: NextRequest) {
  return withAuth(async (session) => {
    const body = await parseBody(req, createSchema);

    const [created] = await db
      .insert(tasks)
      .values({
        orgId: session.orgId,
        title: body.title,
        notes: body.notes,
        entityType: body.entityType ?? null,
        entityId: body.entityId ?? null,
        type: body.type,
        assigneeId: body.assigneeId ?? session.user.id,
        createdBy: session.user.id,
        dueDate: body.dueDate ? new Date(body.dueDate) : null,
        remindAt: body.remindAt ? new Date(body.remindAt) : null,
        timezone: body.timezone ?? null,
      })
      .returning();

    if (!created) return err("Failed to create task", 500);

    const assigneeId = body.assigneeId ?? session.user.id;
    if (assigneeId !== session.user.id) {
      void (async () => {
        const assignee = await db.query.users.findFirst({
          where: eq(users.id, assigneeId),
          columns: { email: true, name: true },
        });
        if (assignee?.email) {
          const dueStr = body.dueDate
            ? new Date(body.dueDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
            : null;
          const entityLabel = body.entityType ? `${body.entityType} #${body.entityId ?? ""}` : undefined;

          await sendTaskAssignedEmail(
            assignee.email,
            assignee.name ?? "Team Member",
            body.title,
            body.type,
            dueStr,
            session.user.name ?? "Team Member",
            entityLabel
          );
        }
      })().catch(() => {});
    }

    return ok(created, 201);
  });
}
