
import { pgTable, text, serial, timestamp, boolean, integer, index, date, jsonb } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { users } from "./auth";


export interface LandingPageTestimonial {
  id: string;
  name: string;
  role?: string;
  text: string;
  avatar?: string;
  rating?: number;
}

export interface LandingPageSettings {
  testimonials?: LandingPageTestimonial[];
  trustBadges?: string[];
  showTrustSection?: boolean;
}

export const landingPages = pgTable("landing_pages", {
  id: serial("id").primaryKey(),
  orgId: text("org_id").notNull(),
  name: text("name").notNull(),
  slug: text("slug"),
  title: text("title"),
  content: text("content"),
  isPublished: boolean("is_published").default(false),
  url: text("url").notNull(),
  description: text("description"),
  isActive: boolean("is_active").default(true),
  settings: jsonb("settings").$type<LandingPageSettings>(),
  createdBy: text("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const pageViews = pgTable("page_views", {
  id: serial("id").primaryKey(),
  pageId: integer("page_id").references(() => landingPages.id, { onDelete: "cascade" }),
  orgId: text("org_id").notNull(),
  referrer: text("referrer"),
  country: text("country"),
  city: text("city"),
  deviceType: text("device_type"),
  utmSource: text("utm_source"),
  utmMedium: text("utm_medium"),
  utmCampaign: text("utm_campaign"),
  abVariant: text("ab_variant"),
  viewedAt: timestamp("viewed_at").defaultNow(),
}, (table) => [
  index("page_views_page_id_idx").on(table.pageId),
  index("page_views_org_id_idx").on(table.orgId),
  index("page_views_viewed_at_idx").on(table.viewedAt),
]);


export const landingPagesRelations = relations(landingPages, ({ one, many }) => ({
  creator: one(users, {
    fields: [landingPages.createdBy],
    references: [users.id],
  }),
  views: many(pageViews),
}));

export const pageViewsRelations = relations(pageViews, ({ one }) => ({
  page: one(landingPages, {
    fields: [pageViews.pageId],
    references: [landingPages.id],
  }),
}));


export const abTests = pgTable(
  "ab_tests",
  {
    id: serial("id").primaryKey(),
    orgId: text("org_id").notNull(),
    name: text("name").notNull(),
    description: text("description"),
    status: text("status").default("draft"),
    variantASubject: text("variant_a_subject").notNull(),
    variantBSubject: text("variant_b_subject").notNull(),
    variantABody: text("variant_a_body"),
    variantBBody: text("variant_b_body"),
    splitPercent: integer("split_percent").default(50),
    audienceSize: integer("audience_size").default(0),
    variantASent: integer("variant_a_sent").default(0),
    variantBSent: integer("variant_b_sent").default(0),
    variantAOpens: integer("variant_a_opens").default(0),
    variantBOpens: integer("variant_b_opens").default(0),
    variantAClicks: integer("variant_a_clicks").default(0),
    variantBClicks: integer("variant_b_clicks").default(0),
    winnerVariant: text("winner_variant"),
    startedAt: timestamp("started_at"),
    endedAt: timestamp("ended_at"),
    createdBy: text("created_by").references(() => users.id),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (t) => ({
    orgIdIdx: index("ab_tests_org_id_idx").on(t.orgId),
    statusIdx: index("ab_tests_status_idx").on(t.status),
  })
);

export const abTestsRelations = relations(abTests, ({ one }) => ({
  creator: one(users, {
    fields: [abTests.createdBy],
    references: [users.id],
  }),
}));


export const socialMetrics = pgTable(
  "social_metrics",
  {
    id: serial("id").primaryKey(),
    orgId: text("org_id").notNull(),
    platform: text("platform").notNull(),
    metricDate: date("metric_date").notNull(),
    followers: integer("followers").default(0),
    impressions: integer("impressions").default(0),
    engagements: integer("engagements").default(0),
    clicks: integer("clicks").default(0),
    shares: integer("shares").default(0),
    comments: integer("comments").default(0),
    reach: integer("reach").default(0),
    recordedBy: text("recorded_by").references(() => users.id),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (t) => [
    index("social_metrics_org_platform_idx").on(t.orgId, t.platform),
    index("social_metrics_date_idx").on(t.metricDate),
  ]
);

export const socialMetricsRelations = relations(socialMetrics, ({ one }) => ({
  recorder: one(users, {
    fields: [socialMetrics.recordedBy],
    references: [users.id],
  }),
}));

export const contentCalendarItems = pgTable("content_calendar_items", {
  id: serial("id").primaryKey(),
  orgId: text("org_id").notNull(),
  title: text("title").notNull(),
  contentType: text("content_type").notNull().default("blog"),
  channel: text("channel"),
  status: text("status").default("idea"),
  scheduledDate: date("scheduled_date"),
  publishedDate: date("published_date"),
  assignedTo: text("assigned_to").references(() => users.id),
  description: text("description"),
  tags: text("tags").array().default([]),
  createdBy: text("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("content_calendar_org_id_idx").on(table.orgId),
  index("content_calendar_scheduled_date_idx").on(table.scheduledDate),
]);

export const contentCalendarItemsRelations = relations(contentCalendarItems, ({ one }) => ({
  creator: one(users, {
    fields: [contentCalendarItems.createdBy],
    references: [users.id],
  }),
}));
