"use client";

import {
  AlertCircle,
  CheckCircle2,
  XCircle,
  IndianRupee,
  Clock,
  BarChart3,
} from "lucide-react";
import { StatsStrip } from "@/components/shared/stats-strip";
import { formatINR, formatINRCompact } from "@/lib/format-utils";
import type { ExpensePageData } from "@/server/actions/expense-query";

interface AdminExpenseStatsProps {
  stats: ExpensePageData["stats"] | null | undefined;
  pendingCount: number;
}

/** Compact amount with the exact value in a tooltip. */
function Amount({ value }: { value: number }) {
  return <span title={formatINR(value)}>{formatINRCompact(value)}</span>;
}

export function AdminExpenseStats({ stats, pendingCount }: AdminExpenseStatsProps) {
  // Day- and month-bounded on the server (IST); all-time status totals made
  // these tiles show old rejections as "today" and count rejected as claimed.
  return (
    <StatsStrip
      items={[
        { label: "Pending Approval", value: pendingCount, icon: AlertCircle, tone: pendingCount > 0 ? "warning" : undefined },
        { label: "Approved Today", value: <Amount value={stats?.approvedTodayAmount || 0} />, icon: CheckCircle2, tone: "success" },
        { label: "Rejected Today", value: <Amount value={stats?.rejectedTodayAmount || 0} />, icon: XCircle, tone: "danger" },
        { label: "Total Claimed (Month)", value: <Amount value={stats?.claimedMonthAmount || 0} />, icon: BarChart3 },
      ]}
    />
  );
}

interface MemberExpenseStatsProps {
  stats: ExpensePageData["stats"] | null | undefined;
}

export function MemberExpenseStats({ stats }: MemberExpenseStatsProps) {
  // Paid this calendar year / rejected in the last 30 days (IST), computed on
  // the server — all-time approved+paid and all-time rejected didn't match the labels.
  return (
    <StatsStrip
      items={[
        { label: "Total Reimbursed (YTD)", value: <Amount value={stats?.reimbursedYtdAmount || 0} />, icon: IndianRupee, tone: "success" },
        { label: "Pending Approval", value: <Amount value={stats?.pendingAmount || 0} />, icon: Clock, tone: "warning" },
        { label: "Rejected (30d)", value: <Amount value={stats?.rejected30dAmount || 0} />, icon: XCircle, tone: "danger" },
      ]}
    />
  );
}
