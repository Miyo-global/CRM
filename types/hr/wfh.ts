import { WfhRequestStatus } from "./common";

export interface WfhRequest {
  id: number;
  orgId: string;
  userId: string;
  date: string | Date;
  reason: string | null;
  approverId: string | null;
  status: WfhRequestStatus | null;
  rejectionReason: string | null;
  createdAt: Date | string | null;
  user?: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    email: string;
    image: string | null;
  } | null;
  approver?: {
    id: string;
    name: string | null;
    firstName: string | null;
    lastName: string | null;
    email: string;
  } | null;
}

export interface CreateWfhRequestInput {
  date: Date | string;
  endDate?: Date | string;
  reason?: string;
}

export interface ProcessWfhRequestInput {
  requestId: number;
  status: "APPROVED" | "REJECTED";
  rejectionReason?: string;
}
