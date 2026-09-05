
import { pgTable, text, serial, timestamp, boolean, jsonb, decimal, date, integer, doublePrecision, index, uniqueIndex } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import {
  leaveStatusEnum, payrollStatusEnum, expenseStatusEnum, assetStatusEnum,
  documentTypeEnum, reviewStatusEnum, ticketPriorityEnum, ticketStatusEnum,
  wfhRequestStatusEnum,
  jobPostingStatusEnum, candidateStatusEnum, interviewTypeEnum,
  interviewResultEnum, applicationStatusEnum,
  reviewCycleStatusEnum, meetingStatusEnum,
  trainingStatusEnum, enrollmentStatusEnum,
  resignationStatusEnum, terminationStatusEnum, exitChecklistStatusEnum,
  ackStatusEnum, reimbursementStatusEnum, loanStatusEnum,
  pipStatusEnum, surveyStatusEnum,
  appraisalTypeEnum, appraisalStageEnum, appraisalRatingTypeEnum,
  appraisalStageRowStatusEnum, appraisalCycleStatusEnum,
  pipReasonEnum, pipReviewFrequencyEnum, pipProgressStatusEnum,
  pipFinalOutcomeEnum, pipRiskLevelEnum, pipImprovementSinceEnum,
  feedbackTypeEnum, bonusTypeEnum, fnfStatusEnum,
  onboardingDocStatusEnum, onboardingDocumentStatusEnum, docAuditActionEnum,
  careerReadinessStatusEnum, careerPromotionStatusEnum,
} from "../enums";
import { organizations, users } from "../auth";
import { projects } from "../projects";

