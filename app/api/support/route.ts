import { type NextRequest } from "next/server";
import { withAuth, ok, err, toNumber } from "@/lib/api/helpers";
import { getSupportTickets, logSupportActivity } from "@/server/queries/support";
import { db } from "@/lib/db";
import { supportTickets, users, clients, organizationMembers } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import { sendSupportTicketCreatedEmail } from "@/lib/email";
import { notifyByRoles } from "@/server/actions/create-notification";
import { ROLES } from "@/lib/constants/roles";
import { computeSlaDueAt } from "@/lib/constants/support-sla";

const SUPPORT_CATEGORIES = [
  "Technical Issue",
  "Billing",
  "Account Access",
  "Feature Request",
  "Bug Report",
  "General Inquiry",
  "Other",
] as const;

const createSchema = z.object({
  title: z
    .string()
    .trim()
    .min(3, "Title must be at least 3 characters")
    .max(200, "Title must be at most 200 characters")
    .refine((v) => !/\s{2,}/.test(v), "Title cannot have multiple consecutive spaces")
    .refine((v) => /[A-Za-z0-9]/.test(v), "Title must contain at least one letter or number"),
  category: z.enum(SUPPORT_CATEGORIES as unknown as [string, ...string[]], {
    message: "Please select a valid category",
  }),
  description: z.string().optional(),
  clientId: z.number().optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).default("MEDIUM"),
  assigneeId: z.string().optional(),
});

export async function GET(req: NextRequest) {
  return withAuth(async (session) => {
    try {
      const params = req.nextUrl.searchParams;
      const status = params.get("status") as
        | "OPEN"
        | "IN_PROGRESS"
        | "WAITING"
        | "RESOLVED"
        | "CLOSED"
        | null;
      const priority = params.get("priority") as
        | "LOW"
        | "MEDIUM"
        | "HIGH"
        | "URGENT"
        | null;
      const assigneeId = params.get("assigneeId") ?? undefined;
      const page = toNumber(params.get("page")) ?? 1;
      const limit = toNumber(params.get("limit")) ?? 50;

      const data = await getSupportTickets(session.orgId, {
        status: status ?? undefined,
        priority: priority ?? undefined,
        assigneeId,
        page,
        limit,
      });
      return ok(data);
    } catch (error) {
      return err(
        error instanceof Error ? error.message : "Failed to load support tickets",
        500
      );
    }
  });
}

export async function POST(req: NextRequest) {
  return withAuth(async (session) => {
    try {
      const body = await req.json();
      const input = createSchema.parse(body);

      if (input.clientId !== undefined) {
        const client = await db.query.clients.findFirst({
          where: and(eq(clients.id, input.clientId), eq(clients.orgId, session.orgId)),
          columns: { id: true },
        });
        if (!client) {
          return err("Client not found in this organization.", 400);
        }
      }

      if (input.assigneeId !== undefined) {
        const membership = await db.query.organizationMembers.findFirst({
          where: and(
            eq(organizationMembers.userId, input.assigneeId),
            eq(organizationMembers.orgId, session.orgId)
          ),
          columns: { id: true },
        });
        if (!membership) {
          return err("Assignee is not a member of this organization.", 400);
        }
      }

      const slaDeadline = computeSlaDueAt(input.priority);

      const [ticket] = await db
        .insert(supportTickets)
        .values({
          orgId: session.orgId,
          title: input.title,
          category: input.category,
          description: input.description,
          clientId: input.clientId,
          priority: input.priority,
          assigneeId: input.assigneeId,
          slaDeadline,
          createdBy: session.user.id,
        })
        .returning();

      void logSupportActivity({
        orgId: session.orgId,
        type: "ticket",
        message: `New ${input.priority.toLowerCase()} ticket: "${input.title}"`,
        person: session.user.name ?? null,
      });

      if (input.assigneeId) {
        void (async () => {
          const assignee = await db.query.users.findFirst({
            where: eq(users.id, input.assigneeId!),
            columns: { email: true, name: true },
          });
          if (assignee?.email) {
            await sendSupportTicketCreatedEmail(
              assignee.email,
              assignee.name ?? "Team Member",
              input.title,
              input.priority,
              session.user.name ?? "User",
              ticket.id
            );
          }
        })().catch(() => {});
      }

      // Route to CUSTOMER_SUPPORT + ADMIN always; include HR/CEO only when created by non-admin
      const notifyRoles: string[] = [ROLES.CUSTOMER_SUPPORT, ROLES.ADMIN];
      const creatorRole = session.user.role?.toUpperCase();
      if (creatorRole !== "CEO" && creatorRole !== "ADMIN") {
        notifyRoles.push(ROLES.CEO, ROLES.HR);
      }
      void notifyByRoles(session.orgId, notifyRoles, {
        type: "INFO",
        title: "New Support Ticket",
        message: `${session.user.name ?? "A user"} raised a ${input.priority} ${input.category} ticket: "${input.title}".`,
        link: "/support",
        metadata: { ticketId: ticket.id },
        excludeUserId: session.user.id,
      }).catch(() => {});

      return ok(ticket, 201);
    } catch (error) {
      return err(
        error instanceof Error ? error.message : "Failed to create support ticket",
        500
      );
    }
  });
}
