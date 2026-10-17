/**
 * MIYO-0630: the ATS tables.
 *
 * Additive only. The Recruitment tables that survived the October removal —
 * job_postings, candidates, candidate_applications, interviews, offers — are
 * reused as they stand (see docs/ATS-DECISIONS.md); these are the pieces the
 * old module never had: requisitions with an approval step, configurable
 * stages, per-job hiring teams, application questions, tags, notes, an
 * activity trail, refuse reasons, consent records and an email log.
 */
import {
  pgTable,
  text,
  serial,
  integer,
  boolean,
  jsonb,
  decimal,
  timestamp,
  index,
  uniqueIndex,
  primaryKey,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

import { organizations, users } from "./auth";
import { departments, candidates, candidateApplications, jobPostings } from "./hr";

/** A request to hire, before a job posting exists. */
export const atsRequisitions = pgTable(
  "ats_requisitions",
  {
    id: serial("id").primaryKey(),
    orgId: text("org_id").references(() => organizations.id).notNull(),
    title: text("title").notNull(),
    departmentId: integer("department_id").references(() => departments.id),
    location: text("location"),
    employmentType: text("employment_type").default("FULL_TIME"),
    openings: integer("openings").default(1).notNull(),
    salaryMin: decimal("salary_min"),
    salaryMax: decimal("salary_max"),
    currency: text("currency").default("INR"),
    justification: text("justification"),
    hiringManagerId: text("hiring_manager_id").references(() => users.id),
    /** DRAFT | PENDING | APPROVED | REJECTED | FILLED | CANCELLED */
    status: text("status").default("DRAFT").notNull(),
    approverId: text("approver_id").references(() => users.id),
    decidedAt: timestamp("decided_at", { withTimezone: true }),
    decisionNote: text("decision_note"),
    createdBy: text("created_by").references(() => users.id),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
  },
  (table) => [
    index("idx_ats_requisitions_org").on(table.orgId),
    index("idx_ats_requisitions_status").on(table.orgId, table.status),
  ],
);

/**
 * A pipeline column. A row with jobId null is an org default, copied onto a
 * job when it is created; a row with a jobId belongs to that job.
 */
export const atsStages = pgTable(
  "ats_stages",
  {
    id: serial("id").primaryKey(),
    orgId: text("org_id").references(() => organizations.id).notNull(),
    jobId: integer("job_id").references(() => jobPostings.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    /** APPLIED | SCREEN | INTERVIEW | OFFER | HIRED | REJECTED */
    type: text("type").default("SCREEN").notNull(),
    sort: integer("sort").default(0).notNull(),
    emailTemplateId: text("email_template_id"),
    autoEmail: boolean("auto_email").default(false).notNull(),
    isDefault: boolean("is_default").default(false).notNull(),
  },
  (table) => [
    index("idx_ats_stages_org").on(table.orgId),
    index("idx_ats_stages_job").on(table.jobId, table.sort),
  ],
);

/** Who is on a job's hiring team, and in what capacity. */
export const atsJobMembers = pgTable(
  "ats_job_members",
  {
    jobId: integer("job_id")
      .references(() => jobPostings.id, { onDelete: "cascade" })
      .notNull(),
    userId: text("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
    /** HIRING_MANAGER | INTERVIEWER | RECRUITER */
    role: text("role").default("INTERVIEWER").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.jobId, table.userId] }),
    index("idx_ats_job_members_user").on(table.userId),
  ],
);

/** Extra questions a job asks on the application form. */
export const atsApplicationQuestions = pgTable(
  "ats_application_questions",
  {
    id: serial("id").primaryKey(),
    jobId: integer("job_id")
      .references(() => jobPostings.id, { onDelete: "cascade" })
      .notNull(),
    label: text("label").notNull(),
    /** TEXT | TEXTAREA | SELECT | MULTISELECT | BOOLEAN | NUMBER | FILE */
    type: text("type").default("TEXT").notNull(),
    options: jsonb("options").$type<string[]>(),
    required: boolean("required").default(false).notNull(),
    /** { equals?: string; notEquals?: string; min?: number } — fails the application outright. */
    knockout: jsonb("knockout").$type<Record<string, unknown>>(),
    sort: integer("sort").default(0).notNull(),
  },
  (table) => [index("idx_ats_questions_job").on(table.jobId, table.sort)],
);

