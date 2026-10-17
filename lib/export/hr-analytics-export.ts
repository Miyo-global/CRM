import { downloadXlsx, type SheetDefinition } from "./xlsx-utils";
import type {
  RetentionAnalyticsData,
  PerformanceAnalyticsData,
  ExecutiveKpisData,
  WorkforceTrendsData,
  AttendanceAnalyticsData,
  LeaveAnalyticsData,
  CompensationAnalyticsData,
  DiversityData,
} from "@/lib/api/hooks/hr/analytics-extended";
import { getTodayString } from "@/lib/date-utils";

export interface AnalyticsExportInput {
  retention?: RetentionAnalyticsData;
  performance?: PerformanceAnalyticsData;
  executive?: ExecutiveKpisData;
  workforceTrends?: WorkforceTrendsData;
  attendance?: AttendanceAnalyticsData;
  leave?: LeaveAnalyticsData;
  compensation?: CompensationAnalyticsData;
  diversity?: DiversityData;
  rangeLabel?: string;
}

interface FlatRow {
  section: string;
  metric: string;
  value: string | number;
}

function buildRows(input: AnalyticsExportInput): FlatRow[] {
  const rows: FlatRow[] = [];
  const {
    executive,
    retention,
    performance,
    workforceTrends,
    attendance,
    leave,
    compensation,
    diversity,
  } = input;

  if (executive) {
    rows.push(
      { section: "Executive", metric: "Headcount", value: executive.headcount },
      { section: "Executive", metric: "Attrition Rate (%)", value: executive.attritionRate },
      { section: "Executive", metric: "Hiring Rate (%)", value: executive.hiringRate },
      { section: "Executive", metric: "Avg Tenure (months)", value: executive.avgTenureMonths ?? "N/A" },
      { section: "Executive", metric: "Diversity Ratio (% female)", value: executive.diversityRatio ?? "N/A" },
      { section: "Executive", metric: "Open Positions", value: executive.openPositions },
      { section: "Executive", metric: "Org Health Score", value: executive.orgHealthScore },
    );
  }

  if (retention) {
    rows.push(
      { section: "Retention", metric: "Active Headcount", value: retention.activeHeadcount },
      { section: "Retention", metric: "Voluntary Exits", value: retention.voluntaryExits },
      { section: "Retention", metric: "Involuntary Exits", value: retention.involuntaryExits },
      { section: "Retention", metric: "Total Exits", value: retention.totalExits },
      { section: "Retention", metric: "Attrition Rate (%)", value: retention.attritionRate },
    );
    for (const d of retention.attritionByDept) {
      rows.push({ section: "Attrition by Dept", metric: d.department, value: d.count });
    }
  }

  if (performance) {
    if (performance.reviews) {
      rows.push(
        { section: "Performance", metric: "Reviews Total", value: performance.reviews.total },
        { section: "Performance", metric: "Reviews Completed", value: performance.reviews.completed },
        { section: "Performance", metric: "Review Completion (%)", value: performance.reviews.completionRate ?? "N/A" },
      );
    }
    if (performance.appraisals) {
      rows.push(
        { section: "Performance", metric: "Appraisals Total", value: performance.appraisals.total },
        { section: "Performance", metric: "Appraisals Closed", value: performance.appraisals.closed },
        { section: "Performance", metric: "Appraisal Completion (%)", value: performance.appraisals.completionRate ?? "N/A" },
      );
    }
    if (performance.goals) {
      rows.push(
        { section: "Performance", metric: "Goals Total", value: performance.goals.total },
        { section: "Performance", metric: "Goals Completed", value: performance.goals.completed },
        { section: "Performance", metric: "Goal Completion (%)", value: performance.goals.completionRate ?? "N/A" },
      );
    }
    for (const r of performance.ratingDistribution) {
      rows.push({ section: "Rating Distribution", metric: r.band, value: r.count });
    }
  }

  // Every tab on the page is exported, not just the first four (QA-0015).
  if (workforceTrends) {
    rows.push({ section: "Workforce", metric: "Current headcount", value: workforceTrends.currentHeadcount });
    for (const m of workforceTrends.monthly) {
      rows.push({ section: "Workforce joiners", metric: m.month, value: m.joiners });
      rows.push({ section: "Workforce exits", metric: m.month, value: m.exits });
    }
  }

  if (diversity) {
    rows.push({ section: "Diversity", metric: "Employees counted", value: diversity.total });
    for (const g of diversity.gender) {
      rows.push({ section: "Diversity gender", metric: g.label, value: `${g.count} (${g.pct}%)` });
    }
    for (const a of diversity.ageBuckets) {
      rows.push({ section: "Diversity age", metric: a.label, value: a.count });
    }
    for (const t of diversity.tenureBuckets) {
      rows.push({ section: "Diversity tenure", metric: t.label, value: t.count });
    }
  }

  if (attendance) {
    rows.push({
      section: "Attendance",
      metric: `Logs ${attendance.year}-${String(attendance.month).padStart(2, "0")}`,
      value: attendance.totalAttendanceLogs,
    });
    for (const d of attendance.byDepartment) {
      rows.push({ section: "Attendance by department", metric: d.department, value: d.count });
    }
    for (const d of attendance.daily) {
      rows.push({ section: "Attendance daily", metric: d.date, value: d.count });
    }
  }

  if (leave) {
    for (const d of leave.byDepartment) {
      rows.push({
        section: "Leave by department",
        metric: d.department,
        value: `${d.total} total / ${d.approved} approved / ${d.pending} pending / ${d.rejected} rejected`,
      });
    }
    for (const m of leave.monthlyTrend) {
      rows.push({ section: "Leave approved by month", metric: m.month, value: m.count });
    }
  }

  if (compensation) {
    rows.push(
      { section: "Compensation", metric: "Average salary", value: compensation.overall.avgSalary },
      { section: "Compensation", metric: "Median salary", value: compensation.overall.medianSalary },
      { section: "Compensation", metric: "Lowest salary", value: compensation.overall.minSalary },
      { section: "Compensation", metric: "Highest salary", value: compensation.overall.maxSalary },
    );
    for (const d of compensation.byDepartment) {
      rows.push({ section: "Compensation by department", metric: d.department, value: `${d.avgSalary} (${d.count})` });
    }
    for (const r of compensation.byRole) {
      rows.push({ section: "Compensation by role", metric: r.role, value: `${r.avgSalary} (${r.count})` });
    }
  }

  return rows;
}

function csvEscape(val: unknown): string {
  if (val === null || val === undefined) return "";
  const str = String(val);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export async function downloadAnalyticsXlsx(input: AnalyticsExportInput): Promise<void> {
  const rows = buildRows(input);
  const sheets: SheetDefinition[] = [
    {
      name: "HR Analytics",
      columns: [
        { header: "Section", key: "section", width: 24 },
        { header: "Metric", key: "metric", width: 32 },
        { header: "Value", key: "value", width: 18 },
      ],
      rows: rows as unknown as Array<Record<string, unknown>>,
    },
  ];
  const stamp = getTodayString();
  await downloadXlsx(`hr-analytics-${stamp}.xlsx`, sheets);
}

export function downloadAnalyticsCsv(input: AnalyticsExportInput): void {
  const rows = buildRows(input);
  const header = ["Section", "Metric", "Value"].map(csvEscape).join(",");
  const lines = rows.map((r) => [r.section, r.metric, r.value].map(csvEscape).join(","));
  const csv = [header, ...lines].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `hr-analytics-${getTodayString()}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
