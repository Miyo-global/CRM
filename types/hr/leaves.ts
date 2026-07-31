import { LeaveStatus } from "./common";

export interface LeaveType {
  id: number;
  orgId: string;
  name: string;
  daysPerYear: number;
  carryForward: boolean | null;
}

export interface LeaveBalance {
  id: number;
  orgId: string;
  userId: string;
  leaveTypeId: number | null;
  balance: string;
  year: number;
}

export interface LeaveRequest {
  id: number;
  orgId: string;
  userId: string;
  leaveTypeId: number | null;
  startDate: string;
  endDate: string;
  reason: string | null;
  priority: string | null;
  status: LeaveStatus | null;
  approverId: string | null;
  rejectionReason: string | null;
  managerComment: string | null;
  attachmentUrl: string | null;
  isHalfDay: boolean;
  halfDayPeriod: string | null;
  coveringEmployeeId: string | null;
  createdAt: Date | string | null;
}

export interface LeavesResult {
  balances: LeaveBalance[];
  types: LeaveType[];
  requests: LeaveRequest[];
}

export interface RequestLeaveInput {
  leaveTypeId: number;
  startDate: string;
  endDate: string;
  reason?: string;
  priority?: "LOW" | "MEDIUM" | "HIGH";
  approverId?: string;
  attachmentUrl?: string;
  isHalfDay?: boolean;
  halfDayPeriod?: "AM" | "PM";
}

export interface ApproveLeaveInput {
  requestId: number;
  status: "APPROVED" | "REJECTED";
  rejectionReason?: string;
}
