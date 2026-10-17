
import { pgTable, text, serial, timestamp, boolean, jsonb, decimal, numeric, date, integer, foreignKey, index, uniqueIndex, unique } from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";
import {
  ticketPriorityEnum, projectStatusEnum,
  stateGroupEnum, cycleStatusEnum, moduleStatusEnum,
  intakeStatusEnum, intakeSourceEnum, workItemRelationTypeEnum, viewLayoutEnum,
} from "./enums";
import { organizations, users } from "./auth";

export const projects = pgTable("projects", {
  id: serial("id").primaryKey(),
  orgId: text("org_id").references(() => organizations.id).notNull(),
  name: text("name").notNull(),
  description: text("description"),
  key: text("key").notNull().unique(),
  clientId: text("client_id").references(() => users.id),
  managerId: text("manager_id").references(() => users.id),
  startDate: timestamp("start_date"),
  endDate: timestamp("end_date"),
  status: projectStatusEnum("status").default("ACTIVE"),
  dealId: integer("deal_id"),
  budget: decimal("budget"),
  settings: jsonb("settings").$type<{
    modules: {
      sprints: boolean;
      epics: boolean;
      timeTracking: boolean;
      wiki: boolean;
    };
  }>(),
  priority: text("priority"),
  archivedAt: timestamp("archived_at"),
  deletedAt: timestamp("deleted_at"),
  intakeToken: text("intake_token"),
}, (table) => [
  uniqueIndex("uniq_projects_org_key_live").on(table.orgId, table.key).where(sql`${table.deletedAt} is null`),
  uniqueIndex("uniq_projects_intake_token").on(table.intakeToken).where(sql`${table.intakeToken} is not null`),
]);

export const sprints = pgTable("sprints", {
  id: serial("id").primaryKey(),
  orgId: text("org_id").references(() => organizations.id).notNull(),
  projectId: integer("project_id").references(() => projects.id),
  name: text("name").notNull(),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  goal: text("goal"),
  status: text("status").default("PLANNED"),
});

export const customStates = pgTable("custom_states", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").references(() => projects.id, { onDelete: "cascade" }).notNull(),
  orgId: text("org_id").references(() => organizations.id).notNull(),
  name: text("name").notNull(),
  color: text("color").notNull().default("#3B82F6"),
  group: stateGroupEnum("group").notNull(),
  sequence: integer("sequence").notNull().default(0),
  isDefault: boolean("is_default").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_custom_states_project").on(table.projectId),
  index("idx_custom_states_org").on(table.orgId),
]);

export const cycles = pgTable("cycles", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").references(() => projects.id, { onDelete: "cascade" }).notNull(),
  orgId: text("org_id").references(() => organizations.id).notNull(),
  name: text("name").notNull(),
  description: text("description"),
  status: cycleStatusEnum("status").default("draft").notNull(),
  startDate: date("start_date").notNull(),
  endDate: date("end_date").notNull(),
  createdBy: text("created_by").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_cycles_project").on(table.projectId),
  index("idx_cycles_org_status").on(table.orgId, table.status),
]);

export const modules = pgTable("modules", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").references(() => projects.id, { onDelete: "cascade" }).notNull(),
  orgId: text("org_id").references(() => organizations.id).notNull(),
  name: text("name").notNull(),
  description: text("description"),
  status: moduleStatusEnum("status").default("backlog").notNull(),
  leadId: text("lead_id").references(() => users.id),
  startDate: date("start_date"),
  endDate: date("end_date"),
  createdBy: text("created_by").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_modules_project").on(table.projectId),
  index("idx_modules_org").on(table.orgId),
]);

