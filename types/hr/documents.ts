import { DocumentType } from "./common";

export interface Document {
  id: number;
  orgId: string;
  userId: string | null;
  departmentId: number | null;
  name: string;
  description: string | null;
  type: DocumentType;
  category: string | null;
  fileUrl: string;
  fileName: string | null;
  fileSize: number | null;
  mimeType: string | null;
  version: number | null;
  parentDocumentId: number | null;
  isPublic: boolean | null;
  isActive: boolean | null;
  expiryDate: string | null;
  expiryReminderSent: boolean | null;
  tags: string[] | null;
  metadata: unknown | null;
  uploadedBy: string | null;
  createdAt: Date | string | null;
  updatedAt: Date | string | null;
}

export interface CreateDocumentInput {
  name: string;
  type: DocumentType;
  fileUrl: string;
  fileName?: string;
  fileSize?: number;
  mimeType?: string;
  userId?: string;
  description?: string;
  category?: string;
  isPublic?: boolean;
  expiryDate?: string;
  tags?: string[];
}
