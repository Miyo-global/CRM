export type NotificationType = "INFO" | "SUCCESS" | "WARNING" | "ERROR";

export interface Notification {
  id: number;
  userId: string;
  orgId: string;
  type: NotificationType;
  title: string;
  message: string | null;
  link: string | null;
  isRead: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface UnreadCount {
  count: number;
}
