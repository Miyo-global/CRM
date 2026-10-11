import { toneSoft } from "@/lib/design/tones";

export const LEVEL_LABELS: Record<number, string> = {
  1: "L1",
  2: "L2",
  3: "L3",
  4: "L4",
  5: "L5",
};

export const LEVEL_NAMES: Record<number, string> = {
  1: "Beginner",
  2: "Basic",
  3: "Intermediate",
  4: "Advanced",
  5: "Expert",
};

// Ordinal skill level: neutral → info → teal → success, Expert = brand (top).
export const LEVEL_COLORS: Record<number, string> = {
  1: `${toneSoft.neutral} border border-transparent`,
  2: `${toneSoft.info} border border-transparent`,
  3: `${toneSoft.teal} border border-transparent`,
  4: `${toneSoft.success} border border-transparent`,
  5: `${toneSoft.brand} font-semibold border border-transparent ring-1 ring-gold-400/40`,
};

export type SortOption = "relevance" | "name" | "experience" | "level";

export type ViewMode = "list" | "grid";

/** Role slugs shown in Find Expert filters (matches org member job roles). */
export const FIND_EXPERT_ROLE_SLUGS = [
  "CEO",
  "HR",
  "SALES",
  "CUSTOMER_SUPPORT",
  "ENGINEERING",
  "DESIGN",
  "VIDEO_EDITOR",
  "DIGITAL_MARKETING",
  "BRANCH_MANAGER",
  "BRANCH_HR",
] as const;

export { getInitials } from "@/lib/format-utils";

export function formatExperience(years: string | null) {
  if (years == null || years === "") return "";
  const n = Number(years);
  if (Number.isNaN(n)) return "";
  return `${n % 1 === 0 ? n : n.toFixed(1)} yr${n !== 1 ? "s" : ""}`;
}
