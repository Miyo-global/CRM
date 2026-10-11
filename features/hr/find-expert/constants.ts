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

// Ordinal skill level as a gold heat scale 50→700 (§8.8, 5 buckets). Each step
// pairs a fixed fill with a fixed ink/gold text so it reads in both themes.
export const LEVEL_COLORS: Record<number, string> = {
  1: "bg-gold-50 text-ink-900",
  2: "bg-gold-100 text-ink-900",
  3: "bg-gold-300 text-ink-900",
  4: "bg-gold-500 text-ink-950",
  5: "bg-gold-700 text-gold-50",
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
