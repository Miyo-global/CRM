export type DmLeadStatus = "pending_review" | "verified" | "sent_to_hr" | "imported_to_pipeline";

export interface DmLead {
  id: number;
  orgId: string;
  name: string;
  phone: string | null;
  email: string | null;
  whatsappNumber: string | null;
  sourcePlatform: string;
  campaignId: number | null;
  campaignType: string | null;
  leadQuality: string;
  notes: string | null;
  landingPageUrl: string | null;
  status: DmLeadStatus;
  verifiedBy: string | null;
  importedLeadId: number | null;
  createdBy: string;
  dateCaptured: Date;
  updatedAt: Date;
}

export interface DmLeadStats {
  total: number;
  pendingReview: number;
  verified: number;
  sentToHr: number;
  imported: number;
  byPlatform: { platform: string; count: number }[];
}

export type DmCampaignStatus = "active" | "paused" | "completed";

export interface DmCampaign {
  id: number;
  orgId: string;
  name: string;
  status: DmCampaignStatus;
  budgetAllocated: string | null;
  budgetSpent: string | null;
  spend?: string | null;
  leadsGenerated: number;
  costPerLead: number | null;
  roi?: number | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface DmCampaignStats {
  total: number;
  active: number;
  totalBudget: number;
  totalSpent: number;
  totalLeads: number;
  avgCpl: number;
}
