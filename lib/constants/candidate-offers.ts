export const CANDIDATE_OFFER_STATUSES = [
  "DRAFT",
  "PENDING_CEO",
  "CEO_APPROVED",
  "CEO_REJECTED",
  "SENT",
  "VIEWED",
  "ACCEPTED",
  "DECLINED",
  "COUNTERED",
  "EXPIRED",
] as const;

export type CandidateOfferStatus = (typeof CANDIDATE_OFFER_STATUSES)[number];

export const OFFER_STATUS_LABELS: Record<CandidateOfferStatus, string> = {
  DRAFT: "Draft",
  PENDING_CEO: "Pending CEO",
  CEO_APPROVED: "CEO Approved",
  CEO_REJECTED: "CEO Rejected",
  SENT: "Sent",
  VIEWED: "Viewed",
  ACCEPTED: "Accepted",
  DECLINED: "Declined",
  COUNTERED: "Countered",
  EXPIRED: "Expired",
};

export const OFFER_STATUS_VARIANTS: Record<
  CandidateOfferStatus,
  "default" | "secondary" | "outline" | "destructive"
> = {
  DRAFT: "secondary",
  PENDING_CEO: "outline",
  CEO_APPROVED: "default",
  CEO_REJECTED: "destructive",
  SENT: "outline",
  VIEWED: "outline",
  ACCEPTED: "default",
  DECLINED: "destructive",
  COUNTERED: "secondary",
  EXPIRED: "destructive",
};

/** Status transitions allowed via generic PATCH (not workflow endpoints). */
export const PATCH_OFFER_TRANSITIONS: Partial<Record<CandidateOfferStatus, CandidateOfferStatus[]>> = {
  CEO_APPROVED: ["SENT"],
  SENT: ["VIEWED", "EXPIRED", "DECLINED", "COUNTERED"],
  VIEWED: ["ACCEPTED", "DECLINED", "COUNTERED", "EXPIRED"],
  COUNTERED: ["SENT", "DECLINED", "EXPIRED"],
  ACCEPTED: [],
  DECLINED: [],
  EXPIRED: [],
};

export const OFFER_EDITABLE_STATUSES: CandidateOfferStatus[] = ["DRAFT", "CEO_REJECTED"];

export const OFFER_SUBMIT_STATUSES: CandidateOfferStatus[] = ["DRAFT", "CEO_REJECTED"];

export const POST_SEND_OFFER_STATUSES: CandidateOfferStatus[] = [
  "SENT",
  "VIEWED",
  "ACCEPTED",
  "DECLINED",
  "COUNTERED",
  "EXPIRED",
];
