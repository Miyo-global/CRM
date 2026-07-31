

export type LeaveStatus = "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED";
export type PayrollStatus = "DRAFT" | "APPROVED" | "PAID";
export type ExpenseStatus = "PENDING" | "APPROVED" | "REJECTED" | "PAID";
export type AssetStatus = "AVAILABLE" | "ASSIGNED" | "MAINTENANCE" | "RETIRED";
export type DocumentType =
  | "CONTRACT"
  | "CERTIFICATE"
  | "ID_PROOF"
  | "PAYSLIP"
  | "POLICY"
  | "OFFER_LETTER"
  | "RESUME"
  | "OTHER";
export type ReviewStatus = "DRAFT" | "IN_PROGRESS" | "COMPLETED" | "ARCHIVED";
export type TicketPriority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";
export type TicketStatus = "TODO" | "IN_PROGRESS" | "IN_REVIEW" | "DONE";
export type WfhRequestStatus = "PENDING" | "APPROVED" | "REJECTED";
export type DeviceStatus = "ACTIVE" | "INACTIVE" | "RETURNED";
export type AttendanceStatus = "OFFLINE" | "PRESENT" | "ON_BREAK" | "CHECKED_OUT";
export type WorkLogStatus = "PENDING" | "APPROVED" | "REJECTED";

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
  department: { id: number; name: string } | null;
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

export interface PaginatedEmployees {
  data: Employee[];
  pagination: Pagination;
}

export interface TerminatedEmployee extends Employee {
  terminatedAt: string | null;
}

export interface BreakEntry {
  start: string;
  end?: string;
}

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

export interface Payroll {
  id: number;
  orgId: string;
  userId: string;
  month: string;
  basicSalary: string;
  hra: string | null;
  allowances: string | null;
  deductions: string | null;
  grossSalary: string;
  netSalary: string;
  status: PayrollStatus | null;
  generatedBy: string | null;
  approvedBy: string | null;
  paidBy?: string | null;
  approvedAt?: Date | string | null;
  paidAt?: Date | string | null;
  overtimeType: string | null;
  overtimeDays: string | null;
  overtimeHours: string | null;
  overtimeAmount: string | null;
  payslipUrl: string | null;
  createdAt: Date | string | null;
  specialAllowance?: string | null;
  lopDays?: string | null;
  lopAmount?: string | null;
  halfDays?: string | null;
  halfDayAmount?: string | null;
  ptAmount?: string | null;
  otherDeductions?: string | null;
  structureDeductions?: string | null;
  advanceRecoveryAmount?: string | null;
}

export interface DeletePayrollInput {
  payrollId: number;
}

export interface SalaryStructure {
  id: number;
  orgId: string;
  userId: string;
  basicSalary: string;
  hraPercentage: string | null;
  specialAllowance: string | null;
  allowances: string | null;
  deductions: string | null;
  professionalTax: string | null;
  effectiveFrom: string;
  effectiveTo: string | null;
  isActive: boolean | null;
  pfApplicable?: boolean | null;
  pfEmployeeRate?: string | null;
  pfEmployerRate?: string | null;
  pfWageCeiling?: string | null;
  esiApplicable?: boolean | null;
  esiEmployeeRate?: string | null;
  esiEmployerRate?: string | null;
  esiWageCeiling?: string | null;
  saturdayOtMultiplier?: string | null;
  sundayOtMultiplier?: string | null;
  holidayOtMultiplier?: string | null;
  createdAt: Date | string | null;
  updatedAt: Date | string | null;
}

export interface Expense {
  id: number;
  orgId: string;
  userId: string;
  categoryId: number | null;
  category: string;
  amount: string;
  currency: string | null;
  description: string | null;
  receiptUrl: string | null;
  receiptFileName: string | null;
  merchant: string | null;
  paymentMethod: string | null;
  projectId: number | null;
  status: ExpenseStatus | null;
  approverId: string | null;
  approvedAt: Date | string | null;
  rejectionReason: string | null;
  paidAt: Date | string | null;
  transactionRef: string | null;
  expenseDate: string;
  createdAt: Date | string | null;
  updatedAt: Date | string | null;
}

