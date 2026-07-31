export type SupportPriority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";

export interface SlaTarget {
  firstResponseHours: number;
  resolutionHours: number;
}

export const SUPPORT_SLA_POLICY: Record<SupportPriority, SlaTarget> = {
  URGENT: { firstResponseHours: 1, resolutionHours: 4 },
  HIGH: { firstResponseHours: 4, resolutionHours: 8 },
  MEDIUM: { firstResponseHours: 8, resolutionHours: 24 },
  LOW: { firstResponseHours: 24, resolutionHours: 48 },
};

const HOUR_MS = 60 * 60 * 1000;

export function normalizePriority(priority: string | null | undefined): SupportPriority {
  const upper = (priority ?? "MEDIUM").toUpperCase();
  if (upper === "LOW" || upper === "MEDIUM" || upper === "HIGH" || upper === "URGENT") {
    return upper;
  }
  return "MEDIUM";
}

export function slaTargetFor(priority: string | null | undefined): SlaTarget {
  return SUPPORT_SLA_POLICY[normalizePriority(priority)];
}

export function resolutionSlaHours(priority: string | null | undefined): number {
  return slaTargetFor(priority).resolutionHours;
}

export function computeSlaDueAt(priority: string | null | undefined, from: Date = new Date()): Date {
  return new Date(from.getTime() + resolutionSlaHours(priority) * HOUR_MS);
}

export function isSlaBreached(args: {
  priority: string | null | undefined;
  createdAt: Date | null | undefined;
  resolvedAt: Date | null | undefined;
  slaDueAt: Date | null | undefined;
  isClosed: boolean;
  now?: number;
}): boolean {
  const now = args.now ?? Date.now();
  const createdMs = args.createdAt ? args.createdAt.getTime() : now;
  const dueMs = args.slaDueAt
    ? args.slaDueAt.getTime()
    : createdMs + resolutionSlaHours(args.priority) * HOUR_MS;

  if (args.resolvedAt) {
    return args.resolvedAt.getTime() > dueMs;
  }
  if (args.isClosed) {
    return false;
  }
  return now > dueMs;
}