export const tickets = pgTable("tickets", {
  id: serial("id").primaryKey(),
  orgId: text("org_id").references(() => organizations.id).notNull(),
  title: text("title").notNull(),
  description: text("description"),
  type: text("type").notNull().default("TASK"),
  status: text("status").notNull().default("TODO"),
  priority: ticketPriorityEnum("priority").default("MEDIUM"),
  projectId: integer("project_id").references(() => projects.id),
  ticketNumber: integer("ticket_number").notNull(),
  sprintId: integer("sprint_id").references(() => sprints.id),
  epicId: integer("epic_id"),
  assigneeId: text("assignee_id").references(() => users.id),
  reporterId: text("reporter_id").references(() => users.id),
  points: integer("points"),
  storyPoints: integer("story_points"),
  link: text("link"),
  order: integer("order").default(0),
  parentTicketId: integer("parent_ticket_id"),
  originalEstimate: decimal("original_estimate"),
  timeSpent: decimal("time_spent").default("0"),
  startDate: date("start_date"),
  dueDate: date("due_date"),
  stateId: integer("state_id"),
  moduleId: integer("module_id"),
  cycleId: integer("cycle_id"),
  sequenceId: text("sequence_id"),
  estimate: integer("estimate"),
  completionPercentage: integer("completion_percentage").default(0),
  version: integer("version").notNull().default(1),
  rank: numeric("rank"),
  clientVisible: boolean("client_visible").notNull().default(false),
  deletedAt: timestamp("deleted_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (t) => ({
  epicReference: foreignKey({ columns: [t.epicId], foreignColumns: [t.id] }),
  parentReference: foreignKey({ columns: [t.parentTicketId], foreignColumns: [t.id] }),
  projectIdx: index("idx_tickets_project_id").on(t.projectId),
  assigneeIdx: index("idx_tickets_assignee_id").on(t.assigneeId),
  sprintIdx: index("idx_tickets_sprint_id").on(t.sprintId),
  orgStatusIdx: index("idx_tickets_org_status").on(t.orgId, t.status),
  // Board/list/overview: live tickets of one project in rank order (MIYO-0066).
  projectRankLiveIdx: index("idx_tickets_project_rank_live").on(t.projectId, t.rank).where(sql`${t.deletedAt} is null`),
}));

