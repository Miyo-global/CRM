

export type PipelineStatus =
  | "NEW"
  | "CONTACTED"
  | "INTERESTED"
  | "QUALIFIED"
  | "CONVERTED"
  | "LOST";

export type LeadSource =
  | "referral"
  | "campaign"
  | "cold_call"
  | "website"
  | "social_media"
  | "walk_in"
  | "other";

export type LeadPriority = "HOT" | "WARM" | "COLD";

export type ActivityType =
  | "call"
  | "email"
  | "whatsapp"
  | "meeting"
  | "site_visit"
  | "note"
  | "task";

export interface LeadUser {
  id: string;
  name: string | null;
  image: string | null;
  email?: string | null;
}

export interface LeadUserWithEmail extends LeadUser {
  email: string | null;
}

export interface LeadCampaign {
  id: number;
  name: string;
}

export interface Lead {
  id: number;
  orgId: string;
  name: string;
  email: string | null;
  phone: string | null;
  whatsappNumber: string | null;
  source: LeadSource | null;
  campaignId: number | null;
  status: PipelineStatus;
  priority: LeadPriority | null;
  investmentInterest: string | null;
  potentialValue: string | null;
  notes: string | null;
  assignedToId: string | null;
  assignedById: string | null;
  verifiedById: string | null;
  assignedAt: string | null;
  convertedAt: string | null;
  lostReason: string | null;
  company: string | null;
  designation: string | null;
  city: string | null;
  referredBy: string | null;
  tags: string[] | null;
  score: number | null;
  slaDeadline: string | null;
  website: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  assignedTo?: LeadUser | null;
  assignedBy?: { id: string; name: string | null } | null;
  campaign?: LeadCampaign | null;
}

export interface LeadWithActivities extends Lead {
  activities: LeadActivity[];
}

export interface LeadActivity {
  id: number;
  orgId: string;
  leadId: number;
  type: ActivityType;
  date: string;
  duration: number | null;
  subject: string | null;
  location: string | null;
  locationLink: string | null;
  messageSummary: string | null;
  notes: string | null;
  outcome: string | null;
  userId: string;
  createdAt: string | null;
  user?: LeadUser | null;
}

export interface LeadNote {
  id: number;
  leadId: number;
  orgId: string;
  authorId: string;
  body: string;
  createdAt: string | null;
  author?: LeadUser | null;
}

export interface LeadTask {
  id: number;
  leadId: number;
  orgId: string;
  title: string;
  dueDate: string | null;
  assigneeId: string | null;
  status: "open" | "done";
  createdAt: string | null;
  assignee?: LeadUser | null;
}

export interface LeadEmail {
  id: number;
  leadId: number;
  orgId: string;
  direction: "sent" | "received";
  subject: string | null;
  body: string | null;
  fromEmail: string;
  toEmail: string;
  sentAt: string | null;
  messageId: string | null;
  createdAt: string | null;
}

export interface TimelineItem {
  id: number;
  type: "note" | "task" | "email" | "activity";
  timestamp: string | null;
  data: Record<string, unknown>;
}

export interface LeadStats {
  total: number;
  byStatus: {
    NEW: number;
    CONTACTED: number;
    INTERESTED: number;
    QUALIFIED: number;
    CONVERTED: number;
    LOST: number;
  };
  conversionRate: number;
  totalPotentialValue: number;
  unassigned: number;
  thisMonth: number;
}

export interface LeadBoard {
  NEW: Lead[];
  CONTACTED: Lead[];
  INTERESTED: Lead[];
  QUALIFIED: Lead[];
  CONVERTED: Lead[];
  LOST: Lead[];
}

export interface SlaAlert {
  leadId: number;
  leadName: string;
  status: string;
  assignedTo: string | null;
  hoursSinceUpdate: number;
  priority: string | null;
}

export interface SlaAlertResponse {
  total: number;
  leads: SlaAlert[];
}

export interface ConversionBySource {
  source: string;
  total: number;
  converted: number;
  rate: number;
}

export interface MonthlyRevenue {
  month: string;
  revenue: number;
}

export interface AssignmentDistribution {
  userId: string;
  name: string;
  count: number;
}

export interface LeadAnalyticsSummary {
  totalLeads: number;
  totalLeadsPrevPeriod: number;
  conversionRate: number;
  conversionRatePrevPeriod: number;
  totalRevenue: number;
  conversionBySource: ConversionBySource[];
  monthlyRevenue: MonthlyRevenue[];
  assignmentDistribution: AssignmentDistribution[];
}

export interface LeadDashboardMetrics {
  activeClients: number;
  inactiveClients: number;
  totalCalls: number;
  inPersonMeetings: number;
  followUpDue: number;
  totalLeads: number;
  conversionRate: number;
}

