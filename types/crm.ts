

export type DealStage =
  | "LEAD"
  | "CONTACTED"
  | "PROPOSAL"
  | "NEGOTIATION"
  | "WON"
  | "LOST";

export type DealActivityType =
  | "note"
  | "call"
  | "email"
  | "meeting"
  | "document"
  | "stage_change";

export interface DealUserRef {
  id: string;
  name: string | null;
  image: string | null;
}

export interface Deal {
  id: number;
  orgId: string;
  leadId: number | null;
  clientId: number | null;
  name: string;
  value: string | null;
  stage: DealStage;
  probability: number | null;
  contactPerson: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  assignedToId: string | null;
  lastContactDate: string | null;
  expectedCloseDate: string | null;
  actualCloseDate: string | null;
  lostReason: string | null;
  notes: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  assignedTo?: DealUserRef | null;
  lead?: { id: number; name: string; email?: string | null; phone?: string | null } | null;
  client?: { id: number; name: string } | null;
}

export interface DealActivity {
  id: number;
  orgId: string;
  dealId: number;
  type: DealActivityType;
  previousValue: string | null;
  newValue: string | null;
  subject: string | null;
  notes: string | null;
  duration: number | null;
  userId: string;
  createdAt: string | null;
  user?: DealUserRef | null;
}

export interface CreateDealInput {
  name: string;
  value?: string;
  stage?: DealStage;
  probability?: number;
  contactPerson?: string;
  contactEmail?: string;
  contactPhone?: string;
  assignedToId?: string;
  expectedCloseDate?: string;
  notes?: string;
  leadId?: number;
  clientId?: number;
}

export interface UpdateDealInput {
  id: number;
  name?: string;
  value?: string;
  stage?: DealStage;
  probability?: number;
  contactPerson?: string;
  contactEmail?: string;
  contactPhone?: string;
  assignedToId?: string;
  expectedCloseDate?: string | null;
  actualCloseDate?: string | null;
  lostReason?: string;
  notes?: string;
}

export interface UpdateDealStageInput {
  id: number;
  stage: DealStage;
  lostReason?: string;
  version?: string;
}

export interface DealFilters {
  stage?: DealStage;
  assignedToId?: string;
  limit?: number;
  offset?: number;
}

export interface DealsListResult {
  data: Deal[];
  total: number;
  limit: number;
  offset: number;
  totalPages: number;
}

export interface Contact {
  id: number;
  orgId: string;
  name: string;
  email: string | null;
  phone: string | null;
  title: string | null;
  department: string | null;
  company: string | null;
  organizationId: number | null;
  linkedinUrl: string | null;
  twitterUrl: string | null;
  websiteUrl: string | null;
  avatarUrl: string | null;
  leadId: number | null;
  dealId: number | null;
  tags: string[];
  createdAt: string | null;
  updatedAt: string | null;
  crmOrganization?: CrmOrganization | null;
  lead?: { id: number; name: string } | null;
  deal?: { id: number; name: string } | null;
}

export interface ContactSearchResult {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  jobTitle: string | null;
  image: string | null;
}

export interface ContactFilters {
  search?: string;
  organizationId?: number;
  limit?: number;
  offset?: number;
}

export interface PaginatedContacts {
  items: Contact[];
  total: number;
}

export interface CreateContactInput {
  name: string;
  email?: string;
  phone?: string;
  title?: string;
  department?: string;
  company?: string;
  organizationId?: number;
  linkedinUrl?: string;
  twitterUrl?: string;
  websiteUrl?: string;
  leadId?: number;
  dealId?: number;
  tags?: string[];
}

export interface UpdateContactInput {
  id: number;
  name?: string;
  email?: string | null;
  phone?: string | null;
  title?: string | null;
  department?: string | null;
  company?: string | null;
  organizationId?: number | null;
  linkedinUrl?: string | null;
  twitterUrl?: string | null;
  websiteUrl?: string | null;
  avatarUrl?: string | null;
  tags?: string[];
}

