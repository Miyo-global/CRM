
import { pgTable, text, serial, timestamp, boolean, jsonb, decimal, date, integer, foreignKey, index, uniqueIndex } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { genderEnum, onboardingStatusEnum, onboardingDocStatusEnum } from "./enums";

import { departments } from "./hr";
import { tickets } from "./projects";

export const organizations = pgTable("organizations", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  logo: text("logo"),
  website: text("website"),
  industry: text("industry"),
  timezone: text("timezone").default("Asia/Kolkata"),
  currency: text("currency").default("INR"),
  fiscalYearStart: integer("fiscal_year_start").default(4),
  settings: jsonb("settings").$type<Record<string, unknown>>(),
  billingEmail: text("billing_email"),
  address: jsonb("address").$type<{ line1?: string; line2?: string; city?: string; state?: string; country?: string; postalCode?: string }>(),
  mfaEnforced: boolean("mfa_enforced").default(false).notNull(),
  allowedEmailDomains: text("allowed_email_domains").array().default([]),
  passwordExpiryDays: integer("password_expiry_days"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const organizationMembers = pgTable("organization_members", {
  id: serial("id").primaryKey(),
  userId: text("user_id").references(() => users.id).notNull(),
  orgId: text("org_id").references(() => organizations.id).notNull(),
  role: text("role").default("ENGINEERING").notNull(),
  joinedAt: timestamp("joined_at").defaultNow(),
}, (table) => [
  uniqueIndex("uniq_org_members_user_org").on(table.userId, table.orgId),
  index("idx_org_members_org_role").on(table.orgId, table.role),
]);

export const users = pgTable("users", {
  id: text("id").primaryKey(),
  name: text("name"),
  email: text("email").notNull().unique(),
  emailVerified: timestamp("email_verified"),
  password: text("password"),
  firstName: text("first_name"),
  lastName: text("last_name"),
  gender: genderEnum("gender"),
  skills: text("skills").array(),
  experienceYears: decimal("experience_years"),
  joiningDate: date("joining_date"),
  dateOfBirth: date("date_of_birth"),
  taxId: text("tax_id"),
  bankDetails: jsonb("bank_details").$type<{
    accountNumber: string;
    bankName: string;
    branch: string;
    ifsc: string;
    accountHolder: string;
    pfUanNumber?: string;
    swiftCode?: string;
    iban?: string;
  }>(),
  image: text("image"),
  role: text("role").default("ENGINEERING").notNull(),
  departmentId: integer("department_id"),
  designation: text("designation"),
  phone: text("phone"),
  whatsappNumber: text("whatsapp_number"),
  whatsappSameAsPhone: boolean("whatsapp_same_as_phone").default(true),
  monthlySalary: decimal("monthly_salary"),
  employeeId: text("employee_id"),
  metadata: jsonb("metadata"),
  isPasswordChangeRequired: boolean("is_password_change_required").default(false),
  loginAttempts: integer("login_attempts").default(0).notNull(),
  lockedUntil: timestamp("locked_until"),
  isActive: boolean("is_active").default(true).notNull(),
  hasDashboardAccess: boolean("has_dashboard_access").default(false).notNull(),
  reportingTo: text("reporting_to"),
  team: text("team"),
  branchId: integer("branch_id"),
  emergencyContact: jsonb("emergency_contact").$type<{
    name: string;
    relation: string;
    phone: string;
    email?: string;
  }>(),
  totpSecret: text("totp_secret"),
  totpEnabled: boolean("totp_enabled").default(false).notNull(),
  passwordChangedAt: timestamp("password_changed_at"),
  googleRefreshToken: text("google_refresh_token"),
  googleEmail: text("google_email"),
  isProfilePictureRequired: boolean("is_profile_picture_required").default(false),
  bio: text("bio"),
  linkedinUrl: text("linkedin_url"),
  twitterUrl: text("twitter_url"),
  githubUrl: text("github_url"),
  websiteUrl: text("website_url"),
  onboardingDocStatus: onboardingDocStatusEnum("onboarding_doc_status").default("PENDING"),
  onboardingCompleted: boolean("onboarding_completed").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_users_email").on(table.email),
  foreignKey({ columns: [table.reportingTo], foreignColumns: [table.id] }),
]);

export const accounts = pgTable("accounts", {
  userId: text("user_id").references(() => users.id).notNull(),
  type: text("type").notNull(),
  provider: text("provider").notNull(),
  providerAccountId: text("provider_account_id").notNull(),
  refresh_token: text("refresh_token"),
  access_token: text("access_token"),
  expires_at: integer("expires_at"),
  token_type: text("token_type"),
  scope: text("scope"),
  id_token: text("id_token"),
  session_state: text("session_state"),
}, (table) => ({
  compoundKey: {
    primaryKey: [table.provider, table.providerAccountId],
  },
}));

export const sessions = pgTable("sessions", {
  sessionToken: text("session_token").primaryKey(),
  userId: text("user_id").references(() => users.id).notNull(),
  expires: timestamp("expires").notNull(),
});

export const verificationTokens = pgTable("verification_tokens", {
  identifier: text("identifier").notNull(),
  token: text("token").notNull(),
  expires: timestamp("expires").notNull(),
}, (table) => ({
  compoundKey: {
    primaryKey: [table.identifier, table.token],
  },
}));

export const invitations = pgTable("invitations", {
  id: text("id").primaryKey(),
  email: text("email").notNull(),
  token: text("token").notNull().unique(),
  orgId: text("org_id").references(() => organizations.id).notNull(),
  role: text("role").default("ENGINEERING").notNull(),
  invitedBy: text("invited_by").references(() => users.id).notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  acceptedAt: timestamp("accepted_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const passwordResetTokens = pgTable("password_reset_tokens", {
  id: text("id").primaryKey(),
  email: text("email").notNull(),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const userSessions = pgTable("user_sessions", {
  id: text("id").primaryKey(),
  userId: text("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  userAgent: text("user_agent"),
  ipAddress: text("ip_address"),
  isRevoked: boolean("is_revoked").default(false).notNull(),
  lastActive: timestamp("last_active").defaultNow().notNull(),
  deviceId: text("device_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("idx_user_sessions_user_active").on(table.userId, table.isRevoked, table.createdAt),
]);

export const apiKeys = pgTable("api_keys", {
  id: text("id").primaryKey(),
  orgId: text("org_id").references(() => organizations.id).notNull(),
  name: text("name").notNull(),
  keyHash: text("key_hash").notNull(),
  keyPrefix: text("key_prefix").notNull(),
  description: text("description"),
  scopes: text("scopes").array().default([]).notNull(),
  isRevoked: boolean("is_revoked").default(false).notNull(),
  lastUsedAt: timestamp("last_used_at"),
  expiresAt: timestamp("expires_at"),
  createdBy: text("created_by").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("idx_api_keys_org_active").on(table.orgId, table.isRevoked),
  uniqueIndex("idx_api_keys_key_prefix").on(table.keyPrefix),
]);

export const mfaBackupCodes = pgTable("mfa_backup_codes", {
  id: serial("id").primaryKey(),
  userId: text("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  codeHash: text("code_hash").notNull(),
  usedAt: timestamp("used_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("idx_mfa_backup_codes_user").on(table.userId),
]);

export const passwordHistory = pgTable("password_history", {
  id: serial("id").primaryKey(),
  userId: text("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  passwordHash: text("password_hash").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("idx_password_history_user").on(table.userId, table.createdAt),
]);

export const roles = pgTable("roles", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull(),
  orgId: text("org_id").references(() => organizations.id).notNull(),
  isSystem: boolean("is_system").default(false).notNull(),
  permissions: jsonb("permissions").$type<string[]>().default([]),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  uniqueIndex("uniq_role_slug_org").on(table.slug, table.orgId),
]);

export const permissions = pgTable("permissions", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  resource: text("resource").notNull(),
  action: text("action").notNull(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const rolePermissions = pgTable("role_permissions", {
  id: serial("id").primaryKey(),
  role: text("role").notNull(),
  permissionId: integer("permission_id").references(() => permissions.id).notNull(),
  orgId: text("org_id").references(() => organizations.id),
  createdAt: timestamp("created_at").defaultNow(),
});

export const userPermissions = pgTable("user_permissions", {
  id: serial("id").primaryKey(),
  userId: text("user_id").references(() => users.id).notNull(),
  permissionId: integer("permission_id").references(() => permissions.id).notNull(),
  orgId: text("org_id").references(() => organizations.id).notNull(),
  granted: boolean("granted").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const onboardingSteps = pgTable("onboarding_steps", {
  id: serial("id").primaryKey(),
  orgId: text("org_id").references(() => organizations.id).notNull(),
  userId: text("user_id").references(() => users.id).notNull(),
  stepName: text("step_name").notNull(),
  status: onboardingStatusEnum("status").default("PENDING"),
  completedAt: timestamp("completed_at"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const organizationsRelations = relations(organizations, ({ many }) => ({
  members: many(organizationMembers),
  departments: many(departments),
}));

export const organizationMembersRelations = relations(organizationMembers, ({ one }) => ({
  user: one(users, {
    fields: [organizationMembers.userId],
    references: [users.id],
  }),
  organization: one(organizations, {
    fields: [organizationMembers.orgId],
    references: [organizations.id],
  }),
}));

export const usersRelations = relations(users, ({ one, many }) => ({
  department: one(departments, {
    fields: [users.departmentId],
    references: [departments.id],
  }),
  organizations: many(organizationMembers),
  accounts: many(accounts),
  sessions: many(sessions),
  manager: one(users, {
    fields: [users.reportingTo],
    references: [users.id],
    relationName: "manager",
  }),
  assignedTickets: many(tickets, { relationName: "assignee" }),
  reportedTickets: many(tickets, { relationName: "reporter" }),
}));

export const accountsRelations = relations(accounts, ({ one }) => ({
  user: one(users, {
    fields: [accounts.userId],
    references: [users.id],
  }),
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, {
    fields: [sessions.userId],
    references: [users.id],
  }),
}));

export const rolesRelations = relations(roles, ({ one }) => ({
  organization: one(organizations, {
    fields: [roles.orgId],
    references: [organizations.id],
  }),
}));

export const permissionsRelations = relations(permissions, ({ many }) => ({
  rolePermissions: many(rolePermissions),
  userPermissions: many(userPermissions),
}));

export const rolePermissionsRelations = relations(rolePermissions, ({ one }) => ({
  permission: one(permissions, {
    fields: [rolePermissions.permissionId],
    references: [permissions.id],
  }),
}));

export const userPermissionsRelations = relations(userPermissions, ({ one }) => ({
  permission: one(permissions, {
    fields: [userPermissions.permissionId],
    references: [permissions.id],
  }),
}));

export const onboardingStepsRelations = relations(onboardingSteps, ({ one }) => ({
  user: one(users, {
    fields: [onboardingSteps.userId],
    references: [users.id],
  }),
  organization: one(organizations, {
    fields: [onboardingSteps.orgId],
    references: [organizations.id],
  }),
}));

export const userSessionsRelations = relations(userSessions, ({ one }) => ({
  user: one(users, { fields: [userSessions.userId], references: [users.id] }),
}));

export const apiKeysRelations = relations(apiKeys, ({ one }) => ({
  organization: one(organizations, { fields: [apiKeys.orgId], references: [organizations.id] }),
  creator: one(users, { fields: [apiKeys.createdBy], references: [users.id] }),
}));

export const mfaBackupCodesRelations = relations(mfaBackupCodes, ({ one }) => ({
  user: one(users, { fields: [mfaBackupCodes.userId], references: [users.id] }),
}));
