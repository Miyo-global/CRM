import type { useChatChannels } from "@/lib/hooks/trpc-hooks";

export type ChannelRaw = NonNullable<ReturnType<typeof useChatChannels>["data"]>[number];
export type Channel = Omit<ChannelRaw, "lastMessage"> & {
  lastMessage?: { content?: string | null; senderName?: string | null; createdAt?: Date | string | null } | null;
};
export type Message = {
  id: number;
  channelId: number;
  senderId: string;
  content: string | null;
  replyToId: number | null;
  isEdited: boolean;
  isDeleted: boolean;
  messageType: "text" | "lead_submission" | "system";
  metadata: unknown;
  actionStatus: string | null;
  createdAt: Date | null;
  updatedAt: Date | null;
  sender: { id: string; name: string | null; image: string | null } | null;
  attachments: {
    id: number;
    fileName: string;
    fileUrl: string;
    fileSize: number;
    mimeType: string;
  }[];
  replyTo: {
    id: number;
    content: string | null;
    isDeleted: boolean;
    sender: { id: string; name: string | null } | null;
  } | null;
  reactions: Record<string, string[]>;
};
