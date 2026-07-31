import { type NextRequest } from "next/server";
import { withAuth, ok, err } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { supportTickets, supportTicketMessages, users } from "@/lib/db/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import { z } from "zod";
import { sendSupportTicketReplyEmail } from "@/lib/email";
import { ADMIN_ROLES, ROLES } from "@/lib/constants/roles";
import { logSupportActivity } from "@/server/queries/support";

const SUPPORT_STAFF_ROLES: readonly string[] = [
  ...ADMIN_ROLES,
  ROLES.CUSTOMER_SUPPORT,
];

const replySchema = z.object({
  body: z.string().min(1),
  isInternal: z.boolean().default(false),
  attachments: z
    .array(
      z.object({
        fileName: z.string(),
        fileUrl: z.string(),
        fileSize: z.number(),
        mimeType: z.string(),
      })
    )
    .optional(),
});

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ supportTicketId: string }> }
) {
  return withAuth(async (session) => {
    try {
      const { supportTicketId: id } = await params;
      const ticketId = Number(id);
      if (!Number.isFinite(ticketId)) return err("Invalid ID", 400);

      const ticket = await db.query.supportTickets.findFirst({
        where: and(
          eq(supportTickets.id, ticketId),
          eq(supportTickets.orgId, session.orgId)
        ),
      });
      if (!ticket) return err("Ticket not found", 404);

      const isSupportStaff = SUPPORT_STAFF_ROLES.includes(
        session.user.role ?? ""
      );
      const canSeeInternal =
        isSupportStaff || session.user.id === ticket.assigneeId;

      const messages = await db.query.supportTicketMessages.findMany({
        where: canSeeInternal
          ? eq(supportTicketMessages.ticketId, ticketId)
          : and(
              eq(supportTicketMessages.ticketId, ticketId),
              eq(supportTicketMessages.isInternal, false)
            ),
        with: {
          author: { columns: { id: true, name: true, image: true } },
        },
        orderBy: [desc(supportTicketMessages.createdAt)],
      });

      return ok(messages);
    } catch (error) {
      return err(
        error instanceof Error ? error.message : "Failed to load messages",
        500
      );
    }
  });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ supportTicketId: string }> }
) {
  return withAuth(async (session) => {
    try {
      const { supportTicketId: id } = await params;
      const ticketId = Number(id);
      if (!Number.isFinite(ticketId)) return err("Invalid ID", 400);

      const ticket = await db.query.supportTickets.findFirst({
        where: and(
          eq(supportTickets.id, ticketId),
          eq(supportTickets.orgId, session.orgId)
        ),
      });
      if (!ticket) return err("Ticket not found", 404);

      const isSupportStaff = SUPPORT_STAFF_ROLES.includes(
        session.user.role ?? ""
      );
      const isParticipant =
        session.user.id === ticket.createdBy ||
        session.user.id === ticket.assigneeId;
      if (!isSupportStaff && !isParticipant) {
        return err("You are not authorized to reply to this ticket", 403);
      }

      const body = await req.json();
      const input = replySchema.parse(body);

      if (input.isInternal && !isSupportStaff) {
        return err("Only support staff can post internal notes", 403);
      }

      const isFirstAgentResponse =
        !input.isInternal && session.user.id !== ticket.createdBy
          ? await (async () => {
              const [{ priorCount }] = await db
                .select({ priorCount: sql<number>`count(*)::int` })
                .from(supportTicketMessages)
                .where(
                  and(
                    eq(supportTicketMessages.ticketId, ticketId),
                    eq(supportTicketMessages.isInternal, false),
                    sql`${supportTicketMessages.authorId} <> ${ticket.createdBy}`
                  )
                );
              return (priorCount ?? 0) === 0;
            })()
          : false;

      const [message] = await db
        .insert(supportTicketMessages)
        .values({
          ticketId,
          authorId: session.user.id,
          body: input.body,
          isInternal: input.isInternal,
          attachments: input.attachments ?? [],
        })
        .returning();

      if (ticket.status === "OPEN") {
        await db
          .update(supportTickets)
          .set({ status: "IN_PROGRESS", updatedAt: new Date() })
          .where(
            and(
              eq(supportTickets.id, ticketId),
              eq(supportTickets.orgId, session.orgId)
            )
          );
      }

      if (isFirstAgentResponse) {
        void logSupportActivity({
          orgId: session.orgId,
          type: "ticket",
          message: `First response sent on ticket "${ticket.title}"`,
          person: session.user.name ?? null,
        });
      }

      if (!input.isInternal) {
        void (async () => {
          const notifyUserId =
            session.user.id === ticket.createdBy
              ? ticket.assigneeId
              : ticket.createdBy;

          if (!notifyUserId) return;

          const [recipient, author] = await Promise.all([
            db.query.users.findFirst({
              where: eq(users.id, notifyUserId),
              columns: { email: true, name: true },
            }),
            db.query.users.findFirst({
              where: eq(users.id, session.user.id),
              columns: { name: true },
            }),
          ]);

          if (recipient?.email) {
            await sendSupportTicketReplyEmail(
              recipient.email,
              recipient.name ?? "User",
              ticket.title,
              ticketId,
              author?.name ?? session.user.name ?? "Team Member",
              input.body
            );
          }
        })().catch(() => {});
      }

      return ok(message, 201);
    } catch (error) {
      return err(
        error instanceof Error ? error.message : "Failed to add message",
        500
      );
    }
  });
}
