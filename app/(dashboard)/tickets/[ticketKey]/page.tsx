import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { organizationMembers, projects, tickets } from "@/lib/db/schema";
import { and, eq, isNull } from "drizzle-orm";

/**
 * Resolves a bare ticket URL to its project-scoped page.
 *
 * /tickets/QUP-1 used to 404, so a ticket key pasted from an email or a
 * bookmark went nowhere even though /projects/3/tickets/QUP-1 worked
 * (QA-0026).
 */
export default async function TicketKeyRedirectPage({
  params,
}: {
  params: Promise<{ ticketKey: string }>;
}) {
  const { ticketKey: raw } = await params;
  const ticketKey = decodeURIComponent(raw).trim().toUpperCase();
  const match = /^([A-Z][A-Z0-9]*)-(\d+)$/.exec(ticketKey);
  if (!match) notFound();

  const session = await auth();
  if (!session?.user?.id) notFound();

  const project = await db.query.projects.findFirst({
    where: and(eq(projects.key, match[1]), isNull(projects.deletedAt)),
    columns: { id: true, orgId: true },
  });
  if (!project) notFound();

  const member = await db.query.organizationMembers.findFirst({
    where: and(
      eq(organizationMembers.userId, session.user.id),
      eq(organizationMembers.orgId, project.orgId),
    ),
    columns: { id: true },
  });
  if (!member) notFound();

  const ticket = await db.query.tickets.findFirst({
    where: and(
      eq(tickets.projectId, project.id),
      eq(tickets.ticketNumber, Number(match[2])),
      eq(tickets.orgId, project.orgId),
    ),
    columns: { id: true },
  });
  if (!ticket) notFound();

  redirect(`/projects/${project.id}/tickets/${ticketKey}`);
}