export const atsApplicationAnswers = pgTable(
  "ats_application_answers",
  {
    applicationId: integer("application_id")
      .references(() => candidateApplications.id, { onDelete: "cascade" })
      .notNull(),
    questionId: integer("question_id")
      .references(() => atsApplicationQuestions.id, { onDelete: "cascade" })
      .notNull(),
    value: jsonb("value").$type<string | number | boolean | string[] | null>(),
  },
  (table) => [primaryKey({ columns: [table.applicationId, table.questionId] })],
);

export const atsCandidateTags = pgTable(
  "ats_candidate_tags",
  {
    id: serial("id").primaryKey(),
    orgId: text("org_id").references(() => organizations.id).notNull(),
    name: text("name").notNull(),
  },
  (table) => [uniqueIndex("uniq_ats_tag_org_name").on(table.orgId, table.name)],
);

export const atsCandidateTagLinks = pgTable(
  "ats_candidate_tag_links",
  {
    candidateId: integer("candidate_id")
      .references(() => candidates.id, { onDelete: "cascade" })
      .notNull(),
    tagId: integer("tag_id")
      .references(() => atsCandidateTags.id, { onDelete: "cascade" })
      .notNull(),
  },
  (table) => [primaryKey({ columns: [table.candidateId, table.tagId] })],
);

