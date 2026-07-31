import { NextRequest } from "next/server";
import { withAuth, ok, err, parseBody } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { ticketAttachments, tickets } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { isAdminOrOwner } from "@/lib/auth/helpers";
import { z } from "zod";

type RouteParams = { params: Promise<{ projectId: string; ticketId: string }> };

const attachmentSchema = z.object({
  fileName: z.string().min(1),
  fileUrl: z.string().min(1),
  fileKey: z.string().optional(),
  fileSize: z.number().int().positive(),
  mimeType: z.string(),
});

export async function POST(req: NextRequest, { params }: RouteParams) {
  return withAuth(async (session) => {
    const { projectId: pid, ticketId: tid } = await params;
    const ticketId = Number(tid);
    const projectId = Number(pid);
    if (!ticketId || !projectId) return err("Invalid ticket id", 400);

    const ticket = await db.query.tickets.findFirst({
      where: and(eq(tickets.id, ticketId), eq(tickets.projectId, projectId), eq(tickets.orgId, session.orgId!)),
      columns: { id: true, assigneeId: true, reporterId: true },
      with: { assignees: { columns: { userId: true } } },
    });
    if (!ticket) return err("Ticket not found", 404);

    if (!isAdminOrOwner(session.user.role)) {
      const isAssignee =
        ticket.assigneeId === session.user.id ||
        ticket.assignees.some((a) => a.userId === session.user.id);
      const isReporter = ticket.reporterId === session.user.id;
      if (!isAssignee && !isReporter) {
        return err("You don't have permission to add attachments to this ticket.", 403);
      }
    }

    const body = await parseBody(req, attachmentSchema);

    const [attachment] = await db
      .insert(ticketAttachments)
      .values({
        orgId: session.orgId!,
        ticketId,
        fileUrl: body.fileUrl,
        fileName: body.fileName,
        fileSize: body.fileSize,
        mimeType: body.mimeType,
        uploadedBy: session.user.id,
      })
      .returning();

    return ok({ id: attachment.id }, 201);
  });
}