export interface LogDealActivityInput {
  dealId: number;
  type: DealActivityType;
  subject?: string;
  notes?: string;
  duration?: number;
}

export type OrgSize = "1-10" | "11-50" | "51-200" | "201-1000" | "1000+";

export interface CrmOrganization {
  id: number;
  orgId: string;
  name: string;
  domain: string | null;
  industry: string | null;
  size: OrgSize | null;
  website: string | null;
  linkedinUrl: string | null;
  description: string | null;
  healthScore: number | null;
  parentId: number | null;
  notes: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  contacts?: Contact[];
}

export interface OrgHierarchyNode {
  id: number;
  name: string;
  industry: string | null;
  healthScore: number | null;
  parentId: number | null;
  children: OrgHierarchyNode[];
}

export interface OrgRollup {
  totalContacts: number;
  totalDeals: number;
  openDeals: number;
  totalDealValue: number;
  totalLeads: number;
}

export type OrgTimelineEventType = "contact_created" | "deal_created" | "lead_linked" | "note_added";

export interface OrgTimelineEvent {
  id: string;
  date: string;
  type: OrgTimelineEventType;
  description: string;
  entityId: number;
}

export interface RelatedLead {
  id: number;
  name: string | null;
  email: string | null;
  phone: string | null;
  status: string;
  priority: string;
  company: string | null;
  source: string | null;
  createdAt: string | null;
}

export interface PaginatedCrmOrganizations {
  organizations: CrmOrganization[];
  totalCount: number;
  page: number;
  totalPages: number;
}

export interface CrmOrganizationFilters {
  search?: string;
  industry?: string;
  page?: number;
  limit?: number;
}

export interface CreateCrmOrganizationInput {
  name: string;
  domain?: string;
  industry?: string;
  size?: OrgSize;
  website?: string;
  linkedinUrl?: string;
  description?: string;
}

export type ClientAccountStatus =
  | "ACCOUNT_OPENING"
  | "QUERIES"
  | "PLAN_SELECTED"
  | "INVESTED";

export interface ClientUserRef {
  id: string;
  name: string | null;
  image: string | null;
  email?: string | null;
}

export interface ClientAccount {
  id: number;
  orgId: string;
  branchId: number | null;
  leadId: number;
  salesRepId: string;
  assignedCrmId: string | null;
  clientName: string;
  clientEmail: string | null;
  clientPhone: string | null;
  clientWhatsapp: string | null;
  status: ClientAccountStatus;
  investmentAmount: string | null;
  planName: string | null;
  investmentDate: string | null;
  transactionRef: string | null;
  conversionNotes: string | null;
  estimatedInvestment: string | null;
  convertedAt: string;
  investedAt: string | null;
  renewalStage: string;
  renewalDate: string | null;
  renewalNotes: string | null;
  createdAt: string;
  updatedAt: string;
  salesRep?: ClientUserRef | null;
  assignedCrm?: ClientUserRef | null;
  lead?: { id: number; name: string | null; source: string | null; priority: string | null } | null;
}

export interface ClientAccountWithActivities extends ClientAccount {
  activities: ClientActivity[];
}

export interface ClientActivity {
  id: number;
  clientAccountId: number;
  userId: string;
  activityType: string;
  title: string;
  description: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  user?: ClientUserRef | null;
}

export interface ClientAccountFilters {
  status?: ClientAccountStatus;
  search?: string;
  page?: number;
  limit?: number;
}

export interface PaginatedClientAccounts {
  accounts: ClientAccount[];
  totalCount: number;
  page: number;
  totalPages: number;
}

export interface ClientAccountStats {
  total: number;
  accountOpening: number;
  queries: number;
  planSelected: number;
  invested: number;
}

export interface UpdateClientAccountStatusInput {
  id: number;
  status: ClientAccountStatus;
  investmentAmount?: string;
  planName?: string;
  investmentDate?: string;
  transactionRef?: string;
}