export interface SalesLeaderboardEntry {
  userId: string;
  name: string;
  image: string | null;
  totalCalls: number;
  totalMeetings: number;
  totalEmails: number;
  leadsAssigned: number;
  leadsConverted: number;
  totalRevenue: number;
  score: number;
}

export interface SalesTeamCapacityEntry {
  id: string;
  name: string | null;
  image: string | null;
  activeLeads: number;
}

export interface PaginatedLeads {
  leads: Lead[];
  totalCount: number;
  page: number;
  totalPages: number;
}

export interface LeadFilters {
  status?: PipelineStatus;
  priority?: LeadPriority;
  source?: LeadSource;
  assignedToId?: string;
  search?: string;
  sortBy?: "name" | "email" | "company" | "status" | "priority" | "source" | "score" | "potentialValue" | "createdAt";
  sortOrder?: "asc" | "desc";
  page?: number;
  limit?: number;
  dateFrom?: string;
  dateTo?: string;
}

export interface CreateLeadInput {
  name: string;
  email?: string;
  phone?: string;
  whatsappNumber?: string;
  source?: LeadSource;
  campaignId?: number;
  investmentInterest?: string;
  potentialValue?: string;
  notes?: string;
  company?: string;
  designation?: string;
  city?: string;
  referredBy?: string;
  tags?: string[];
  assignedToId?: string;
  priority?: LeadPriority;
}

export interface UpdateLeadInput {
  id: number;
  name?: string;
  email?: string;
  phone?: string;
  whatsappNumber?: string;
  source?: LeadSource;
  campaignId?: number;
  investmentInterest?: string;
  potentialValue?: string;
  notes?: string;
  company?: string;
  designation?: string;
  city?: string;
  tags?: string[];
  lostReason?: string;
  priority?: LeadPriority;
}

export interface UpdateLeadStatusInput {
  leadId: number;
  status: PipelineStatus;
  expectedStatus?: PipelineStatus;
  lostReason?: string;
  estimatedInvestment?: string;
  conversionNotes?: string;
}

export interface AssignLeadInput {
  leadId: number;
  assignedToId: string;
}

export interface LogActivityInput {
  leadId: number;
  type: ActivityType;
  date: string;
  duration?: number;
  subject?: string;
  location?: string;
  locationLink?: string;
  messageSummary?: string;
  notes?: string;
  outcome?: string;
}

export interface BulkUpdateLeadsInput {
  leadIds: number[];
  update: {
    status?: PipelineStatus;
    priority?: LeadPriority;
    assignedToId?: string;
  };
}

export interface BulkDeleteLeadsInput {
  leadIds: number[];
}

export interface DistributeLeadsInput {
  leadIds: number[];
  skipAbsent?: boolean;
}

export interface BulkImportLeadRow {
  name: string;
  email?: string;
  phone?: string;
  company?: string;
  source?: LeadSource;
  notes?: string;
  city?: string;
  designation?: string;
  referredBy?: string;
  potentialValue?: string;
  investmentInterest?: string;
  whatsappNumber?: string;
  website?: string;
  priority?: LeadPriority;
  tags?: string[];
}

export interface BulkImportLeadsInput {
  leads: BulkImportLeadRow[];
  duplicateAction?: "skip" | "update" | "import";
  autoDistribute?: boolean;
}

export interface BulkImportResult {
  imported: number;
  skipped: number;
  updated: number;
  errors: { row: number; message: string }[];
  duplicatesFound: number;
  distributed: number;
  salesPeopleCount: number;
}

export interface VerifyLeadInput {
  leadId: number;
  priority?: LeadPriority;
  notes?: string;
}

export interface RejectLeadInput {
  leadId: number;
  reason?: string;
}

export interface DistributeResult {
  distributed: number;
  salesPeople: number;
  totalSalesPeople: number;
  absentCount: number;
  absentNames: string[];
  summary: { userId: string; name: string; count: number }[];
}

export interface LeadClient {
  id: number;
  orgId: string;
  leadId: number | null;
  name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  designation: string | null;
  city: string | null;
  investmentValue: string | null;
  status: string;
  accountManagerId: string | null;
  notes: string | null;
  convertedAt: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  accountManager?: LeadUser | null;
  lead?: { id: number; source: string | null; priority: string | null } | null;
}

export interface LeadImportBatch {
  id: number;
  orgId: string;
  createdBy: string;
  filename: string;
  status: string;
  totalRows: number;
  importedRows: number;
  failedRows: number;
  errorReport: Array<{ row: number; error: string }> | null;
  createdAt: string | null;
  completedAt: string | null;
}

