
import { pgTable, text, serial, timestamp, boolean, jsonb, integer, index, uniqueIndex } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { chatMessageTypeEnum } from "./enums";
import { organizations, users } from "./auth";
import { deals } from "./crm";

export const chatChannels = pgTable("chat_channels", {
  id: serial("id").primaryKey(),
  orgId: text("org_id").references(() => organizations.id).notNull(),
  name: text("name").notNull(),
  type: text("type").notNull().default("GROUP"),
  description: text("description"),
  avatarUrl: text("avatar_url"),
  createdBy: text("created_by").references(() => users.id).notNull(),
  isArchived: boolean("is_archived").default(false).notNull(),
  isPinned: boolean("is_pinned").default(false).notNull(),
  pinnedAt: timestamp("pinned_at"),
  pinnedUntil: timestamp("pinned_until"),
  linkedDealId: integer("linked_deal_id").references(() => deals.id, { onDelete: "set null" }),
  lastMessageAt: timestamp("last_message_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_chat_channels_org").on(table.orgId),
  index("idx_chat_channels_last_msg").on(table.orgId, table.lastMessageAt),
]);

export const chatChannelMembers = pgTable("chat_channel_members", {
  id: serial("id").primaryKey(),
  channelId: integer("channel_id").references(() => chatChannels.id, { onDelete: "cascade" }).notNull(),
  userId: text("user_id").references(() => users.id).notNull(),
  role: text("role").default("MEMBER").notNull(),
  lastReadAt: timestamp("last_read_at").defaultNow(),
  joinedAt: timestamp("joined_at").defaultNow(),
  mutedUntil: timestamp("muted_until"),
}, (table) => [
  uniqueIndex("uniq_channel_member").on(table.channelId, table.userId),
  index("idx_chat_members_user").on(table.userId),
  index("idx_chat_members_channel").on(table.channelId),
]);

export const chatMessages = pgTable("chat_messages", {
  id: serial("id").primaryKey(),
  channelId: integer("channel_id").references(() => chatChannels.id, { onDelete: "cascade" }).notNull(),
  senderId: text("sender_id").references(() => users.id).notNull(),
  content: text("content"),
  replyToId: integer("reply_to_id"),
  isEdited: boolean("is_edited").default(false).notNull(),
  isDeleted: boolean("is_deleted").default(false).notNull(),
  messageType: chatMessageTypeEnum("message_type").notNull().default("text"),
  reactions: jsonb("reactions").$type<Record<string, string[]>>().default({}).notNull(),
  metadata: jsonb("metadata"),
  actionStatus: text("action_status"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_chat_messages_channel").on(table.channelId, table.createdAt),
  index("idx_chat_messages_sender").on(table.senderId),
  index("idx_chat_messages_unread").on(table.channelId, table.createdAt, table.senderId, table.isDeleted),
]);

export const chatAttachments = pgTable("chat_attachments", {
  id: serial("id").primaryKey(),
  messageId: integer("message_id").references(() => chatMessages.id, { onDelete: "cascade" }).notNull(),
  fileName: text("file_name").notNull(),
  fileUrl: text("file_url").notNull(),
  fileKey: text("file_key").notNull(),
  fileSize: integer("file_size").notNull(),
  mimeType: text("mime_type").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_chat_attachments_msg").on(table.messageId),
]);

export const chatUserPresence = pgTable("chat_user_presence", {
  id: serial("id").primaryKey(),
  userId: text("user_id").references(() => users.id).notNull(),
  orgId: text("org_id").references(() => organizations.id).notNull(),
  status: text("status").default("OFFLINE").notNull(),
  lastSeenAt: timestamp("last_seen_at").defaultNow(),
}, (table) => [
  uniqueIndex("uniq_chat_presence_user").on(table.userId),
  index("idx_chat_presence_org").on(table.orgId, table.status),
  index("idx_chat_presence_lastseen").on(table.orgId, table.lastSeenAt),
]);

export const chatChannelsRelations = relations(chatChannels, ({ many, one }) => ({
  members: many(chatChannelMembers),
  messages: many(chatMessages),
  creator: one(users, { fields: [chatChannels.createdBy], references: [users.id] }),
}));

export const chatChannelMembersRelations = relations(chatChannelMembers, ({ one }) => ({
  channel: one(chatChannels, { fields: [chatChannelMembers.channelId], references: [chatChannels.id] }),
  user: one(users, { fields: [chatChannelMembers.userId], references: [users.id] }),
}));

export const chatMessagesRelations = relations(chatMessages, ({ one, many }) => ({
  channel: one(chatChannels, { fields: [chatMessages.channelId], references: [chatChannels.id] }),
  sender: one(users, { fields: [chatMessages.senderId], references: [users.id] }),
  attachments: many(chatAttachments),
  replyTo: one(chatMessages, { fields: [chatMessages.replyToId], references: [chatMessages.id] }),
}));

export const chatAttachmentsRelations = relations(chatAttachments, ({ one }) => ({
  message: one(chatMessages, { fields: [chatAttachments.messageId], references: [chatMessages.id] }),
}));