export interface LogClientActivityInput {
  clientAccountId: number;
  activityType: string;
  title: string;
  description?: string;
  metadata?: Record<string, unknown>;
}

export interface Target {
  id: number;
  orgId: string;
  userId: string;
  metricType: string;
  targetValue: string;
  currentValue: string | null;
  period: string | null;
  startDate: string;
  endDate: string;
  setById: string | null;
  branchId: number | null;
  parentTargetId: number | null;
  notes: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  user?: { id: string; name: string | null; image: string | null } | null;
}

export interface TargetHistory {
  id: number;
  targetId: number;
  orgId: string;
  changedById: string;
  field: string;
  oldValue: string | null;
  newValue: string | null;
  createdAt: string | null;
  changedBy?: { id: string; name: string | null; image: string | null } | null;
}

export interface TargetFilters {
  userId?: string;
  period?: string;
  limit?: number;
  offset?: number;
}

export interface TargetLeaderboardEntry {
  userId: string;
  name: string;
  image: string | null;
  totalTarget: number;
  totalCurrent: number;
  progress: number;
}

export interface CreateTargetInput {
  userId?: string;
  userIds?: string[];
  metricType: string;
  targetValue: string;
  period?: string;
  startDate: string;
  endDate: string;
  notes?: string;
  branchId?: number;
  parentTargetId?: number;
}

export interface UpdateTargetInput {
  id: number;
  targetValue?: string;
  currentValue?: string;
  notes?: string;
}

export interface LogTargetProgressInput {
  id: number;
  currentValue: string;
  notes?: string;
}

export interface TrendValue {
  value: number;
  isPositive: boolean;
}

export interface StatWithTrend<T = number> {
  value: T;
  trend: TrendValue;
}

export interface SalesFunnelItem {
  stage: string;
  value: number;
  color: string;
}

export interface TopDeal {
  company: string;
  value: number;
  stage: string;
  rep: string;
  probability: number;
}

export interface SalesLeaderboardItem {
  name: string;
  deals: number;
  revenue: number;
  avatar: string;
}

export interface SalesActivityItem {
  type: "deal_won" | "meeting" | "proposal" | "call" | "email";
  message: string;
  time: string;
  person: string;
}

export interface DealsByStage {
  stage: string;
  count: number;
  value: number;
  color: string;
}

export interface EnhancedSalesMetrics {
  activeClients: number;
  inactiveClients: number;
  totalCalls: number;
  totalMeetings: number;
  totalEmails: number;
  totalSiteVisits: number;
  followUpNeeded: number;
}

export interface SalesDashboard {
  salesStats: {
    pipeline: StatWithTrend;
    dealsWon: StatWithTrend;
    conversionRate: StatWithTrend;
    avgDealSize: StatWithTrend;
  };
  revenueTimeline: { month: string; value: number }[];
  salesFunnel: SalesFunnelItem[];
  topDeals: TopDeal[];
  salesLeaderboard: SalesLeaderboardItem[];
  salesActivity: SalesActivityItem[];
  dealsByStage: DealsByStage[];
  enhancedMetrics: EnhancedSalesMetrics;
}

export interface ClientHealthItem {
  label: string;
  value: number;
  color: string;
}

export interface UpcomingRenewal {
  client: string;
  value: number;
  date: string;
  health: "healthy" | "at_risk" | "critical";
}

export interface KeyAccount {
  name: string;
  revenue: number;
  health: "healthy" | "at_risk" | "critical";
  csm: string;
  since: string;
}

export interface CustomerInteractionItem {
  type: "call" | "email" | "meeting" | "ticket" | "escalation";
  message: string;
  time: string;
  person: string;
}

export interface SupportStats {
  openTickets: number;
  avgResolution: string;
  firstResponse: string;
  satisfaction: number;
}