export interface PaginatedExpenses {
  data: Expense[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface Asset {
  id: number;
  orgId: string;
  name: string;
  type: string;
  serialNumber: string | null;
  brand: string | null;
  model: string | null;
  assignedTo: string | null;
  status: AssetStatus | null;
  purchaseDate: string | null;
  purchaseCost: string | null;
  location: string | null;
  notes: string | null;
  assignmentCount?: number;
  createdAt: Date | string | null;
  updatedAt: Date | string | null;
}

export interface Document {
  id: number;
  orgId: string;
  userId: string | null;
  departmentId: number | null;
  name: string;
  description: string | null;
  type: DocumentType;
  category: string | null;
  fileUrl: string;
  fileName: string | null;
  fileSize: number | null;
  mimeType: string | null;
  version: number | null;
  parentDocumentId: number | null;
  isPublic: boolean | null;
  isActive: boolean | null;
  expiryDate: string | null;
  expiryReminderSent: boolean | null;
  tags: string[] | null;
  metadata: unknown | null;
  uploadedBy: string | null;
  createdAt: Date | string | null;
  updatedAt: Date | string | null;
}

export interface RatingEntry {
  category: string;
  score: number;
  comment?: string;
}

export interface GoalEntry {
  goal: string;
  achieved: boolean;
}

export type ReviewCycleStatus = "DRAFT" | "ACTIVE" | "COMPLETED" | "CANCELLED";
export type MeetingStatus = "SCHEDULED" | "COMPLETED" | "CANCELLED" | "NO_SHOW";

export interface ReviewCycle {
  id: number;
  orgId: string;
  name: string;
  type: string | null;
  periodStart: string;
  periodEnd: string;
  deadline: string | null;
  status: ReviewCycleStatus | null;
  description: string | null;
  createdBy: string | null;
  createdAt: Date | string | null;
  updatedAt: Date | string | null;
  _count?: { reviews?: number };
}

export interface PerformanceReview {
  id: number;
  orgId: string;
  userId: string;
  reviewerId: string | null;
  cycleId: number | null;
  periodStart: string;
  periodEnd: string;
  status: ReviewStatus | null;
  ratings: RatingEntry[] | null;
  strengths: string | null;
  improvements: string | null;
  goals: GoalEntry[] | null;
  overallRating: string | null;
  comments: string | null;
  createdAt: Date | string | null;
  updatedAt: Date | string | null;
  user?: { id: string; name: string | null; image: string | null } | null;
  reviewer?: { id: string; name: string | null } | null;
  cycle?: ReviewCycle | null;
}

export interface OneOnOneMeeting {
  id: number;
  orgId: string;
  managerId: string;
  employeeId: string;
  scheduledAt: Date | string;
  duration: number | null;
  status: MeetingStatus | null;
  notes: string | null;
  actionItems: { text: string; done: boolean }[] | null;
  agenda: string | null;
  meetingLink: string | null;
  createdAt: Date | string | null;
  updatedAt: Date | string | null;
  manager?: { id: string; name: string | null; image: string | null } | null;
  employee?: { id: string; name: string | null; image: string | null } | null;
}

export interface Goal {
  id: number;
  orgId: string;
  userId: string;
  title: string;
  description: string | null;
  type: string | null;
  targetValue: string | null;
  currentValue: string | null;
  unit: string | null;
  startDate: string;
  endDate: string;
  status: string | null;
  progress: number | null;
  parentGoalId: number | null;
  createdAt: Date | string | null;
  updatedAt: Date | string | null;
}

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
  user?: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    name: string | null;
  } | null;
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

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaginatedResult<T> {
  data: T[];
  pagination: Pagination;
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

export interface CheckInInput {
  location?: {
    lat: number;
    lng: number;
    address?: string;
  } | null;
  localDate?: string;
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

export interface GeneratePayrollInput {
  month: string;
}

export interface CreateSalaryStructureInput {
  userId: string;
  basicSalary: number;
  hraPercentage: number;
  allowances: number;
  deductions: number;
  effectiveFrom: Date | string;
  effectiveTo?: Date | string;
}

export interface CreateExpenseInput {
  category: string;
  categoryId?: number;
  amount: number;
  description?: string;
  receiptUrl?: string;
  receiptFileName?: string;
  merchant?: string;
  paymentMethod?: string;
  projectId?: number;
  expenseDate: Date | string;
}

export interface UpdateExpenseStatusInput {
  expenseId: number;
  status: "APPROVED" | "REJECTED" | "PAID";
  rejectionReason?: string;
}

/** Inventory registration only — assignment is a separate PATCH lifecycle step. */
export interface CreateAssetInput {
  name: string;
  type: string;
  serialNumber: string;
  brand: string;
  model: string;
  purchaseDate: string;
  purchaseCost: number;
  notes?: string;
}

export interface UpdateAssetInput {
  assetId: number;
  name?: string;
  type?: string;
  serialNumber?: string;
  brand?: string;
  model?: string;
  assignedTo?: string;
  status?: AssetStatus;
  purchaseDate?: string;
  purchaseCost?: number;
  notes?: string;
  reassignmentReason?: string;
}

export interface CreateDocumentInput {
  name: string;
  type: DocumentType;
  fileUrl: string;
  fileName?: string;
  fileSize?: number;
  mimeType?: string;
  userId?: string;
  description?: string;
  category?: string;
  isPublic?: boolean;
  expiryDate?: string;
  tags?: string[];
}

export interface CreateReviewCycleInput {
  name: string;
  type?: string;
  periodStart: string;
  periodEnd: string;
  deadline?: string;
  description?: string;
}

export interface UpdateReviewCycleInput {
  name?: string;
  type?: string;
  periodStart?: string;
  periodEnd?: string;
  deadline?: string;
  status?: ReviewCycleStatus;
  description?: string;
}

export interface CreatePerformanceReviewInput {
  userId: string;
  reviewerId?: string;
  cycleId?: number;
  periodStart: Date | string;
  periodEnd: Date | string;
  ratings?: RatingEntry[];
  strengths?: string;
  improvements?: string;
  goals?: GoalEntry[];
  overallRating?: number;
  comments?: string;
}

export interface UpdatePerformanceReviewInput {
  ratings?: RatingEntry[];
  strengths?: string;
  improvements?: string;
  goals?: GoalEntry[];
  overallRating?: number;
  comments?: string;
  status?: ReviewStatus;
}

export interface CreateOneOnOneInput {
  employeeId: string;
  scheduledAt: string;
  duration?: number;
  agenda?: string;
  meetingLink?: string;
  additionalParticipantIds?: string[];
}

export interface UpdateOneOnOneInput {
  scheduledAt?: string;
  duration?: number;
  status?: MeetingStatus;
  notes?: string;
  actionItems?: { text: string; done: boolean }[];
  agenda?: string;
  meetingLink?: string;
}

export interface CreateGoalInput {
  userId: string;
  title: string;
  description?: string;
  type?: string;
  targetValue?: number;
  currentValue: number;
  unit?: string;
  startDate: Date | string;
  endDate: Date | string;
  parentGoalId?: number;
}

export interface UpdateGoalInput {
  goalId: number;
  title?: string;
  description?: string;
  targetValue?: number;
  currentValue?: number;
  status?: string;
  progress?: number;
}

export interface CreateHelpdeskTicketInput {
  title: string;
  description?: string;
  category?: string;
  priority?: TicketPriority;
  attachmentUrl?: string;
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
  departmentId?: string;
  month?: number;
  dateFrom?: string;
  dateTo?: string;
}

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

export interface Holiday {
  id: number;
  orgId: string;
  name: string;
  date: string;
  message: string | null;
  year: number;
  createdAt: Date | string | null;
}

export interface AddHolidayInput {
  name: string;
  date: Date | string;
  message?: string;
  type?: "NATIONAL" | "PUBLIC" | "OPTIONAL";
  isHalfDay?: boolean;
}

export interface DeleteHolidayInput {
  holidayId: number;
}

export type DeviceStatusExtended = "ACTIVE" | "INACTIVE" | "LOST" | "RETURNED";

export interface Device {
  id: number;
  orgId: string;
  userId: string;
  deviceType: string;
  deviceName: string;
  serialNumber: string | null;
  brand: string | null;
  model: string | null;
  notes: string | null;
  assignedDate: Date | string | null;
  returnDate: Date | string | null;
  status: DeviceStatusExtended | null;
  user?: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    email: string;
  } | null;
}

export interface CreateDeviceInput {
  userId: string;
  deviceType: string;
  deviceName: string;
  serialNumber?: string;
  brand?: string;
  model?: string;
  notes?: string;
  assignedDate?: Date | string;
}

export interface UpdateDeviceInput {
  deviceId: number;
  userId?: string;
  deviceType?: string;
  deviceName?: string;
  serialNumber?: string;
  brand?: string;
  model?: string;
  notes?: string;
  status?: DeviceStatusExtended;
  returnDate?: Date | string;
}

export interface DeleteDeviceInput {
  deviceId: number;
}

export interface EmployeePayslip {
  id: number;
  userId: string;
  month: string;
  basicSalary: string;
  hra: string | null;
  specialAllowance: string | null;
  allowances: string | null;
  lopDays: string | null;
  lopAmount: string | null;
  halfDays: string | null;
  halfDayAmount: string | null;
  ptAmount: string | null;
  pfEmployee: string | null;
  pfEmployer: string | null;
  esiEmployee: string | null;
  esiEmployer: string | null;
  advanceRecoveryAmount: string | null;
  otherDeductions: string | null;
  structureDeductions: string | null;
  deductions: string | null;
  grossSalary: string;
  netSalary: string;
  status: PayrollStatus | null;
  overtimeType: string | null;
  overtimeDays: string | null;
  overtimeHours: string | null;
  overtimeAmount: string | null;
  user?: {
    firstName: string | null;
    lastName: string | null;
    designation: string | null;
    joiningDate: string | null;
    employeeId: string | null;
    taxId: string | null;
    bankDetails: unknown;
  } | null;
}

export interface GetEmployeePayslipsInput {
  userId?: string;
}

export interface PayrollWithUser extends Payroll {
  generatedByUser?: { id: string; name: string | null } | null;
  approvedByUser?: { id: string; name: string | null } | null;
  paidByUser?: { id: string; name: string | null } | null;
  user?: {
    firstName: string | null;
    lastName: string | null;
    designation: string | null;
    monthlySalary: string | null;
  } | null;
}

export interface GetAllPayrollsInput {
  month: string;
}

export interface GenerateEmployeePayslipInput {
  userId: string;
  month: string;
  lopDays?: number;
  halfDays?: number;
  otherDeductions?: number;
  bonus?: number;
  overtimeType?: "days" | "hours";
  overtimeDays?: number;
  overtimeHours?: number;
  overtimeAmount?: number;
}

export interface ApprovePayrollInput {
  payrollId: number;
}

export interface MarkPayrollPaidInput {
  payrollId: number;
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

export interface OnboardEmployeeInput {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  whatsappSameAsPhone?: boolean;
  whatsappNumber?: string;
  gender?: string;
  password: string;
  designation: string;
  departmentId?: number;
  role: string;
  employeeId?: string;
  joiningDate?: Date | string;
  dateOfBirth?: Date | string;
  skills?: string;
  experienceYears?: number;
  taxId?: string;
  monthlySalary?: number;
  bankDetails?: {
    accountNumber?: string;
    bankName?: string;
    branch?: string;
    ifsc?: string;
    accountHolder?: string;
    pfUanNumber?: string;
  };
}

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

export interface GetMonthlyAttendanceInput {
  userId: string;
  year: number;
  month: number;
}

export type AttendanceSummaryPeriod = "month" | "quarter" | "year";

export interface AttendancePeriodSummary {
  period: AttendanceSummaryPeriod;
  label: string;
  rangeStart: string;
  rangeEnd: string;
  weekdaysInPeriod: number;
  weekdaysElapsed: number;
  presentWeekdays: number;
  absentWeekdays: number;
  attendanceRatePct: number;
  totalWorkHours: number;
  avgHoursPerWeekdayElapsed: number;
  avgHoursPerPresentDay: number;
  loggedDays: number;
}

export interface AttendanceSummaryApiResponse {
  summary: AttendancePeriodSummary;
  logs: AttendanceLog[];
}

export type JobPostingStatus = "DRAFT" | "OPEN" | "PAUSED" | "CLOSED" | "FILLED";
export type CandidateStatus = "NEW" | "SCREENING" | "INTERVIEW" | "OFFER" | "HIRED" | "REJECTED";
export type InterviewType = "PHONE" | "VIDEO" | "ONSITE" | "TECHNICAL" | "HR" | "FINAL";
export type InterviewResult = "PENDING" | "PASSED" | "FAILED" | "NO_SHOW";
export type ApplicationStatus = "APPLIED" | "SHORTLISTED" | "INTERVIEWING" | "OFFERED" | "ACCEPTED" | "REJECTED" | "WITHDRAWN";

export interface JobPosting {
  id: number;
  orgId: string;
  title: string;
  departmentId: number | null;
  location: string | null;
  type: string | null;
  workMode: string | null;
  experience: string | null;
  salaryMin: string | null;
  salaryMax: string | null;
  description: string | null;
  requirements: string | null;
  benefits: string | null;
  status: JobPostingStatus | null;
  openings: number | null;
  applicationDeadline: string | null;
  closingDate: string | null;
  postedBy: string | null;
  externalPostingIds: Record<string, string> | null;
  hiringFlowTemplateId: number | null;
  createdAt: Date | string | null;
  updatedAt: Date | string | null;
  _count?: { applications?: number };
}

export type BgvStatus = "NOT_INITIATED" | "INITIATED" | "PENDING" | "CLEARED" | "FAILED";

export interface Candidate {
  id: number;
  orgId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  resumeUrl: string | null;
  resumeText: string | null;
  linkedinUrl: string | null;
  portfolioUrl: string | null;
  currentCompany: string | null;
  currentRole: string | null;
  experienceYears: string | null;
  skills: string[] | null;
  source: string | null;
  sourceUrl: string | null;
  status: CandidateStatus | null;
  notes: string | null;
  rating: number | null;
  aiScore: number | null;
  aiScoreBreakdown: Record<string, number> | null;
  aiScoreGeneratedAt: Date | string | null;
  bgvStatus: BgvStatus | null;
  bgvAgency: string | null;
  bgvNotes: string | null;
  bgvInitiatedAt: Date | string | null;
  bgvCompletedAt: Date | string | null;
  externalId: string | null;
  duplicateOfId: number | null;
  appliedTitle?: string | null;
  appliedDepartment?: string | null;
  createdAt: Date | string | null;
  updatedAt: Date | string | null;
}

export interface CandidateApplicationSummary {
  id: number;
  jobPostingId: number;
  jobTitle: string;
  jobStatus: JobPostingStatus | null;
  applicationStatus: ApplicationStatus | null;
  pipelineStage: string | null;
  appliedAt: Date | string | null;
}

export interface CandidateListItem extends Candidate {
  applications: CandidateApplicationSummary[];
  primaryJobTitle: string | null;
  primaryJobPostingId: number | null;
  primaryAppliedAt: Date | string | null;
}

export interface CandidateApplication {
  id: number;
  orgId: string;
  candidateId: number;
  jobPostingId: number;
  status: ApplicationStatus | null;
  appliedAt: Date | string | null;
  coverLetter: string | null;
  notes: string | null;
  candidate?: Candidate;
  jobPosting?: JobPosting;
}

export type SlaCandidateStatus = "ON_TRACK" | "AT_RISK" | "BREACHED";

export interface AtsPipelineCandidate {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  source: string | null;
  rating: number | null;
  jobTitle: string | null;
  applicationId: number | null;
  appliedAt: Date | string | null;
  slaStatus: SlaCandidateStatus | null;
  resumeUrl: string | null;
  notes: string | null;
}

export interface AtsPipelineStage {
  stage: CandidateStatus;
  candidates: AtsPipelineCandidate[];
}

export interface AtsPipelineResponse {
  stages: AtsPipelineStage[];
}

export interface JobPipelineCandidate {
  id: number;
  candidateId: number;
  name: string;
  email: string;
  phone: string | null;
  source: string | null;
  rating: number | null;
  resumeUrl: string | null;
  appliedAt: Date | string | null;
  pipelineStage: string | null;
  currentRoundIndex: number | null;
  notes: string | null;
}

export interface JobPipelineStage {
  stage: string;
  label: string;
  candidates: JobPipelineCandidate[];
}

export interface JobPipelineResponse {
  job: JobPosting;
  hiringFlow: HiringFlowTemplate | null;
  stages: JobPipelineStage[];
}

export interface Interview {
  id: number;
  orgId: string;
  candidateId: number;
  jobPostingId: number | null;
  interviewerId: string | null;
  type: InterviewType | null;
  scheduledAt: Date | string;
  duration: number | null;
  location: string | null;
  meetingLink: string | null;
  result: InterviewResult | null;
  feedback: string | null;
  rating: number | null;
  rubric: InterviewRubricEntry[] | null;
  notes: string | null;
  recordingUrl?: string | null;
  recordingPlatform?: string | null;
  panelInterviewerIds?: string[] | null;
  createdAt: Date | string | null;
  updatedAt: Date | string | null;
  candidate?: Candidate;
  interviewer?: { id: string; name: string | null; image: string | null };
}

export interface InterviewRubricEntry {
  category: string;
  score: number;
  maxScore: number;
  comment?: string;
}

export interface RecruitmentStats {
  totalJobs: number;
  openJobs: number;
  totalCandidates: number;
  newCandidates: number;
  upcomingInterviews: number;
  hiredThisMonth: number;
  funnel: Record<string, number>;
  sources: { source: string; count: number }[];
  avgTimeToHireDays: number;
}

export interface CreateJobPostingInput {
  title: string;
  departmentId?: number;
  location?: string;
  type?: string;
  workMode?: string;
  experience?: string;
  salaryMin?: number;
  salaryMax?: number;
  description?: string;
  requirements?: string;
  benefits?: string;
  openings?: number;
  applicationDeadline?: string;
}

export interface UpdateJobPostingInput {
  title?: string;
  departmentId?: number;
  location?: string;
  type?: string;
  experience?: string;
  salaryMin?: number;
  salaryMax?: number;
  description?: string;
  requirements?: string;
  benefits?: string;
  status?: JobPostingStatus;
  openings?: number;
  applicationDeadline?: string;
}

export interface CreateCandidateInput {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  resumeUrl?: string;
  linkedinUrl?: string;
  portfolioUrl?: string;
  currentCompany?: string;
  currentRole?: string;
  experienceYears?: number;
  skills?: string[];
  source?: string;
  notes?: string;
}

export interface UpdateCandidateInput {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  currentRole?: string;
  currentCompany?: string;
  experienceYears?: number;
  linkedinUrl?: string;
  source?: string;
  skills?: string[];
  status?: CandidateStatus;
  notes?: string;
  rating?: number;
}

export interface CreateInterviewInput {
  candidateId: number;
  jobPostingId?: number;
  interviewerId?: string;
  type?: InterviewType;
  scheduledAt: string;
  duration?: number;
  location?: string;
  meetingLink?: string;
  notes?: string;
}

export interface UpdateInterviewInput {
  type?: InterviewType;
  scheduledAt?: string;
  duration?: number;
  location?: string;
  meetingLink?: string;
  result?: InterviewResult;
  feedback?: string;
  rating?: number;
  rubric?: InterviewRubricEntry[];
  notes?: string;
  recordingUrl?: string | null;
  recordingPlatform?: string | null;
}

// ─── Career Ladder Module ────────────────────────────────────────────────────

export type CareerReadinessStatus = "NOT_READY" | "DEVELOPING" | "READY_SOON" | "RECOMMENDED";
export type CareerPromotionStatus = "PENDING" | "APPROVED" | "REJECTED" | "WITHDRAWN";

export type CareerLadderStatus = "draft" | "active" | "archived";
export type CareerLadderTrackType = "individual_contributor" | "management" | "technical" | "specialist";
export type CareerLadderVisibility = "all" | "department" | "admin";

export interface CareerLevel {
  level: number;
  title: string;
  description: string;
  minExperience: number;
  skills: string[];
  scope?: string;
  responsibilities?: string[];
  behaviors?: string[];
  leadershipExpectations?: string;
  promotionCriteria?: string;
  salaryBandMin?: number;
  salaryBandMax?: number;
  typicalDuration?: string;
  competencies?: string[];
}

export interface CareerLadder {
  id: number;
  orgId: string;
  title: string;
  department: string | null;
  description: string | null;
  status: CareerLadderStatus;
  trackType: CareerLadderTrackType | null;
  visibility: CareerLadderVisibility;
  levels: CareerLevel[] | null;
  createdAt: string | null;
}

export interface EmployeeCareerProfile {
  id: number;
  orgId: string;
  userId: string;
  ladderId: number | null;
  currentLevel: number | null;
  assignedBy: string | null;
  assignedAt: string | null;
  notes: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  ladderTitle?: string | null;
  levelTitle?: string | null;
  employeeName?: string | null;
  employeeEmail?: string | null;
}

export interface CareerEvaluation {
  id: number;
  orgId: string;
  employeeUserId: string;
  evaluatorUserId: string;
  ladderId: number | null;
  level: number | null;
  readinessStatus: CareerReadinessStatus;
  strengths: string | null;
  areasToGrow: string | null;
  notes: string | null;
  evaluatedAt: string | null;
  createdAt: string | null;
  employeeName?: string | null;
  evaluatorName?: string | null;
  ladderTitle?: string | null;
  levelTitle?: string | null;
}

export interface CareerPromotionRecommendation {
  id: number;
  orgId: string;
  employeeUserId: string;
  recommendedBy: string;
  ladderId: number | null;
  fromLevel: number | null;
  toLevel: number;
  status: CareerPromotionStatus;
  reason: string | null;
  reviewedBy: string | null;
  reviewedAt: string | null;
  reviewNotes: string | null;
  effectiveDate: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  employeeName?: string | null;
  recommenderName?: string | null;
  reviewerName?: string | null;
  ladderTitle?: string | null;
  fromLevelTitle?: string | null;
  toLevelTitle?: string | null;
}

export interface CareerPromotionHistory {
  id: number;
  orgId: string;
  employeeUserId: string;
  ladderId: number | null;
  fromLevel: number | null;
  toLevel: number;
  promotedBy: string | null;
  recommendationId: number | null;
  effectiveDate: string | null;
  notes: string | null;
  createdAt: string | null;
  employeeName?: string | null;
  promoterName?: string | null;
  ladderTitle?: string | null;
  fromLevelTitle?: string | null;
  toLevelTitle?: string | null;
}

export type HiringRoundType = "HR_SCREENING" | "TECHNICAL" | "MANAGER" | "CULTURAL_FIT" | "FINAL" | "CUSTOM";
export type HiringRoundMode = "VIDEO" | "PHONE" | "ONSITE";

export interface HiringFlowRound {
  id: number;
  templateId: number;
  orgId: string;
  roundOrder: number;
  name: string;
  type: HiringRoundType;
  interviewerRole: string | null;
  scorecardTemplateId: number | null;
  questionBankTag: string | null;
  slaDays: number | null;
  autoAdvanceThreshold: number | null;
  durationMinutes: number | null;
  mode: HiringRoundMode | null;
  notes: string | null;
}

export interface HiringFlowTemplate {
  id: number;
  orgId: string;
  name: string;
  description: string | null;
  isDefault: boolean | null;
  createdBy: string;
  createdAt: string | null;
  updatedAt: string | null;
  rounds: HiringFlowRound[];
}
