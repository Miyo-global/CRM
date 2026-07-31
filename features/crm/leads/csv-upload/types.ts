export interface ParsedLead {
  name: string;
  email?: string;
  phone?: string;
  company?: string;
  source?: string;
  notes?: string;
  city?: string;
  designation?: string;
  referredBy?: string;
  potentialValue?: string;
  investmentInterest?: string;
  whatsappNumber?: string;
  website?: string;
  priority?: string;
  tags?: string;
}

export interface ImportResult {
  imported: number;
  skipped: number;
  updated: number;
  errors: { row: number; message: string }[];
  duplicatesFound: number;
  distributed?: number;
  salesPeopleCount?: number;
}

export const VALID_SOURCES = [
  "referral",
  "campaign",
  "cold_call",
  "website",
  "social_media",
  "walk_in",
  "other",
] as const;

export const VALID_PRIORITIES = ["HOT", "WARM", "COLD"] as const;

export const ACCEPTED_EXTENSIONS = [".csv", ".xlsx", ".xls"] as const;

export const CRM_FIELDS: { value: string; label: string }[] = [
  { value: "_skip", label: "Skip column" },
  { value: "name", label: "Name (required)" },
  { value: "email", label: "Email" },
  { value: "phone", label: "Phone" },
  { value: "company", label: "Company" },
  { value: "source", label: "Source" },
  { value: "notes", label: "Notes / Remarks" },
  { value: "city", label: "City / Location" },
  { value: "designation", label: "Designation / Title" },
  { value: "referredBy", label: "Referred By" },
  { value: "potentialValue", label: "Potential Value" },
  { value: "investmentInterest", label: "Investment Interest" },
  { value: "whatsappNumber", label: "WhatsApp Number" },
  { value: "website", label: "Website / URL" },
  { value: "priority", label: "Priority (HOT/WARM/COLD)" },
  { value: "tags", label: "Tags (comma-separated)" },
];

export const HEADER_ALIASES: Record<string, string[]> = {
  name: ["name", "lead name", "full name", "contact name", "lead"],
  email: ["email", "e-mail", "email address", "mail"],
  phone: [
    "phone",
    "mobile",
    "tel",
    "telephone",
    "contact number",
    "phone number",
    "mobile number",
  ],
  company: ["company", "organization", "org", "firm", "company name"],
  source: ["source", "lead source", "channel"],
  notes: ["notes", "remarks", "comments", "description"],
  city: ["city", "location", "area"],
  designation: ["designation", "title", "role", "position", "job title"],
  referredBy: ["referred by", "referral", "referred", "referrer"],
  potentialValue: [
    "potential value",
    "value",
    "deal value",
    "amount",
    "budget",
  ],
  investmentInterest: ["investment interest", "investment", "interest"],
  whatsappNumber: ["whatsapp", "whatsapp number", "wa number"],
  website: ["website", "url", "web"],
  priority: ["priority", "lead priority", "urgency"],
  tags: ["tags", "labels", "categories"],
};
