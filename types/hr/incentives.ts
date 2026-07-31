export interface IncentiveConfig {
  id: number;
  orgId: string;
  incentiveRate: string;
  effectiveFrom: string | Date;
  createdAt: Date | string | null;
}

export interface Incentive {
  id: number;
  orgId: string;
  salesRepId: string;
  clientAccountId: number | null;
  investmentAmount: string;
  incentiveRate: string;
  calculatedAmount: string;
  approvedAmount: string | null;
  status: "PENDING" | "APPROVED" | "REJECTED" | "ADDED_TO_PAYROLL";
  notes: string | null;
  createdAt: Date | string | null;
  salesRep?: {
    id: string;
    name: string | null;
    image: string | null;
  } | null;
  clientAccount?: {
    clientName: string | null;
  } | null;
}

export interface IncentivesResult {
  incentives: Incentive[];
  total: number;
  page: number;
  totalPages: number;
}

export interface IncentiveConfigHistoryEntry {
  id: number;
  previousRate: string | null;
  incentiveRate: string;
  effectiveFrom: string | Date;
  createdAt: Date | string | null;
  createdBy: {
    id: string;
    name: string | null;
    image: string | null;
  } | null;
}

export interface IncentiveConfigHistoryResult {
  history: IncentiveConfigHistoryEntry[];
  total: number;
  page: number;
  totalPages: number;
}

export interface IncentiveStats {
  thisMonth: string;
  totalRevenue: string;
  avgPerConversion: string;
  pending: number;
  approved: number;
}

export interface GetIncentivesInput {
  status?: "PENDING" | "APPROVED" | "REJECTED" | "ADDED_TO_PAYROLL";
  page?: number;
  limit?: number;
}

export interface ApproveIncentiveInput {
  id: number;
  approvedAmount: string;
  notes?: string;
}

export interface RejectIncentiveInput {
  id: number;
}

export interface SetIncentiveConfigInput {
  incentiveRate: string;
}