export interface CustomerExecutiveDashboard {
  customerStats: {
    totalClients: StatWithTrend;
    nps: StatWithTrend;
    csat: StatWithTrend;
    retention: StatWithTrend;
  };
  clientHealth: ClientHealthItem[];
  upcomingRenewals: UpcomingRenewal[];
  keyAccounts: KeyAccount[];
  customerInteractions: CustomerInteractionItem[];
  supportStats: SupportStats;
  retentionTimeline: { month: string; value: number }[];
  csatTimeline: { month: string; value: number }[];
}

export interface MarketingStats {
  campaigns: StatWithTrend;
  leads: StatWithTrend;
  mqls: StatWithTrend;
  roi: StatWithTrend;
}

export interface CampaignItem {
  name: string;
  status: "active" | "paused" | "completed";
  leads: number;
  spend: number;
  roi: number;
}

export interface ChannelBreakdownItem {
  label: string;
  value: number;
  color: string;
}

export interface ContentPerformanceItem {
  title: string;
  type: string;
  views: number;
  leads: number;
  convRate: number;
}

export interface UpcomingEventItem {
  name: string;
  date: string;
  type: string;
  status: "planning" | "confirmed" | "completed";
}

export interface MarketingDashboard {
  marketingStats: MarketingStats;
  mqlTimeline: { month: string; value: number }[];
  leadFunnel: SalesFunnelItem[];
  campaigns: CampaignItem[];
  channelBreakdown: ChannelBreakdownItem[];
  contentPerformance: ContentPerformanceItem[];
  upcomingEvents: UpcomingEventItem[];
}

export interface SupportDashboardStats {
  openTickets: StatWithTrend;
  avgResolution: StatWithTrend<string>;
  csatScore: StatWithTrend<string>;
  responseRate: StatWithTrend<string>;
}

export interface TicketBreakdownItem {
  label: string;
  value: number;
  color: string;
}

export interface SupportActivityItem {
  type: "deal_won" | "meeting" | "proposal" | "call" | "email" | "ticket" | "escalation";
  message: string;
  time: string;
  person: string;
}

export interface SupportTeamMember {
  name: string;
  role: string;
  access: string;
  avatar: string;
  status: "online" | "away" | "offline";
}

export interface SlaPriorityRow {
  priority: string;
  total: number;
  avgResolutionHours: number;
  slaTargetHours: number;
  color: string;
}

export interface SupportSlaCompliance {
  compliancePct: number;
  breached: number;
  withinSla: number;
  totalTickets: number;
  respondedTickets: number;
  responseRate: number;
  byPriority: SlaPriorityRow[];
}

export interface SupportDashboard {
  supportDashboardStats: SupportDashboardStats;
  ticketStatusBreakdown: TicketBreakdownItem[];
  ticketVolumeTimeline: { month: string; value: number }[];
  supportActivityFeed: SupportActivityItem[];
  supportTeamMembers: SupportTeamMember[];
  ticketsByPriority: TicketBreakdownItem[];
  slaCompliance: SupportSlaCompliance;
}

export interface PersonStat {
  label: string;
  value: string | number;
  trend?: { value: number; isPositive: boolean };
}

export interface PersonDeal {
  company: string;
  value: number;
  stage: string;
  probability: number;
  closeDate: string;
}

export interface PersonAccount {
  name: string;
  revenue: number;
  health: "healthy" | "at_risk" | "critical";
  since: string;
  renewalDate: string;
}

export interface PersonActivity {
  type: "deal_won" | "meeting" | "proposal" | "call" | "email" | "ticket" | "escalation";
  message: string;
  time: string;
}

export interface CrmPersonProfile {
  slug: string;
  name: string;
  initials: string;
  role: string;
  title: string;
  department: string;
  email: string;
  phone: string;
  location: string;
  joinDate: string;
  bio: string;
  stats: PersonStat[];
  monthlyPerformance: { month: string; value: number }[];
  deals: PersonDeal[];
  accounts: PersonAccount[];
  activities: PersonActivity[];
  skills: string[];
}
