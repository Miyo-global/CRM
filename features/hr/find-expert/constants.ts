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

export const LEVEL_COLORS: Record<number, string> = {
  1: "bg-muted text-muted-foreground border border-border/60",
  2: "bg-gold/10 text-gold border border-gold/20",
  3: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20",
  4: "bg-gold/20 text-gold border border-gold/30",
  5: "bg-gold/30 text-gold font-semibold border border-gold/40 ring-1 ring-gold/20",
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
