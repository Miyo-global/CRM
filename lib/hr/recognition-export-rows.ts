import { format } from "date-fns";
import type { RecognitionExportFilters } from "@/lib/hr/recognition-export-filters";

export type RecognitionExportRow = {
  id: number;
  fromUserId: string;
  toUserId: string;
  message: string;
  category: string | null;
  createdAt: Date | string | null;
  fromUser?: { name?: string | null; email?: string | null } | null;
  toUser?: { name?: string | null; email?: string | null } | null;
  fromUserDept?: string | null;
  toUserDept?: string | null;
};

const CATEGORY_LABELS: Record<string, string> = {
  KUDOS: "Kudos",
  TEAMWORK: "Teamwork",
  INNOVATION: "Innovation",
  LEADERSHIP: "Leadership",
  ABOVE_AND_BEYOND: "Above & Beyond",
};

export function filterRecognitionRows(
  rows: RecognitionExportRow[],
  filters: RecognitionExportFilters,
  options: { isAdmin: boolean; currentUserId?: string }
): RecognitionExportRow[] {
  let result = rows;

  if (!options.isAdmin && options.currentUserId) {
    if (filters.historyFilter === "SENT") {
      result = result.filter((r) => r.fromUserId === options.currentUserId);
    } else if (filters.historyFilter === "RECEIVED") {
      result = result.filter((r) => r.toUserId === options.currentUserId);
    } else {
      result = result.filter(
        (r) => r.fromUserId === options.currentUserId || r.toUserId === options.currentUserId
      );
    }
  }

  const q = filters.searchQuery?.trim().toLowerCase();
  if (q) {
    result = result.filter(
      (r) =>
        r.fromUser?.name?.toLowerCase().includes(q) ||
        r.toUser?.name?.toLowerCase().includes(q) ||
        r.fromUser?.email?.toLowerCase().includes(q) ||
        r.toUser?.email?.toLowerCase().includes(q) ||
        r.message?.toLowerCase().includes(q)
    );
  }

  if (filters.category && filters.category !== "ALL") {
    result = result.filter((r) => r.category === filters.category);
  }

  if (filters.department && filters.department !== "ALL") {
    result = result.filter(
      (r) => r.fromUserDept === filters.department || r.toUserDept === filters.department
    );
  }

  if (filters.fromUserId && filters.fromUserId !== "ALL") {
    result = result.filter((r) => r.fromUserId === filters.fromUserId);
  }

  if (filters.toUserId && filters.toUserId !== "ALL") {
    result = result.filter((r) => r.toUserId === filters.toUserId);
  }

  if (filters.dateFrom) {
    result = result.filter((r) => r.createdAt && new Date(r.createdAt) >= new Date(filters.dateFrom!));
  }

  if (filters.dateTo) {
    result = result.filter(
      (r) => r.createdAt && new Date(r.createdAt) <= new Date(`${filters.dateTo}T23:59:59`)
    );
  }

  return result;
}

export function buildRecognitionCsvText(rows: RecognitionExportRow[]): string {
  const escape = (v: string | null | undefined) => `"${(v ?? "").replace(/"/g, '""')}"`;
  const header = [
    "Date",
    "Time",
    "From Name",
    "From Email",
    "From Dept",
    "To Name",
    "To Email",
    "To Dept",
    "Category",
    "Message",
  ];
  const csvRows = rows.map((r) => {
    const dt = r.createdAt ? new Date(r.createdAt) : null;
    return [
      dt ? format(dt, "dd/MM/yyyy") : "",
      dt ? format(dt, "hh:mm a") : "",
      r.fromUser?.name ?? "",
      r.fromUser?.email ?? "",
      r.fromUserDept ?? "",
      r.toUser?.name ?? "",
      r.toUser?.email ?? "",
      r.toUserDept ?? "",
      CATEGORY_LABELS[r.category ?? ""] ?? r.category ?? "",
      r.message ?? "",
    ]
      .map(escape)
      .join(",");
  });
  return [header.join(","), ...csvRows].join("\n");
}

export function buildRecognitionCsvBuffer(rows: RecognitionExportRow[]): Buffer {
  return Buffer.from(buildRecognitionCsvText(rows), "utf-8");
}
