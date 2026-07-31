export interface WorkLog {
  id: number;
  orgId: string;
  userId: string | null;
  ticketId: number | null;
  date: string;
  hours: string | null;
  description: string | null;
  imageUrl: string | null;
  workLink: string | null;
  status: string | null;
  approvedBy: string | null;
  approvedAt: Date | string | null;
  rejectionReason: string | null;
  isBillable: boolean | null;
  createdAt: Date | string | null;
  updatedAt: Date | string | null;
  ticket?: {
    id: number;
    title: string;
    ticketNumber: number;
    project?: { id: number; name: string; key: string } | null;
  } | null;
}

export interface UpsertWorkLogInput {
  date: Date | string;
  hours?: number;
  description?: string;
  workLink?: string;
}

export interface UpdateWorkLogStatusInput {
  id: number;
  status: "APPROVED" | "REJECTED";
  rejectionReason?: string;
}

export interface GetWorkLogsInput {
  year: number;
  quarter: number;
  userId?: string;
}
