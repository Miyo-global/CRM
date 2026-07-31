import { withAuth, ok, err, parseBody } from "@/lib/api/helpers";
import { getHelpdeskTickets } from "@/server/queries/hr";
import { db } from "@/lib/db";
import { helpdeskTickets, users, organizationMembers } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { isAdminOrOwner } from "@/lib/auth/helpers";
import type { TicketPriority, TicketStatus } from "@/types/hr";
import type { NextRequest } from "next/server";
import { z } from "zod";
import { sendHelpdeskTicketEmail } from "@/lib/email";
import { cleanRequiredName } from "@/lib/validations/text-rules";
import { sql } from "drizzle-orm";

const createTicketSchema = z.object({
  title: cleanRequiredName("Title", 200, 3),
  description: z.string().trim().max(5000).optional(),
  category: z.string().trim().min(1, "Category is required").max(100),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional(),
  attachmentUrl: z.string().url().optional().or(z.literal("")),
});

export async function GET(req: NextRequest) {
  return withAuth(async (session) => {
    const { searchParams } = req.nextUrl;
    const isAdmin = isAdminOrOwner(session.user.role);
    const filterUserId = searchParams.get("userId") ?? undefined;
    const status = searchParams.get("status") as TicketStatus | null;

    if (filterUserId && filterUserId !== session.user.id && !isAdmin) {
      return err("Not authorized to view other users' tickets.", 403);
    }

    const data = await getHelpdeskTickets(
      session.orgId,
      session.user.id,
      isAdmin,
      {
        filterUserId,
        status: status ?? undefined,
      }
    );
    return ok(data);
  });
}

export async function POST(req: NextRequest) {
  return withAuth(async (session) => {
    const body = await parseBody(req, createTicketSchema);

    // Prevent duplicate ticket titles within the org (case-insensitive) that are
    // still open, so the same issue isn't filed twice.
    const duplicate = await db
      .select({ id: helpdeskTickets.id })
      .from(helpdeskTickets)
      .where(
        and(
          eq(helpdeskTickets.orgId, session.orgId),
          sql`lower(${helpdeskTickets.title}) = ${body.title.toLowerCase()}`,
          sql`${helpdeskTickets.status} <> 'DONE'`,
        ),
      )
      .limit(1);
    if (duplicate.length > 0) {
      return err("An open ticket with this title already exists.", 409);
    }

    const [ticket] = await db
      .insert(helpdeskTickets)
      .values({
        orgId: session.orgId,
        userId: session.user.id,
        title: body.title,
        description: body.description,
        category: body.category,
        priority: body.priority || "MEDIUM",
        status: "TODO",
        attachmentUrl: body.attachmentUrl?.trim() || null,
      })
      .returning();

    void (async () => {
      const hrMembers = await db
        .select({ userId: organizationMembers.userId })
        .from(organizationMembers)
        .where(and(eq(organizationMembers.orgId, session.orgId), eq(organizationMembers.role, "HR")));

      for (const m of hrMembers) {
        const hrUser = await db.query.users.findFirst({
          where: eq(users.id, m.userId),
          columns: { email: true, name: true },
        });
        if (hrUser?.email) {
          await sendHelpdeskTicketEmail(
            hrUser.email,
            hrUser.name ?? "HR",
            body.title,
            body.category ?? "General",
            body.priority ?? "MEDIUM",
            session.user.name ?? "Employee"
          );
        }
      }
    })().catch(() => {});

    return ok(ticket);
  });
}