export const departments = pgTable("departments", {
  id: serial("id").primaryKey(),
  orgId: text("org_id").references(() => organizations.id).notNull(),
  name: text("name").notNull(),
  managerId: text("manager_id"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const departmentMembers = pgTable("department_members", {
  id: serial("id").primaryKey(),
  departmentId: integer("department_id").references(() => departments.id).notNull(),
  userId: text("user_id").references(() => users.id).notNull(),
  role: text("role").default("member"),
  joinedAt: timestamp("joined_at").defaultNow(),
}, (table) => [
  uniqueIndex("uniq_dept_members_dept_user").on(table.departmentId, table.userId),
]);

export const attendance = pgTable("attendance", {
  id: serial("id").primaryKey(),
  orgId: text("org_id").references(() => organizations.id).notNull(),
  userId: text("user_id").notNull().references(() => users.id),
  date: date("date").notNull(),
  checkIn: timestamp("check_in"),
  checkOut: timestamp("check_out"),
  status: text("status").default("PRESENT"),
  workHours: decimal("work_hours"),
  breakHours: decimal("break_hours").default("0"),
  breaks: jsonb("breaks").$type<{ start: string; end?: string }[]>().default([]),
  locationData: jsonb("location_data"),
  isOvertime: boolean("is_overtime").default(false),
  isHolidayWork: boolean("is_holiday_work").default(false).notNull(),
  isSundayWork: boolean("is_sunday_work").default(false).notNull(),
  holidayId: integer("holiday_id").references(() => holidays.id),
  autoCheckedOut: boolean("auto_checked_out").default(false),
  overtimeNote: text("overtime_note"),
  overtimeProofUrl: text("overtime_proof_url"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_attendance_user_id").on(table.userId),
  index("idx_attendance_org_date").on(table.orgId, table.date),
  index("idx_attendance_date").on(table.date),
  index("idx_attendance_user_date").on(table.userId, table.date),
]);

export const leaveTypes = pgTable("leave_types", {
  id: serial("id").primaryKey(),
  orgId: text("org_id").references(() => organizations.id).notNull(),
  name: text("name").notNull(),
  daysPerYear: integer("days_per_year").notNull(),
  carryForward: boolean("carry_forward").default(false),
});

export const leaveBalances = pgTable("leave_balances", {
  id: serial("id").primaryKey(),
  orgId: text("org_id").references(() => organizations.id).notNull(),
  userId: text("user_id").notNull().references(() => users.id),
  leaveTypeId: integer("leave_type_id").references(() => leaveTypes.id),
  balance: decimal("balance").default("0").notNull(),
  year: integer("year").notNull(),
}, (table) => [
  index("idx_leave_balances_user_year").on(table.userId, table.year),
  index("idx_leave_balances_org_year").on(table.orgId, table.year),
  index("idx_leave_balances_type_org").on(table.leaveTypeId, table.orgId),
]);

export const leaveRequests = pgTable("leave_requests", {
  id: serial("id").primaryKey(),
  orgId: text("org_id").references(() => organizations.id).notNull(),
  userId: text("user_id").notNull().references(() => users.id),
  leaveTypeId: integer("leave_type_id").references(() => leaveTypes.id),
  startDate: date("start_date").notNull(),
  endDate: date("end_date").notNull(),
  reason: text("reason"),
  priority: text("priority").default("MEDIUM"),
  status: leaveStatusEnum("status").default("PENDING"),
  approverId: text("approver_id").references(() => users.id),
  rejectionReason: text("rejection_reason"),
  managerComment: text("manager_comment"),
  attachmentUrl: text("attachment_url"),
  isHalfDay: boolean("is_half_day").default(false).notNull(),
  halfDayPeriod: text("half_day_period"),
  coveringEmployeeId: text("covering_employee_id").references(() => users.id),
  lopDays: decimal("lop_days", { precision: 5, scale: 1 }).default("0"),
  createdAt: timestamp("created_at").defaultNow(),
  hrEscalationSentAt: timestamp("hr_escalation_sent_at"),
}, (table) => [
  index("idx_leave_requests_user_id").on(table.userId),
  index("idx_leave_requests_org_status").on(table.orgId, table.status),
]);

export const payrolls = pgTable("payrolls", {
  id: serial("id").primaryKey(),
  orgId: text("org_id").references(() => organizations.id).notNull(),
  userId: text("user_id").notNull().references(() => users.id),
  month: text("month").notNull(),
  basicSalary: decimal("basic_salary").notNull(),
  hra: decimal("hra").default("0"),
  specialAllowance: decimal("special_allowance").default("0"),
  allowances: decimal("allowances").default("0"),
  lopDays: decimal("lop_days").default("0"),
  lopAmount: decimal("lop_amount").default("0"),
  halfDays: decimal("half_days").default("0"),
  halfDayAmount: decimal("half_day_amount").default("0"),
  ptAmount: decimal("pt_amount").default("200"),
  pfEmployee: decimal("pf_employee").default("0"),
  pfEmployer: decimal("pf_employer").default("0"),
  esiEmployee: decimal("esi_employee").default("0"),
  esiEmployer: decimal("esi_employer").default("0"),
  advanceRecoveryAmount: decimal("advance_recovery_amount").default("0"),
  otherDeductions: decimal("other_deductions").default("0"),
  structureDeductions: decimal("structure_deductions").default("0"),
  deductions: decimal("deductions").default("0"),
  grossSalary: decimal("gross_salary").notNull(),
  netSalary: decimal("net_salary").notNull(),
  status: payrollStatusEnum("status").default("DRAFT"),
  generatedBy: text("generated_by").references(() => users.id),
  approvedBy: text("approved_by").references(() => users.id),
  paidBy: text("paid_by").references(() => users.id),
  approvedAt: timestamp("approved_at"),
  paidAt: timestamp("paid_at"),
  overtimeType: text("overtime_type"),
  overtimeDays: decimal("overtime_days").default("0"),
  overtimeHours: decimal("overtime_hours").default("0"),
  overtimeAmount: decimal("overtime_amount").default("0"),
  leaveDaysDisplay: decimal("leave_days_display"),
  payslipUrl: text("payslip_url"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_payrolls_org_month").on(table.orgId, table.month),
  uniqueIndex("uniq_payroll_org_user_month").on(table.orgId, table.userId, table.month),
]);

export const salaryStructures = pgTable("salary_structures", {
  id: serial("id").primaryKey(),
  orgId: text("org_id").references(() => organizations.id).notNull(),
  userId: text("user_id").notNull().references(() => users.id),
  basicSalary: decimal("basic_salary").notNull(),
  hraPercentage: decimal("hra_percentage").default("50"),
  allowances: decimal("allowances").default("0"),
  specialAllowance: decimal("special_allowance").default("0"),
  deductions: decimal("deductions").default("0"),
  professionalTax: decimal("professional_tax").default("200"),
  pfApplicable: boolean("pf_applicable").default(false).notNull(),
  pfEmployeeRate: decimal("pf_employee_rate", { precision: 5, scale: 2 }).default("12"),
  pfEmployerRate: decimal("pf_employer_rate", { precision: 5, scale: 2 }).default("12"),
  pfWageCeiling: decimal("pf_wage_ceiling", { precision: 10, scale: 2 }).default("15000"),
  esiApplicable: boolean("esi_applicable").default(false).notNull(),
  esiEmployeeRate: decimal("esi_employee_rate", { precision: 5, scale: 2 }).default("0.75"),
  esiEmployerRate: decimal("esi_employer_rate", { precision: 5, scale: 2 }).default("3.25"),
  esiWageCeiling: decimal("esi_wage_ceiling", { precision: 10, scale: 2 }).default("21000"),
  saturdayOtMultiplier: decimal("saturday_ot_multiplier", { precision: 4, scale: 2 }).default("1.00"),
  sundayOtMultiplier: decimal("sunday_ot_multiplier", { precision: 4, scale: 2 }).default("2.00"),
  holidayOtMultiplier: decimal("holiday_ot_multiplier", { precision: 4, scale: 2 }).default("2.00"),
  effectiveFrom: date("effective_from").notNull(),
  effectiveTo: date("effective_to"),
  isActive: boolean("is_active").default(true),
  createdBy: text("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const salaryRevisionHistory = pgTable("salary_revision_history", {
  id: serial("id").primaryKey(),
  orgId: text("org_id").references(() => organizations.id).notNull(),
  userId: text("user_id").references(() => users.id).notNull(),
  salaryStructureId: integer("salary_structure_id").references(() => salaryStructures.id),
  previousBasic: decimal("previous_basic"),
  previousHraPct: decimal("previous_hra_pct"),
  previousSpecialAllowance: decimal("previous_special_allowance"),
  previousPt: decimal("previous_pt"),
  newBasic: decimal("new_basic").notNull(),
  newHraPct: decimal("new_hra_pct").notNull(),
  newSpecialAllowance: decimal("new_special_allowance").notNull(),
  newPt: decimal("new_pt").notNull(),
  effectiveFrom: date("effective_from").notNull(),
  reason: text("reason"),
  changedBy: text("changed_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_salary_revision_user").on(table.userId),
  index("idx_salary_revision_org").on(table.orgId, table.userId),
]);

export const expenseCategories = pgTable("expense_categories", {
  id: serial("id").primaryKey(),
  orgId: text("org_id").references(() => organizations.id).notNull(),
  name: text("name").notNull(),
  description: text("description"),
  budgetLimit: decimal("budget_limit"),
  budgetPeriod: text("budget_period").default("MONTHLY"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const expenses = pgTable("expenses", {
  id: serial("id").primaryKey(),
  orgId: text("org_id").references(() => organizations.id).notNull(),
  userId: text("user_id").notNull().references(() => users.id),
  categoryId: integer("category_id").references(() => expenseCategories.id),
  category: text("category").notNull(),
  amount: decimal("amount").notNull(),
  currency: text("currency").default("INR"),
  description: text("description"),
  receiptUrl: text("receipt_url"),
  receiptFileName: text("receipt_file_name"),
  merchant: text("merchant"),
  paymentMethod: text("payment_method"),
  projectId: integer("project_id").references(() => projects.id),
  status: expenseStatusEnum("status").default("PENDING"),
  approverId: text("approver_id").references(() => users.id),
  approvedAt: timestamp("approved_at"),
  rejectionReason: text("rejection_reason"),
  paidAt: timestamp("paid_at"),
  transactionRef: text("transaction_ref"),
  expenseDate: date("expense_date").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_expenses_user_id").on(table.userId),
  index("idx_expenses_org_status").on(table.orgId, table.status),
  index("idx_expenses_date").on(table.expenseDate),
  index("idx_expenses_category").on(table.categoryId),
]);

export const assets = pgTable("assets", {
  id: serial("id").primaryKey(),
  orgId: text("org_id").references(() => organizations.id).notNull(),
  name: text("name").notNull(),
  type: text("type").notNull(),
  serialNumber: text("serial_number"),
  brand: text("brand"),
  model: text("model"),
  assignedTo: text("assigned_to").references(() => users.id),
  status: assetStatusEnum("status").default("AVAILABLE"),
  purchaseDate: date("purchase_date"),
  purchaseCost: decimal("purchase_cost"),
  location: text("location"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const assetAssignmentHistory = pgTable("asset_assignment_history", {
  id: serial("id").primaryKey(),
  orgId: text("org_id").references(() => organizations.id).notNull(),
  assetId: integer("asset_id").references(() => assets.id).notNull(),
  fromUserId: text("from_user_id").references(() => users.id),
  toUserId: text("to_user_id").references(() => users.id),
  reason: text("reason"),
  assignedBy: text("assigned_by").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_asset_assignment_history_asset").on(table.assetId),
]);

export const documents = pgTable("documents", {
  id: serial("id").primaryKey(),
  orgId: text("org_id").references(() => organizations.id).notNull(),
  userId: text("user_id").references(() => users.id),
  departmentId: integer("department_id").references(() => departments.id),
  name: text("name").notNull(),
  description: text("description"),
  type: documentTypeEnum("type").notNull(),
  category: text("category"),
  fileUrl: text("file_url").notNull(),
  fileName: text("file_name"),
  fileSize: integer("file_size"),
  mimeType: text("mime_type"),
  version: integer("version").default(1),
  parentDocumentId: integer("parent_document_id"),
  isPublic: boolean("is_public").default(false),
  isActive: boolean("is_active").default(true),
  expiryDate: date("expiry_date"),
  expiryReminderSent: boolean("expiry_reminder_sent").default(false),
  tags: text("tags").array(),
  metadata: jsonb("metadata"),
  uploadedBy: text("uploaded_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const reviewCycles = pgTable("review_cycles", {
  id: serial("id").primaryKey(),
  orgId: text("org_id").references(() => organizations.id).notNull(),
  name: text("name").notNull(),
  type: text("type").default("QUARTERLY"),
  periodStart: date("period_start").notNull(),
  periodEnd: date("period_end").notNull(),
  deadline: date("deadline"),
  status: reviewCycleStatusEnum("status").default("DRAFT"),
  description: text("description"),
  createdBy: text("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_review_cycles_org").on(table.orgId),
]);

export const performanceReviews = pgTable("performance_reviews", {
  id: serial("id").primaryKey(),
  orgId: text("org_id").references(() => organizations.id).notNull(),
  userId: text("user_id").notNull().references(() => users.id),
  reviewerId: text("reviewer_id").references(() => users.id),
  cycleId: integer("cycle_id").references(() => reviewCycles.id),
  periodStart: date("period_start").notNull(),
  periodEnd: date("period_end").notNull(),
  status: reviewStatusEnum("status").default("DRAFT"),
  ratings: jsonb("ratings").$type<{ category: string; score: number; comment?: string }[]>(),
  strengths: text("strengths"),
  improvements: text("improvements"),
  goals: jsonb("goals").$type<{ goal: string; achieved: boolean }[]>(),
  overallRating: decimal("overall_rating"),
  comments: text("comments"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_perf_reviews_org_cycle").on(table.orgId, table.cycleId),
  index("idx_perf_reviews_user").on(table.userId),
]);

export const oneOnOneMeetings = pgTable("one_on_one_meetings", {
  id: serial("id").primaryKey(),
  orgId: text("org_id").references(() => organizations.id).notNull(),
  managerId: text("manager_id").references(() => users.id).notNull(),
  employeeId: text("employee_id").references(() => users.id).notNull(),
  scheduledAt: timestamp("scheduled_at", { withTimezone: true }).notNull(),
  duration: integer("duration").default(30),
  status: meetingStatusEnum("status").default("SCHEDULED"),
  notes: text("notes"),
  actionItems: jsonb("action_items").$type<{ text: string; done: boolean }[]>(),
  additionalParticipants: jsonb("additional_participants").$type<string[]>(),
  agenda: text("agenda"),
  meetingLink: text("meeting_link"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_one_on_ones_org").on(table.orgId),
  index("idx_one_on_ones_manager").on(table.managerId),
  index("idx_one_on_ones_scheduled").on(table.scheduledAt),
]);

export const trainingPrograms = pgTable("training_programs", {
  id: serial("id").primaryKey(),
  orgId: text("org_id").references(() => organizations.id).notNull(),
  title: text("title").notNull(),
  description: text("description"),
  category: text("category"),
  duration: text("duration"),
  instructor: text("instructor"),
  maxParticipants: integer("max_participants"),
  status: trainingStatusEnum("status").default("DRAFT"),
  startDate: date("start_date"),
  endDate: date("end_date"),
  location: text("location"),
  meetingLink: text("meeting_link"),
  materials: text("materials"),
  createdBy: text("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_training_programs_org").on(table.orgId),
]);

export const trainingEnrollments = pgTable("training_enrollments", {
  id: serial("id").primaryKey(),
  orgId: text("org_id").references(() => organizations.id).notNull(),
  programId: integer("program_id").references(() => trainingPrograms.id, { onDelete: "cascade" }).notNull(),
  userId: text("user_id").references(() => users.id).notNull(),
  status: enrollmentStatusEnum("status").default("ENROLLED"),
  completedAt: timestamp("completed_at"),
  score: integer("score"),
  feedback: text("feedback"),
  certificateUrl: text("certificate_url"),
  enrolledAt: timestamp("enrolled_at").defaultNow(),
}, (table) => [
  index("idx_enrollments_program").on(table.programId),
  index("idx_enrollments_user").on(table.userId),
]);

export const resignations = pgTable("resignations", {
  id: serial("id").primaryKey(),
  orgId: text("org_id").references(() => organizations.id).notNull(),
  userId: text("user_id").references(() => users.id).notNull(),
  reason: text("reason"),
  reasonCategory: text("reason_category"),
  lastWorkingDate: date("last_working_date"),
  noticePeriodDays: integer("notice_period_days").default(30),
  status: resignationStatusEnum("status").default("SUBMITTED"),
  resignationLetterUrl: text("resignation_letter_url"),
  approvedBy: text("approved_by").references(() => users.id),
  approvedAt: timestamp("approved_at"),
  hrReviewedBy: text("hr_reviewed_by").references(() => users.id),
  hrReviewedAt: timestamp("hr_reviewed_at"),
  hrRemarks: text("hr_remarks"),
  ceoReviewedBy: text("ceo_reviewed_by").references(() => users.id),
  ceoReviewedAt: timestamp("ceo_reviewed_at"),
  ceoRemarks: text("ceo_remarks"),
  willingForExitInterview: boolean("willing_for_exit_interview").default(true),
  companyFeedback: text("company_feedback"),
  exitInterviewNotes: text("exit_interview_notes"),
  exitInterviewDate: timestamp("exit_interview_date"),
  exitInterviewConductedBy: text("exit_interview_conducted_by").references(() => users.id),
  feedback: jsonb("feedback").$type<{ question: string; answer: string }[]>(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_resignations_org").on(table.orgId),
  index("idx_resignations_user").on(table.userId),
]);

export const exitChecklists = pgTable("exit_checklists", {
  id: serial("id").primaryKey(),
  resignationId: integer("resignation_id").references(() => resignations.id, { onDelete: "cascade" }).notNull(),
  item: text("item").notNull(),
  assignedTo: text("assigned_to").references(() => users.id),
  status: exitChecklistStatusEnum("status").default("PENDING"),
  completedAt: timestamp("completed_at"),
  notes: text("notes"),
});

export const terminations = pgTable("terminations", {
  id: serial("id").primaryKey(),
  orgId: text("org_id").references(() => organizations.id).notNull(),
  userId: text("user_id").references(() => users.id).notNull(),
  reasons: text("reasons").array().notNull().default([]),
  detailedExplanation: text("detailed_explanation").notNull(),
  effectiveDate: date("effective_date").notNull(),
  severanceAmount: decimal("severance_amount"),
  noticePeriodWaived: boolean("notice_period_waived").default(false),
  terminationLetterUrl: text("termination_letter_url"),
  supportingDocUrls: text("supporting_doc_urls").array().default([]),
  evidenceUrls: jsonb("evidence_urls").$type<string[]>(),
  internalNotes: text("internal_notes"),
  status: terminationStatusEnum("status").default("DRAFT"),
  initiatedBy: text("initiated_by").references(() => users.id),
  ceoReviewedBy: text("ceo_reviewed_by").references(() => users.id),
  ceoReviewedAt: timestamp("ceo_reviewed_at"),
  ceoRemarks: text("ceo_remarks"),
  emailSentAt: timestamp("email_sent_at"),
  emailStatus: text("email_status"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_terminations_org").on(table.orgId),
  index("idx_terminations_user").on(table.userId),
  index("idx_terminations_status").on(table.status),
]);

export const documentTypes = pgTable("document_types", {
  id: serial("id").primaryKey(),
  orgId: text("org_id").references(() => organizations.id).notNull(),
  name: text("name").notNull(),
  slug: text("slug").notNull(),
  description: text("description"),
  isMandatory: boolean("is_mandatory").default(true),
  isActive: boolean("is_active").default(true),
  sortOrder: doublePrecision("sort_order").default(0),
  applicableRoles: text("applicable_roles").array().default([]),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_doc_types_org").on(table.orgId),
]);

export const onboardingDocuments = pgTable("onboarding_documents", {
  id: serial("id").primaryKey(),
  orgId: text("org_id").references(() => organizations.id).notNull(),
  userId: text("user_id").references(() => users.id).notNull(),
  documentTypeId: integer("document_type_id").references(() => documentTypes.id).notNull(),
  fileUrl: text("file_url").notNull(),
  fileName: text("file_name").notNull(),
  fileSize: integer("file_size"),
  mimeType: text("mime_type"),
  version: integer("version").default(1),
  status: onboardingDocumentStatusEnum("status").default("SUBMITTED"),
  reviewedBy: text("reviewed_by").references(() => users.id),
  reviewedAt: timestamp("reviewed_at"),
  remarks: text("remarks"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_onboarding_docs_user").on(table.userId),
  index("idx_onboarding_docs_org").on(table.orgId),
]);

export const documentAuditLogs = pgTable("document_audit_logs", {
  id: serial("id").primaryKey(),
  orgId: text("org_id").references(() => organizations.id).notNull(),
  onboardingDocumentId: integer("onboarding_document_id").references(() => onboardingDocuments.id).notNull(),
  action: docAuditActionEnum("action").notNull(),
  performedBy: text("performed_by").references(() => users.id).notNull(),
  remarks: text("remarks"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
});


export const recognitions = pgTable("recognitions", {
  id: serial("id").primaryKey(),
  orgId: text("org_id").references(() => organizations.id).notNull(),
  fromUserId: text("from_user_id").references(() => users.id).notNull(),
  toUserId: text("to_user_id").references(() => users.id).notNull(),
  message: text("message").notNull(),
  category: text("category").default("KUDOS"),
  isPublic: boolean("is_public").default(true),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_recognitions_org").on(table.orgId),
  index("idx_recognitions_to_user").on(table.toUserId),
]);

export const policyAcknowledgments = pgTable("policy_acknowledgments", {
  id: serial("id").primaryKey(),
  orgId: text("org_id").references(() => organizations.id).notNull(),
  documentId: integer("document_id").references(() => documents.id, { onDelete: "cascade" }).notNull(),
  userId: text("user_id").references(() => users.id).notNull(),
  status: ackStatusEnum("status").default("PENDING"),
  acknowledgedAt: timestamp("acknowledged_at"),
  ipAddress: text("ip_address"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_policy_ack_doc").on(table.documentId),
  index("idx_policy_ack_user").on(table.userId),
]);

export const reimbursements = pgTable("reimbursements", {
  id: serial("id").primaryKey(),
  orgId: text("org_id").references(() => organizations.id).notNull(),
  userId: text("user_id").references(() => users.id).notNull(),
  category: text("category").notNull(),
  amount: decimal("amount").notNull(),
  description: text("description"),
  receiptUrl: text("receipt_url"),
  status: reimbursementStatusEnum("status").default("PENDING"),
  approvedBy: text("approved_by").references(() => users.id),
  approvedAt: timestamp("approved_at"),
  paidAt: timestamp("paid_at"),
  rejectionReason: text("rejection_reason"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_reimbursements_org").on(table.orgId),
  index("idx_reimbursements_user").on(table.userId),
]);

export const salaryLoans = pgTable("salary_loans", {
  id: serial("id").primaryKey(),
  orgId: text("org_id").references(() => organizations.id).notNull(),
  userId: text("user_id").references(() => users.id).notNull(),
  amount: decimal("amount").notNull(),
  reason: text("reason"),
  emiAmount: decimal("emi_amount"),
  totalEmis: integer("total_emis"),
  paidEmis: integer("paid_emis").default(0),
  status: loanStatusEnum("status").default("PENDING"),
  approvedBy: text("approved_by").references(() => users.id),
  approvedAt: timestamp("approved_at"),
  disbursedAt: timestamp("disbursed_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_loans_org").on(table.orgId),
  index("idx_loans_user").on(table.userId),
]);

export const certifications = pgTable("certifications", {
  id: serial("id").primaryKey(),
  orgId: text("org_id").references(() => organizations.id).notNull(),
  userId: text("user_id").references(() => users.id).notNull(),
  name: text("name").notNull(),
  issuingOrganization: text("issuing_organization"),
  issueDate: date("issue_date"),
  expiryDate: date("expiry_date"),
  credentialId: text("credential_id"),
  credentialUrl: text("credential_url"),
  documentUrl: text("document_url"),
  reminderSent: boolean("reminder_sent").default(false),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_certifications_user").on(table.userId),
  index("idx_certifications_expiry").on(table.expiryDate),
]);

export const backgroundVerifications = pgTable("background_verifications", {
  id: serial("id").primaryKey(),
  orgId: text("org_id").references(() => organizations.id).notNull(),
  userId: text("user_id").references(() => users.id).notNull(),
  type: text("type").notNull(),
  status: text("status").default("PENDING"),
  provider: text("provider"),
  referenceNumber: text("reference_number"),
  result: text("result"),
  notes: text("notes"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_bgv_user").on(table.userId),
]);

export const appraisalCategories = pgTable("appraisal_categories", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  ratingType: appraisalRatingTypeEnum("rating_type").notNull(),
  weight: decimal("weight", { precision: 6, scale: 4 }).default("0.0833").notNull(),
  sortOrder: integer("sort_order").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const appraisalCycles = pgTable("appraisal_cycles", {
  id: serial("id").primaryKey(),
  orgId: text("org_id").references(() => organizations.id).notNull(),
  userId: text("user_id").references(() => users.id).notNull(),
  type: appraisalTypeEnum("type").notNull(),
  periodStart: date("period_start").notNull(),
  periodEnd: date("period_end").notNull(),
  dueDate: date("due_date"),
  anchorJoiningDate: date("anchor_joining_date"),
  status: appraisalCycleStatusEnum("status").default("OPEN"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_appraisal_cycles_org_user").on(table.orgId, table.userId),
  index("idx_appraisal_cycles_period").on(table.periodStart, table.periodEnd),
]);

export const appraisals = pgTable("appraisals", {
  id: serial("id").primaryKey(),
  orgId: text("org_id").references(() => organizations.id).notNull(),
  cycleId: integer("cycle_id").references(() => appraisalCycles.id),
  userId: text("user_id").references(() => users.id).notNull(),
  reviewerId: text("reviewer_id").references(() => users.id),
  currentStage: appraisalStageEnum("current_stage").default("CYCLE_INITIATION").notNull(),
  overallRating: decimal("overall_rating", { precision: 4, scale: 2 }),
  calibratedRating: decimal("calibrated_rating", { precision: 4, scale: 2 }),
  hrCalibrationNotes: text("hr_calibration_notes"),
  proposedSalary: decimal("proposed_salary", { precision: 14, scale: 2 }),
  salaryIncrementPct: decimal("salary_increment_pct", { precision: 5, scale: 2 }),
  promotionRecommended: boolean("promotion_recommended").notNull().default(false),
  proposedDesignation: text("proposed_designation"),
  appraisalLetterUrl: text("appraisal_letter_url"),
  discussionScheduledAt: timestamp("discussion_scheduled_at"),
  discussionNotes: text("discussion_notes"),
  outcomeNotes: text("outcome_notes"),
  confidentialityNote: text("confidentiality_note"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_appraisals_org_user").on(table.orgId, table.userId),
  index("idx_appraisals_stage").on(table.orgId, table.currentStage),
]);

export const appraisalCategoryRatings = pgTable("appraisal_category_ratings", {
  id: serial("id").primaryKey(),
  appraisalId: integer("appraisal_id").references(() => appraisals.id, { onDelete: "cascade" }).notNull(),
  categoryId: integer("category_id").references(() => appraisalCategories.id).notNull(),
  selfScore: decimal("self_score", { precision: 4, scale: 2 }),
  selfText: text("self_text"),
  managerScore: decimal("manager_score", { precision: 4, scale: 2 }),
  managerComment: text("manager_comment"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  uniqueIndex("uniq_appraisal_category_rating").on(table.appraisalId, table.categoryId),
  index("idx_appraisal_cat_ratings_appraisal").on(table.appraisalId),
]);

export const appraisalStages = pgTable("appraisal_stages", {
  id: serial("id").primaryKey(),
  appraisalId: integer("appraisal_id").references(() => appraisals.id, { onDelete: "cascade" }).notNull(),
  stage: appraisalStageEnum("stage").notNull(),
  assigneeId: text("assignee_id").references(() => users.id),
  status: appraisalStageRowStatusEnum("status").default("PENDING").notNull(),
  startedAt: timestamp("started_at").defaultNow(),
  dueAt: timestamp("due_at"),
  completedAt: timestamp("completed_at"),
  comment: text("comment"),
}, (table) => [
  index("idx_appraisal_stages_appraisal").on(table.appraisalId),
  index("idx_appraisal_stages_due").on(table.dueAt),
]);

export const appraisalAcknowledgements = pgTable("appraisal_acknowledgements", {
  id: serial("id").primaryKey(),
  appraisalId: integer("appraisal_id").references(() => appraisals.id, { onDelete: "cascade" }).notNull(),
  userId: text("user_id").references(() => users.id).notNull(),
  acknowledgedAt: timestamp("acknowledged_at").defaultNow(),
}, (table) => [
  uniqueIndex("uniq_appraisal_ack").on(table.appraisalId),
]);

export const performanceImprovementPlans = pgTable("performance_improvement_plans", {
  id: serial("id").primaryKey(),
  orgId: text("org_id").references(() => organizations.id).notNull(),
  userId: text("user_id").references(() => users.id).notNull(),
  managerId: text("manager_id").references(() => users.id).notNull(),
  reason: text("reason").notNull(),
  objectives: jsonb("objectives").$type<{ objective: string; metric: string; deadline: string }[]>(),
  startDate: date("start_date").notNull(),
  endDate: date("end_date").notNull(),
  status: pipStatusEnum("status").default("ACTIVE"),
  outcome: text("outcome"),
  notes: text("notes"),
  reasonCategory: pipReasonEnum("reason_category"),
  reasonEntries: jsonb("reason_entries").$type<{ category: string; description: string }[]>(),
  description: text("description"),
  areasOfConcern: text("areas_of_concern").array(),
  evidence: text("evidence"),
  reviewFrequency: pipReviewFrequencyEnum("review_frequency"),
  reviewMethod: text("review_method"),
  mentorId: text("mentor_id").references(() => users.id),
  hrRepId: text("hr_rep_id").references(() => users.id),
  expectedImprovement: text("expected_improvement"),
  consequencesIfNotMet: text("consequences_if_not_met"),
  acknowledgedAt: timestamp("acknowledged_at"),
  acknowledgedComment: text("acknowledged_comment"),
  managerApprovedAt: timestamp("manager_approved_at"),
  hrApprovedAt: timestamp("hr_approved_at"),
  linkedAppraisalId: integer("linked_appraisal_id").references(() => appraisals.id),
  finalOutcome: pipFinalOutcomeEnum("final_outcome"),
  initiatedBy: text("initiated_by").references(() => users.id),
  phase: text("phase").notNull().default("FORMAL_PIP"),
  sufficientEvidence: boolean("sufficient_evidence"),
  performanceImprovedCounseling: boolean("performance_improved_counseling"),
  counselingDate: date("counseling_date"),
  counselingNotes: text("counseling_notes"),
  monitoringPeriodDays: integer("monitoring_period_days"),
  managementDecision: text("management_decision"),
  midpointAssessmentNotes: text("midpoint_assessment_notes"),
  midpointOnTrack: boolean("midpoint_on_track"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_pip_user").on(table.userId),
  index("idx_pip_org_status").on(table.orgId, table.status),
  index("idx_pip_linked_appraisal").on(table.linkedAppraisalId),
]);

export const pipGoals = pgTable("pip_goals", {
  id: serial("id").primaryKey(),
  pipId: integer("pip_id").references(() => performanceImprovementPlans.id, { onDelete: "cascade" }).notNull(),
  title: text("title").notNull(),
  description: text("description"),
  successCriteria: text("success_criteria").notNull(),
  deadline: date("deadline").notNull(),
  sortOrder: integer("sort_order").default(0),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_pip_goals_pip").on(table.pipId),
]);

export const pipCheckIns = pgTable("pip_check_ins", {
  id: serial("id").primaryKey(),
  pipId: integer("pip_id").references(() => performanceImprovementPlans.id, { onDelete: "cascade" }).notNull(),
  checkInDate: date("check_in_date").notNull(),
  checkInType: pipReviewFrequencyEnum("check_in_type").notNull(),
  periodStart: date("period_start"),
  periodEnd: date("period_end"),
  overallStatus: pipProgressStatusEnum("overall_status"),
  summaryCommentsManager: text("summary_comments_manager"),
  summaryCommentsEmployee: text("summary_comments_employee"),
  managerRating: integer("manager_rating"),
  managerFeedback: text("manager_feedback"),
  improvementSinceLast: pipImprovementSinceEnum("improvement_since_last"),
  employeeSelfComments: text("employee_self_comments"),
  supportRequired: text("support_required"),
  riskLevel: pipRiskLevelEnum("risk_level"),
  escalationRequired: boolean("escalation_required").default(false),
  escalationNotes: text("escalation_notes"),
  managerAckAt: timestamp("manager_ack_at"),
  employeeAckAt: timestamp("employee_ack_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_pip_check_ins_pip").on(table.pipId),
  index("idx_pip_check_ins_date").on(table.checkInDate),
]);

export const pipCheckInGoalProgress = pgTable("pip_check_in_goal_progress", {
  id: serial("id").primaryKey(),
  checkInId: integer("check_in_id").references(() => pipCheckIns.id, { onDelete: "cascade" }).notNull(),
  pipGoalId: integer("pip_goal_id").references(() => pipGoals.id, { onDelete: "cascade" }).notNull(),
  progressStatus: pipProgressStatusEnum("progress_status").notNull(),
  percentComplete: integer("percent_complete").notNull(),
  workDone: text("work_done").notNull(),
  blockers: text("blockers").notNull(),
  nextSteps: text("next_steps").notNull(),
}, (table) => [
  uniqueIndex("uniq_pip_check_in_goal").on(table.checkInId, table.pipGoalId),
]);

export const pipDocuments = pgTable("pip_documents", {
  id: serial("id").primaryKey(),
  pipId: integer("pip_id").references(() => performanceImprovementPlans.id, { onDelete: "cascade" }).notNull(),
  orgId: text("org_id").references(() => organizations.id).notNull(),
  docType: text("doc_type").notNull(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  uploadedBy: text("uploaded_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_pip_documents_pip").on(table.pipId),
]);

export const keyResults = pgTable("key_results", {
  id: serial("id").primaryKey(),
  goalId: integer("goal_id").references(() => goals.id, { onDelete: "cascade" }).notNull(),
  title: text("title").notNull(),
  targetValue: decimal("target_value"),
  currentValue: decimal("current_value").default("0"),
  unit: text("unit"),
  progress: integer("progress").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_key_results_goal").on(table.goalId),
]);

export const employeeSkills = pgTable("employee_skills", {
  id: serial("id").primaryKey(),
  orgId: text("org_id").references(() => organizations.id).notNull(),
  userId: text("user_id").references(() => users.id).notNull(),
  skillName: text("skill_name").notNull(),
  level: integer("level").default(1),
  verifiedBy: text("verified_by").references(() => users.id),
  verifiedAt: timestamp("verified_at"),
  certifiedAt: timestamp("certified_at"),
  validUntil: date("valid_until"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_employee_skills_user").on(table.userId),
  index("idx_employee_skills_name").on(table.skillName),
]);

export const skillAssessments = pgTable("skill_assessments", {
  id: serial("id").primaryKey(),
  orgId: text("org_id").references(() => organizations.id).notNull(),
  title: text("title").notNull(),
  skillName: text("skill_name").notNull(),
  questions: jsonb("questions").$type<{ id: string; question: string; options: string[]; correctIndex: number }[]>(),
  passingScore: integer("passing_score").default(70),
  timeLimit: integer("time_limit"),
  createdBy: text("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_skill_assessments_org").on(table.orgId),
]);

export const assessmentAttempts = pgTable("assessment_attempts", {
  id: serial("id").primaryKey(),
  assessmentId: integer("assessment_id").references(() => skillAssessments.id, { onDelete: "cascade" }).notNull(),
  userId: text("user_id").references(() => users.id).notNull(),
  answers: jsonb("answers").$type<{ questionId: string; selectedIndex: number }[]>(),
  score: integer("score"),
  passed: boolean("passed").default(false),
  completedAt: timestamp("completed_at").defaultNow(),
}, (table) => [
  index("idx_assessment_attempts_user").on(table.userId),
]);

export const learningPaths = pgTable("learning_paths", {
  id: serial("id").primaryKey(),
  orgId: text("org_id").references(() => organizations.id).notNull(),
  title: text("title").notNull(),
  description: text("description"),
  targetRole: text("target_role"),
  steps: jsonb("steps").$type<{ order: number; type: "training" | "assessment" | "certification"; referenceId: number; title: string }[]>(),
  createdBy: text("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_learning_paths_org").on(table.orgId),
]);

export const teamEvents = pgTable("team_events", {
  id: serial("id").primaryKey(),
  orgId: text("org_id").references(() => organizations.id).notNull(),
  title: text("title").notNull(),
  description: text("description"),
  type: text("type").default("TEAM_BUILDING"),
  date: date("date").notNull(),
  time: text("time"),
  location: text("location"),
  maxParticipants: integer("max_participants"),
  organizedBy: text("organized_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_team_events_org").on(table.orgId),
]);

export const teamEventParticipants = pgTable("team_event_participants", {
  id: serial("id").primaryKey(),
  eventId: integer("event_id").references(() => teamEvents.id, { onDelete: "cascade" }).notNull(),
  userId: text("user_id").references(() => users.id).notNull(),
  status: text("status").default("GOING"),
  joinedAt: timestamp("joined_at").defaultNow(),
});

export const pulseSurveys = pgTable("pulse_surveys", {
  id: serial("id").primaryKey(),
  orgId: text("org_id").references(() => organizations.id).notNull(),
  title: text("title").notNull(),
  questions: jsonb("questions").$type<{ id: string; text: string; type: "rating" | "text" | "choice"; options?: string[] }[]>(),
  status: surveyStatusEnum("status").default("DRAFT"),
  isAnonymous: boolean("is_anonymous").default(true),
  createdBy: text("created_by").references(() => users.id),
  closesAt: timestamp("closes_at"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_surveys_org").on(table.orgId),
]);

export const surveyResponses = pgTable("survey_responses", {
  id: serial("id").primaryKey(),
  surveyId: integer("survey_id").references(() => pulseSurveys.id, { onDelete: "cascade" }).notNull(),
  userId: text("user_id").references(() => users.id),
  answers: jsonb("answers").$type<{ questionId: string; value: string | number }[]>(),
  submittedAt: timestamp("submitted_at").defaultNow(),
}, (table) => [
  index("idx_survey_responses_survey").on(table.surveyId),
]);

export const feedbackRequests = pgTable("feedback_requests", {
  id: serial("id").primaryKey(),
  orgId: text("org_id").references(() => organizations.id).notNull(),
  subjectUserId: text("subject_user_id").references(() => users.id).notNull(),
  reviewerUserId: text("reviewer_user_id").references(() => users.id).notNull(),
  type: feedbackTypeEnum("type").notNull(),
  cycleId: integer("cycle_id").references(() => reviewCycles.id),
  ratings: jsonb("ratings").$type<{ category: string; score: number; comment?: string }[]>(),
  strengths: text("strengths"),
  improvements: text("improvements"),
  overallRating: integer("overall_rating"),
  isCompleted: boolean("is_completed").default(false),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_feedback_subject").on(table.subjectUserId),
  index("idx_feedback_reviewer").on(table.reviewerUserId),
]);

export const emailTemplates = pgTable("hr_email_templates", {
  id: serial("id").primaryKey(),
  orgId: text("org_id").references(() => organizations.id).notNull(),
  name: text("name").notNull(),
  subject: text("subject").notNull(),
  body: text("body").notNull(),
  category: text("category").default("GENERAL"),
  variables: text("variables").array(),
  createdBy: text("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_email_templates_org").on(table.orgId),
]);

export const careerLadders = pgTable("career_ladders", {
  id: serial("id").primaryKey(),
  orgId: text("org_id").references(() => organizations.id).notNull(),
  title: text("title").notNull(),
  department: text("department"),
  description: text("description"),
  status: text("status").default("active").notNull(),
  trackType: text("track_type"),
  visibility: text("visibility").default("all").notNull(),
  levels: jsonb("levels").$type<{
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
  }[]>(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_career_ladders_org").on(table.orgId),
]);

export const bonuses = pgTable("bonuses", {
  id: serial("id").primaryKey(),
  orgId: text("org_id").references(() => organizations.id).notNull(),
  userId: text("user_id").references(() => users.id).notNull(),
  type: bonusTypeEnum("type").notNull(),
  amount: decimal("amount").notNull(),
  reason: text("reason"),
  month: text("month"),
  status: text("status").default("PENDING"),
  approvedBy: text("approved_by").references(() => users.id),
  approvedAt: timestamp("approved_at"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_bonuses_user").on(table.userId),
]);

export const fnfSettlements = pgTable("fnf_settlements", {
  id: serial("id").primaryKey(),
  orgId: text("org_id").references(() => organizations.id).notNull(),
  userId: text("user_id").references(() => users.id).notNull(),
  resignationId: integer("resignation_id").references(() => resignations.id),
  basicDues: decimal("basic_dues").default("0"),
  leaveEncashment: decimal("leave_encashment").default("0"),
  bonusDue: decimal("bonus_due").default("0"),
  deductions: decimal("deductions").default("0"),
  loanRecovery: decimal("loan_recovery").default("0"),
  netPayable: decimal("net_payable").default("0"),
  status: fnfStatusEnum("status").default("DRAFT"),
  approvedBy: text("approved_by").references(() => users.id),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_fnf_user").on(table.userId),
]);

export const assetReturns = pgTable("asset_returns", {
  id: serial("id").primaryKey(),
  orgId: text("org_id").references(() => organizations.id).notNull(),
  userId: text("user_id").references(() => users.id).notNull(),
  assetId: integer("asset_id").references(() => assets.id),
  assetName: text("asset_name").notNull(),
  status: text("status").default("PENDING"),
  returnedAt: timestamp("returned_at"),
  condition: text("condition"),
  notes: text("notes"),
  handoverPhotoUrls: jsonb("handover_photo_urls").$type<string[]>().notNull().default([]),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_asset_returns_user").on(table.userId),
]);

export const alumniProfiles = pgTable("alumni_profiles", {
  id: serial("id").primaryKey(),
  orgId: text("org_id").references(() => organizations.id).notNull(),
  userId: text("user_id").references(() => users.id).notNull(),
  currentCompany: text("current_company"),
  currentRole: text("current_role"),
  linkedinUrl: text("linkedin_url"),
  email: text("email"),
  leftDate: date("left_date"),
  isOptedIn: boolean("is_opted_in").default(true),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_alumni_org").on(table.orgId),
]);

export const enpsScores = pgTable("enps_scores", {
  id: serial("id").primaryKey(),
  orgId: text("org_id").references(() => organizations.id).notNull(),
  userId: text("user_id").references(() => users.id),
  score: integer("score").notNull(),
  comment: text("comment"),
  isAnonymous: boolean("is_anonymous").default(true),
  period: text("period"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_enps_org_period").on(table.orgId, table.period),
]);

export const handbookVersions = pgTable("handbook_versions", {
  id: serial("id").primaryKey(),
  orgId: text("org_id").references(() => organizations.id).notNull(),
  version: text("version").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  documentUrl: text("document_url"),
  documentId: integer("document_id").references(() => richDocuments.id),
  changelog: text("changelog"),
  status: text("status").notNull().default("DRAFT"),
  publishedAt: timestamp("published_at"),
  publishedBy: text("published_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_handbook_org").on(table.orgId),
  uniqueIndex("uq_handbook_org_version").on(table.orgId, table.version),
]);

export const goals = pgTable("goals", {
  id: serial("id").primaryKey(),
  orgId: text("org_id").references(() => organizations.id).notNull(),
  userId: text("user_id").notNull().references(() => users.id),
  title: text("title").notNull(),
  description: text("description"),
  type: text("type").default("OKR"),
  targetValue: decimal("target_value"),
  currentValue: decimal("current_value").default("0"),
  unit: text("unit"),
  startDate: date("start_date").notNull(),
  endDate: date("end_date").notNull(),
  status: text("status").default("IN_PROGRESS"),
  progress: integer("progress").default(0),
  parentGoalId: integer("parent_goal_id"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const holidays = pgTable("holidays", {
  id: serial("id").primaryKey(),
  orgId: text("org_id").references(() => organizations.id).notNull(),
  name: text("name").notNull(),
  date: date("date").notNull(),
  type: text("type").default("PUBLIC"),
  message: text("message"),
  isPublic: boolean("is_public").default(false).notNull(),
  isHalfDay: boolean("is_half_day").default(false).notNull(),
  notificationSent: boolean("notification_sent").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const wfhRequests = pgTable("wfh_requests", {
  id: serial("id").primaryKey(),
  orgId: text("org_id").references(() => organizations.id).notNull(),
  userId: text("user_id").references(() => users.id).notNull(),
  date: date("date").notNull(),
  reason: text("reason"),
  status: wfhRequestStatusEnum("status").default("PENDING"),
  approverId: text("approver_id").references(() => users.id),
  rejectionReason: text("rejection_reason"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const helpdeskTickets = pgTable("helpdesk_tickets", {
  id: serial("id").primaryKey(),
  orgId: text("org_id").references(() => organizations.id).notNull(),
  userId: text("user_id").notNull().references(() => users.id),
  title: text("title").notNull(),
  description: text("description"),
  category: text("category"),
  priority: ticketPriorityEnum("priority").default("MEDIUM"),
  status: ticketStatusEnum("status").default("TODO"),
  assigneeId: text("assignee_id").references(() => users.id),
  resolvedAt: timestamp("resolved_at"),
  resolution: text("resolution"),
  attachmentUrl: text("attachment_url"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const richDocuments = pgTable("rich_documents", {
  id: serial("id").primaryKey(),
  orgId: text("org_id").references(() => organizations.id).notNull(),
  title: text("title").notNull(),
  contentJson: jsonb("content_json"),
  templateType: text("template_type"),
  isPublished: boolean("is_published").default(false),
  version: integer("version").default(1),
  createdBy: text("created_by").references(() => users.id).notNull(),
  updatedBy: text("updated_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_rich_documents_org").on(table.orgId),
]);

export const jobPostings = pgTable("job_postings", {
  id: serial("id").primaryKey(),
  orgId: text("org_id").references(() => organizations.id).notNull(),
  title: text("title").notNull(),
  departmentId: integer("department_id").references(() => departments.id),
  location: text("location"),
  type: text("type").default("FULL_TIME"),
  experience: text("experience"),
  salaryMin: decimal("salary_min"),
  salaryMax: decimal("salary_max"),
  description: text("description"),
  requirements: text("requirements"),
  benefits: text("benefits"),
  status: jobPostingStatusEnum("status").default("DRAFT"),
  openings: integer("openings").default(1),
  applicationDeadline: date("application_deadline"),
  closingDate: timestamp("closing_date"),
  postedBy: text("posted_by").references(() => users.id),
  role: text("role"),
  workMode: text("work_mode"),
  country: text("country"),
  stateCity: text("state_city"),
  officeLocation: text("office_location"),
  currency: text("currency").default("INR"),
  salaryType: text("salary_type").default("ANNUAL"),
  bonus: text("bonus"),
  minExperience: integer("min_experience"),
  maxExperience: integer("max_experience"),
  educationLevel: text("education_level"),
  requiredSkills: text("required_skills").array(),
  preferredSkills: text("preferred_skills").array(),
  tags: text("tags").array(),
  overview: text("overview"),
  responsibilities: text("responsibilities"),
  hiringManager: text("hiring_manager"),
  interviewRounds: text("interview_rounds").array(),
  questionBank: text("question_bank"),
  resumeRequired: boolean("resume_required").default(true),
  coverLetterRequired: boolean("cover_letter_required").default(false),
  customFields: text("custom_fields").array(),
  visibility: text("visibility").default("PUBLIC"),
  priority: text("priority").default("MEDIUM"),
  referralEnabled: boolean("referral_enabled").default(false),
  approvalRequired: boolean("approval_required").default(false),

  applicationFields: jsonb("application_fields").$type<import("@/lib/hr/application-field-config").ApplicationFieldConfig>(),
  externalPostingIds: jsonb("external_posting_ids").$type<Record<string, string>>(),
  hiringFlowTemplateId: integer("hiring_flow_template_id"),
  hiringFlowConfig: jsonb("hiring_flow_config").$type<HiringFlowRoundConfig[]>(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_job_postings_org").on(table.orgId),
  index("idx_job_postings_status").on(table.status),
]);

export type HiringFlowRoundConfig = {
  roundOrder: number;
  name: string;
  type: string;
  interviewerRole?: string;
  scorecardTemplateId?: number;
  questionBankTag?: string;
  slaDays?: number;
  autoAdvanceThreshold?: number;
  durationMinutes?: number;
  mode?: string;
  notes?: string;
};

export const hiringFlowTemplates = pgTable("hiring_flow_templates", {
  id: serial("id").primaryKey(),
  orgId: text("org_id").references(() => organizations.id).notNull(),
  name: text("name").notNull(),
  description: text("description"),
  isDefault: boolean("is_default").default(false),
  createdBy: text("created_by").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_hiring_flow_templates_org").on(table.orgId),
]);

export const hiringFlowRounds = pgTable("hiring_flow_rounds", {
  id: serial("id").primaryKey(),
  templateId: integer("template_id").references(() => hiringFlowTemplates.id, { onDelete: "cascade" }).notNull(),
  orgId: text("org_id").references(() => organizations.id).notNull(),
  roundOrder: integer("round_order").notNull(),
  name: text("name").notNull(),
  type: text("type").notNull().default("INTERVIEW"),
  interviewerRole: text("interviewer_role"),
  scorecardTemplateId: integer("scorecard_template_id").references(() => scorecardTemplates.id),
  questionBankTag: text("question_bank_tag"),
  slaDays: integer("sla_days").default(3),
  autoAdvanceThreshold: integer("auto_advance_threshold"),
  durationMinutes: integer("duration_minutes").default(60),
  mode: text("mode").default("VIDEO"),
  notes: text("notes"),
}, (table) => [
  index("idx_hiring_flow_rounds_template").on(table.templateId),
]);

export const hiringFlowTemplatesRelations = relations(hiringFlowTemplates, ({ one, many }) => ({
  organization: one(organizations, { fields: [hiringFlowTemplates.orgId], references: [organizations.id] }),
  createdByUser: one(users, { fields: [hiringFlowTemplates.createdBy], references: [users.id] }),
  rounds: many(hiringFlowRounds),
}));

export const hiringFlowRoundsRelations = relations(hiringFlowRounds, ({ one }) => ({
  template: one(hiringFlowTemplates, { fields: [hiringFlowRounds.templateId], references: [hiringFlowTemplates.id] }),
  organization: one(organizations, { fields: [hiringFlowRounds.orgId], references: [organizations.id] }),
  scorecardTemplate: one(scorecardTemplates, { fields: [hiringFlowRounds.scorecardTemplateId], references: [scorecardTemplates.id] }),
}));

export const candidateSources = pgTable("candidate_sources", {
  id: serial("id").primaryKey(),
  orgId: text("org_id").references(() => organizations.id).notNull(),
  platform: text("platform").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  
  oauthToken: text("oauth_token"),
  
  meta: jsonb("meta").$type<Record<string, unknown>>(),
  lastSyncedAt: timestamp("last_synced_at"),
  lastSyncCount: integer("last_sync_count").default(0),
  createdBy: text("created_by").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_candidate_sources_org").on(table.orgId),
  uniqueIndex("uq_candidate_sources_org_platform").on(table.orgId, table.platform),
]);

export const candidates = pgTable("candidates", {
  id: serial("id").primaryKey(),
  orgId: text("org_id").references(() => organizations.id).notNull(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  email: text("email").notNull(),
  phone: text("phone"),
  resumeUrl: text("resume_url"),
  linkedinUrl: text("linkedin_url"),
  portfolioUrl: text("portfolio_url"),
  currentCompany: text("current_company"),
  currentRole: text("current_role"),
  experienceYears: decimal("experience_years"),
  skills: text("skills").array(),
  source: text("source").default("DIRECT"),
  status: candidateStatusEnum("status").default("NEW"),
  notes: text("notes"),
  rating: integer("rating"),
  referredBy: text("referred_by").references(() => users.id),
  externalId: text("external_id"),
  duplicateOfId: integer("duplicate_of_id"),
  resumeText: text("resume_text"),
  aiScore: integer("ai_score"),
  aiScoreBreakdown: jsonb("ai_score_breakdown").$type<Record<string, number>>(),
  aiScoreGeneratedAt: timestamp("ai_score_generated_at"),
  bgvStatus: text("bgv_status").$type<"NOT_INITIATED" | "INITIATED" | "PENDING" | "CLEARED" | "FAILED">().default("NOT_INITIATED"),
  bgvAgency: text("bgv_agency"),
  bgvNotes: text("bgv_notes"),
  bgvInitiatedAt: timestamp("bgv_initiated_at"),
  bgvCompletedAt: timestamp("bgv_completed_at"),
  sourceUrl: text("source_url"),
  location: text("location"),
  gender: text("gender").$type<"MALE" | "FEMALE" | "OTHER" | "PREFER_NOT_TO_SAY" | null>(),
  githubUrl: text("github_url"),
  education: jsonb("education").$type<{ qualification: string; specialization?: string; institution?: string; year?: string }[]>(),
  workExperience: jsonb("work_experience").$type<{ company: string; title?: string; startDate?: string; endDate?: string; description?: string }[]>(),
  customLinks: jsonb("custom_links").$type<{ label: string; url: string }[]>(),
  alternatePhone: text("alternate_phone"),
  dateOfBirth: date("date_of_birth"),
  preferredLocation: text("preferred_location"),
  requisitionId: text("requisition_id"),
  employmentType: text("employment_type"),
  applicationDate: date("application_date"),
  relevantExperienceMonths: integer("relevant_experience_months"),
  currentEmploymentStatus: text("current_employment_status"),
  noticePeriodDays: integer("notice_period_days"),
  availableFrom: date("available_from"),
  currentCtc: decimal("current_ctc"),
  expectedCtc: decimal("expected_ctc"),
  salaryCurrency: text("salary_currency"),
  coverLetterUrl: text("cover_letter_url"),
  workAuthorization: text("work_authorization"),
  willingToRelocate: boolean("willing_to_relocate"),
  preferredWorkMode: text("preferred_work_mode"),
  referralName: text("referral_name"),
  appliedTitle: text("applied_title"),
  appliedDepartment: text("applied_department"),
  skillEntries: jsonb("skill_entries").$type<{ name: string; skillType: string; proficiency?: string }[]>(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_candidates_org").on(table.orgId),
  index("idx_candidates_status").on(table.status),
  index("idx_candidates_email").on(table.email),
]);

export const candidateApplications = pgTable("candidate_applications", {
  id: serial("id").primaryKey(),
  orgId: text("org_id").references(() => organizations.id).notNull(),
  candidateId: integer("candidate_id").references(() => candidates.id, { onDelete: "cascade" }).notNull(),
  jobPostingId: integer("job_posting_id").references(() => jobPostings.id, { onDelete: "cascade" }).notNull(),
  status: applicationStatusEnum("status").default("APPLIED"),
  appliedAt: timestamp("applied_at").defaultNow(),
  coverLetter: text("cover_letter"),
  notes: text("notes"),
  pipelineStage: text("pipeline_stage").default("APPLIED"),
  currentRoundIndex: integer("current_round_index"),
  stageHistory: jsonb("stage_history").$type<{ stage: string; changedAt: string; changedBy?: string; notes?: string }[]>().default([]),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_applications_candidate").on(table.candidateId),
  index("idx_applications_job").on(table.jobPostingId),
]);

export const interviews = pgTable("interviews", {
  id: serial("id").primaryKey(),
  orgId: text("org_id").references(() => organizations.id).notNull(),
  candidateId: integer("candidate_id").references(() => candidates.id, { onDelete: "cascade" }).notNull(),
  jobPostingId: integer("job_posting_id").references(() => jobPostings.id),
  interviewerId: text("interviewer_id").references(() => users.id),
  type: interviewTypeEnum("type").default("VIDEO"),
  scheduledAt: timestamp("scheduled_at").notNull(),
  duration: integer("duration").default(60),
  location: text("location"),
  meetingLink: text("meeting_link"),
  result: interviewResultEnum("result").default("PENDING"),
  feedback: text("feedback"),
  rating: integer("rating"),
  rubric: jsonb("rubric").$type<{ category: string; score: number; maxScore: number; comment?: string }[]>(),
  notes: text("notes"),
  recordingUrl: text("recording_url"),
  recordingPlatform: text("recording_platform"),
  panelInterviewerIds: jsonb("panel_interviewer_ids").$type<string[]>().default([]),
  remindersSent: jsonb("reminders_sent").$type<Record<string, boolean>>().notNull().default({}),
  calendarSyncToken: text("calendar_sync_token"),
  applicationId: integer("application_id").references(() => candidateApplications.id),
  roundIndex: integer("round_index"),
  roundLabel: text("round_label"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_interviews_candidate").on(table.candidateId),
  index("idx_interviews_interviewer").on(table.interviewerId),
  index("idx_interviews_scheduled").on(table.scheduledAt),
]);


export const scorecardTemplates = pgTable("scorecard_templates", {
  id: serial("id").primaryKey(),
  orgId: text("org_id").references(() => organizations.id).notNull(),
  name: text("name").notNull(),
  criteria: jsonb("criteria").$type<Array<{ name: string; weight: number }>>().notNull().default([]),
  isActive: boolean("is_active").notNull().default(true),
  createdBy: text("created_by").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_scorecard_templates_org").on(table.orgId),
]);

export const interviewScorecards = pgTable("interview_scorecards", {
  id: serial("id").primaryKey(),
  interviewId: integer("interview_id").references(() => interviews.id, { onDelete: "cascade" }).notNull(),
  interviewerId: text("interviewer_id").references(() => users.id).notNull(),
  templateId: integer("template_id").references(() => scorecardTemplates.id),
  ratings: jsonb("ratings").$type<Record<string, number>>().notNull().default({}),
  recommendation: text("recommendation").notNull().default("MAYBE"),
  notes: text("notes"),
  isBlindMode: boolean("is_blind_mode").notNull().default(false),
  submittedAt: timestamp("submitted_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_scorecards_interview").on(table.interviewId),
  index("idx_scorecards_interviewer").on(table.interviewerId),
  uniqueIndex("uniq_scorecard_interview_interviewer").on(table.interviewId, table.interviewerId),
]);


export interface BookingSlot {
  start: string;
  end: string;
}

export const interviewBookingLinks = pgTable("interview_booking_links", {
  id: serial("id").primaryKey(),
  orgId: text("org_id").references(() => organizations.id).notNull(),
  candidateId: integer("candidate_id").references(() => candidates.id, { onDelete: "cascade" }).notNull(),
  jobPostingId: integer("job_posting_id").references(() => jobPostings.id),
  token: text("token").notNull().unique(),
  interviewerIds: jsonb("interviewer_ids").$type<string[]>().notNull().default([]),
  durationMinutes: integer("duration_minutes").notNull().default(60),
  interviewType: text("interview_type").notNull().default("VIDEO"),
  availableSlots: jsonb("available_slots").$type<BookingSlot[]>().notNull().default([]),
  selectedSlot: timestamp("selected_slot"),
  status: text("status").$type<"pending" | "booked" | "expired" | "cancelled">().notNull().default("pending"),
  expiresAt: timestamp("expires_at").notNull(),
  createdBy: text("created_by").references(() => users.id).notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_booking_links_token").on(table.token),
  index("idx_booking_links_candidate").on(table.candidateId),
]);


export const candidateReferrals = pgTable("candidate_referrals", {
  id: serial("id").primaryKey(),
  orgId: text("org_id").references(() => organizations.id).notNull(),
  candidateId: integer("candidate_id").references(() => candidates.id, { onDelete: "cascade" }).notNull(),
  referredBy: text("referred_by").references(() => users.id).notNull(),
  relationship: text("relationship"),
  notes: text("notes"),
  bonusEligible: boolean("bonus_eligible").notNull().default(true),
  bonusAmount: decimal("bonus_amount", { precision: 12, scale: 2 }),
  bonusPaidAt: timestamp("bonus_paid_at"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_referrals_candidate").on(table.candidateId),
  index("idx_referrals_referred_by").on(table.referredBy),
]);


export const calibrationSessions = pgTable("calibration_sessions", {
  id: serial("id").primaryKey(),
  orgId: text("org_id").references(() => organizations.id).notNull(),
  candidateId: integer("candidate_id").references(() => candidates.id, { onDelete: "cascade" }).notNull(),
  jobPostingId: integer("job_posting_id").references(() => jobPostings.id),
  scheduledAt: timestamp("scheduled_at"),
  status: text("status").$type<"pending" | "scheduled" | "completed" | "cancelled">().notNull().default("pending"),
  notes: text("notes"),
  decision: text("decision").$type<"STRONG_HIRE" | "HIRE" | "NO_HIRE" | "HOLD" | null>(),
  participantIds: jsonb("participant_ids").$type<string[]>().notNull().default([]),
  createdBy: text("created_by").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_calibration_sessions_candidate").on(table.candidateId),
  index("idx_calibration_sessions_org").on(table.orgId),
]);


export const candidateDocumentsVault = pgTable("candidate_documents_vault", {
  id: serial("id").primaryKey(),
  candidateId: integer("candidate_id").notNull(),
  orgId: text("org_id").references(() => organizations.id).notNull(),
  filename: text("filename").notNull(),
  s3Key: text("s3_key").notNull(),
  fileUrl: text("file_url").notNull(),
  fileType: text("file_type").notNull(),
  fileSize: integer("file_size").notNull().default(0),
  
  documentType: text("document_type"),
  avResult: text("av_result").$type<"PENDING" | "CLEAN" | "INFECTED">().notNull().default("PENDING"),
  expiresAt: date("expires_at"),
  uploadedBy: text("uploaded_by").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_vault_candidate").on(table.candidateId),
  index("idx_vault_org").on(table.orgId),
]);

export const vaultAccessLogs = pgTable("vault_access_logs", {
  id: serial("id").primaryKey(),
  vaultDocumentId: integer("vault_document_id").references(() => candidateDocumentsVault.id, { onDelete: "cascade" }).notNull(),
  accessedBy: text("accessed_by").references(() => users.id).notNull(),
  action: text("action").notNull().default("VIEW"),
  accessedAt: timestamp("accessed_at").defaultNow(),
});


export const onboardingTemplates = pgTable("onboarding_templates", {
  id: serial("id").primaryKey(),
  orgId: text("org_id").references(() => organizations.id).notNull(),
  name: text("name").notNull(),
  departmentId: integer("department_id"),
  description: text("description"),
  isActive: boolean("is_active").notNull().default(true),
  createdBy: text("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_onboarding_templates_org").on(table.orgId),
]);

export const onboardingTemplateSteps = pgTable("onboarding_template_steps", {
  id: serial("id").primaryKey(),
  templateId: integer("template_id").notNull().references(() => onboardingTemplates.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description"),
  ownerRole: text("owner_role").notNull().default("NEW_HIRE"),
  dueOffsetDays: integer("due_offset_days").notNull().default(0),
  isRequired: boolean("is_required").notNull().default(true),
  isComplianceItem: boolean("is_compliance_item").notNull().default(false),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const onboardingTasks = pgTable("onboarding_tasks", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id),
  orgId: text("org_id").notNull().references(() => organizations.id),
  templateStepId: integer("template_step_id").references(() => onboardingTemplateSteps.id),
  title: text("title").notNull(),
  description: text("description"),
  ownerRole: text("owner_role").notNull().default("NEW_HIRE"),
  dueDate: timestamp("due_date"),
  status: text("status").notNull().default("PENDING"),
  completedAt: timestamp("completed_at"),
  completedBy: text("completed_by").references(() => users.id),
  dependsOnTaskIds: jsonb("depends_on_task_ids").$type<number[]>().default([]),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_onboarding_tasks_user").on(table.userId, table.orgId),
  index("idx_onboarding_tasks_status").on(table.orgId, table.status),
]);


export const departmentsRelations = relations(departments, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [departments.orgId],
    references: [organizations.id],
  }),
  members: many(departmentMembers),
}));

export const departmentMembersRelations = relations(departmentMembers, ({ one }) => ({
  department: one(departments, {
    fields: [departmentMembers.departmentId],
    references: [departments.id],
  }),
  user: one(users, {
    fields: [departmentMembers.userId],
    references: [users.id],
  }),
}));

export const attendanceRelations = relations(attendance, ({ one }) => ({
  user: one(users, { fields: [attendance.userId], references: [users.id] }),
  holiday: one(holidays, { fields: [attendance.holidayId], references: [holidays.id] }),
}));

export const leaveRequestsRelations = relations(leaveRequests, ({ one }) => ({
  user: one(users, { fields: [leaveRequests.userId], references: [users.id] }),
  leaveType: one(leaveTypes, { fields: [leaveRequests.leaveTypeId], references: [leaveTypes.id] }),
  approver: one(users, { fields: [leaveRequests.approverId], references: [users.id], relationName: "leaveApprover" }),
  coveringEmployee: one(users, { fields: [leaveRequests.coveringEmployeeId], references: [users.id], relationName: "leaveCoveringEmployee" }),
}));

export const leaveBalancesRelations = relations(leaveBalances, ({ one }) => ({
  leaveType: one(leaveTypes, { fields: [leaveBalances.leaveTypeId], references: [leaveTypes.id] }),
}));

export const payrollsRelations = relations(payrolls, ({ one }) => ({
  user: one(users, { fields: [payrolls.userId], references: [users.id] }),
  generatedByUser: one(users, { fields: [payrolls.generatedBy], references: [users.id], relationName: "payrollGeneratedBy" }),
  approvedByUser: one(users, { fields: [payrolls.approvedBy], references: [users.id], relationName: "payrollApprovedBy" }),
}));

export const salaryStructuresRelations = relations(salaryStructures, ({ one }) => ({
  user: one(users, { fields: [salaryStructures.userId], references: [users.id] }),
}));

export const expenseCategoriesRelations = relations(expenseCategories, ({ many }) => ({
  expenses: many(expenses),
}));

export const expensesRelations = relations(expenses, ({ one }) => ({
  user: one(users, { fields: [expenses.userId], references: [users.id], relationName: "expenseUser" }),
  approver: one(users, { fields: [expenses.approverId], references: [users.id], relationName: "expenseApprover" }),
  expenseCategory: one(expenseCategories, { fields: [expenses.categoryId], references: [expenseCategories.id] }),
  project: one(projects, { fields: [expenses.projectId], references: [projects.id] }),
}));

export const assetsRelations = relations(assets, ({ one }) => ({
  assignedUser: one(users, { fields: [assets.assignedTo], references: [users.id] }),
}));

export const documentsRelations = relations(documents, ({ one }) => ({
  user: one(users, { fields: [documents.userId], references: [users.id] }),
  uploader: one(users, { fields: [documents.uploadedBy], references: [users.id], relationName: "documentUploader" }),
  parent: one(documents, { fields: [documents.parentDocumentId], references: [documents.id] }),
}));

export const reviewCyclesRelations = relations(reviewCycles, ({ one, many }) => ({
  organization: one(organizations, { fields: [reviewCycles.orgId], references: [organizations.id] }),
  creator: one(users, { fields: [reviewCycles.createdBy], references: [users.id] }),
  reviews: many(performanceReviews),
}));

export const performanceReviewsRelations = relations(performanceReviews, ({ one }) => ({
  user: one(users, { fields: [performanceReviews.userId], references: [users.id], relationName: "reviewUser" }),
  reviewer: one(users, { fields: [performanceReviews.reviewerId], references: [users.id], relationName: "reviewReviewer" }),
  cycle: one(reviewCycles, { fields: [performanceReviews.cycleId], references: [reviewCycles.id] }),
}));

export const oneOnOneMeetingsRelations = relations(oneOnOneMeetings, ({ one }) => ({
  organization: one(organizations, { fields: [oneOnOneMeetings.orgId], references: [organizations.id] }),
  manager: one(users, { fields: [oneOnOneMeetings.managerId], references: [users.id], relationName: "meetingManager" }),
  employee: one(users, { fields: [oneOnOneMeetings.employeeId], references: [users.id], relationName: "meetingEmployee" }),
}));

export const goalsRelations = relations(goals, ({ one }) => ({
  user: one(users, { fields: [goals.userId], references: [users.id] }),
  parent: one(goals, { fields: [goals.parentGoalId], references: [goals.id] }),
}));

export const holidaysRelations = relations(holidays, ({ one }) => ({
  organization: one(organizations, { fields: [holidays.orgId], references: [organizations.id] }),
}));

export const wfhRequestsRelations = relations(wfhRequests, ({ one }) => ({
  user: one(users, { fields: [wfhRequests.userId], references: [users.id] }),
  approver: one(users, { fields: [wfhRequests.approverId], references: [users.id], relationName: "wfhApprover" }),
}));

export const jobPostingsRelations = relations(jobPostings, ({ one, many }) => ({
  organization: one(organizations, { fields: [jobPostings.orgId], references: [organizations.id] }),
  department: one(departments, { fields: [jobPostings.departmentId], references: [departments.id] }),
  postedByUser: one(users, { fields: [jobPostings.postedBy], references: [users.id] }),
  applications: many(candidateApplications),
}));

export const candidateSourcesRelations = relations(candidateSources, ({ one }) => ({
  organization: one(organizations, { fields: [candidateSources.orgId], references: [organizations.id] }),
  createdByUser: one(users, { fields: [candidateSources.createdBy], references: [users.id] }),
}));

export const candidatesRelations = relations(candidates, ({ many }) => ({
  applications: many(candidateApplications),
  interviews: many(interviews),
}));

export const candidateApplicationsRelations = relations(candidateApplications, ({ one }) => ({
  candidate: one(candidates, { fields: [candidateApplications.candidateId], references: [candidates.id] }),
  jobPosting: one(jobPostings, { fields: [candidateApplications.jobPostingId], references: [jobPostings.id] }),
}));

export const interviewsRelations = relations(interviews, ({ one, many }) => ({
  candidate: one(candidates, { fields: [interviews.candidateId], references: [candidates.id] }),
  jobPosting: one(jobPostings, { fields: [interviews.jobPostingId], references: [jobPostings.id] }),
  interviewer: one(users, { fields: [interviews.interviewerId], references: [users.id] }),
  scorecards: many(interviewScorecards),
}));

export const richDocumentsRelations = relations(richDocuments, ({ one }) => ({
  organization: one(organizations, { fields: [richDocuments.orgId], references: [organizations.id] }),
  creator: one(users, { fields: [richDocuments.createdBy], references: [users.id] }),
}));

export const trainingProgramsRelations = relations(trainingPrograms, ({ one, many }) => ({
  organization: one(organizations, { fields: [trainingPrograms.orgId], references: [organizations.id] }),
  creator: one(users, { fields: [trainingPrograms.createdBy], references: [users.id] }),
  enrollments: many(trainingEnrollments),
}));

export const trainingEnrollmentsRelations = relations(trainingEnrollments, ({ one }) => ({
  program: one(trainingPrograms, { fields: [trainingEnrollments.programId], references: [trainingPrograms.id] }),
  user: one(users, { fields: [trainingEnrollments.userId], references: [users.id] }),
}));

export const resignationsRelations = relations(resignations, ({ one, many }) => ({
  user: one(users, { fields: [resignations.userId], references: [users.id] }),
  approver: one(users, { fields: [resignations.approvedBy], references: [users.id], relationName: "resignationApprover" }),
  hrReviewer: one(users, { fields: [resignations.hrReviewedBy], references: [users.id], relationName: "resignationHrReviewer" }),
  ceoReviewer: one(users, { fields: [resignations.ceoReviewedBy], references: [users.id], relationName: "resignationCeoReviewer" }),
  interviewer: one(users, { fields: [resignations.exitInterviewConductedBy], references: [users.id], relationName: "exitInterviewer" }),
  checklists: many(exitChecklists),
}));

export const terminationsRelations = relations(terminations, ({ one }) => ({
  user: one(users, { fields: [terminations.userId], references: [users.id] }),
  initiator: one(users, { fields: [terminations.initiatedBy], references: [users.id], relationName: "terminationInitiator" }),
  ceoReviewer: one(users, { fields: [terminations.ceoReviewedBy], references: [users.id], relationName: "terminationCeoReviewer" }),
}));

export const exitChecklistsRelations = relations(exitChecklists, ({ one }) => ({
  resignation: one(resignations, { fields: [exitChecklists.resignationId], references: [resignations.id] }),
  assignee: one(users, { fields: [exitChecklists.assignedTo], references: [users.id] }),
}));

export const recognitionsRelations = relations(recognitions, ({ one }) => ({
  fromUser: one(users, { fields: [recognitions.fromUserId], references: [users.id], relationName: "recognitionFrom" }),
  toUser: one(users, { fields: [recognitions.toUserId], references: [users.id], relationName: "recognitionTo" }),
}));

export const policyAcknowledgmentsRelations = relations(policyAcknowledgments, ({ one }) => ({
  document: one(documents, { fields: [policyAcknowledgments.documentId], references: [documents.id] }),
  user: one(users, { fields: [policyAcknowledgments.userId], references: [users.id] }),
}));

export const reimbursementsRelations = relations(reimbursements, ({ one }) => ({
  user: one(users, { fields: [reimbursements.userId], references: [users.id] }),
  approver: one(users, { fields: [reimbursements.approvedBy], references: [users.id], relationName: "reimbursementApprover" }),
}));

export const salaryLoansRelations = relations(salaryLoans, ({ one }) => ({
  user: one(users, { fields: [salaryLoans.userId], references: [users.id] }),
  approver: one(users, { fields: [salaryLoans.approvedBy], references: [users.id], relationName: "loanApprover" }),
}));

export const certificationsRelations = relations(certifications, ({ one }) => ({
  user: one(users, { fields: [certifications.userId], references: [users.id] }),
}));

export const backgroundVerificationsRelations = relations(backgroundVerifications, ({ one }) => ({
  user: one(users, { fields: [backgroundVerifications.userId], references: [users.id] }),
}));

export const appraisalCategoriesRelations = relations(appraisalCategories, ({ many }) => ({
  ratings: many(appraisalCategoryRatings),
}));

export const appraisalCyclesRelations = relations(appraisalCycles, ({ one, many }) => ({
  organization: one(organizations, { fields: [appraisalCycles.orgId], references: [organizations.id] }),
  user: one(users, { fields: [appraisalCycles.userId], references: [users.id] }),
  appraisals: many(appraisals),
}));

export const appraisalsRelations = relations(appraisals, ({ one, many }) => ({
  organization: one(organizations, { fields: [appraisals.orgId], references: [organizations.id] }),
  cycle: one(appraisalCycles, { fields: [appraisals.cycleId], references: [appraisalCycles.id] }),
  user: one(users, { fields: [appraisals.userId], references: [users.id], relationName: "appraisalSubject" }),
  reviewer: one(users, { fields: [appraisals.reviewerId], references: [users.id], relationName: "appraisalReviewer" }),
  categoryRatings: many(appraisalCategoryRatings),
  stages: many(appraisalStages),
  acknowledgement: one(appraisalAcknowledgements, { fields: [appraisals.id], references: [appraisalAcknowledgements.appraisalId] }),
  linkedPIPs: many(performanceImprovementPlans),
}));

export const appraisalCategoryRatingsRelations = relations(appraisalCategoryRatings, ({ one }) => ({
  appraisal: one(appraisals, { fields: [appraisalCategoryRatings.appraisalId], references: [appraisals.id] }),
  category: one(appraisalCategories, { fields: [appraisalCategoryRatings.categoryId], references: [appraisalCategories.id] }),
}));

export const appraisalStagesRelations = relations(appraisalStages, ({ one }) => ({
  appraisal: one(appraisals, { fields: [appraisalStages.appraisalId], references: [appraisals.id] }),
  assignee: one(users, { fields: [appraisalStages.assigneeId], references: [users.id], relationName: "appraisalStageAssignee" }),
}));

export const appraisalAcknowledgementsRelations = relations(appraisalAcknowledgements, ({ one }) => ({
  appraisal: one(appraisals, { fields: [appraisalAcknowledgements.appraisalId], references: [appraisals.id] }),
  user: one(users, { fields: [appraisalAcknowledgements.userId], references: [users.id] }),
}));

export const pipRelations = relations(performanceImprovementPlans, ({ one, many }) => ({
  user: one(users, { fields: [performanceImprovementPlans.userId], references: [users.id] }),
  manager: one(users, { fields: [performanceImprovementPlans.managerId], references: [users.id], relationName: "pipManager" }),
  mentor: one(users, { fields: [performanceImprovementPlans.mentorId], references: [users.id], relationName: "pipMentor" }),
  hrRep: one(users, { fields: [performanceImprovementPlans.hrRepId], references: [users.id], relationName: "pipHrRep" }),
  initiator: one(users, { fields: [performanceImprovementPlans.initiatedBy], references: [users.id], relationName: "pipInitiator" }),
  linkedAppraisal: one(appraisals, { fields: [performanceImprovementPlans.linkedAppraisalId], references: [appraisals.id] }),
  goals: many(pipGoals),
  checkIns: many(pipCheckIns),
  documents: many(pipDocuments),
}));

export const pipGoalsRelations = relations(pipGoals, ({ one, many }) => ({
  pip: one(performanceImprovementPlans, { fields: [pipGoals.pipId], references: [performanceImprovementPlans.id] }),
  checkInProgress: many(pipCheckInGoalProgress),
}));

export const pipCheckInsRelations = relations(pipCheckIns, ({ one, many }) => ({
  pip: one(performanceImprovementPlans, { fields: [pipCheckIns.pipId], references: [performanceImprovementPlans.id] }),
  goalProgressRows: many(pipCheckInGoalProgress),
}));

export const pipCheckInGoalProgressRelations = relations(pipCheckInGoalProgress, ({ one }) => ({
  checkIn: one(pipCheckIns, { fields: [pipCheckInGoalProgress.checkInId], references: [pipCheckIns.id] }),
  goal: one(pipGoals, { fields: [pipCheckInGoalProgress.pipGoalId], references: [pipGoals.id] }),
}));

export const pipDocumentsRelations = relations(pipDocuments, ({ one }) => ({
  pip: one(performanceImprovementPlans, { fields: [pipDocuments.pipId], references: [performanceImprovementPlans.id] }),
  uploader: one(users, { fields: [pipDocuments.uploadedBy], references: [users.id] }),
}));

export const keyResultsRelations = relations(keyResults, ({ one }) => ({
  goal: one(goals, { fields: [keyResults.goalId], references: [goals.id] }),
}));

export const employeeSkillsRelations = relations(employeeSkills, ({ one }) => ({
  user: one(users, { fields: [employeeSkills.userId], references: [users.id] }),
  verifier: one(users, { fields: [employeeSkills.verifiedBy], references: [users.id], relationName: "skillVerifier" }),
}));

export const pulseSurveysRelations = relations(pulseSurveys, ({ one, many }) => ({
  creator: one(users, { fields: [pulseSurveys.createdBy], references: [users.id] }),
  responses: many(surveyResponses),
}));

export const surveyResponsesRelations = relations(surveyResponses, ({ one }) => ({
  survey: one(pulseSurveys, { fields: [surveyResponses.surveyId], references: [pulseSurveys.id] }),
  user: one(users, { fields: [surveyResponses.userId], references: [users.id] }),
}));

export const feedbackRequestsRelations = relations(feedbackRequests, ({ one }) => ({
  subject: one(users, { fields: [feedbackRequests.subjectUserId], references: [users.id], relationName: "feedbackSubject" }),
  reviewer: one(users, { fields: [feedbackRequests.reviewerUserId], references: [users.id], relationName: "feedbackReviewer" }),
  cycle: one(reviewCycles, { fields: [feedbackRequests.cycleId], references: [reviewCycles.id] }),
}));

export const emailTemplatesRelations = relations(emailTemplates, ({ one }) => ({
  creator: one(users, { fields: [emailTemplates.createdBy], references: [users.id] }),
}));

export const bonusesRelations = relations(bonuses, ({ one }) => ({
  user: one(users, { fields: [bonuses.userId], references: [users.id] }),
  approver: one(users, { fields: [bonuses.approvedBy], references: [users.id], relationName: "bonusApprover" }),
}));

export const fnfSettlementsRelations = relations(fnfSettlements, ({ one }) => ({
  user: one(users, { fields: [fnfSettlements.userId], references: [users.id] }),
  resignation: one(resignations, { fields: [fnfSettlements.resignationId], references: [resignations.id] }),
}));

export const assetReturnsRelations = relations(assetReturns, ({ one }) => ({
  user: one(users, { fields: [assetReturns.userId], references: [users.id] }),
  asset: one(assets, { fields: [assetReturns.assetId], references: [assets.id] }),
}));

export const alumniProfilesRelations = relations(alumniProfiles, ({ one }) => ({
  user: one(users, { fields: [alumniProfiles.userId], references: [users.id] }),
}));

export const handbookVersionsRelations = relations(handbookVersions, ({ one }) => ({
  document: one(richDocuments, { fields: [handbookVersions.documentId], references: [richDocuments.id] }),
  publisher: one(users, { fields: [handbookVersions.publishedBy], references: [users.id] }),
}));

export const skillAssessmentsRelations = relations(skillAssessments, ({ one, many }) => ({
  creator: one(users, { fields: [skillAssessments.createdBy], references: [users.id] }),
  attempts: many(assessmentAttempts),
}));

export const assessmentAttemptsRelations = relations(assessmentAttempts, ({ one }) => ({
  assessment: one(skillAssessments, { fields: [assessmentAttempts.assessmentId], references: [skillAssessments.id] }),
  user: one(users, { fields: [assessmentAttempts.userId], references: [users.id] }),
}));

export const learningPathsRelations = relations(learningPaths, ({ one }) => ({
  creator: one(users, { fields: [learningPaths.createdBy], references: [users.id] }),
}));

export const teamEventsRelations = relations(teamEvents, ({ one, many }) => ({
  organizer: one(users, { fields: [teamEvents.organizedBy], references: [users.id] }),
  participants: many(teamEventParticipants),
}));

export const teamEventParticipantsRelations = relations(teamEventParticipants, ({ one }) => ({
  event: one(teamEvents, { fields: [teamEventParticipants.eventId], references: [teamEvents.id] }),
  user: one(users, { fields: [teamEventParticipants.userId], references: [users.id] }),
}));

export const scorecardTemplatesRelations = relations(scorecardTemplates, ({ one, many }) => ({
  organization: one(organizations, { fields: [scorecardTemplates.orgId], references: [organizations.id] }),
  creator: one(users, { fields: [scorecardTemplates.createdBy], references: [users.id] }),
  scorecards: many(interviewScorecards),
}));

export const interviewScorecardsRelations = relations(interviewScorecards, ({ one }) => ({
  interview: one(interviews, { fields: [interviewScorecards.interviewId], references: [interviews.id] }),
  interviewer: one(users, { fields: [interviewScorecards.interviewerId], references: [users.id] }),
  template: one(scorecardTemplates, { fields: [interviewScorecards.templateId], references: [scorecardTemplates.id] }),
}));

export const candidateDocumentsVaultRelations = relations(candidateDocumentsVault, ({ one, many }) => ({
  organization: one(organizations, { fields: [candidateDocumentsVault.orgId], references: [organizations.id] }),
  uploader: one(users, { fields: [candidateDocumentsVault.uploadedBy], references: [users.id] }),
  accessLogs: many(vaultAccessLogs),
}));

export const vaultAccessLogsRelations = relations(vaultAccessLogs, ({ one }) => ({
  document: one(candidateDocumentsVault, { fields: [vaultAccessLogs.vaultDocumentId], references: [candidateDocumentsVault.id] }),
  accessor: one(users, { fields: [vaultAccessLogs.accessedBy], references: [users.id] }),
}));

export const onboardingTemplatesRelations = relations(onboardingTemplates, ({ one, many }) => ({
  organization: one(organizations, { fields: [onboardingTemplates.orgId], references: [organizations.id] }),
  creator: one(users, { fields: [onboardingTemplates.createdBy], references: [users.id] }),
  steps: many(onboardingTemplateSteps),
}));

export const onboardingTemplateStepsRelations = relations(onboardingTemplateSteps, ({ one }) => ({
  template: one(onboardingTemplates, { fields: [onboardingTemplateSteps.templateId], references: [onboardingTemplates.id] }),
}));

export const onboardingTasksRelations = relations(onboardingTasks, ({ one }) => ({
  user: one(users, { fields: [onboardingTasks.userId], references: [users.id], relationName: "onboardingTaskUser" }),
  completedByUser: one(users, { fields: [onboardingTasks.completedBy], references: [users.id], relationName: "onboardingTaskCompletedBy" }),
  templateStep: one(onboardingTemplateSteps, { fields: [onboardingTasks.templateStepId], references: [onboardingTemplateSteps.id] }),
}));


export const documentFolders = pgTable("document_folders", {
  id: serial("id").primaryKey(),
  orgId: text("org_id").references(() => organizations.id).notNull(),
  name: text("name").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_document_folders_org").on(table.orgId),
]);

export const orgDocumentVariables = pgTable("org_document_variables", {
  id: serial("id").primaryKey(),
  orgId: text("org_id").references(() => organizations.id).notNull(),
  slug: text("slug").notNull(),
  label: text("label").notNull(),
  defaultValue: text("default_value").notNull().default(""),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_org_doc_vars_org").on(table.orgId),
]);

export const documentTemplates = pgTable("document_templates", {
  id: serial("id").primaryKey(),
  orgId: text("org_id").references(() => organizations.id).notNull(),
  title: text("title").notNull(),
  type: text("type").notNull().default("OFFER"),
  htmlContent: text("html_content").notNull().default(""),
  variables: jsonb("variables").$type<string[]>().notNull().default([]),
  version: integer("version").notNull().default(1),
  isActive: boolean("is_active").notNull().default(true),
  createdBy: text("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_doc_templates_org").on(table.orgId, table.type),
]);

export const candidateDocuments = pgTable("candidate_documents", {
  id: serial("id").primaryKey(),
  candidateId: integer("candidate_id").notNull(),
  orgId: text("org_id").references(() => organizations.id).notNull(),
  templateId: integer("template_id").references(() => documentTemplates.id),
  title: text("title").notNull(),
  htmlContent: text("html_content").notNull().default(""),
  status: text("status").notNull().default("GENERATED"),
  
  externalDocId: text("external_doc_id"),
  sentAt: timestamp("sent_at"),
  viewedAt: timestamp("viewed_at"),
  signedAt: timestamp("signed_at"),
  declinedAt: timestamp("declined_at"),
  
  acceptanceDeadline: timestamp("acceptance_deadline"),
  createdBy: text("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_candidate_docs_candidate").on(table.candidateId),
  index("idx_candidate_docs_external").on(table.externalDocId),
]);

export const documentTemplateVersions = pgTable("document_template_versions", {
  id: serial("id").primaryKey(),
  templateId: integer("template_id").notNull().references(() => documentTemplates.id, { onDelete: "cascade" }),
  orgId: text("org_id").notNull(),
  version: integer("version").notNull(),
  title: text("title").notNull(),
  type: text("type").notNull(),
  htmlContent: text("html_content").notNull(),
  variables: jsonb("variables").$type<string[]>().notNull().default([]),
  archivedAt: timestamp("archived_at").defaultNow(),
  archivedBy: text("archived_by").notNull().references(() => users.id),
}, (table) => [
  index("idx_dtv_template_id").on(table.templateId),
]);


export const documentTemplatesRelations = relations(documentTemplates, ({ one, many }) => ({
  organization: one(organizations, { fields: [documentTemplates.orgId], references: [organizations.id] }),
  creator: one(users, { fields: [documentTemplates.createdBy], references: [users.id] }),
  candidateDocuments: many(candidateDocuments),
  versions: many(documentTemplateVersions),
}));

export const documentTemplateVersionsRelations = relations(documentTemplateVersions, ({ one }) => ({
  template: one(documentTemplates, { fields: [documentTemplateVersions.templateId], references: [documentTemplates.id] }),
  archivedByUser: one(users, { fields: [documentTemplateVersions.archivedBy], references: [users.id] }),
}));

export const candidateDocumentsRelations = relations(candidateDocuments, ({ one }) => ({
  template: one(documentTemplates, { fields: [candidateDocuments.templateId], references: [documentTemplates.id] }),
  organization: one(organizations, { fields: [candidateDocuments.orgId], references: [organizations.id] }),
  creator: one(users, { fields: [candidateDocuments.createdBy], references: [users.id] }),
}));


export const interviewSlas = pgTable("interview_slas", {
  id: serial("id").primaryKey(),
  orgId: text("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  stage: text("stage").notNull(),
  maxHours: integer("max_hours").notNull().default(48),
  warningHours: integer("warning_hours").notNull().default(36),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  uniqueIndex("uniq_interview_sla_org_stage").on(table.orgId, table.stage),
]);

export const candidateSlaTracking = pgTable("candidate_sla_tracking", {
  id: serial("id").primaryKey(),
  orgId: text("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  candidateId: integer("candidate_id").notNull().references(() => candidates.id, { onDelete: "cascade" }),
  stage: text("stage").notNull(),
  enteredAt: timestamp("entered_at").notNull().defaultNow(),
  breachedAt: timestamp("breached_at"),
  status: text("status").notNull().default("ON_TRACK"),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  uniqueIndex("uniq_sla_tracking_candidate_stage").on(table.candidateId, table.stage),
  index("idx_sla_tracking_org_status").on(table.orgId, table.status),
  index("idx_sla_tracking_candidate").on(table.candidateId),
]);

export const interviewSlasRelations = relations(interviewSlas, ({ one }) => ({
  organization: one(organizations, { fields: [interviewSlas.orgId], references: [organizations.id] }),
}));

export const candidateSlaTrackingRelations = relations(candidateSlaTracking, ({ one }) => ({
  organization: one(organizations, { fields: [candidateSlaTracking.orgId], references: [organizations.id] }),
  candidate: one(candidates, { fields: [candidateSlaTracking.candidateId], references: [candidates.id] }),
}));


export const interviewQuestions = pgTable("interview_questions", {
  id: serial("id").primaryKey(),
  orgId: text("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  question: text("question").notNull(),
  category: text("category").notNull().default("GENERAL"),
  role: text("role"),
  difficulty: text("difficulty").notNull().default("MEDIUM"),
  tags: text("tags").array().default([]),
  sampleAnswer: text("sample_answer"),
  keywords: text("keywords").array().default([]),
  isActive: boolean("is_active").notNull().default(true),
  createdBy: text("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_interview_questions_org").on(table.orgId),
  index("idx_interview_questions_category").on(table.orgId, table.category),
]);

export const interviewQuestionsRelations = relations(interviewQuestions, ({ one }) => ({
  organization: one(organizations, { fields: [interviewQuestions.orgId], references: [organizations.id] }),
  creator: one(users, { fields: [interviewQuestions.createdBy], references: [users.id] }),
}));


export const candidateReferenceChecks = pgTable("candidate_reference_checks", {
  id: serial("id").primaryKey(),
  candidateId: integer("candidate_id").notNull().references(() => candidates.id, { onDelete: "cascade" }),
  orgId: text("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  referenceName: text("reference_name").notNull(),
  referenceDesignation: text("reference_designation"),
  referenceCompany: text("reference_company"),
  referenceEmail: text("reference_email"),
  referencePhone: text("reference_phone"),
  relationship: text("relationship"),
  status: text("status").notNull().default("PENDING"),
  outcome: text("outcome"),
  notes: text("notes"),
  contactedAt: timestamp("contacted_at"),
  createdBy: text("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_reference_checks_candidate").on(table.candidateId),
  index("idx_reference_checks_org").on(table.orgId),
]);

export const candidateReferenceChecksRelations = relations(candidateReferenceChecks, ({ one }) => ({
  candidate: one(candidates, { fields: [candidateReferenceChecks.candidateId], references: [candidates.id] }),
  organization: one(organizations, { fields: [candidateReferenceChecks.orgId], references: [organizations.id] }),
  createdByUser: one(users, { fields: [candidateReferenceChecks.createdBy], references: [users.id] }),
}));


export const candidateOffers = pgTable("candidate_offers", {
  id: serial("id").primaryKey(),
  orgId: text("org_id").notNull().references(() => organizations.id),
  candidateId: integer("candidate_id").notNull().references(() => candidates.id, { onDelete: "cascade" }),
  jobPostingId: integer("job_posting_id").references(() => jobPostings.id),
  offeredBy: text("offered_by").references(() => users.id),
  offerStatus: text("offer_status").notNull().default("DRAFT"),
  offeredSalary: decimal("offered_salary"),
  offeredDesignation: text("offered_designation"),
  joiningDate: date("joining_date"),
  offerLetterUrl: text("offer_letter_url"),
  validUntil: date("valid_until"),
  notes: text("notes"),
  sentAt: timestamp("sent_at"),
  viewedAt: timestamp("viewed_at"),
  respondedAt: timestamp("responded_at"),
  acceptanceToken: text("acceptance_token").unique(),
  acceptanceTokenExpiresAt: timestamp("acceptance_token_expires_at"),
  submittedForCeoAt: timestamp("submitted_for_ceo_at"),
  ceoReviewedBy: text("ceo_reviewed_by").references(() => users.id),
  ceoReviewedAt: timestamp("ceo_reviewed_at"),
  ceoRemarks: text("ceo_remarks"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_candidate_offers_candidate").on(table.candidateId),
  index("idx_candidate_offers_org").on(table.orgId),
]);

export const candidateOffersRelations = relations(candidateOffers, ({ one }) => ({
  candidate: one(candidates, { fields: [candidateOffers.candidateId], references: [candidates.id] }),
  organization: one(organizations, { fields: [candidateOffers.orgId], references: [organizations.id] }),
  jobPosting: one(jobPostings, { fields: [candidateOffers.jobPostingId], references: [jobPostings.id] }),
  offeredByUser: one(users, { fields: [candidateOffers.offeredBy], references: [users.id] }),
  ceoReviewer: one(users, { fields: [candidateOffers.ceoReviewedBy], references: [users.id], relationName: "offerCeoReviewer" }),
}));


export const leaveBlackoutDates = pgTable("leave_blackout_dates", {
  id: serial("id").primaryKey(),
  orgId: text("org_id").notNull().references(() => organizations.id),
  startDate: date("start_date").notNull(),
  endDate: date("end_date").notNull(),
  reason: text("reason").notNull(),
  appliesTo: text("applies_to").notNull().default("ALL"),
  createdBy: text("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_leave_blackout_org").on(table.orgId, table.startDate),
]);

export const leaveBlackoutDatesRelations = relations(leaveBlackoutDates, ({ one }) => ({
  organization: one(organizations, { fields: [leaveBlackoutDates.orgId], references: [organizations.id] }),
  creator: one(users, { fields: [leaveBlackoutDates.createdBy], references: [users.id] }),
}));


export const salaryRevisionHistoryRelations = relations(salaryRevisionHistory, ({ one }) => ({
  organization: one(organizations, { fields: [salaryRevisionHistory.orgId], references: [organizations.id] }),
  user: one(users, { fields: [salaryRevisionHistory.userId], references: [users.id], relationName: "revisionUser" }),
  changedByUser: one(users, { fields: [salaryRevisionHistory.changedBy], references: [users.id], relationName: "revisionChanger" }),
  salaryStructure: one(salaryStructures, { fields: [salaryRevisionHistory.salaryStructureId], references: [salaryStructures.id] }),
}));

export const holidayWorkRequests = pgTable("holiday_work_requests", {
  id: serial("id").primaryKey(),
  orgId: text("org_id").references(() => organizations.id).notNull(),
  userId: text("user_id").references(() => users.id).notNull(),
  requestDate: date("request_date").notNull(),
  type: text("type").notNull(),
  holidayId: integer("holiday_id").references(() => holidays.id),
  reason: text("reason"),
  compensationPreference: text("compensation_preference").notNull(),
  status: text("status").notNull().default("PENDING"),
  approvedBy: text("approved_by").references(() => users.id),
  approvedAt: timestamp("approved_at"),
  rejectionReason: text("rejection_reason"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  uniqueIndex("uniq_hwr_org_user_date").on(table.orgId, table.userId, table.requestDate),
  index("idx_hwr_org_status").on(table.orgId, table.status),
  index("idx_hwr_user").on(table.userId),
]);

export const holidayWorkRequestsRelations = relations(holidayWorkRequests, ({ one }) => ({
  organization: one(organizations, { fields: [holidayWorkRequests.orgId], references: [organizations.id] }),
  user: one(users, { fields: [holidayWorkRequests.userId], references: [users.id], relationName: "hwrUser" }),
  approver: one(users, { fields: [holidayWorkRequests.approvedBy], references: [users.id], relationName: "hwrApprover" }),
  holiday: one(holidays, { fields: [holidayWorkRequests.holidayId], references: [holidays.id] }),
}));

export const compOffGrants = pgTable("comp_off_grants", {
  id: serial("id").primaryKey(),
  orgId: text("org_id").references(() => organizations.id).notNull(),
  userId: text("user_id").references(() => users.id).notNull(),
  holidayWorkRequestId: integer("holiday_work_request_id").references(() => holidayWorkRequests.id),
  grantedDays: decimal("granted_days").notNull().default("1"),
  usedDays: decimal("used_days").notNull().default("0"),
  expiryDate: date("expiry_date").notNull(),
  status: text("status").notNull().default("ACTIVE"),
  grantedBy: text("granted_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_comp_off_user_status").on(table.userId, table.status, table.expiryDate),
  index("idx_comp_off_org").on(table.orgId),
]);

export const compOffGrantsRelations = relations(compOffGrants, ({ one }) => ({
  organization: one(organizations, { fields: [compOffGrants.orgId], references: [organizations.id] }),
  user: one(users, { fields: [compOffGrants.userId], references: [users.id], relationName: "compOffUser" }),
  grantedByUser: one(users, { fields: [compOffGrants.grantedBy], references: [users.id], relationName: "compOffGranter" }),
  holidayWorkRequest: one(holidayWorkRequests, { fields: [compOffGrants.holidayWorkRequestId], references: [holidayWorkRequests.id] }),
}));

export const lateArrivalWarnings = pgTable("late_arrival_warnings", {
  id: serial("id").primaryKey(),
  orgId: text("org_id").references(() => organizations.id).notNull(),
  userId: text("user_id").references(() => users.id).notNull(),
  date: date("date").notNull(),
  warningNumber: integer("warning_number").notNull().default(1),
  attendanceId: integer("attendance_id").references(() => attendance.id),
  notedBy: text("noted_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_late_warnings_user").on(table.userId),
  index("idx_late_warnings_org_date").on(table.orgId, table.date),
]);

export const lateArrivalWarningsRelations = relations(lateArrivalWarnings, ({ one }) => ({
  organization: one(organizations, { fields: [lateArrivalWarnings.orgId], references: [organizations.id] }),
  user: one(users, { fields: [lateArrivalWarnings.userId], references: [users.id], relationName: "warningUser" }),
  notedByUser: one(users, { fields: [lateArrivalWarnings.notedBy], references: [users.id], relationName: "warningNoteBy" }),
  attendance: one(attendance, { fields: [lateArrivalWarnings.attendanceId], references: [attendance.id] }),
}));

export const offerLetterTemplates = pgTable("hr_offer_letter_templates", {
  id: serial("id").primaryKey(),
  orgId: text("org_id").references(() => organizations.id).notNull(),
  name: text("name").notNull(),
  body: text("body").notNull(),
  description: text("description"),
  isDefault: boolean("is_default").default(false).notNull(),
  variables: text("variables").array(),
  documentType: text("document_type").notNull().default("OFFER_LETTER"),
  showSignatureBlock: boolean("show_signature_block").notNull().default(false),
  createdBy: text("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_offer_letter_templates_org").on(table.orgId),
]);

export const offerLetterTemplatesRelations = relations(offerLetterTemplates, ({ one }) => ({
  organization: one(organizations, { fields: [offerLetterTemplates.orgId], references: [organizations.id] }),
  creator: one(users, { fields: [offerLetterTemplates.createdBy], references: [users.id] }),
}));

export const documentAssignments = pgTable("document_assignments", {
  id: serial("id").primaryKey(),
  orgId: text("org_id").references(() => organizations.id).notNull(),
  documentId: integer("document_id").references(() => documents.id).notNull(),
  userId: text("user_id").references(() => users.id).notNull(),
  assignedById: text("assigned_by_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  uniqueIndex("uniq_document_assignments_doc_user").on(table.documentId, table.userId),
  index("idx_document_assignments_org").on(table.orgId),
  index("idx_document_assignments_user").on(table.userId),
]);

export const documentAssignmentsRelations = relations(documentAssignments, ({ one }) => ({
  organization: one(organizations, { fields: [documentAssignments.orgId], references: [organizations.id] }),
  document: one(documents, { fields: [documentAssignments.documentId], references: [documents.id] }),
  user: one(users, { fields: [documentAssignments.userId], references: [users.id], relationName: "documentAssignmentAssignee" }),
  assignedByUser: one(users, { fields: [documentAssignments.assignedById], references: [users.id], relationName: "documentAssignmentAssigner" }),
}));

export const helpdeskTicketComments = pgTable("helpdesk_ticket_comments", {
  id: serial("id").primaryKey(),
  orgId: text("org_id").references(() => organizations.id).notNull(),
  ticketId: integer("ticket_id").references(() => helpdeskTickets.id).notNull(),
  authorId: text("author_id").references(() => users.id),
  kind: text("kind").notNull().default("comment"),
  body: text("body"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_helpdesk_ticket_comments_ticket").on(table.ticketId),
]);

export const helpdeskTicketCommentsRelations = relations(helpdeskTicketComments, ({ one }) => ({
  organization: one(organizations, { fields: [helpdeskTicketComments.orgId], references: [organizations.id] }),
  ticket: one(helpdeskTickets, { fields: [helpdeskTicketComments.ticketId], references: [helpdeskTickets.id] }),
  author: one(users, { fields: [helpdeskTicketComments.authorId], references: [users.id] }),
}));

export const terminationReasons = pgTable("termination_reasons", {
  id: serial("id").primaryKey(),
  orgId: text("org_id").references(() => organizations.id).notNull(),
  label: text("label").notNull(),
  description: text("description"),
  isActive: boolean("is_active").default(true),
  sortOrder: integer("sort_order").default(0),
  createdById: text("created_by_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_termination_reasons_org").on(table.orgId),
]);

export const terminationReasonsRelations = relations(terminationReasons, ({ one }) => ({
  organization: one(organizations, { fields: [terminationReasons.orgId], references: [organizations.id] }),
  creator: one(users, { fields: [terminationReasons.createdById], references: [users.id] }),
}));

export const jobRoles = pgTable("job_roles", {
  id: serial("id").primaryKey(),
  orgId: text("org_id").references(() => organizations.id).notNull(),
  departmentId: integer("department_id").references(() => departments.id),
  title: text("title").notNull(),
  isActive: boolean("is_active").default(true),
  createdById: text("created_by_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  uniqueIndex("uniq_job_roles_org_dept_title").on(table.orgId, table.departmentId, table.title),
  index("idx_job_roles_org").on(table.orgId),
]);

export const jobRolesRelations = relations(jobRoles, ({ one }) => ({
  organization: one(organizations, { fields: [jobRoles.orgId], references: [organizations.id] }),
  department: one(departments, { fields: [jobRoles.departmentId], references: [departments.id] }),
  creator: one(users, { fields: [jobRoles.createdById], references: [users.id] }),
}));

export const offerLetterCustomVariables = pgTable("hr_offer_letter_custom_variables", {
  id: serial("id").primaryKey(),
  orgId: text("org_id").references(() => organizations.id).notNull(),
  variableKey: text("variable_key").notNull(),
  label: text("label").notNull(),
  description: text("description"),
  createdById: text("created_by_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  uniqueIndex("uniq_offer_letter_custom_vars_org_key").on(table.orgId, table.variableKey),
  index("idx_offer_letter_custom_vars_org").on(table.orgId),
]);

export const offerLetterCustomVariablesRelations = relations(offerLetterCustomVariables, ({ one }) => ({
  organization: one(organizations, { fields: [offerLetterCustomVariables.orgId], references: [organizations.id] }),
  creator: one(users, { fields: [offerLetterCustomVariables.createdById], references: [users.id] }),
}));

export const payrollSchedules = pgTable("payroll_schedules", {
  id: serial("id").primaryKey(),
  orgId: text("org_id").references(() => organizations.id).notNull(),
  frequency: text("frequency").notNull().default("MONTHLY"),
  dayOfMonth: integer("day_of_month").default(1),
  isEnabled: boolean("is_enabled").default(false),
  autoApprove: boolean("auto_approve").default(false),
  lastRunPeriod: text("last_run_period"),
  lastRunAt: timestamp("last_run_at"),
  createdById: text("created_by_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  uniqueIndex("uniq_payroll_schedules_org").on(table.orgId),
]);

export const payrollSchedulesRelations = relations(payrollSchedules, ({ one }) => ({
  organization: one(organizations, { fields: [payrollSchedules.orgId], references: [organizations.id] }),
  creator: one(users, { fields: [payrollSchedules.createdById], references: [users.id] }),
}));


export const employeeCareerProfiles = pgTable("employee_career_profiles", {
  id: serial("id").primaryKey(),
  orgId: text("org_id").references(() => organizations.id).notNull(),
  userId: text("user_id").references(() => users.id).notNull(),
  ladderId: integer("ladder_id").references(() => careerLadders.id),
  currentLevel: integer("current_level").default(1),
  assignedBy: text("assigned_by").references(() => users.id),
  assignedAt: timestamp("assigned_at"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_career_profiles_org").on(table.orgId),
  index("idx_career_profiles_user").on(table.userId),
  uniqueIndex("uq_career_profiles_org_user").on(table.orgId, table.userId),
]);

export const careerEvaluations = pgTable("career_evaluations", {
  id: serial("id").primaryKey(),
  orgId: text("org_id").references(() => organizations.id).notNull(),
  employeeUserId: text("employee_user_id").references(() => users.id).notNull(),
  evaluatorUserId: text("evaluator_user_id").references(() => users.id).notNull(),
  ladderId: integer("ladder_id").references(() => careerLadders.id),
  level: integer("level"),
  readinessStatus: careerReadinessStatusEnum("readiness_status").notNull().default("NOT_READY"),
  strengths: text("strengths"),
  areasToGrow: text("areas_to_grow"),
  notes: text("notes"),
  evaluatedAt: timestamp("evaluated_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_career_evaluations_org").on(table.orgId),
  index("idx_career_evaluations_employee").on(table.employeeUserId),
]);

export const careerPromotionRecommendations = pgTable("career_promotion_recommendations", {
  id: serial("id").primaryKey(),
  orgId: text("org_id").references(() => organizations.id).notNull(),
  employeeUserId: text("employee_user_id").references(() => users.id).notNull(),
  recommendedBy: text("recommended_by").references(() => users.id).notNull(),
  ladderId: integer("ladder_id").references(() => careerLadders.id),
  fromLevel: integer("from_level"),
  toLevel: integer("to_level").notNull(),
  status: careerPromotionStatusEnum("status").notNull().default("PENDING"),
  reason: text("reason"),
  reviewedBy: text("reviewed_by").references(() => users.id),
  reviewedAt: timestamp("reviewed_at"),
  reviewNotes: text("review_notes"),
  effectiveDate: date("effective_date"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_career_promos_org").on(table.orgId),
  index("idx_career_promos_employee").on(table.employeeUserId),
]);

export const careerPromotionHistory = pgTable("career_promotion_history", {
  id: serial("id").primaryKey(),
  orgId: text("org_id").references(() => organizations.id).notNull(),
  employeeUserId: text("employee_user_id").references(() => users.id).notNull(),
  ladderId: integer("ladder_id").references(() => careerLadders.id),
  fromLevel: integer("from_level"),
  toLevel: integer("to_level").notNull(),
  promotedBy: text("promoted_by").references(() => users.id),
  recommendationId: integer("recommendation_id").references(() => careerPromotionRecommendations.id),
  effectiveDate: date("effective_date"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_career_history_org").on(table.orgId),
  index("idx_career_history_employee").on(table.employeeUserId),
]);

export const careerAuditLogs = pgTable("career_audit_logs", {
  id: serial("id").primaryKey(),
  orgId: text("org_id").references(() => organizations.id).notNull(),
  actorUserId: text("actor_user_id").references(() => users.id),
  targetUserId: text("target_user_id").references(() => users.id),
  action: text("action").notNull(),
  entity: text("entity").notNull(),
  entityId: integer("entity_id"),
  changes: jsonb("changes"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_career_audit_org").on(table.orgId),
  index("idx_career_audit_target").on(table.targetUserId),
]);
