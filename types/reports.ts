export interface AttendanceRecord {
  id: number;
  userId: string;
  orgId: string;
  date: string;
  checkIn: string | null;
  checkOut: string | null;
  workHours: string | null;
  isOvertime: boolean | null;
  status: string | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface AttendanceSummary {
  totalDays: number;
  totalHours: number;
  averageHours: number;
  overtimeDays: number;
}

export interface AttendanceReport {
  records: AttendanceRecord[];
  summary: AttendanceSummary;
}

export interface PayrollRecord {
  id: number;
  userId: string;
  orgId: string;
  month: string;
  grossSalary: string | null;
  netSalary: string | null;
  deductions: string | null;
  status: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface PayrollSummary {
  count: number;
  totalGross: number;
  totalNet: number;
  totalDeductions: number;
}

export interface PayrollReport {
  payrolls: PayrollRecord[];
  summary: PayrollSummary;
}

export interface ProjectReportItem {
  projectId: number;
  projectName: string;
  totalTickets: number;
  completedTickets: number;
  inProgressTickets: number;
  totalPoints: number;
  completedPoints: number;
  completionRate: number;
  pointsCompletionRate: number;
}

export interface ProjectReportSummary {
  totalProjects: number;
  activeProjects: number;
  totalTickets: number;
  completedTickets: number;
}

export interface ProjectReport {
  projects: ProjectReportItem[];
  summary: ProjectReportSummary;
}

export interface TeamPerformanceReport {
  userId: string;
  userName: string;
  totalHours: number;
  ticketsWorked: number;
  ticketsCompleted: number;
}
