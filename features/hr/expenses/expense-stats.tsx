"use client";

import {
  AlertCircle,
  CheckCircle2,
  XCircle,
  DollarSign,
  Clock,
  BarChart3,
} from "lucide-react";
import { StatCard } from "@/components/ui/stat-card";
import { formatINR, formatINRCompact } from "@/lib/format-utils";
import type { ExpensePageData } from "@/server/actions/expense-query";

interface AdminExpenseStatsProps {
  stats: ExpensePageData["stats"] | null | undefined;
  pendingCount: number;
}

export function AdminExpenseStats({ stats, pendingCount }: AdminExpenseStatsProps) {
  const totalClaimed =
    (stats?.approvedAmount || 0) +
    (stats?.pendingAmount || 0) +
    (stats?.rejectedAmount || 0) +
    (stats?.paidAmount || 0);

  return (
    <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
      <StatCard
        label="Pending Approval"
        value={pendingCount}
        icon={AlertCircle}
        color="red"
      />
      <StatCard
        label="Approved Today"
        value={formatINRCompact(stats?.approvedAmount || 0)}
        valueTooltip={formatINR(stats?.approvedAmount || 0)}
        icon={CheckCircle2}
        color="green"
      />
      <StatCard
        label="Rejected Today"
        value={formatINRCompact(stats?.rejectedAmount || 0)}
        valueTooltip={formatINR(stats?.rejectedAmount || 0)}
        icon={XCircle}
        color="red"
      />
      <StatCard
        label="Total Claimed (Month)"
        value={formatINRCompact(totalClaimed)}
        valueTooltip={formatINR(totalClaimed)}
        icon={BarChart3}
        color="blue"
      />
    </div>
  );
}

interface MemberExpenseStatsProps {
  stats: ExpensePageData["stats"] | null | undefined;
}

export function MemberExpenseStats({ stats }: MemberExpenseStatsProps) {
  const totalReimbursed = (stats?.approvedAmount || 0) + (stats?.paidAmount || 0);
  return (
    <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
      <StatCard
        label="Total Reimbursed (YTD)"
        value={formatINRCompact(totalReimbursed)}
        valueTooltip={formatINR(totalReimbursed)}
        icon={DollarSign}
        color="green"
      />
      <StatCard
        label="Pending Approval"
        value={formatINRCompact(stats?.pendingAmount || 0)}
        valueTooltip={formatINR(stats?.pendingAmount || 0)}
        icon={Clock}
        color="gold"
      />
      <StatCard
        label="Rejected (30d)"
        value={formatINRCompact(stats?.rejectedAmount || 0)}
        valueTooltip={formatINR(stats?.rejectedAmount || 0)}
        icon={XCircle}
        color="red"
      />
    </div>
  );
}
