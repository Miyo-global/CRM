import { Pagination } from "./common";

export interface Department {
  id: number;
  orgId: string;
  name: string;
  managerId: string | null;
  createdAt: Date | string | null;
}

export interface Employee {
  id: string;
  name: string | null;
  firstName: string | null;
  lastName: string | null;
  email: string;
  role: string;
  designation: string | null;
  employeeId: string | null;
  departmentId: number | null;
  department?: { id: number; name: string } | null;
  image: string | null;
  isActive: boolean;
  joiningDate: string | null;
  hasDashboardAccess: boolean;
  reportingTo: string | null;
  monthlySalary: string | null;
  bio: string | null;
  linkedinUrl: string | null;
  twitterUrl: string | null;
  githubUrl: string | null;
  websiteUrl: string | null;
  skills: string[] | null;
  phone: string | null;
}

export interface TerminatedEmployee extends Employee {
  terminatedAt: string | null;
}

export interface PaginatedEmployees {
  data: Employee[];
  pagination: Pagination;
}

export interface BreakEntry {
  start: string;
  end?: string;
}

export interface OrgChartNode {
  id: string;
  name: string | null;
  email: string;
  role: string;
  designation: string | null;
  image: string | null;
  departmentId: number | null;
  reportingTo: string | null;
}

export interface EmployeeAttendanceSummaryData {
  daysPresent: number;
  daysAbsent: number;
  daysLate: number;
  totalHours: string;
  avgHoursPerDay: string;
}

export interface EmployeeStats {
  leaves: {
    total: number;
    approved: number;
    pending: number;
    rejected: number;
    byType: Record<string, number>;
  };
  attendance: EmployeeAttendanceSummaryData | null;
}

export interface CreateDepartmentInput {
  name: string;
}

export interface UpdateProfileInput {
  userId: string;
  name?: string;
  firstName?: string;
  lastName?: string;
  designation?: string;
  departmentId?: number;
  phone?: string;
  image?: string;
  bio?: string;
  linkedinUrl?: string;
  twitterUrl?: string;
  githubUrl?: string;
  websiteUrl?: string;
  skills?: string[];
  role?: string;
  gender?: "MALE" | "FEMALE" | "OTHER";
  experienceYears?: number;
  taxId?: string;
  monthlySalary?: number;
  bankDetails?: {
    accountNumber?: string;
    bankName?: string;
    branch?: string;
    ifsc?: string;
    accountHolder?: string;
    swiftCode?: string;
    iban?: string;
  };
  joiningDate?: string;
  reportingTo?: string | null;
}
