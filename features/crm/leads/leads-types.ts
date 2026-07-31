export type LeadStatus = "NEW" | "CONTACTED" | "INTERESTED" | "QUALIFIED" | "CONVERTED" | "LOST";
export type LeadSource = "referral" | "campaign" | "cold_call" | "website" | "social_media" | "walk_in" | "other";
export type LeadPriority = "HOT" | "WARM" | "COLD";
export type LeadActivityType = "call" | "email" | "whatsapp" | "meeting" | "site_visit";

export interface BoardLead {
  id: number;
  name: string;
  email?: string | null;
  phone?: string | null;
  company?: string | null;
  source?: string | null;
  priority?: string | null;
  potentialValue?: string | null;
  score?: number | null;
  slaDeadline?: string | Date | null;
  createdAt?: string | Date | null;
  assignedTo?: { name?: string | null; image?: string | null } | null;
}

export interface LeadActivity {
  id: number;
  type: string;
  date: string | Date;
  subject?: string | null;
  notes?: string | null;
  outcome?: string | null;
  user?: { name?: string | null } | null;
}
