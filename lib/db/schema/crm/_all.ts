
import { pgTable, text, serial, timestamp, boolean, jsonb, decimal, date, integer, foreignKey, index, uniqueIndex, unique } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import {
  leadPipelineStatusEnum, leadActivityTypeEnum, leadSourceEnum, leadPriorityEnum,
  dealStageEnum, dealActivityTypeEnum, clientAccountStatusEnum, incentiveStatusEnum,
  dmLeadStatusEnum, branchStatusEnum, socialPlatformEnum,
  leadEmailDirectionEnum, leadTaskStatusEnum, scoringOperatorEnum,
  assignmentRuleTypeEnum, slaAppliesToEnum, slaPriorityEnum, orgSizeEnum,
  crmPersonRoleEnum, crmHealthEnum, crmDealStageEnum, crmCampaignStatusEnum,
  crmLeadStatusEnum, crmSupportTicketStatusEnum, crmSupportTicketPriorityEnum,
  crmActivityTypeEnum, crmEventStatusEnum,
  invoiceStatusEnum, supportTicketStatusEnum, supportTicketPriorityEnum,
  taskEntityTypeEnum, taskTypeEnum, taskStatusEnum,
  quoteStatusEnum,
} from "../enums";
import { organizations, users } from "../auth";
import { projects } from "../projects";
import { payrolls } from "../hr";

