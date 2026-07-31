import { format } from "date-fns";
import { BONUS_TYPE_LABELS, type BonusType } from "@/lib/validations/bonus";

export interface BonusRow {
  id: number;
  userId: string;
  employeeName: string | null;
  amount: string;
  type: string | null;
  reason: string | null;
  month: string | null;
  status: string | null;
  approvedAt: string | null;
  createdAt: string | null;
}

export type BonusStatusFilter = "ALL" | "PENDING" | "APPROVED" | "PAID";
export type BonusTypeFilter = "ALL" | BonusType;

export interface BonusListFilters {
  search: string;
  status: BonusStatusFilter;
  type: BonusTypeFilter;
  userId: string;
  dateFrom: string;
  dateTo: string;
}

export const DEFAULT_BONUS_FILTERS: BonusListFilters = {
  search: "",
  status: "ALL",
  type: "ALL",
  userId: "ALL",
  dateFrom: "",
  dateTo: "",
};

export function parseBonusFiltersFromParams(params: URLSearchParams): BonusListFilters {
  const type = params.get("type");
  return {
    search: params.get("q") ?? "",
    status: (params.get("status") as BonusStatusFilter) || "ALL",
    type: type && type !== "ALL" ? (type as BonusType) : "ALL",
    userId: params.get("userId") ?? "ALL",
    dateFrom: params.get("dateFrom") ?? "",
    dateTo: params.get("dateTo") ?? "",
  };
}

export function countActiveBonusFilters(filters: BonusListFilters): number {
  let count = 0;
  if (filters.search.trim()) count += 1;
  if (filters.status !== "ALL") count += 1;
  if (filters.type !== "ALL") count += 1;
  if (filters.userId !== "ALL") count += 1;
  if (filters.dateFrom) count += 1;
  if (filters.dateTo) count += 1;
  return count;
}

function bonusDateValue(createdAt: string | null): string | null {
  if (!createdAt) return null;
  const parsed = new Date(createdAt);
  if (Number.isNaN(parsed.getTime())) return null;
  return format(parsed, "yyyy-MM-dd");
}

export function applyBonusFilters(bonuses: BonusRow[], filters: BonusListFilters): BonusRow[] {
  const q = filters.search.trim().toLowerCase();

  return bonuses.filter((bonus) => {
    if (filters.status !== "ALL" && (bonus.status ?? "PENDING") !== filters.status) return false;
    if (filters.type !== "ALL" && bonus.type !== filters.type) return false;
    if (filters.userId !== "ALL" && bonus.userId !== filters.userId) return false;

    const rowDate = bonusDateValue(bonus.createdAt);
    if (filters.dateFrom && rowDate && rowDate < filters.dateFrom) return false;
    if (filters.dateTo && rowDate && rowDate > filters.dateTo) return false;

    if (!q) return true;

    const typeLabel = bonus.type ? (BONUS_TYPE_LABELS[bonus.type as BonusType] ?? bonus.type) : "";
    const haystack = [
      bonus.employeeName,
      bonus.reason,
      bonus.type,
      typeLabel,
      bonus.status,
      bonus.amount,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    return haystack.includes(q);
  });
}

export interface BonusStats {
  total: number;
  pending: number;
  approved: number;
  paid: number;
  totalAmount: number;
  pendingAmount: number;
  paidAmount: number;
}

export function computeBonusStats(bonuses: BonusRow[]): BonusStats {
  return bonuses.reduce<BonusStats>(
    (acc, bonus) => {
      const amount = Number.parseFloat(bonus.amount || "0") || 0;
      const status = bonus.status ?? "PENDING";
      acc.total += 1;
      acc.totalAmount += amount;
      if (status === "PAID") {
        acc.paid += 1;
        acc.paidAmount += amount;
      } else if (status === "APPROVED") {
        acc.approved += 1;
        acc.pendingAmount += amount;
      } else {
        acc.pending += 1;
        acc.pendingAmount += amount;
      }
      return acc;
    },
    {
      total: 0,
      pending: 0,
      approved: 0,
      paid: 0,
      totalAmount: 0,
      pendingAmount: 0,
      paidAmount: 0,
    },
  );
}

export function buildBonusScopeLabel(filters: BonusListFilters): string {
  const parts: string[] = [];
  if (filters.status !== "ALL") parts.push(filters.status);
  if (filters.type !== "ALL") {
    parts.push(BONUS_TYPE_LABELS[filters.type] ?? filters.type);
  }
  if (filters.userId !== "ALL") parts.push("selected employee");
  if (filters.dateFrom || filters.dateTo) {
    parts.push(
      filters.dateFrom && filters.dateTo
        ? `${filters.dateFrom} to ${filters.dateTo}`
        : filters.dateFrom
          ? `from ${filters.dateFrom}`
          : `until ${filters.dateTo}`,
    );
  }
  if (filters.search.trim()) parts.push(`matching "${filters.search.trim()}"`);
  return parts.length ? parts.join(", ") : "all bonuses";
}

export function bonusExportFilename(): string {
  return `bonuses-${format(new Date(), "yyyy-MM-dd")}.xlsx`;
}
