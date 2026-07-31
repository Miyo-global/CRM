import { AttendanceStatus } from "./common";
import { BreakEntry } from "./employees";

export interface AttendanceLog {
  id: number;
  orgId: string;
  userId: string;
  date: string;
  checkIn: Date | string | null;
  checkOut: Date | string | null;
  status: string | null;
  workHours: string | null;
  breakHours: string | null;
  breaks: BreakEntry[] | null;
  locationData: unknown | null;
  isOvertime: boolean | null;
  autoCheckedOut: boolean | null;
  createdAt: Date | string | null;
}

export interface DailyStats {
  workHours: string;
  breakHours: string;
  isOvertime: boolean;
}

export interface AttendanceStatusResult {
  status: AttendanceStatus;
  logs: AttendanceLog[];
  todayLog: AttendanceLog | null | undefined;
  dailyStats: DailyStats;
  cooldownRemaining: number;
  punchBlockedReason?: string | null;
}

export interface CheckInInput {
  location?: {
    lat: number;
    lng: number;
    address?: string;
  } | null;
  localDate?: string;
}

export interface GetMonthlyAttendanceInput {
  userId: string;
  year: number;
  month: number;
}
