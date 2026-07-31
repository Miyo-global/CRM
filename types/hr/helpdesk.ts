import { TicketPriority, TicketStatus } from "./common";

export interface HelpdeskTicket {
  id: number;
  orgId: string;
  userId: string;
  title: string;
  description: string | null;
  category: string | null;
  priority: TicketPriority | null;
  status: TicketStatus | null;
  assigneeId: string | null;
  resolvedAt: Date | string | null;
  resolution: string | null;
  attachmentUrl: string | null;
  createdAt: Date | string | null;
  updatedAt: Date | string | null;
}

export interface CreateHelpdeskTicketInput {
  title: string;
  description?: string;
  category?: string;
  priority?: TicketPriority;
  attachmentUrl?: string;
}