export const crmCampaigns = pgTable("crm_campaigns", {
  id: serial("id").primaryKey(),
  orgId: text("org_id").references(() => organizations.id).notNull(),
  name: text("name").notNull(),
  status: crmCampaignStatusEnum("status").default("active"),
  channel: text("channel"),
  description: text("description"),
  startDate: date("start_date"),
  endDate: date("end_date"),
  targetAudience: text("target_audience"),
  leads: integer("leads").default(0),
  spend: decimal("spend").default("0"),
  roi: decimal("roi").default("0"),
  budgetAllocated: decimal("budget_allocated", { precision: 15, scale: 2 }),
  budgetSpent: decimal("budget_spent", { precision: 15, scale: 2 }),
  ownerId: text("owner_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const leads = pgTable("leads", {
  id: serial("id").primaryKey(),
  orgId: text("org_id").references(() => organizations.id).notNull(),
  name: text("name").notNull(),
  email: text("email"),
  phone: text("phone"),
  whatsappNumber: text("whatsapp_number"),
  source: leadSourceEnum("source").default("other"),
  campaignId: integer("campaign_id").references(() => crmCampaigns.id),
  status: leadPipelineStatusEnum("status").default("NEW").notNull(),
  priority: leadPriorityEnum("priority").default("WARM"),
  investmentInterest: decimal("investment_interest"),
  potentialValue: decimal("potential_value"),
  notes: text("notes"),
  assignedToId: text("assigned_to_id").references(() => users.id),
  assignedById: text("assigned_by_id").references(() => users.id),
  verifiedById: text("verified_by_id").references(() => users.id),
  assignedAt: timestamp("assigned_at"),
  convertedAt: timestamp("converted_at"),
  lostReason: text("lost_reason"),
  company: text("company"),
  designation: text("designation"),
  city: text("city"),
  referredBy: text("referred_by"),
  tags: text("tags").array(),
  score: integer("score").default(0),
  slaDeadline: timestamp("sla_deadline"),
  website: text("website"),
  subSource: text("sub_source"),
  dmLeadId: integer("dm_lead_id"),
  followUpDate: timestamp("follow_up_date"),
  followUpNotes: text("follow_up_notes"),
  customData: jsonb("custom_data").$type<Record<string, unknown>>(),
  utmSource: text("utm_source"),
  utmMedium: text("utm_medium"),
  utmCampaign: text("utm_campaign"),
  utmContent: text("utm_content"),
  utmTerm: text("utm_term"),
  ipAddress: text("ip_address"),
  referrerUrl: text("referrer_url"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  deletedAt: timestamp("deleted_at"),
  mergedIntoId: integer("merged_into_id"),
}, (table) => [
  index("idx_leads_org_status").on(table.orgId, table.status),
  index("idx_leads_assigned_to").on(table.assignedToId),
  index("idx_leads_created_at").on(table.orgId, table.createdAt),
  index("idx_leads_source").on(table.source),
  index("idx_leads_score").on(table.score),
]);

export const leadActivities = pgTable("lead_activities", {
  id: serial("id").primaryKey(),
  orgId: text("org_id").references(() => organizations.id).notNull(),
  leadId: integer("lead_id").references(() => leads.id).notNull(),
  type: leadActivityTypeEnum("type").notNull(),
  date: timestamp("date").notNull(),
  duration: integer("duration"),
  subject: text("subject"),
  location: text("location"),
  locationLink: text("location_link"),
  messageSummary: text("message_summary"),
  notes: text("notes"),
  outcome: text("outcome"),
  userId: text("user_id").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_lead_activities_lead").on(table.leadId),
  index("idx_lead_activities_user").on(table.userId),
]);

export const leadNotes = pgTable("lead_notes", {
  id: serial("id").primaryKey(),
  leadId: integer("lead_id").references(() => leads.id, { onDelete: "cascade" }).notNull(),
  orgId: text("org_id").references(() => organizations.id).notNull(),
  authorId: text("author_id").references(() => users.id).notNull(),
  body: text("body").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_lead_notes_lead").on(table.leadId),
]);

export const leadTasks = pgTable("lead_tasks", {
  id: serial("id").primaryKey(),
  leadId: integer("lead_id").references(() => leads.id, { onDelete: "cascade" }).notNull(),
  orgId: text("org_id").references(() => organizations.id).notNull(),
  title: text("title").notNull(),
  dueDate: date("due_date"),
  assigneeId: text("assignee_id").references(() => users.id),
  status: leadTaskStatusEnum("status").default("open").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_lead_tasks_lead").on(table.leadId),
]);

export const leadEmails = pgTable("lead_emails", {
  id: serial("id").primaryKey(),
  leadId: integer("lead_id").references(() => leads.id, { onDelete: "cascade" }).notNull(),
  orgId: text("org_id").references(() => organizations.id).notNull(),
  direction: leadEmailDirectionEnum("direction").notNull(),
  subject: text("subject"),
  body: text("body"),
  fromEmail: text("from_email").notNull(),
  toEmail: text("to_email").notNull(),
  sentAt: timestamp("sent_at").defaultNow(),
  messageId: text("message_id"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_lead_emails_lead").on(table.leadId),
]);

export const clients = pgTable("clients", {
  id: serial("id").primaryKey(),
  orgId: text("org_id").references(() => organizations.id).notNull(),
  leadId: integer("lead_id").references(() => leads.id),
  name: text("name").notNull(),
  email: text("email"),
  phone: text("phone"),
  company: text("company"),
  designation: text("designation"),
  city: text("city"),
  investmentValue: decimal("investment_value"),
  status: text("status").default("active").notNull(),
  accountManagerId: text("account_manager_id").references(() => users.id),
  notes: text("notes"),
  healthScore: integer("health_score").default(50),
  healthStatus: text("health_status").default("healthy"),
  lastHealthCheck: timestamp("last_health_check"),
  churnRiskScore: integer("churn_risk_score"),
  churnRiskReasoning: text("churn_risk_reasoning"),
  convertedAt: timestamp("converted_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_clients_org").on(table.orgId),
]);

export const targets = pgTable("targets", {
  id: serial("id").primaryKey(),
  orgId: text("org_id").references(() => organizations.id).notNull(),
  userId: text("user_id").references(() => users.id).notNull(),
  metricType: text("metric_type").notNull(),
  targetValue: decimal("target_value").notNull(),
  currentValue: decimal("current_value").default("0"),
  period: text("period").default("daily"),
  startDate: date("start_date").notNull(),
  endDate: date("end_date").notNull(),
  setById: text("set_by_id").references(() => users.id),
  branchId: integer("branch_id"),
  parentTargetId: integer("parent_target_id"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_targets_user_period").on(table.userId, table.period),
  index("idx_targets_branch").on(table.branchId),
  foreignKey({ columns: [table.parentTargetId], foreignColumns: [table.id] }),
]);

export const targetHistory = pgTable("target_history", {
  id: serial("id").primaryKey(),
  targetId: integer("target_id").references(() => targets.id, { onDelete: "cascade" }).notNull(),
  orgId: text("org_id").references(() => organizations.id).notNull(),
  changedById: text("changed_by_id").references(() => users.id).notNull(),
  field: text("field").notNull(),
  oldValue: text("old_value"),
  newValue: text("new_value"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_target_history_target").on(table.targetId),
]);

export const deals = pgTable("deals", {
  id: serial("id").primaryKey(),
  orgId: text("org_id").references(() => organizations.id).notNull(),
  leadId: integer("lead_id").references(() => leads.id),
  clientId: integer("client_id").references(() => clients.id),
  name: text("name").notNull(),
  value: decimal("value").default("0"),
  stage: dealStageEnum("stage").default("LEAD").notNull(),
  probability: integer("probability").default(0),
  contactPerson: text("contact_person"),
  contactEmail: text("contact_email"),
  contactPhone: text("contact_phone"),
  assignedToId: text("assigned_to_id").references(() => users.id),
  lastContactDate: timestamp("last_contact_date"),
  expectedCloseDate: date("expected_close_date"),
  actualCloseDate: date("actual_close_date"),
  lostReason: text("lost_reason"),
  notes: text("notes"),
  linkedLeadId: integer("linked_lead_id").references(() => leads.id),
  linkedClientId: integer("linked_client_id").references(() => clients.id),
  slaDeadline: timestamp("sla_deadline"),
  followUpDate: timestamp("follow_up_date"),
  followUpNotes: text("follow_up_notes"),
  customData: jsonb("custom_data").$type<Record<string, unknown>>(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_deals_org_stage").on(table.orgId, table.stage),
  index("idx_deals_assigned_to").on(table.assignedToId),
]);

export const dealActivities = pgTable("deal_activities", {
  id: serial("id").primaryKey(),
  orgId: text("org_id").references(() => organizations.id).notNull(),
  dealId: integer("deal_id").references(() => deals.id, { onDelete: "cascade" }).notNull(),
  type: dealActivityTypeEnum("type").notNull(),
  previousValue: text("previous_value"),
  newValue: text("new_value"),
  subject: text("subject"),
  notes: text("notes"),
  duration: integer("duration"),
  userId: text("user_id").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_deal_activities_deal").on(table.dealId),
  index("idx_deal_activities_org").on(table.orgId),
]);

export const salesQuotas = pgTable("sales_quotas", {
  id: serial("id").primaryKey(),
  orgId: text("org_id").references(() => organizations.id).notNull(),
  userId: text("user_id").references(() => users.id).notNull(),
  period: text("period").default("monthly").notNull(),
  startDate: date("start_date").notNull(),
  endDate: date("end_date").notNull(),
  targetRevenue: decimal("target_revenue").default("0").notNull(),
  actualRevenue: decimal("actual_revenue").default("0").notNull(),
  notes: text("notes"),
  setById: text("set_by_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_sales_quotas_org_user").on(table.orgId, table.userId),
]);

export const commissionRules = pgTable("commission_rules", {
  id: serial("id").primaryKey(),
  orgId: text("org_id").references(() => organizations.id).notNull(),
  name: text("name").notNull(),
  type: text("type").default("flat_percent").notNull(),
  flatRate: decimal("flat_rate"),
  tiers: jsonb("tiers"),
  appliesTo: text("applies_to").default("all").notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const commissions = pgTable("commissions", {
  id: serial("id").primaryKey(),
  orgId: text("org_id").references(() => organizations.id).notNull(),
  userId: text("user_id").references(() => users.id).notNull(),
  dealId: integer("deal_id").references(() => deals.id).notNull(),
  ruleId: integer("rule_id").references(() => commissionRules.id),
  dealValue: decimal("deal_value").default("0").notNull(),
  commissionRate: decimal("commission_rate").default("0").notNull(),
  commissionAmount: decimal("commission_amount").default("0").notNull(),
  status: text("status").default("pending").notNull(),
  paidAt: timestamp("paid_at"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_commissions_org_user").on(table.orgId, table.userId),
  index("idx_commissions_deal").on(table.dealId),
]);

export const dealApprovalRules = pgTable("deal_approval_rules", {
  id: serial("id").primaryKey(),
  orgId: text("org_id").references(() => organizations.id).notNull(),
  minValue: decimal("min_value").default("0").notNull(),
  approverRole: text("approver_role").default("CEO").notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const dealApprovals = pgTable("deal_approvals", {
  id: serial("id").primaryKey(),
  orgId: text("org_id").references(() => organizations.id).notNull(),
  dealId: integer("deal_id").references(() => deals.id).notNull(),
  requestedBy: text("requested_by").references(() => users.id).notNull(),
  requestedStage: text("requested_stage").notNull(),
  status: text("status").default("pending").notNull(),
  approvedBy: text("approved_by").references(() => users.id),
  rejectionReason: text("rejection_reason"),
  createdAt: timestamp("created_at").defaultNow(),
  resolvedAt: timestamp("resolved_at"),
}, (table) => [
  index("idx_deal_approvals_org").on(table.orgId, table.status),
  index("idx_deal_approvals_deal").on(table.dealId),
]);

export const emailCampaigns = pgTable("email_campaigns", {
  id: serial("id").primaryKey(),
  orgId: text("org_id").references(() => organizations.id).notNull(),
  name: text("name").notNull(),
  subject: text("subject").notNull(),
  body: text("body").notNull(),
  templateId: integer("template_id"),
  status: text("status").default("draft").notNull(),
  recipientFilter: jsonb("recipient_filter"),
  recipientCount: integer("recipient_count").default(0),
  sentCount: integer("sent_count").default(0),
  failedCount: integer("failed_count").default(0),
  openCount: integer("open_count").default(0),
  clickCount: integer("click_count").default(0),
  scheduledAt: timestamp("scheduled_at"),
  sentAt: timestamp("sent_at"),
  createdBy: text("created_by").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_email_campaigns_org").on(table.orgId, table.status),
]);

export const emailCampaignRecipients = pgTable("email_campaign_recipients", {
  id: serial("id").primaryKey(),
  campaignId: integer("campaign_id").references(() => emailCampaigns.id, { onDelete: "cascade" }).notNull(),
  leadId: integer("lead_id").references(() => leads.id),
  email: text("email").notNull(),
  name: text("name"),
  status: text("status").default("pending").notNull(),
  sentAt: timestamp("sent_at"),
  openedAt: timestamp("opened_at"),
  clickedAt: timestamp("clicked_at"),
  errorMessage: text("error_message"),
}, (table) => [
  index("idx_ecr_campaign").on(table.campaignId, table.status),
]);

export const crmPeople = pgTable("crm_people", {
  id: serial("id").primaryKey(),
  orgId: text("org_id").references(() => organizations.id).notNull(),
  slug: text("slug").notNull(),
  name: text("name").notNull(),
  initials: text("initials").notNull(),
  role: crmPersonRoleEnum("role").notNull(),
  title: text("title").notNull(),
  department: text("department").notNull(),
  email: text("email").notNull(),
  phone: text("phone"),
  location: text("location"),
  joinDate: text("join_date"),
  bio: text("bio"),
  skills: text("skills").array(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_crm_people_org").on(table.orgId),
  index("idx_crm_people_org_slug").on(table.orgId, table.slug),
  index("idx_crm_people_email").on(table.email),
]);

export const crmCompanies = pgTable("crm_companies", {
  id: serial("id").primaryKey(),
  orgId: text("org_id").references(() => organizations.id).notNull(),
  name: text("name").notNull(),
  health: crmHealthEnum("health").default("healthy"),
  revenue: decimal("revenue").default("0"),
  renewalDate: date("renewal_date"),
  renewalValue: decimal("renewal_value").default("0"),
  customerSince: text("customer_since"),
  csmId: integer("csm_id").references(() => crmPeople.id),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_crm_companies_org").on(table.orgId),
  index("idx_crm_companies_csm").on(table.csmId),
]);

export const crmDeals = pgTable("crm_deals", {
  id: serial("id").primaryKey(),
  orgId: text("org_id").references(() => organizations.id).notNull(),
  companyName: text("company_name").notNull(),
  value: decimal("value").notNull(),
  stage: crmDealStageEnum("stage").notNull(),
  probability: integer("probability").default(0),
  closeDate: date("close_date"),
  salesRepId: integer("sales_rep_id").references(() => crmPeople.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_crm_deals_org_stage").on(table.orgId, table.stage),
  index("idx_crm_deals_sales_rep").on(table.salesRepId),
]);

export const crmLeads = pgTable("crm_leads", {
  id: serial("id").primaryKey(),
  orgId: text("org_id").references(() => organizations.id).notNull(),
  campaignId: integer("campaign_id").references(() => crmCampaigns.id),
  email: text("email"),
  name: text("name"),
  status: crmLeadStatusEnum("status").default("lead"),
  channel: text("channel"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_crm_leads_org_status").on(table.orgId, table.status),
  index("idx_crm_leads_campaign").on(table.campaignId),
]);

export const crmContent = pgTable("crm_content", {
  id: serial("id").primaryKey(),
  orgId: text("org_id").references(() => organizations.id).notNull(),
  title: text("title").notNull(),
  type: text("type").notNull(),
  views: integer("views").default(0),
  leads: integer("leads").default(0),
  convRate: decimal("conv_rate").default("0"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_crm_content_org").on(table.orgId),
]);

export const crmEvents = pgTable("crm_events", {
  id: serial("id").primaryKey(),
  orgId: text("org_id").references(() => organizations.id).notNull(),
  name: text("name").notNull(),
  date: text("date").notNull(),
  type: text("type").notNull(),
  status: crmEventStatusEnum("status").default("planning"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_crm_events_org").on(table.orgId),
]);

export const crmActivities = pgTable("crm_activities", {
  id: serial("id").primaryKey(),
  orgId: text("org_id").references(() => organizations.id).notNull(),
  type: crmActivityTypeEnum("type").notNull(),
  message: text("message").notNull(),
  time: text("time").notNull(),
  person: text("person"),
  personId: integer("person_id").references(() => crmPeople.id),
  category: text("category").notNull().default("sales"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_crm_activities_org_created").on(table.orgId, table.createdAt),
  index("idx_crm_activities_person").on(table.personId),
]);

export const crmSupportTickets = pgTable("crm_support_tickets", {
  id: serial("id").primaryKey(),
  orgId: text("org_id").references(() => organizations.id).notNull(),
  title: text("title"),
  priority: crmSupportTicketPriorityEnum("priority").default("medium"),
  status: crmSupportTicketStatusEnum("status").default("new"),
  assigneeId: integer("assignee_id").references(() => crmPeople.id),
  createdAt: timestamp("created_at").defaultNow(),
  firstResponseAt: timestamp("first_response_at"),
  slaDueAt: timestamp("sla_due_at"),
  resolvedAt: timestamp("resolved_at"),
}, (table) => [
  index("idx_crm_support_tickets_org_status").on(table.orgId, table.status),
  index("idx_crm_support_tickets_assignee").on(table.assigneeId),
]);

export const crmMonthlyMetrics = pgTable("crm_monthly_metrics", {
  id: serial("id").primaryKey(),
  orgId: text("org_id").references(() => organizations.id).notNull(),
  month: text("month").notNull(),
  revenue: decimal("revenue").default("0"),
  mqls: integer("mqls").default(0),
  retention: decimal("retention").default("0"),
  csat: decimal("csat").default("0"),
  ticketVolume: integer("ticket_volume").default(0),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_crm_monthly_metrics_org_month").on(table.orgId, table.month),
]);

export const crmTeamPerformance = pgTable("crm_team_performance", {
  id: serial("id").primaryKey(),
  orgId: text("org_id").references(() => organizations.id).notNull(),
  personId: integer("person_id").references(() => crmPeople.id).notNull(),
  month: text("month").notNull(),
  value: decimal("value").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const crmSupportTeamMembers = pgTable("crm_support_team_members", {
  id: serial("id").primaryKey(),
  orgId: text("org_id").references(() => organizations.id).notNull(),
  name: text("name").notNull(),
  role: text("role").notNull(),
  access: text("access").notNull(),
  avatar: text("avatar").notNull(),
  status: text("status").default("online"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const crmEmailTemplates = pgTable("crm_email_templates", {
  id: serial("id").primaryKey(),
  orgId: text("org_id").references(() => organizations.id).notNull(),
  name: text("name").notNull(),
  subject: text("subject").notNull(),
  body: text("body").notNull(),
  createdBy: text("created_by").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_crm_email_templates_org").on(table.orgId),
]);

export const leadScoringRules = pgTable("lead_scoring_rules", {
  id: serial("id").primaryKey(),
  orgId: text("org_id").references(() => organizations.id).notNull(),
  field: text("field").notNull(),
  operator: scoringOperatorEnum("operator").notNull(),
  value: text("value").notNull(),
  points: integer("points").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_lead_scoring_rules_org").on(table.orgId),
]);

export const leadAssignmentRules = pgTable("lead_assignment_rules", {
  id: serial("id").primaryKey(),
  orgId: text("org_id").references(() => organizations.id).notNull(),
  name: text("name").notNull(),
  conditions: jsonb("conditions").$type<{ field: string; operator: string; value: string }[]>().default([]),
  assignmentType: assignmentRuleTypeEnum("assignment_type").notNull(),
  assignToUserId: text("assign_to_user_id").references(() => users.id),
  roundRobinUserIds: jsonb("round_robin_user_ids").$type<string[]>().default([]),
  priority: integer("priority").notNull().default(0),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_lead_assignment_rules_org").on(table.orgId),
]);

export const assignmentRuleState = pgTable("assignment_rule_state", {
  id: serial("id").primaryKey(),
  ruleId: integer("rule_id").references(() => leadAssignmentRules.id, { onDelete: "cascade" }).notNull().unique(),
  lastAssignedIndex: integer("last_assigned_index").default(0).notNull(),
});

export const crmSla = pgTable("crm_sla_policies", {
  id: serial("id").primaryKey(),
  orgId: text("org_id").references(() => organizations.id).notNull(),
  name: text("name").notNull(),
  appliesTo: slaAppliesToEnum("applies_to").notNull(),
  priority: slaPriorityEnum("priority").notNull(),
  firstResponseHours: integer("first_response_hours").notNull(),
  resolutionHours: integer("resolution_hours").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_crm_sla_org").on(table.orgId),
]);

export const contacts = pgTable("contacts", {
  id: serial("id").primaryKey(),
  orgId: text("org_id").references(() => organizations.id).notNull(),
  name: text("name").notNull(),
  email: text("email"),
  phone: text("phone"),
  title: text("title"),
  department: text("department"),
  company: text("company"),
  organizationId: integer("organization_id"),
  linkedinUrl: text("linkedin_url"),
  twitterUrl: text("twitter_url"),
  websiteUrl: text("website_url"),
  avatarUrl: text("avatar_url"),
  leadId: integer("lead_id").references(() => leads.id),
  dealId: integer("deal_id").references(() => deals.id),
  tags: jsonb("tags").$type<string[]>().default([]),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_contacts_org").on(table.orgId),
  index("idx_contacts_organization").on(table.organizationId),
  index("idx_contacts_name_email").on(table.orgId, table.name, table.email),
]);

export const crmOrganizations = pgTable("crm_organizations", {
  id: serial("id").primaryKey(),
  orgId: text("org_id").references(() => organizations.id).notNull(),
  name: text("name").notNull(),
  domain: text("domain"),
  industry: text("industry"),
  size: orgSizeEnum("size"),
  website: text("website"),
  linkedinUrl: text("linkedin_url"),
  description: text("description"),
  healthScore: integer("health_score"),
  parentId: integer("parent_id"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_crm_organizations_org").on(table.orgId),
  index("idx_crm_organizations_parent").on(table.orgId, table.parentId),
  foreignKey({ columns: [table.parentId], foreignColumns: [table.id] }).onDelete("set null"),
]);

export const branches = pgTable("branches", {
  id: serial("id").primaryKey(),
  orgId: text("org_id").notNull().references(() => organizations.id),
  name: text("name").notNull(),
  code: text("code").notNull(),
  city: text("city"),
  state: text("state"),
  country: text("country").default("India"),
  pincode: text("pincode"),
  address: text("address"),
  phone: text("phone"),
  email: text("email"),
  branchManagerId: text("branch_manager_id").references(() => users.id),
  branchHrId: text("branch_hr_id").references(() => users.id),
  status: branchStatusEnum("status").notNull().default("ACTIVE"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("idx_branches_org").on(table.orgId),
  uniqueIndex("uniq_branch_code_org").on(table.orgId, table.code),
]);

export const clientAccounts = pgTable("client_accounts", {
  id: serial("id").primaryKey(),
  orgId: text("org_id").notNull().references(() => organizations.id),
  branchId: integer("branch_id").references(() => branches.id),
  leadId: integer("lead_id").notNull().references(() => leads.id),
  salesRepId: text("sales_rep_id").notNull().references(() => users.id),
  assignedCrmId: text("assigned_crm_id").references(() => users.id),
  clientName: text("client_name").notNull(),
  clientEmail: text("client_email"),
  clientPhone: text("client_phone"),
  clientWhatsapp: text("client_whatsapp"),
  status: clientAccountStatusEnum("status").notNull().default("ACCOUNT_OPENING"),
  investmentAmount: decimal("investment_amount", { precision: 15, scale: 2 }),
  planName: text("plan_name"),
  investmentDate: timestamp("investment_date"),
  transactionRef: text("transaction_ref"),
  conversionNotes: text("conversion_notes"),
  estimatedInvestment: decimal("estimated_investment", { precision: 15, scale: 2 }),
  convertedAt: timestamp("converted_at").defaultNow().notNull(),
  investedAt: timestamp("invested_at"),
  renewalStage: text("renewal_stage").default("upcoming").notNull(),
  renewalDate: date("renewal_date"),
  renewalNotes: text("renewal_notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("idx_client_accounts_org").on(table.orgId),
  index("idx_client_accounts_sales_rep").on(table.salesRepId),
  index("idx_client_accounts_status").on(table.orgId, table.status),
  index("idx_client_accounts_assigned_crm").on(table.assignedCrmId),
]);

export const clientAccountActivities = pgTable("client_account_activities", {
  id: serial("id").primaryKey(),
  clientAccountId: integer("client_account_id").notNull().references(() => clientAccounts.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull().references(() => users.id),
  activityType: text("activity_type").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("idx_client_account_activities_account").on(table.clientAccountId),
  index("idx_client_account_activities_user").on(table.userId),
]);

export const incentiveConfig = pgTable("incentive_config", {
  id: serial("id").primaryKey(),
  orgId: text("org_id").notNull().references(() => organizations.id),
  branchId: integer("branch_id").references(() => branches.id),
  incentiveRate: decimal("incentive_rate", { precision: 5, scale: 2 }).notNull(),
  effectiveFrom: timestamp("effective_from").defaultNow().notNull(),
  effectiveTo: timestamp("effective_to"),
  isActive: boolean("is_active").notNull().default(true),
  createdBy: text("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const incentives = pgTable("incentives", {
  id: serial("id").primaryKey(),
  orgId: text("org_id").notNull().references(() => organizations.id),
  branchId: integer("branch_id").references(() => branches.id),
  clientAccountId: integer("client_account_id").notNull().references(() => clientAccounts.id),
  salesRepId: text("sales_rep_id").notNull().references(() => users.id),
  investmentAmount: decimal("investment_amount", { precision: 15, scale: 2 }).notNull(),
  incentiveRate: decimal("incentive_rate", { precision: 5, scale: 2 }).notNull(),
  calculatedAmount: decimal("calculated_amount", { precision: 15, scale: 2 }).notNull(),
  approvedAmount: decimal("approved_amount", { precision: 15, scale: 2 }),
  status: incentiveStatusEnum("status").notNull().default("PENDING"),
  approvedBy: text("approved_by").references(() => users.id),
  approvedAt: timestamp("approved_at"),
  payrollId: integer("payroll_id").references(() => payrolls.id),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("idx_incentives_org").on(table.orgId),
  index("idx_incentives_sales_rep").on(table.salesRepId),
  index("idx_incentives_status").on(table.status),
]);

export const dmLeads = pgTable("dm_leads", {
  id: serial("id").primaryKey(),
  orgId: text("org_id").notNull().references(() => organizations.id),
  name: text("name").notNull(),
  phone: text("phone"),
  email: text("email"),
  whatsappNumber: text("whatsapp_number"),
  sourcePlatform: text("source_platform").notNull(),
  campaignId: integer("campaign_id").references(() => crmCampaigns.id),
  campaignType: text("campaign_type"),
  leadQuality: text("lead_quality").default("warm"),
  notes: text("notes"),
  landingPageUrl: text("landing_page_url"),
  dateCaptured: timestamp("date_captured").defaultNow().notNull(),
  status: dmLeadStatusEnum("status").notNull().default("pending_review"),
  verifiedBy: text("verified_by").references(() => users.id),
  importedLeadId: integer("imported_lead_id").references(() => leads.id),
  createdBy: text("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("idx_dm_leads_org").on(table.orgId),
  index("idx_dm_leads_status").on(table.status),
  index("idx_dm_leads_platform").on(table.sourcePlatform),
]);

export const socialMediaStats = pgTable("social_media_stats", {
  id: serial("id").primaryKey(),
  orgId: text("org_id").notNull().references(() => organizations.id),
  platform: socialPlatformEnum("platform").notNull(),
  date: date("date").notNull(),
  postsPublished: integer("posts_published").default(0),
  storiesReels: integer("stories_reels").default(0),
  followersTotal: integer("followers_total").default(0),
  engagementRate: decimal("engagement_rate", { precision: 5, scale: 2 }),
  impressions: integer("impressions").default(0),
  reach: integer("reach").default(0),
  linkClicks: integer("link_clicks").default(0),
  profileVisits: integer("profile_visits").default(0),
  enteredBy: text("entered_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  unique("uniq_social_stats_org_platform_date").on(table.orgId, table.platform, table.date),
]);

export const invoices = pgTable("invoices", {
  id: serial("id").primaryKey(),
  orgId: text("org_id").references(() => organizations.id).notNull(),
  clientId: integer("client_id").references(() => clients.id),
  projectId: integer("project_id").references(() => projects.id),
  invoiceNumber: text("invoice_number").notNull(),
  status: invoiceStatusEnum("status").default("DRAFT").notNull(),
  lineItems: jsonb("line_items").$type<{ description: string; quantity: number; rate: number; amount: number }[]>().default([]),
  subtotal: decimal("subtotal").default("0").notNull(),
  taxRate: decimal("tax_rate").default("0"),
  taxAmount: decimal("tax_amount").default("0"),
  discount: decimal("discount").default("0"),
  total: decimal("total").default("0").notNull(),
  currency: text("currency").default("INR").notNull(),
  dueDate: date("due_date"),
  notes: text("notes"),
  sentAt: timestamp("sent_at"),
  paidAt: timestamp("paid_at"),
  viewedAt: timestamp("viewed_at"),
  terms: text("terms"),
  isRecurring: boolean("is_recurring").default(false).notNull(),
  recurringInterval: text("recurring_interval"),
  nextRecurringDate: date("next_recurring_date"),
  createdBy: text("created_by").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_invoices_org_status").on(table.orgId, table.status),
  index("idx_invoices_client").on(table.clientId),
  index("idx_invoices_project").on(table.projectId),
  index("idx_invoices_due_date").on(table.dueDate),
]);

export const payments = pgTable("payments", {
  id: serial("id").primaryKey(),
  orgId: text("org_id").references(() => organizations.id).notNull(),
  invoiceId: integer("invoice_id").references(() => invoices.id, { onDelete: "cascade" }).notNull(),
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  paymentDate: date("payment_date").notNull(),
  paymentMethod: text("payment_method").notNull(),
  referenceNumber: text("reference_number"),
  notes: text("notes"),
  createdBy: text("created_by").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("idx_payments_invoice").on(table.invoiceId),
  index("idx_payments_org_date").on(table.orgId, table.paymentDate),
]);


export const supportTickets = pgTable("support_tickets", {
  id: serial("id").primaryKey(),
  orgId: text("org_id").references(() => organizations.id).notNull(),
  clientId: integer("client_id").references(() => clients.id),
  assigneeId: text("assignee_id").references(() => users.id),
  title: text("title").notNull(),
  category: text("category"),
  description: text("description"),
  status: supportTicketStatusEnum("status").default("OPEN").notNull(),
  priority: supportTicketPriorityEnum("priority").default("MEDIUM").notNull(),
  slaDeadline: timestamp("sla_deadline"),
  resolvedAt: timestamp("resolved_at"),
  closedAt: timestamp("closed_at"),
  createdBy: text("created_by").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_support_tickets_org_status").on(table.orgId, table.status),
  index("idx_support_tickets_assignee").on(table.assigneeId),
  index("idx_support_tickets_client").on(table.clientId),
  index("idx_support_tickets_priority").on(table.priority),
  index("idx_support_tickets_sla").on(table.slaDeadline),
]);

export const supportTicketMessages = pgTable("support_ticket_messages", {
  id: serial("id").primaryKey(),
  ticketId: integer("ticket_id").references(() => supportTickets.id, { onDelete: "cascade" }).notNull(),
  authorId: text("author_id").references(() => users.id).notNull(),
  body: text("body").notNull(),
  isInternal: boolean("is_internal").default(false).notNull(),
  attachments: jsonb("attachments").$type<{ fileName: string; fileUrl: string; fileSize: number; mimeType: string }[]>().default([]),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_support_ticket_messages_ticket").on(table.ticketId),
  index("idx_support_ticket_messages_author").on(table.authorId),
]);

export const leadsRelations = relations(leads, ({ one, many }) => ({
  organization: one(organizations, { fields: [leads.orgId], references: [organizations.id] }),
  assignedTo: one(users, { fields: [leads.assignedToId], references: [users.id], relationName: "leadAssignee" }),
  assignedBy: one(users, { fields: [leads.assignedById], references: [users.id], relationName: "leadAssigner" }),
  campaign: one(crmCampaigns, { fields: [leads.campaignId], references: [crmCampaigns.id] }),
  activities: many(leadActivities),
}));

export const leadActivitiesRelations = relations(leadActivities, ({ one }) => ({
  lead: one(leads, { fields: [leadActivities.leadId], references: [leads.id] }),
  user: one(users, { fields: [leadActivities.userId], references: [users.id] }),
}));

export const leadNotesRelations = relations(leadNotes, ({ one }) => ({
  lead: one(leads, { fields: [leadNotes.leadId], references: [leads.id] }),
  author: one(users, { fields: [leadNotes.authorId], references: [users.id] }),
}));

export const leadTasksRelations = relations(leadTasks, ({ one }) => ({
  lead: one(leads, { fields: [leadTasks.leadId], references: [leads.id] }),
  assignee: one(users, { fields: [leadTasks.assigneeId], references: [users.id] }),
}));

export const leadEmailsRelations = relations(leadEmails, ({ one }) => ({
  lead: one(leads, { fields: [leadEmails.leadId], references: [leads.id] }),
}));

export const clientsRelations = relations(clients, ({ one }) => ({
  lead: one(leads, { fields: [clients.leadId], references: [leads.id] }),
  accountManager: one(users, { fields: [clients.accountManagerId], references: [users.id] }),
}));

export const targetsRelations = relations(targets, ({ one, many }) => ({
  user: one(users, { fields: [targets.userId], references: [users.id] }),
  setBy: one(users, { fields: [targets.setById], references: [users.id], relationName: "targetSetter" }),
  history: many(targetHistory),
}));

export const targetHistoryRelations = relations(targetHistory, ({ one }) => ({
  target: one(targets, { fields: [targetHistory.targetId], references: [targets.id] }),
  changedBy: one(users, { fields: [targetHistory.changedById], references: [users.id] }),
}));

export const dealMeetings = pgTable("deal_meetings", {
  id: serial("id").primaryKey(),
  orgId: text("org_id").references(() => organizations.id).notNull(),
  dealId: integer("deal_id").references(() => deals.id, { onDelete: "cascade" }).notNull(),
  title: text("title").notNull(),
  scheduledAt: timestamp("scheduled_at").notNull(),
  durationMinutes: integer("duration_minutes").default(30),
  attendees: text("attendees").array(),
  agenda: text("agenda"),
  notes: text("notes"),
  actionItems: text("action_items"),
  recordingLink: text("recording_link"),
  status: text("status").default("scheduled").notNull(),
  createdBy: text("created_by").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("idx_deal_meetings_deal").on(table.dealId),
  index("idx_deal_meetings_org").on(table.orgId),
]);

export const clientOpportunities = pgTable("client_opportunities", {
  id: serial("id").primaryKey(),
  orgId: text("org_id").references(() => organizations.id).notNull(),
  clientId: integer("client_id").references(() => clients.id, { onDelete: "cascade" }).notNull(),
  title: text("title").notNull(),
  type: text("type").default("upsell").notNull(),
  stage: text("stage").default("identified").notNull(),
  value: decimal("value", { precision: 15, scale: 2 }),
  notes: text("notes"),
  expectedCloseDate: date("expected_close_date"),
  createdBy: text("created_by").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("idx_client_opps_org").on(table.orgId),
  index("idx_client_opps_client").on(table.clientId),
]);

export const clientOpportunitiesRelations = relations(clientOpportunities, ({ one }) => ({
  client: one(clients, { fields: [clientOpportunities.clientId], references: [clients.id] }),
  creator: one(users, { fields: [clientOpportunities.createdBy], references: [users.id] }),
}));

export const clientOnboardingTemplates = pgTable("client_onboarding_templates", {
  id: serial("id").primaryKey(),
  orgId: text("org_id").references(() => organizations.id).notNull(),
  name: text("name").notNull(),
  description: text("description"),
  isDefault: boolean("is_default").default(false).notNull(),
  createdBy: text("created_by").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("idx_client_onboarding_templates_org").on(table.orgId),
]);

export const clientOnboardingItems = pgTable("client_onboarding_items", {
  id: serial("id").primaryKey(),
  orgId: text("org_id").references(() => organizations.id).notNull(),
  clientId: integer("client_id").references(() => clients.id, { onDelete: "cascade" }).notNull(),
  templateId: integer("template_id").references(() => clientOnboardingTemplates.id),
  title: text("title").notNull(),
  description: text("description"),
  assignedTo: text("assigned_to").references(() => users.id),
  dueDate: date("due_date"),
  completedAt: timestamp("completed_at"),
  completedBy: text("completed_by").references(() => users.id),
  sortOrder: integer("sort_order").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("idx_onboarding_items_client").on(table.clientId),
  index("idx_onboarding_items_org").on(table.orgId),
]);

export const clientOnboardingTemplatesRelations = relations(clientOnboardingTemplates, ({ one, many }) => ({
  organization: one(organizations, { fields: [clientOnboardingTemplates.orgId], references: [organizations.id] }),
  creator: one(users, { fields: [clientOnboardingTemplates.createdBy], references: [users.id] }),
  items: many(clientOnboardingItems),
}));

export const clientOnboardingItemsRelations = relations(clientOnboardingItems, ({ one }) => ({
  client: one(clients, { fields: [clientOnboardingItems.clientId], references: [clients.id] }),
  template: one(clientOnboardingTemplates, { fields: [clientOnboardingItems.templateId], references: [clientOnboardingTemplates.id] }),
  assignee: one(users, { fields: [clientOnboardingItems.assignedTo], references: [users.id] }),
  completedByUser: one(users, { fields: [clientOnboardingItems.completedBy], references: [users.id] }),
}));

export const dealsRelations = relations(deals, ({ one, many }) => ({
  organization: one(organizations, { fields: [deals.orgId], references: [organizations.id] }),
  lead: one(leads, { fields: [deals.leadId], references: [leads.id] }),
  client: one(clients, { fields: [deals.clientId], references: [clients.id] }),
  assignedTo: one(users, { fields: [deals.assignedToId], references: [users.id] }),
  activities: many(dealActivities),
  meetings: many(dealMeetings),
}));

export const dealMeetingsRelations = relations(dealMeetings, ({ one }) => ({
  deal: one(deals, { fields: [dealMeetings.dealId], references: [deals.id] }),
  creator: one(users, { fields: [dealMeetings.createdBy], references: [users.id] }),
}));

export const dealActivitiesRelations = relations(dealActivities, ({ one }) => ({
  deal: one(deals, { fields: [dealActivities.dealId], references: [deals.id] }),
  user: one(users, { fields: [dealActivities.userId], references: [users.id] }),
}));

export const crmPeopleRelations = relations(crmPeople, ({ one, many }) => ({
  organization: one(organizations, { fields: [crmPeople.orgId], references: [organizations.id] }),
  deals: many(crmDeals),
  managedCompanies: many(crmCompanies),
  activities: many(crmActivities),
  performance: many(crmTeamPerformance),
}));

export const crmCompaniesRelations = relations(crmCompanies, ({ one }) => ({
  organization: one(organizations, { fields: [crmCompanies.orgId], references: [organizations.id] }),
  csm: one(crmPeople, { fields: [crmCompanies.csmId], references: [crmPeople.id] }),
}));

export const crmDealsRelations = relations(crmDeals, ({ one }) => ({
  organization: one(organizations, { fields: [crmDeals.orgId], references: [organizations.id] }),
  salesRep: one(crmPeople, { fields: [crmDeals.salesRepId], references: [crmPeople.id] }),
}));

export const crmCampaignsRelations = relations(crmCampaigns, ({ one, many }) => ({
  organization: one(organizations, { fields: [crmCampaigns.orgId], references: [organizations.id] }),
  leads: many(crmLeads),
}));

export const crmLeadsRelations = relations(crmLeads, ({ one }) => ({
  organization: one(organizations, { fields: [crmLeads.orgId], references: [organizations.id] }),
  campaign: one(crmCampaigns, { fields: [crmLeads.campaignId], references: [crmCampaigns.id] }),
}));

export const crmActivitiesRelations = relations(crmActivities, ({ one }) => ({
  organization: one(organizations, { fields: [crmActivities.orgId], references: [organizations.id] }),
  crmPerson: one(crmPeople, { fields: [crmActivities.personId], references: [crmPeople.id] }),
}));

export const crmSupportTicketsRelations = relations(crmSupportTickets, ({ one }) => ({
  organization: one(organizations, { fields: [crmSupportTickets.orgId], references: [organizations.id] }),
  assignee: one(crmPeople, { fields: [crmSupportTickets.assigneeId], references: [crmPeople.id] }),
}));

export const crmTeamPerformanceRelations = relations(crmTeamPerformance, ({ one }) => ({
  organization: one(organizations, { fields: [crmTeamPerformance.orgId], references: [organizations.id] }),
  person: one(crmPeople, { fields: [crmTeamPerformance.personId], references: [crmPeople.id] }),
}));

export const crmEmailTemplatesRelations = relations(crmEmailTemplates, ({ one }) => ({
  organization: one(organizations, { fields: [crmEmailTemplates.orgId], references: [organizations.id] }),
  creator: one(users, { fields: [crmEmailTemplates.createdBy], references: [users.id] }),
}));

export const leadScoringRulesRelations = relations(leadScoringRules, ({ one }) => ({
  organization: one(organizations, { fields: [leadScoringRules.orgId], references: [organizations.id] }),
}));

export const leadAssignmentRulesRelations = relations(leadAssignmentRules, ({ one }) => ({
  organization: one(organizations, { fields: [leadAssignmentRules.orgId], references: [organizations.id] }),
  assignToUser: one(users, { fields: [leadAssignmentRules.assignToUserId], references: [users.id] }),
}));

export const assignmentRuleStateRelations = relations(assignmentRuleState, ({ one }) => ({
  rule: one(leadAssignmentRules, { fields: [assignmentRuleState.ruleId], references: [leadAssignmentRules.id] }),
}));

export const crmSlaRelations = relations(crmSla, ({ one }) => ({
  organization: one(organizations, { fields: [crmSla.orgId], references: [organizations.id] }),
}));

export const contactsRelations = relations(contacts, ({ one }) => ({
  organization: one(organizations, { fields: [contacts.orgId], references: [organizations.id] }),
  crmOrganization: one(crmOrganizations, { fields: [contacts.organizationId], references: [crmOrganizations.id] }),
  lead: one(leads, { fields: [contacts.leadId], references: [leads.id] }),
  deal: one(deals, { fields: [contacts.dealId], references: [deals.id] }),
}));

export const csatSurveys = pgTable("csat_surveys", {
  id: serial("id").primaryKey(),
  orgId: text("org_id").references(() => organizations.id).notNull(),
  clientId: integer("client_id").references(() => clients.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  question: text("question").notNull().default("How satisfied are you with our service?"),
  scaleMax: integer("scale_max").default(5).notNull(),
  status: text("status").default("draft").notNull(),
  publicToken: text("public_token").notNull(),
  sentAt: timestamp("sent_at"),
  closedAt: timestamp("closed_at"),
  createdBy: text("created_by").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("idx_csat_surveys_org").on(table.orgId),
  uniqueIndex("idx_csat_surveys_token").on(table.publicToken),
]);

export const csatResponses = pgTable("csat_responses", {
  id: serial("id").primaryKey(),
  surveyId: integer("survey_id").references(() => csatSurveys.id, { onDelete: "cascade" }).notNull(),
  orgId: text("org_id").references(() => organizations.id).notNull(),
  rating: integer("rating").notNull(),
  comment: text("comment"),
  respondentName: text("respondent_name"),
  respondentEmail: text("respondent_email"),
  submittedAt: timestamp("submitted_at").defaultNow().notNull(),
}, (table) => [
  index("idx_csat_responses_survey").on(table.surveyId),
]);

export const csatSurveysRelations = relations(csatSurveys, ({ one, many }) => ({
  organization: one(organizations, { fields: [csatSurveys.orgId], references: [organizations.id] }),
  client: one(clients, { fields: [csatSurveys.clientId], references: [clients.id] }),
  creator: one(users, { fields: [csatSurveys.createdBy], references: [users.id] }),
  responses: many(csatResponses),
}));

export const csatResponsesRelations = relations(csatResponses, ({ one }) => ({
  survey: one(csatSurveys, { fields: [csatResponses.surveyId], references: [csatSurveys.id] }),
}));

export const crmOrganizationsRelations = relations(crmOrganizations, ({ one, many }) => ({
  org: one(organizations, { fields: [crmOrganizations.orgId], references: [organizations.id] }),
  contacts: many(contacts),
  parent: one(crmOrganizations, { fields: [crmOrganizations.parentId], references: [crmOrganizations.id], relationName: "orgParent" }),
  children: many(crmOrganizations, { relationName: "orgParent" }),
}));

export const branchesRelations = relations(branches, ({ one }) => ({
  organization: one(organizations, { fields: [branches.orgId], references: [organizations.id] }),
  branchManager: one(users, { fields: [branches.branchManagerId], references: [users.id], relationName: "branchManager" }),
  branchHr: one(users, { fields: [branches.branchHrId], references: [users.id], relationName: "branchHr" }),
}));

export const clientAccountsRelations = relations(clientAccounts, ({ one, many }) => ({
  organization: one(organizations, { fields: [clientAccounts.orgId], references: [organizations.id] }),
  branch: one(branches, { fields: [clientAccounts.branchId], references: [branches.id] }),
  lead: one(leads, { fields: [clientAccounts.leadId], references: [leads.id] }),
  salesRep: one(users, { fields: [clientAccounts.salesRepId], references: [users.id], relationName: "clientAccountSalesRep" }),
  assignedCrm: one(users, { fields: [clientAccounts.assignedCrmId], references: [users.id], relationName: "clientAccountCrm" }),
  activities: many(clientAccountActivities),
  incentives: many(incentives),
}));

export const clientAccountActivitiesRelations = relations(clientAccountActivities, ({ one }) => ({
  clientAccount: one(clientAccounts, { fields: [clientAccountActivities.clientAccountId], references: [clientAccounts.id] }),
  user: one(users, { fields: [clientAccountActivities.userId], references: [users.id] }),
}));

export const incentivesRelations = relations(incentives, ({ one }) => ({
  organization: one(organizations, { fields: [incentives.orgId], references: [organizations.id] }),
  clientAccount: one(clientAccounts, { fields: [incentives.clientAccountId], references: [clientAccounts.id] }),
  salesRep: one(users, { fields: [incentives.salesRepId], references: [users.id] }),
  approver: one(users, { fields: [incentives.approvedBy], references: [users.id] }),
}));

export const dmLeadsRelations = relations(dmLeads, ({ one }) => ({
  organization: one(organizations, { fields: [dmLeads.orgId], references: [organizations.id] }),
  campaign: one(crmCampaigns, { fields: [dmLeads.campaignId], references: [crmCampaigns.id] }),
  verifier: one(users, { fields: [dmLeads.verifiedBy], references: [users.id], relationName: "dmLeadVerifier" }),
  importedLead: one(leads, { fields: [dmLeads.importedLeadId], references: [leads.id] }),
  creator: one(users, { fields: [dmLeads.createdBy], references: [users.id], relationName: "dmLeadCreator" }),
}));

export const invoicesRelations = relations(invoices, ({ one, many }) => ({
  organization: one(organizations, { fields: [invoices.orgId], references: [organizations.id] }),
  client: one(clients, { fields: [invoices.clientId], references: [clients.id] }),
  project: one(projects, { fields: [invoices.projectId], references: [projects.id] }),
  creator: one(users, { fields: [invoices.createdBy], references: [users.id] }),
  payments: many(payments),
}));

export const paymentsRelations = relations(payments, ({ one }) => ({
  organization: one(organizations, { fields: [payments.orgId], references: [organizations.id] }),
  invoice: one(invoices, { fields: [payments.invoiceId], references: [invoices.id] }),
  creator: one(users, { fields: [payments.createdBy], references: [users.id] }),
}));


export const supportTicketsRelations = relations(supportTickets, ({ one, many }) => ({
  organization: one(organizations, { fields: [supportTickets.orgId], references: [organizations.id] }),
  client: one(clients, { fields: [supportTickets.clientId], references: [clients.id] }),
  assignee: one(users, { fields: [supportTickets.assigneeId], references: [users.id] }),
  creator: one(users, { fields: [supportTickets.createdBy], references: [users.id] }),
  messages: many(supportTicketMessages),
}));

export const supportTicketMessagesRelations = relations(supportTicketMessages, ({ one }) => ({
  ticket: one(supportTickets, { fields: [supportTicketMessages.ticketId], references: [supportTickets.id] }),
  author: one(users, { fields: [supportTicketMessages.authorId], references: [users.id] }),
}));

export const customFieldDefinitions = pgTable("custom_field_definitions", {
  id: serial("id").primaryKey(),
  orgId: text("org_id").notNull().references(() => organizations.id),
  entityType: text("entity_type").notNull(),
  name: text("name").notNull(),
  label: text("label").notNull(),
  fieldType: text("field_type").notNull().default("text"),
  options: jsonb("options").$type<Array<{ value: string; label: string }>>(),
  isRequired: boolean("is_required").default(false),
  isActive: boolean("is_active").default(true),
  sortOrder: integer("sort_order").default(0),
  createdBy: text("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  uniqueIndex("cfd_org_entity_name_idx").on(table.orgId, table.entityType, table.name),
  index("idx_cfd_org_entity").on(table.orgId, table.entityType),
]);

export const customFieldDefinitionsRelations = relations(customFieldDefinitions, ({ one }) => ({
  organization: one(organizations, { fields: [customFieldDefinitions.orgId], references: [organizations.id] }),
  creator: one(users, { fields: [customFieldDefinitions.createdBy], references: [users.id] }),
}));

export const territories = pgTable("territories", {
  id: serial("id").primaryKey(),
  orgId: text("org_id").notNull().references(() => organizations.id),
  name: text("name").notNull(),
  states: text("states").array().default([]),
  cities: text("cities").array().default([]),
  assignedReps: integer("assigned_reps").array().default([]),
  description: text("description"),
  isActive: boolean("is_active").default(true),
  createdBy: text("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("territories_org_id_idx").on(table.orgId),
]);

export const territoriesRelations = relations(territories, ({ one }) => ({
  organization: one(organizations, { fields: [territories.orgId], references: [organizations.id] }),
  creator: one(users, { fields: [territories.createdBy], references: [users.id] }),
}));

export const webLeadForms = pgTable("web_lead_forms", {
  id: serial("id").primaryKey(),
  orgId: text("org_id").notNull().references(() => organizations.id),
  name: text("name").notNull(),
  description: text("description"),
  fields: jsonb("fields").$type<Array<{ name: string; label: string; type: string; required: boolean; options?: string[] }>>().notNull().default([]),
  publicToken: text("public_token").notNull().unique(),
  isActive: boolean("is_active").default(true),
  submitMessage: text("submit_message").default("Thank you! We'll be in touch soon."),
  redirectUrl: text("redirect_url"),
  totalSubmissions: integer("total_submissions").default(0),
  createdBy: text("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("web_lead_forms_org_id_idx").on(table.orgId),
  uniqueIndex("web_lead_forms_token_idx").on(table.publicToken),
]);

export const webLeadFormsRelations = relations(webLeadForms, ({ one }) => ({
  organization: one(organizations, { fields: [webLeadForms.orgId], references: [organizations.id] }),
  creator: one(users, { fields: [webLeadForms.createdBy], references: [users.id] }),
}));

export const tasks = pgTable("tasks", {
  id: serial("id").primaryKey(),
  orgId: text("org_id").references(() => organizations.id).notNull(),
  title: text("title").notNull(),
  notes: text("notes"),
  entityType: taskEntityTypeEnum("entity_type"),
  entityId: integer("entity_id"),
  type: taskTypeEnum("type").notNull().default("CUSTOM"),
  status: taskStatusEnum("status").notNull().default("pending"),
  assigneeId: text("assignee_id").references(() => users.id),
  createdBy: text("created_by").references(() => users.id),
  dueDate: timestamp("due_date", { withTimezone: true }),
  remindAt: timestamp("remind_at", { withTimezone: true }),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  timezone: text("timezone"),
  recurrence: jsonb("recurrence").$type<{
    frequency: "DAILY" | "WEEKLY" | "MONTHLY";
    interval: number;
    endDate?: string;
  } | null>(),
  parentTaskId: integer("parent_task_id"),
  isTemplate: boolean("is_template").notNull().default(false),
  templateName: text("template_name"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_tasks_org").on(table.orgId),
  index("idx_tasks_assignee").on(table.assigneeId),
  index("idx_tasks_status").on(table.status),
  index("idx_tasks_due_date").on(table.dueDate),
  index("idx_tasks_entity").on(table.entityType, table.entityId),
  index("idx_tasks_parent").on(table.parentTaskId),
]);

export const taskSequences = pgTable("task_sequences", {
  id: serial("id").primaryKey(),
  orgId: text("org_id").notNull().references(() => organizations.id),
  name: text("name").notNull(),
  description: text("description"),
  createdBy: text("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

export const taskSequenceSteps = pgTable("task_sequence_steps", {
  id: serial("id").primaryKey(),
  sequenceId: integer("sequence_id").notNull().references(() => taskSequences.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  type: text("type").notNull().default("CUSTOM"),
  notes: text("notes"),
  offsetDays: integer("offset_days").notNull().default(0),
  order: integer("order").notNull().default(0),
});

export const tasksRelations = relations(tasks, ({ one }) => ({
  organization: one(organizations, { fields: [tasks.orgId], references: [organizations.id] }),
  assignee: one(users, { fields: [tasks.assigneeId], references: [users.id], relationName: "taskAssignee" }),
  createdByUser: one(users, { fields: [tasks.createdBy], references: [users.id], relationName: "taskCreator" }),
  parentTask: one(tasks, { fields: [tasks.parentTaskId], references: [tasks.id], relationName: "childTasks" }),
}));

export const taskSequencesRelations = relations(taskSequences, ({ one, many }) => ({
  organization: one(organizations, { fields: [taskSequences.orgId], references: [organizations.id] }),
  creator: one(users, { fields: [taskSequences.createdBy], references: [users.id] }),
  steps: many(taskSequenceSteps),
}));

export const taskSequenceStepsRelations = relations(taskSequenceSteps, ({ one }) => ({
  sequence: one(taskSequences, { fields: [taskSequenceSteps.sequenceId], references: [taskSequences.id] }),
}));

export const leadImportBatches = pgTable("lead_import_batches", {
  id: serial("id").primaryKey(),
  orgId: text("org_id").references(() => organizations.id).notNull(),
  createdBy: text("created_by").references(() => users.id).notNull(),
  filename: text("filename").notNull(),
  status: text("status").notNull().default("PROCESSING"),
  totalRows: integer("total_rows").notNull().default(0),
  importedRows: integer("imported_rows").notNull().default(0),
  failedRows: integer("failed_rows").notNull().default(0),
  errorReport: jsonb("error_report").$type<Array<{ row: number; error: string }>>(),
  createdAt: timestamp("created_at").defaultNow(),
  completedAt: timestamp("completed_at"),
}, (table) => [
  index("idx_lead_batches_org").on(table.orgId),
]);

export const leadImportBatchesRelations = relations(leadImportBatches, ({ one }) => ({
  organization: one(organizations, { fields: [leadImportBatches.orgId], references: [organizations.id] }),
  creator: one(users, { fields: [leadImportBatches.createdBy], references: [users.id] }),
}));


export const quotes = pgTable("quotes", {
  id: serial("id").primaryKey(),
  orgId: text("org_id").references(() => organizations.id).notNull(),
  dealId: integer("deal_id").references(() => deals.id, { onDelete: "set null" }),
  clientId: integer("client_id").references(() => clientAccounts.id, { onDelete: "set null" }),
  quoteNumber: text("quote_number").notNull(),
  subject: text("subject").notNull(),
  description: text("description"),
  status: quoteStatusEnum("status").default("DRAFT").notNull(),
  currency: text("currency").default("INR").notNull(),
  totalAmount: decimal("total_amount", { precision: 15, scale: 2 }).notNull(),
  taxAmount: decimal("tax_amount", { precision: 15, scale: 2 }).default("0"),
  discountAmount: decimal("discount_amount", { precision: 15, scale: 2 }).default("0"),
  netAmount: decimal("net_amount", { precision: 15, scale: 2 }).notNull(),
  validUntil: date("valid_until").notNull(),
  termsAndConditions: text("terms_and_conditions"),
  createdById: text("created_by_id").references(() => users.id).notNull(),
  sentAt: timestamp("sent_at"),
  acceptedAt: timestamp("accepted_at"),
  rejectedAt: timestamp("rejected_at"),
  rejectionReason: text("rejection_reason"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_quotes_org_status").on(table.orgId, table.status),
  index("idx_quotes_deal").on(table.dealId),
  index("idx_quotes_client").on(table.clientId),
  index("idx_quotes_created_by").on(table.createdById),
  uniqueIndex("idx_quotes_number").on(table.orgId, table.quoteNumber),
]);

export const quoteLineItems = pgTable("quote_line_items", {
  id: serial("id").primaryKey(),
  quoteId: integer("quote_id").references(() => quotes.id, { onDelete: "cascade" }).notNull(),
  description: text("description").notNull(),
  quantity: decimal("quantity", { precision: 10, scale: 2 }).notNull(),
  unitPrice: decimal("unit_price", { precision: 15, scale: 2 }).notNull(),
  amount: decimal("amount", { precision: 15, scale: 2 }).notNull(),
  taxRate: decimal("tax_rate", { precision: 5, scale: 2 }).default("0"),
  displayOrder: integer("display_order").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

export const quotesRelations = relations(quotes, ({ one, many }) => ({
  organization: one(organizations, { fields: [quotes.orgId], references: [organizations.id] }),
  deal: one(deals, { fields: [quotes.dealId], references: [deals.id] }),
  client: one(clientAccounts, { fields: [quotes.clientId], references: [clientAccounts.id] }),
  createdBy: one(users, { fields: [quotes.createdById], references: [users.id] }),
  lineItems: many(quoteLineItems),
}));

export const quoteLineItemsRelations = relations(quoteLineItems, ({ one }) => ({
  quote: one(quotes, { fields: [quoteLineItems.quoteId], references: [quotes.id] }),
}));