export const atsCandidateNotes = pgTable(
  "ats_candidate_notes",
  {
    id: serial("id").primaryKey(),
    candidateId: integer("candidate_id")
      .references(() => candidates.id, { onDelete: "cascade" })
      .notNull(),
    applicationId: integer("application_id").references(() => candidateApplications.id, {
      onDelete: "cascade",
    }),
    authorId: text("author_id").references(() => users.id),
    body: text("body").notNull(),
    mentions: text("mentions").array(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  },
  (table) => [index("idx_ats_notes_candidate").on(table.candidateId)],
);

/** Everything that happened to a candidate, in order. Time in stage comes from here. */
export const atsActivity = pgTable(
  "ats_activity",
  {
    id: serial("id").primaryKey(),
    orgId: text("org_id").references(() => organizations.id).notNull(),
    // MIYO-0632: a requisition has history too, and it exists before any
    // candidate does, so the candidate is optional on an activity row.
    candidateId: integer("candidate_id").references(() => candidates.id, { onDelete: "cascade" }),
    applicationId: integer("application_id").references(() => candidateApplications.id, {
      onDelete: "cascade",
    }),
    requisitionId: integer("requisition_id").references(() => atsRequisitions.id, {
      onDelete: "cascade",
    }),
    actorId: text("actor_id").references(() => users.id),
    /** applied | stage_moved | note_added | interview_scheduled | offer_sent | hired | rejected … */
    type: text("type").notNull(),
    data: jsonb("data").$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  },
  (table) => [
    index("idx_ats_activity_candidate").on(table.candidateId, table.createdAt),
    index("idx_ats_activity_application").on(table.applicationId, table.createdAt),
    index("idx_ats_activity_requisition").on(table.requisitionId, table.createdAt),
  ],
);

/** Why a candidate was turned down, optionally tied to a mail template. */
export const atsRefuseReasons = pgTable(
  "ats_refuse_reasons",
  {
    id: serial("id").primaryKey(),
    orgId: text("org_id").references(() => organizations.id).notNull(),
    name: text("name").notNull(),
    emailTemplateId: text("email_template_id"),
    active: boolean("active").default(true).notNull(),
  },
  (table) => [index("idx_ats_refuse_reasons_org").on(table.orgId)],
);

/** What a candidate agreed to, and when it runs out. */
export const atsConsents = pgTable(
  "ats_consents",
  {
    id: serial("id").primaryKey(),
    candidateId: integer("candidate_id")
      .references(() => candidates.id, { onDelete: "cascade" })
      .notNull(),
    /** PROCESSING | TALENT_POOL */
    type: text("type").notNull(),
    textVersion: text("text_version").notNull(),
    grantedAt: timestamp("granted_at", { withTimezone: true }).defaultNow(),
    ip: text("ip"),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
  },
  (table) => [index("idx_ats_consents_candidate").on(table.candidateId, table.type)],
);

/** Every mail the ATS sent, so a recruiter can see what a candidate received. */
export const atsEmailLog = pgTable(
  "ats_email_log",
  {
    id: serial("id").primaryKey(),
    orgId: text("org_id").references(() => organizations.id).notNull(),
    candidateId: integer("candidate_id").references(() => candidates.id, { onDelete: "cascade" }),
    templateId: text("template_id").notNull(),
    toEmail: text("to_email").notNull(),
    subject: text("subject"),
    providerId: text("provider_id"),
    /** sent | failed | skipped */
    status: text("status").default("sent").notNull(),
    sentAt: timestamp("sent_at", { withTimezone: true }).defaultNow(),
  },
  (table) => [
    index("idx_ats_email_log_org").on(table.orgId, table.sentAt),
    index("idx_ats_email_log_candidate").on(table.candidateId),
  ],
);

/**
 * MIYO-0673: an org's own wording for one of the ats-* templates. Only the
 * subject and the body are theirs; the frame around them stays the same, so
 * a badly edited template cannot break the layout.
 */
export const atsEmailTemplates = pgTable(
  "ats_email_templates",
  {
    id: serial("id").primaryKey(),
    orgId: text("org_id").references(() => organizations.id).notNull(),
    /** A template id from the generated catalogue, e.g. ats-application-rejected. */
    templateId: text("template_id").notNull(),
    subject: text("subject"),
    /** Markdown; rendered into the shared frame when the mail is sent. */
    body: text("body"),
    updatedBy: text("updated_by").references(() => users.id),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
  },
  (table) => [uniqueIndex("uniq_ats_email_template_org").on(table.orgId, table.templateId)],
);

export const atsRequisitionsRelations = relations(atsRequisitions, ({ one }) => ({
  organization: one(organizations, {
    fields: [atsRequisitions.orgId],
    references: [organizations.id],
  }),
  department: one(departments, {
    fields: [atsRequisitions.departmentId],
    references: [departments.id],
  }),
  hiringManager: one(users, {
    fields: [atsRequisitions.hiringManagerId],
    references: [users.id],
  }),
}));

export const atsStagesRelations = relations(atsStages, ({ one }) => ({
  job: one(jobPostings, { fields: [atsStages.jobId], references: [jobPostings.id] }),
}));

export const atsJobMembersRelations = relations(atsJobMembers, ({ one }) => ({
  job: one(jobPostings, { fields: [atsJobMembers.jobId], references: [jobPostings.id] }),
  user: one(users, { fields: [atsJobMembers.userId], references: [users.id] }),
}));

export const atsCandidateNotesRelations = relations(atsCandidateNotes, ({ one }) => ({
  candidate: one(candidates, {
    fields: [atsCandidateNotes.candidateId],
    references: [candidates.id],
  }),
  author: one(users, { fields: [atsCandidateNotes.authorId], references: [users.id] }),
}));

export const atsActivityRelations = relations(atsActivity, ({ one }) => ({
  candidate: one(candidates, { fields: [atsActivity.candidateId], references: [candidates.id] }),
  actor: one(users, { fields: [atsActivity.actorId], references: [users.id] }),
}));
