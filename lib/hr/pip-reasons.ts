import type { z } from "zod";
import { pipReasonCategorySchema } from "@/lib/validations/hr-pip";

export type PipReasonCategory = z.infer<typeof pipReasonCategorySchema>;

export interface PipReasonEntry {
  category: PipReasonCategory;
  description: string;
}

export const PIP_MAX_REASONS = 5;

export const PIP_REASON_LABELS: Record<PipReasonCategory, string> = {
  POOR_PERFORMANCE: "Poor performance",
  BEHAVIORAL: "Behavioral",
  POLICY_VIOLATION: "Policy violation",
  MISSED_KPIS: "Missed KPIs",
};

export function formatPipReasonsDescription(reasons: PipReasonEntry[]): string {
  return reasons
    .map((entry, index) => {
      const label = PIP_REASON_LABELS[entry.category];
      return `Reason ${index + 1} — ${label}\n${entry.description.trim()}`;
    })
    .join("\n\n");
}

export function derivePipLegacyFields(reasons: PipReasonEntry[]) {
  const formatted = formatPipReasonsDescription(reasons);
  return {
    reasonCategory: reasons[0]!.category,
    description: formatted,
    reason: formatted.slice(0, 1000),
  };
}

export function normalizePipReasonEntries(pip: {
  reasonEntries?: { category: string; description: string }[] | null;
  reasonCategory?: string | null;
  description?: string | null;
}): PipReasonEntry[] {
  if (Array.isArray(pip.reasonEntries) && pip.reasonEntries.length > 0) {
    return pip.reasonEntries.map((entry) => {
      const parsed = pipReasonCategorySchema.safeParse(entry.category);
      return {
        category: parsed.success ? parsed.data : "POOR_PERFORMANCE",
        description: entry.description ?? "",
      };
    });
  }
  const category = pip.reasonCategory;
  if (
    category &&
    pipReasonCategorySchema.safeParse(category).success &&
    (pip.description ?? "").trim()
  ) {
    return [
      {
        category: category as PipReasonCategory,
        description: pip.description!.trim(),
      },
    ];
  }
  return [{ category: "POOR_PERFORMANCE", description: "" }];
}

export function createEmptyPipReason(): PipReasonEntry {
  return { category: "POOR_PERFORMANCE", description: "" };
}
