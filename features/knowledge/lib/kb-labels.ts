import type { Tone } from "@/lib/design/tones";

/** KB-0070: the ten content types, in the words a reader would use. */
export const KB_CONTENT_TYPE_LABELS: Record<string, string> = {
  note: "Note",
  sop: "SOP",
  policy: "Policy",
  support_article: "Support article",
  troubleshooting: "Troubleshooting",
  decision_record: "Decision record",
  meeting_notes: "Meeting notes",
  runbook: "Runbook",
  project_brief: "Project brief",
  playbook: "Playbook",
};

export const KB_CONTENT_TYPES = Object.keys(KB_CONTENT_TYPE_LABELS);

export function contentTypeLabel(contentType: string | null | undefined): string {
  if (!contentType) return "Note";
  return KB_CONTENT_TYPE_LABELS[contentType] ?? contentType;
}

const STATUS: Record<string, { label: string; tone: Tone }> = {
  draft: { label: "Draft", tone: "neutral" },
  in_review: { label: "In review", tone: "info" },
  published: { label: "Published", tone: "success" },
  archived: { label: "Archived", tone: "warning" },
};

export function statusBadge(status: string | null | undefined) {
  return STATUS[status ?? "draft"] ?? { label: status ?? "Draft", tone: "neutral" as Tone };
}

const VISIBILITY: Record<string, string> = {
  private: "Only me and people I add",
  org: "Everyone at Miyo",
  space: "Space members",
  project: "Project members",
  public: "Anyone with the link",
};

export function visibilityLabel(visibility: string | null | undefined): string {
  return VISIBILITY[visibility ?? "private"] ?? "Private";
}

/**
 * Trust, as a reader cares about it: a page verified long enough ago that its
 * window has passed is not "verified", it is "needs checking".
 */
export function trustBadge(
  verifiedAt: string | null | undefined,
  windowDays: number,
): { label: string; tone: Tone } | null {
  if (!verifiedAt) return null;
  const expiry = new Date(verifiedAt).getTime() + windowDays * 24 * 60 * 60 * 1000;
  return expiry < Date.now()
    ? { label: "Needs checking", tone: "warning" }
    : { label: "Verified", tone: "success" };
}
