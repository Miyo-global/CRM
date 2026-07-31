import { downloadXlsx, type SheetDefinition } from "./xlsx-utils";
import type {
  RecruitmentAnalyticsData,
  RetentionAnalyticsData,
  PerformanceAnalyticsData,
  ExecutiveKpisData,
} from "@/lib/api/hooks/hr/analytics-extended";

export interface AnalyticsExportInput {
  recruitment?: RecruitmentAnalyticsData;
  retention?: RetentionAnalyticsData;
  performance?: PerformanceAnalyticsData;
  executive?: ExecutiveKpisData;
  rangeLabel?: string;
}

interface FlatRow {
  section: string;
  metric: string;
  value: string | number;
}

function buildRows(input: AnalyticsExportInput): FlatRow[] {
  const rows: FlatRow[] = [];
  const { executive, recruitment, retention, performance } = input;

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

  if (recruitment) {
    rows.push(
      { section: "Recruitment", metric: "Open Positions", value: recruitment.openPositions },
      { section: "Recruitment", metric: "Total Openings", value: recruitment.totalOpenings },
      { section: "Recruitment", metric: "Offers Released", value: recruitment.offersReleased },
      { section: "Recruitment", metric: "Offers Accepted", value: recruitment.offersAccepted },
      { section: "Recruitment", metric: "Offer Acceptance Rate (%)", value: recruitment.offerAcceptanceRate ?? "N/A" },
      { section: "Recruitment", metric: "Hired", value: recruitment.hiredCount },
      { section: "Recruitment", metric: "Avg Time to Hire (days)", value: recruitment.avgTimeToHireDays ?? "N/A" },
    );
    for (const s of recruitment.pipelineByStage) {
      rows.push({ section: "Recruitment Pipeline", metric: s.stage, value: s.count });
    }
    for (const s of recruitment.sourceOfHire) {
      rows.push({ section: "Source of Hire", metric: s.source, value: s.count });
    }
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
  const stamp = new Date().toISOString().slice(0, 10);
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
  a.download = `hr-analytics-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