export const projectStatuses = pgTable("project_statuses", {
  id: serial("id").primaryKey(),
  orgId: text("org_id").references(() => organizations.id).notNull(),
  projectId: integer("project_id").references(() => projects.id).notNull(),
  name: text("name").notNull(),
  order: integer("order").notNull().default(0),
  color: text("color"),
  wipLimit: integer("wip_limit"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const projectMembers = pgTable("project_members", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").references(() => projects.id).notNull(),
  userId: text("user_id").references(() => users.id).notNull(),
  role: text("role").default("CONTRIBUTOR"),
  hourlyRate: decimal("hourly_rate").default("0"),
  joinedAt: timestamp("joined_at").defaultNow(),
}, (table) => [
  uniqueIndex("uniq_project_members_project_user").on(table.projectId, table.userId),
]);

export const ticketAssignees = pgTable("ticket_assignees", {
  id: serial("id").primaryKey(),
  ticketId: integer("ticket_id").references(() => tickets.id).notNull(),
  userId: text("user_id").references(() => users.id).notNull(),
  assignedAt: timestamp("assigned_at").defaultNow(),
  assignedBy: text("assigned_by").references(() => users.id),
}, (table) => [
  uniqueIndex("uniq_ticket_assignees_ticket_user").on(table.ticketId, table.userId),
  index("idx_ticket_assignees_user_id").on(table.userId),
]);

export const ticketComments = pgTable("ticket_comments", {
  id: serial("id").primaryKey(),
  orgId: text("org_id").references(() => organizations.id).notNull(),
  ticketId: integer("ticket_id").references(() => tickets.id).notNull(),
  userId: text("user_id").references(() => users.id).notNull(),
  content: text("content").notNull(),
  parentCommentId: integer("parent_comment_id"),
  images: jsonb("images").$type<{ url: string; key: string; fileName: string; mimeType?: string }[]>(),
  deletedAt: timestamp("deleted_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const ticketCommentMentions = pgTable("ticket_comment_mentions", {
  id: serial("id").primaryKey(),
  orgId: text("org_id").references(() => organizations.id).notNull(),
  commentId: integer("comment_id").references(() => ticketComments.id, { onDelete: "cascade" }).notNull(),
  userId: text("user_id").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  uniqueIndex("uniq_ticket_comment_mentions_comment_user").on(table.commentId, table.userId),
  index("idx_ticket_comment_mentions_org_user").on(table.orgId, table.userId),
]);

export const ticketCommentReactions = pgTable("ticket_comment_reactions", {
  id: serial("id").primaryKey(),
  orgId: text("org_id").references(() => organizations.id).notNull(),
  commentId: integer("comment_id").references(() => ticketComments.id, { onDelete: "cascade" }).notNull(),
  userId: text("user_id").references(() => users.id).notNull(),
  emoji: text("emoji").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  uniqueIndex("uniq_ticket_comment_reactions_comment_user_emoji").on(table.commentId, table.userId, table.emoji),
]);

export const ticketActivity = pgTable("ticket_activity", {
  id: serial("id").primaryKey(),
  orgId: text("org_id").references(() => organizations.id).notNull(),
  projectId: integer("project_id").references(() => projects.id, { onDelete: "cascade" }).notNull(),
  ticketId: integer("ticket_id").references(() => tickets.id, { onDelete: "cascade" }).notNull(),
  actorId: text("actor_id").references(() => users.id),
  action: text("action").notNull(),
  field: text("field"),
  fromValue: text("from_value"),
  toValue: text("to_value"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("idx_ticket_activity_ticket_created").on(table.ticketId, table.createdAt),
  index("idx_ticket_activity_project_created").on(table.projectId, table.createdAt),
]);

export const ticketAttachments = pgTable("ticket_attachments", {
  id: serial("id").primaryKey(),
  orgId: text("org_id").references(() => organizations.id).notNull(),
  ticketId: integer("ticket_id").references(() => tickets.id).notNull(),
  fileUrl: text("file_url").notNull(),
  fileName: text("file_name").notNull(),
  fileSize: integer("file_size"),
  mimeType: text("mime_type"),
  uploadedBy: text("uploaded_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

export const ticketLabels = pgTable("ticket_labels", {
  id: serial("id").primaryKey(),
  orgId: text("org_id").references(() => organizations.id).notNull(),
  name: text("name").notNull(),
  color: text("color").default("#3B82F6"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const ticketLabelMappings = pgTable("ticket_label_mappings", {
  id: serial("id").primaryKey(),
  ticketId: integer("ticket_id").references(() => tickets.id).notNull(),
  labelId: integer("label_id").references(() => ticketLabels.id).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const ticketWatchers = pgTable("ticket_watchers", {
  id: serial("id").primaryKey(),
  ticketId: integer("ticket_id").references(() => tickets.id, { onDelete: "cascade" }).notNull(),
  userId: text("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  uniqueIndex("uniq_ticket_watcher").on(table.ticketId, table.userId),
  index("idx_ticket_watchers_user").on(table.userId),
]);

export const workItemRelations = pgTable("work_item_relations", {
  id: serial("id").primaryKey(),
  workItemId: integer("work_item_id").references(() => tickets.id, { onDelete: "cascade" }).notNull(),
  relatedWorkItemId: integer("related_work_item_id").references(() => tickets.id, { onDelete: "cascade" }).notNull(),
  relationType: workItemRelationTypeEnum("relation_type").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  uniqueIndex("uniq_work_item_relation").on(table.workItemId, table.relatedWorkItemId),
  index("idx_work_item_relations_item").on(table.workItemId),
  index("idx_work_item_relations_related").on(table.relatedWorkItemId),
]);

export const projectViews = pgTable("project_views", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").references(() => projects.id, { onDelete: "cascade" }).notNull(),
  orgId: text("org_id").references(() => organizations.id).notNull(),
  createdBy: text("created_by").references(() => users.id).notNull(),
  name: text("name").notNull(),
  filters: jsonb("filters").$type<Record<string, unknown>>().default({}),
  groupBy: text("group_by"),
  orderBy: text("order_by"),
  layoutType: viewLayoutEnum("layout_type").default("board").notNull(),
  isPinned: boolean("is_pinned").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_project_views_project").on(table.projectId),
  index("idx_project_views_org").on(table.orgId),
]);

export const intakeItems = pgTable("intake_items", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").references(() => projects.id, { onDelete: "cascade" }).notNull(),
  orgId: text("org_id").references(() => organizations.id).notNull(),
  title: text("title").notNull(),
  description: jsonb("description"),
  source: intakeSourceEnum("source").default("manual").notNull(),
  status: intakeStatusEnum("status").default("pending").notNull(),
  submitterEmail: text("submitter_email"),
  linkedWorkItemId: integer("linked_work_item_id").references(() => tickets.id),
  declineReason: text("decline_reason"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_intake_items_project").on(table.projectId),
  index("idx_intake_items_org_status").on(table.orgId, table.status),
]);

export const pages = pgTable("pages", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").references(() => projects.id, { onDelete: "cascade" }).notNull(),
  orgId: text("org_id").references(() => organizations.id).notNull(),
  title: text("title").notNull(),
  content: jsonb("content"),
  icon: text("icon"),
  coverImage: text("cover_image"),
  isPublic: boolean("is_public").default(false).notNull(),
  isPinned: boolean("is_pinned").default(false).notNull(),
  parentPageId: integer("parent_page_id"),
  createdBy: text("created_by").references(() => users.id).notNull(),
  updatedAt: timestamp("updated_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_pages_project").on(table.projectId),
  index("idx_pages_org").on(table.orgId),
  foreignKey({ columns: [table.parentPageId], foreignColumns: [table.id] }),
]);

export const timesheets = pgTable("timesheets", {
  id: serial("id").primaryKey(),
  orgId: text("org_id").references(() => organizations.id).notNull(),
  userId: text("user_id").references(() => users.id),
  ticketId: integer("ticket_id").references(() => tickets.id),
  date: date("date").notNull(),
  hours: decimal("hours").default("0"),
  description: text("description"),
  imageUrl: text("image_url"),
  workLink: text("work_link"),
  status: text("status").default("PENDING"),
  approvedBy: text("approved_by").references(() => users.id),
  approvedAt: timestamp("approved_at"),
  rejectionReason: text("rejection_reason"),
  isBillable: boolean("is_billable").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_timesheets_user_date").on(table.userId, table.date),
  unique("timesheets_org_user_date_unique").on(table.orgId, table.userId, table.date),
]);

export const reports = pgTable("reports", {
  id: serial("id").primaryKey(),
  orgId: text("org_id").references(() => organizations.id).notNull(),
  name: text("name").notNull(),
  type: text("type").notNull(),
  config: jsonb("config").$type<{ filters: Record<string, unknown>; columns: string[] }>(),
  createdBy: text("created_by").references(() => users.id),
  isScheduled: boolean("is_scheduled").default(false),
  scheduleConfig: jsonb("schedule_config").$type<{ frequency: string; recipients: string[] }>(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const projectMilestones = pgTable("project_milestones", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").references(() => projects.id, { onDelete: "cascade" }).notNull(),
  orgId: text("org_id").references(() => organizations.id).notNull(),
  name: text("name").notNull(),
  description: text("description"),
  targetDate: date("target_date").notNull(),
  status: text("status").notNull().default("PENDING"),
  clientVisible: boolean("client_visible").notNull().default(false),
  createdBy: text("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_project_milestones_project").on(table.projectId),
  index("idx_project_milestones_org").on(table.orgId),
]);

export const projectClientGrants = pgTable("project_client_grants", {
  id: serial("id").primaryKey(),
  orgId: text("org_id").references(() => organizations.id).notNull(),
  projectId: integer("project_id").references(() => projects.id, { onDelete: "cascade" }).notNull(),
  userId: text("user_id").references(() => users.id).notNull(),
  canViewMilestones: boolean("can_view_milestones").notNull().default(true),
  canViewTasks: boolean("can_view_tasks").notNull().default(false),
  canViewComments: boolean("can_view_comments").notNull().default(false),
  canSubmitRequests: boolean("can_submit_requests").notNull().default(false),
  status: text("status").notNull().default("ACTIVE"),
  expiresAt: timestamp("expires_at"),
  grantedBy: text("granted_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  uniqueIndex("uniq_project_client_grants_active").on(table.projectId, table.userId).where(sql`${table.status} = 'ACTIVE'`),
  index("idx_project_client_grants_org_user").on(table.orgId, table.userId),
]);

export const projectClientGrantsRelations = relations(projectClientGrants, ({ one }) => ({
  project: one(projects, { fields: [projectClientGrants.projectId], references: [projects.id] }),
  user: one(users, { fields: [projectClientGrants.userId], references: [users.id] }),
}));

export const projectMilestonesRelations = relations(projectMilestones, ({ one }) => ({
  project: one(projects, { fields: [projectMilestones.projectId], references: [projects.id] }),
  creator: one(users, { fields: [projectMilestones.createdBy], references: [users.id] }),
}));

export const projectsRelations = relations(projects, ({ one, many }) => ({
  tickets: many(tickets),
  manager: one(users, { fields: [projects.managerId], references: [users.id], relationName: "projectManager" }),
  client: one(users, { fields: [projects.clientId], references: [users.id], relationName: "projectClient" }),
  members: many(projectMembers),
  statuses: many(projectStatuses, { relationName: "projectStatuses" }),
  milestones: many(projectMilestones),
}));

export const sprintsRelations = relations(sprints, ({ one, many }) => ({
  project: one(projects, { fields: [sprints.projectId], references: [projects.id] }),
  tickets: many(tickets),
}));

export const projectStatusesRelations = relations(projectStatuses, ({ one }) => ({
  project: one(projects, { fields: [projectStatuses.projectId], references: [projects.id], relationName: "projectStatuses" }),
}));

export const projectMembersRelations = relations(projectMembers, ({ one }) => ({
  project: one(projects, { fields: [projectMembers.projectId], references: [projects.id] }),
  user: one(users, { fields: [projectMembers.userId], references: [users.id] }),
}));

export const ticketsRelations = relations(tickets, ({ one, many }) => ({
  project: one(projects, { fields: [tickets.projectId], references: [projects.id] }),
  sprint: one(sprints, { fields: [tickets.sprintId], references: [sprints.id] }),
  assignee: one(users, { fields: [tickets.assigneeId], references: [users.id], relationName: "assignee" }),
  reporter: one(users, { fields: [tickets.reporterId], references: [users.id], relationName: "reporter" }),
  state: one(customStates, { fields: [tickets.stateId], references: [customStates.id] }),
  module: one(modules, { fields: [tickets.moduleId], references: [modules.id] }),
  cycle: one(cycles, { fields: [tickets.cycleId], references: [cycles.id] }),
  comments: many(ticketComments),
  attachments: many(ticketAttachments),
  labels: many(ticketLabelMappings),
  assignees: many(ticketAssignees),
  watchers: many(ticketWatchers),
  relations: many(workItemRelations),
  activity: many(ticketActivity),
}));

export const ticketAssigneesRelations = relations(ticketAssignees, ({ one }) => ({
  ticket: one(tickets, { fields: [ticketAssignees.ticketId], references: [tickets.id] }),
  user: one(users, { fields: [ticketAssignees.userId], references: [users.id] }),
  assigner: one(users, { fields: [ticketAssignees.assignedBy], references: [users.id], relationName: "assigner" }),
}));

export const ticketCommentsRelations = relations(ticketComments, ({ one, many }) => ({
  ticket: one(tickets, { fields: [ticketComments.ticketId], references: [tickets.id] }),
  user: one(users, { fields: [ticketComments.userId], references: [users.id] }),
  parent: one(ticketComments, { fields: [ticketComments.parentCommentId], references: [ticketComments.id], relationName: "parentComment" }),
  mentions: many(ticketCommentMentions),
  reactions: many(ticketCommentReactions),
}));

export const ticketCommentMentionsRelations = relations(ticketCommentMentions, ({ one }) => ({
  comment: one(ticketComments, { fields: [ticketCommentMentions.commentId], references: [ticketComments.id] }),
  user: one(users, { fields: [ticketCommentMentions.userId], references: [users.id] }),
}));

export const ticketCommentReactionsRelations = relations(ticketCommentReactions, ({ one }) => ({
  comment: one(ticketComments, { fields: [ticketCommentReactions.commentId], references: [ticketComments.id] }),
  user: one(users, { fields: [ticketCommentReactions.userId], references: [users.id] }),
}));

export const ticketActivityRelations = relations(ticketActivity, ({ one }) => ({
  ticket: one(tickets, { fields: [ticketActivity.ticketId], references: [tickets.id] }),
  project: one(projects, { fields: [ticketActivity.projectId], references: [projects.id] }),
  actor: one(users, { fields: [ticketActivity.actorId], references: [users.id] }),
}));

export const ticketAttachmentsRelations = relations(ticketAttachments, ({ one }) => ({
  ticket: one(tickets, { fields: [ticketAttachments.ticketId], references: [tickets.id] }),
  uploader: one(users, { fields: [ticketAttachments.uploadedBy], references: [users.id] }),
}));

export const ticketLabelMappingsRelations = relations(ticketLabelMappings, ({ one }) => ({
  ticket: one(tickets, { fields: [ticketLabelMappings.ticketId], references: [tickets.id] }),
  label: one(ticketLabels, { fields: [ticketLabelMappings.labelId], references: [ticketLabels.id] }),
}));

export const ticketLabelsRelations = relations(ticketLabels, ({ many }) => ({
  tickets: many(ticketLabelMappings),
}));

export const customStatesRelations = relations(customStates, ({ one, many }) => ({
  project: one(projects, { fields: [customStates.projectId], references: [projects.id] }),
  organization: one(organizations, { fields: [customStates.orgId], references: [organizations.id] }),
  tickets: many(tickets),
}));

export const cyclesRelations = relations(cycles, ({ one, many }) => ({
  project: one(projects, { fields: [cycles.projectId], references: [projects.id] }),
  organization: one(organizations, { fields: [cycles.orgId], references: [organizations.id] }),
  creator: one(users, { fields: [cycles.createdBy], references: [users.id] }),
  tickets: many(tickets),
}));

export const modulesRelations = relations(modules, ({ one, many }) => ({
  project: one(projects, { fields: [modules.projectId], references: [projects.id] }),
  organization: one(organizations, { fields: [modules.orgId], references: [organizations.id] }),
  lead: one(users, { fields: [modules.leadId], references: [users.id], relationName: "moduleLead" }),
  creator: one(users, { fields: [modules.createdBy], references: [users.id], relationName: "moduleCreator" }),
  tickets: many(tickets),
}));

export const pagesRelations = relations(pages, ({ one, many }) => ({
  project: one(projects, { fields: [pages.projectId], references: [projects.id] }),
  organization: one(organizations, { fields: [pages.orgId], references: [organizations.id] }),
  creator: one(users, { fields: [pages.createdBy], references: [users.id] }),
  parent: one(pages, { fields: [pages.parentPageId], references: [pages.id], relationName: "parentPage" }),
  children: many(pages, { relationName: "parentPage" }),
}));

export const intakeItemsRelations = relations(intakeItems, ({ one }) => ({
  project: one(projects, { fields: [intakeItems.projectId], references: [projects.id] }),
  organization: one(organizations, { fields: [intakeItems.orgId], references: [organizations.id] }),
  linkedWorkItem: one(tickets, { fields: [intakeItems.linkedWorkItemId], references: [tickets.id] }),
}));

export const workItemRelationsRelations = relations(workItemRelations, ({ one }) => ({
  workItem: one(tickets, { fields: [workItemRelations.workItemId], references: [tickets.id] }),
  relatedWorkItem: one(tickets, { fields: [workItemRelations.relatedWorkItemId], references: [tickets.id] }),
}));

export const projectViewsRelations = relations(projectViews, ({ one }) => ({
  project: one(projects, { fields: [projectViews.projectId], references: [projects.id] }),
  organization: one(organizations, { fields: [projectViews.orgId], references: [organizations.id] }),
  creator: one(users, { fields: [projectViews.createdBy], references: [users.id] }),
}));

export const ticketWatchersRelations = relations(ticketWatchers, ({ one }) => ({
  ticket: one(tickets, { fields: [ticketWatchers.ticketId], references: [tickets.id] }),
  user: one(users, { fields: [ticketWatchers.userId], references: [users.id] }),
}));

export const timesheetsRelations = relations(timesheets, ({ one }) => ({
  ticket: one(tickets, { fields: [timesheets.ticketId], references: [tickets.id] }),
  user: one(users, { fields: [timesheets.userId], references: [users.id] }),
}));


export const projectTemplates = pgTable("project_templates", {
  id: serial("id").primaryKey(),
  orgId: text("org_id").references(() => organizations.id).notNull(),
  name: text("name").notNull(),
  description: text("description"),
  category: text("category").default("GENERAL"),
  createdBy: text("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

export const projectTemplateTickets = pgTable("project_template_tickets", {
  id: serial("id").primaryKey(),
  templateId: integer("template_id").notNull().references(() => projectTemplates.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description"),
  type: text("type").default("TASK"),
  priority: text("priority").default("MEDIUM"),
  estimatedHours: decimal("estimated_hours"),
  order: integer("order").notNull().default(0),
  phase: text("phase"),
});

export const projectTemplatesRelations = relations(projectTemplates, ({ one, many }) => ({
  org: one(organizations, { fields: [projectTemplates.orgId], references: [organizations.id] }),
  createdBy: one(users, { fields: [projectTemplates.createdBy], references: [users.id] }),
  tickets: many(projectTemplateTickets),
}));

export const projectTemplateTicketsRelations = relations(projectTemplateTickets, ({ one }) => ({
  template: one(projectTemplates, { fields: [projectTemplateTickets.templateId], references: [projectTemplates.id] }),
}));
