import { NextResponse } from "next/server";
import { TICKET_CONFLICT_CODE } from "@/lib/projects/ticket-conflict-code";


export function ticketConflict(currentVersion: number): NextResponse<never> {
  return NextResponse.json(
    { error: "Ticket was modified by someone else. Refresh and try again.", code: TICKET_CONFLICT_CODE, currentVersion },
    { status: 409 },
  ) as NextResponse<never>;
}

export const userColumns = { id: true, name: true, firstName: true, lastName: true, email: true, image: true } as const;

export const ticketResponseColumns = {
  id: true,
  version: true,
  title: true,
  status: true,
  priority: true,
  type: true,
  assigneeId: true,
  sprintId: true,
  epicId: true,
  cycleId: true,
  milestoneId: true,
  points: true,
  dueDate: true,
  startDate: true,
  parentTicketId: true,
  updatedAt: true,
} as const;
