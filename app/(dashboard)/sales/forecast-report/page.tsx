"use client";

import { useCallback } from "react";
import { TrendingUp, DollarSign, Briefcase, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { StatCard } from "@/components/ui/stat-card";
import { useDealForecast } from "@/lib/api/hooks/crm";


function fmtCurrency(val: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(val);
}

function fmtPct(val: number) {
  return `${val}%`;
}


async function exportToExcel(data: {
  byMonth: Array<{ month: string; label: string; weighted: number; bestCase: number; dealCount: number }>;
  byStage: Array<{ stage: string; count: number; totalValue: number; weightedValue: number; avgProbability: number }>;
}) {
  const ExcelJS = (await import("exceljs")).default;
  const wb = new ExcelJS.Workbook();
  wb.creator = "Miyo Global CRM";
  wb.created = new Date();

  const monthly = wb.addWorksheet("Monthly Forecast");
  monthly.columns = [
    { header: "Month", key: "label", width: 16 },
    { header: "Deals", key: "dealCount", width: 10 },
    { header: "Weighted Revenue (₹)", key: "weighted", width: 24 },
    { header: "Best Case Revenue (₹)", key: "bestCase", width: 24 },
  ];
  monthly.getRow(1).font = { bold: true };
  data.byMonth.forEach((row) => monthly.addRow(row));

  const stages = wb.addWorksheet("Stage Breakdown");
  stages.columns = [
    { header: "Stage", key: "stage", width: 18 },
    { header: "Count", key: "count", width: 10 },
    { header: "Total Value (₹)", key: "totalValue", width: 20 },
    { header: "Weighted Value (₹)", key: "weightedValue", width: 22 },
    { header: "Avg Probability %", key: "avgProbability", width: 20 },
  ];
  stages.getRow(1).font = { bold: true };
  data.byStage.forEach((row) => stages.addRow(row));

  const buf = await wb.xlsx.writeBuffer();
  const blob = new Blob([buf], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `forecast-report-${new Date().toISOString().slice(0, 10)}.xlsx`;
  a.click();
  URL.revokeObjectURL(url);
}


function ForecastSkeleton() {
  return (
    <PageWrapper title="Forecast Report" subtitle="Pipeline revenue forecast by month and stage">
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-28 w-full rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-64 w-full rounded-xl" />
        <Skeleton className="h-48 w-full rounded-xl" />
      </div>
    </PageWrapper>
  );
}


export default function ForecastReportPage() {
  const { data, isLoading } = useDealForecast();

  const handleExport = useCallback(() => {
    if (!data) return;
    exportToExcel({ byMonth: data.byMonth, byStage: data.byStage });
  }, [data]);

  if (isLoading || !data) return <ForecastSkeleton />;

  return (
    <PageWrapper
      title="Forecast Report"
      subtitle="Pipeline revenue forecast by month and stage"
      actions={
        <Button variant="outline" size="sm" onClick={handleExport} className="gap-2">
          <Download className="h-4 w-4" />
          Export Excel
        </Button>
      }
    >
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-3">
          <StatCard
            label="Total Weighted Revenue"
            value={fmtCurrency(data.totalWeighted)}
            icon={TrendingUp}
            color="gold"
            index={0}
          />
          <StatCard
            label="Best Case Revenue"
            value={fmtCurrency(data.totalBestCase)}
            icon={DollarSign}
            color="green"
            index={1}
          />
          <StatCard
            label="Active Deals"
            value={data.totalDeals}
            icon={Briefcase}
            color="blue"
            index={2}
          />
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Monthly Forecast</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="w-full" type="auto">
              <div className="min-w-[600px]">
                <table className="w-full text-sm">
                  <caption className="sr-only">Monthly revenue forecast</caption>
                  <thead className="border-b border-border bg-muted/40">
                    <tr>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Month</th>
                      <th className="text-right px-4 py-3 font-medium text-muted-foreground">Deals</th>
                      <th className="text-right px-4 py-3 font-medium text-muted-foreground">Weighted Revenue</th>
                      <th className="text-right px-4 py-3 font-medium text-muted-foreground">Best Case</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.byMonth.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="text-center text-muted-foreground py-8">
                          No forecast data available
                        </td>
                      </tr>
                    ) : (
                      data.byMonth.map((row) => (
                        <tr key={row.month} className="border-b border-border/50 last:border-0 hover:bg-muted/30 transition-colors">
                          <td className="px-4 py-3 font-medium text-foreground">{row.label}</td>
                          <td className="px-4 py-3 text-right text-muted-foreground">{row.dealCount}</td>
                          <td className="px-4 py-3 text-right font-medium text-foreground">{fmtCurrency(row.weighted)}</td>
                          <td className="px-4 py-3 text-right text-muted-foreground">{fmtCurrency(row.bestCase)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Stage Breakdown</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="w-full" type="auto">
              <div className="min-w-[640px]">
                <table className="w-full text-sm">
                  <caption className="sr-only">Deal stage breakdown</caption>
                  <thead className="border-b border-border bg-muted/40">
                    <tr>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Stage</th>
                      <th className="text-right px-4 py-3 font-medium text-muted-foreground">Count</th>
                      <th className="text-right px-4 py-3 font-medium text-muted-foreground">Total Value</th>
                      <th className="text-right px-4 py-3 font-medium text-muted-foreground">Weighted Value</th>
                      <th className="text-right px-4 py-3 font-medium text-muted-foreground">Avg Probability</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.byStage.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="text-center text-muted-foreground py-8">
                          No stage data available
                        </td>
                      </tr>
                    ) : (
                      data.byStage.map((row) => (
                        <tr key={row.stage} className="border-b border-border/50 last:border-0 hover:bg-muted/30 transition-colors">
                          <td className="px-4 py-3 font-medium text-foreground capitalize">{row.stage.toLowerCase()}</td>
                          <td className="px-4 py-3 text-right text-muted-foreground">{row.count}</td>
                          <td className="px-4 py-3 text-right text-muted-foreground">{fmtCurrency(row.totalValue)}</td>
                          <td className="px-4 py-3 text-right font-medium text-foreground">{fmtCurrency(row.weightedValue)}</td>
                          <td className="px-4 py-3 text-right text-muted-foreground">{fmtPct(row.avgProbability)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </PageWrapper>
  );
}
