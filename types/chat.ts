

export type ChannelType = "DIRECT" | "GROUP";

export type ChannelMemberRole = "ADMIN" | "MEMBER";

export type MessageType = "text" | "lead_submission" | "system";

export type PresenceStatus = "ONLINE" | "AWAY" | "OFFLINE";

export interface ChannelMember {
  id: number;
  channelId: number;
  userId: string;
  role: ChannelMemberRole;
  lastReadAt: Date | string | null;
  joinedAt: Date | string | null;
  mutedUntil: Date | string | null;
  user: {
    id: string;
    name: string | null;
    image: string | null;
    email?: string | null;
    role?: string | null;
  } | null;
}

export interface LastMessage {
  content: string | null;
  senderName: string | null;
  createdAt: Date | string | null;
}

export interface Channel {
  id: number;
  orgId: string;
  name: string;
  type: ChannelType;
  description: string | null;
  avatarUrl: string | null;
  createdBy: string;
  isArchived: boolean;
  isPinned?: boolean;
  pinnedAt?: Date | string | null;
  pinnedUntil?: Date | string | null;
  lastMessageAt: Date | string | null;
  createdAt: Date | string | null;
  updatedAt: Date | string | null;
  members: ChannelMember[];
  unreadCount: number;
  lastMessage: LastMessage | null;
}

export interface MessageAttachment {
  id: number;
  messageId: number;
  fileName: string;
  fileUrl: string;
  fileKey: string;
  fileSize: number;
  mimeType: string;
  createdAt: Date | string | null;
}

export interface MessageReplyTo {
  id: number;
  content: string | null;
  sender: { id: string; name: string | null } | null;
}

export interface Message {
  id: number;
  channelId: number;
  senderId: string;
  content: string | null;
  replyToId: number | null;
  isEdited: boolean;
  isDeleted: boolean;
  messageType: MessageType;
  metadata: unknown;
  actionStatus: string | null;
  createdAt: Date | string | null;
  updatedAt: Date | string | null;
  sender: { id: string; name: string | null; image: string | null } | null;
  attachments: MessageAttachment[];
  replyTo: MessageReplyTo | null;
  reactions: Record<string, string[]>;
}

export interface MessageWithChannel extends Message {
  channel: { id: number; name: string; type: ChannelType } | null;
}

export interface TypingIndicator {
  userId: string;
  name: string;
}

export interface OnlineUser {
  userId: string;
  status: PresenceStatus;
  lastSeenAt: Date | string | null;
  userName: string | null;
  userImage: string | null;
}

export interface OrgUser {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
  role: string | null;
  designation: string | null;
  departmentName: string | null;
}

export interface MessagesPage {
  messages: Message[];
  nextCursor?: number;
}

export interface CreateDMInput {
  targetUserId: string;
}

export interface CreateGroupChannelInput {
  name: string;
  description?: string;
  avatarUrl?: string;
  memberIds: string[];
}

export interface UpdateChannelInput {
  name?: string;
  description?: string;
  avatarUrl?: string;
  pinForDays?: 1 | 7 | 14 | 30;
  unpin?: boolean;
}

export interface AttachmentInput {
  fileName: string;
  fileUrl: string;
  fileKey: string;
  fileSize: number;
  mimeType: string;
}

export interface SendMessageInput {
  channelId: number;
  content?: string;
  replyToId?: number;
  attachments?: AttachmentInput[];
}

export interface EditMessageInput {
  messageId: number;
  content: string;
}

export interface DeleteMessageInput {
  messageId: number;
}

export interface MarkReadInput {
  channelId: number;
}

export interface SetTypingInput {
  channelId: number;
}

export interface GetMessagesParams {
  cursor?: number;
  limit?: number;
}

export interface PollMessagesParams {
  since: string;
}

export interface SearchMessagesParams {
  query: string;
  channelId?: number;
  limit?: number;
}

export interface PollOption {
  id: number;
  text: string;
  voteCount: number;
}

export interface PollVote {
  optionId: number;
  userId: string;
}

export interface Poll {
  id: number;
  messageId: number;
  question: string;
  options: PollOption[];
  votes: PollVote[];
  endsAt: Date | string | null;
  createdAt: Date | string | null;
}

export interface CreatePollInput {
  channelId: number;
  question: string;
  options: string[];
  endsAt?: string;
}

export interface VotePollInput {
  pollId: number;
  optionId: number;
}

export interface UnreadTotalResponse {
  total: number;
}
