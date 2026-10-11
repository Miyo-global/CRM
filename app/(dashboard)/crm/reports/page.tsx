"use client";

import { useState, useMemo, useCallback } from "react";
import { motion } from "framer-motion";
import {
  FileDown, FileSpreadsheet, Filter, TrendingUp, Users,
  Target, UserCheck, Calendar, BarChart3, ArrowDown, X, AlertTriangle, Clock,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { DatePicker } from "@/components/ui/date-picker";
import { Skeleton } from "@/components/ui/skeleton";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { staggerContainer, fadeUp, scaleIn } from "@/lib/motion-variants";
import { useLeadStats, useSlaAlerts } from "@/lib/api/hooks/leads";
import { toast } from "sonner";
import { CURRENCY_SYMBOL, DEFAULT_LOCALE } from "@/lib/constants/locale";
import { toneVar, type Tone } from "@/lib/design/tones";
import { StatsStrip } from "@/components/shared/stats-strip";
import { StatusPill } from "@/components/ui/status-pill";
import { IconChip } from "@/components/ui/icon-chip";
import { QueryErrorState } from "@/components/ui/query-error-state";

const PRIORITY_TONES: Record<string, Tone> = { HOT: "danger", WARM: "warning", COLD: "info" };

const PIPELINE_COLORS: Record<string, { color: string; bg: string }> = {
  NEW: { color: toneVar.info, bg: "bg-info-soft" },
  CONTACTED: { color: toneVar.teal, bg: "bg-teal-soft" },
  INTERESTED: { color: toneVar.warning, bg: "bg-warning-soft" },
  QUALIFIED: { color: toneVar.plum, bg: "bg-plum-soft" },
  CONVERTED: { color: toneVar.success, bg: "bg-success-soft" },
  LOST: { color: toneVar.danger, bg: "bg-danger-soft" },
};

export default function CrmReportsPage() {
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [appliedFrom, setAppliedFrom] = useState("");
  const [appliedTo, setAppliedTo] = useState("");

  const statsInput = useMemo(() => {
    if (!appliedFrom && !appliedTo) return undefined;
    return {
      ...(appliedFrom && { dateFrom: appliedFrom }),
      ...(appliedTo && { dateTo: appliedTo }),
    };
  }, [appliedFrom, appliedTo]);

  const { data: stats, isLoading, isError, error, refetch } = useLeadStats(statsInput);
  const { data: slaData } = useSlaAlerts();

  const handleApplyFilter = useCallback(() => {
    setAppliedFrom(dateFrom);
    setAppliedTo(dateTo);
    if (dateFrom || dateTo) {
      toast.success("Date filter applied");
    } else {
      toast.info("Showing all-time data");
    }
  }, [dateFrom, dateTo]);

  const handleExportExcel = useCallback(async () => {
    try {
      const ExcelJS = (await import("exceljs")).default;
      if (!stats) return;

      const wb = new ExcelJS.Workbook();

      const ws1 = wb.addWorksheet("Summary");
      ws1.columns = [
        { header: "Metric", key: "metric", width: 30 },
        { header: "Value", key: "value", width: 30 },
      ];
      ws1.addRows([
        { metric: "Total Leads", value: stats.total },
        { metric: "Conversion Rate", value: `${stats.conversionRate}%` },
        { metric: "Total Potential Value", value: `${CURRENCY_SYMBOL}${stats.totalPotentialValue.toLocaleString(DEFAULT_LOCALE)}` },
        { metric: "Unassigned Leads", value: stats.unassigned },
        { metric: "New This Month", value: stats.thisMonth },
      ]);

      const ws2 = wb.addWorksheet("Pipeline");
      ws2.columns = [
        { header: "Status", key: "status", width: 20 },
        { header: "Count", key: "count", width: 15 },
        { header: "Percentage", key: "percentage", width: 15 },
      ];
      ws2.addRows(
        Object.entries(stats.byStatus).map(([status, count]) => ({
          status,
          count,
          percentage: stats.total > 0 ? `${((count / stats.total) * 100).toFixed(1)}%` : "0%",
        }))
      );

      const buffer = await wb.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `crm-report-${new Date().toISOString().split("T")[0]}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Excel report downloaded");
    } catch {
      toast.error("Failed to export Excel");
    }
  }, [stats]);

  const handleExportPDF = useCallback(async () => {
    try {
      const { default: jsPDF } = await import("jspdf");
      if (!stats) return;

      const doc = new jsPDF();
      doc.setFontSize(20);
      doc.text("CRM Pipeline Report", 20, 20);
      doc.setFontSize(12);
      doc.text(`Generated: ${new Date().toLocaleDateString()}`, 20, 30);
      doc.text("", 20, 40);

      doc.setFontSize(14);
      doc.text("Summary", 20, 50);
      doc.setFontSize(11);
      doc.text(`Total Leads: ${stats.total}`, 20, 60);
      doc.text(`Conversion Rate: ${stats.conversionRate}%`, 20, 68);
      doc.text(`Total Potential Value: INR ${stats.totalPotentialValue.toLocaleString(DEFAULT_LOCALE)}`, 20, 76);
      doc.text(`Unassigned: ${stats.unassigned}`, 20, 84);
      doc.text(`New This Month: ${stats.thisMonth}`, 20, 92);

      doc.setFontSize(14);
      doc.text("Pipeline Breakdown", 20, 110);
      doc.setFontSize(11);
      let y = 120;
      for (const [status, count] of Object.entries(stats.byStatus)) {
        const pct = stats.total > 0 ? ((count / stats.total) * 100).toFixed(1) : "0";
        doc.text(`${status}: ${count} (${pct}%)`, 20, y);
        y += 8;
      }

      doc.save(`crm-report-${new Date().toISOString().split("T")[0]}.pdf`);
      toast.success("PDF report downloaded");
    } catch {
      toast.error("Failed to export PDF");
    }
  }, [stats]);

  const maxPipelineCount = useMemo(() => {
    if (!stats) return 1;
    return Math.max(1, ...Object.values(stats.byStatus));
  }, [stats]);

  if (isLoading) {
    return (
      <PageWrapper title="CRM Reports" subtitle="Analytics, pipeline insights, and exportable reports">
        <div className="space-y-6">
          <Skeleton className="h-20 w-full rounded-lg" />
          <div className="grid gap-4 lg:grid-cols-2">
            <Skeleton className="h-80 rounded-lg" />
            <Skeleton className="h-80 rounded-lg" />
          </div>
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper
      title="CRM Reports"
      subtitle="Analytics, pipeline insights, and exportable reports"
      filters={
        <div className="flex flex-wrap items-end gap-2">
          <div>
            <Label htmlFor="dateFrom" className="text-xs text-muted-foreground">From</Label>
            <DatePicker value={dateFrom} onChange={setDateFrom} placeholder="From date" />
          </div>
          <div>
            <Label htmlFor="dateTo" className="text-xs text-muted-foreground">To</Label>
            <DatePicker
              value={dateTo}
              onChange={setDateTo}
              placeholder="To date"
              fromDate={dateFrom ? new Date(dateFrom) : undefined}
            />
          </div>
          <Button variant="outline" size="sm" onClick={handleApplyFilter}>
            <Filter className="size-4" />
            Apply
          </Button>
          {(appliedFrom || appliedTo) && (
            <Button variant="ghost" size="sm" onClick={() => { setDateFrom(""); setDateTo(""); setAppliedFrom(""); setAppliedTo(""); }}>
              <X className="size-4" />
              Clear
            </Button>
          )}
        </div>
      }
      actions={
        <>
          <Button variant="outline" size="sm" onClick={handleExportExcel} disabled={!stats}>
            <FileSpreadsheet className="size-4" />
            Excel
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportPDF} disabled={!stats}>
            <FileDown className="size-4" />
            PDF
          </Button>
        </>
      }
    >
      {isError ? (
        <QueryErrorState title="Couldn't load report data" error={error} onRetry={() => refetch()} />
      ) : (
      <motion.div
        className="space-y-6"
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
      >
        {slaData && slaData.total > 0 && (
          <motion.div variants={fadeUp}>
            <Card className="border-danger-500/40">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base text-danger-strong">
                  <IconChip icon={AlertTriangle} tone="danger" size="sm" />
                  SLA Breached — {slaData.total} leads not contacted in 24h+
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="max-h-52 space-y-2 overflow-y-auto">
                  {slaData.leads.slice(0, 10).map((lead) => (
                    <div key={lead.leadId} className="flex flex-wrap items-center justify-between gap-2 rounded-md border bg-surface-sunken/40 p-2.5">
                      <div className="flex min-w-0 flex-wrap items-center gap-2">
                        <span className="truncate text-sm font-medium">{lead.leadName}</span>
                        <Badge variant="outline">{lead.status}</Badge>
                        {lead.priority && (
                          <StatusPill tone={PRIORITY_TONES[lead.priority] ?? "neutral"} dot>{lead.priority}</StatusPill>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-xs tabular-nums text-muted-foreground">
                        <Clock className="size-3.5" aria-hidden="true" />
                        {lead.hoursSinceUpdate}h overdue
                        {lead.assignedTo && <span>· {lead.assignedTo}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {stats && (
          <>
            <motion.div variants={fadeUp}>
              <StatsStrip
                items={[
                  { label: "Total Leads", value: stats.total, icon: Users, tone: "info" },
                  { label: "Conversion Rate", value: `${stats.conversionRate}%`, icon: TrendingUp, tone: "success" },
                  { label: "Potential Value", value: `${CURRENCY_SYMBOL}${(stats.totalPotentialValue / 100000).toFixed(1)}L`, icon: Target, tone: "brand" },
                  { label: "Unassigned", value: stats.unassigned, icon: UserCheck, tone: "danger" },
                  { label: "New This Month", value: stats.thisMonth, icon: Calendar, tone: "plum" },
                ]}
              />
            </motion.div>

            <div className="grid gap-4 lg:grid-cols-2">
            <motion.div variants={fadeUp}>
              <Card className="h-full">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <IconChip icon={BarChart3} size="sm" />
                    Pipeline Breakdown
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {Object.entries(stats.byStatus).map(([status, count]) => {
                      const pct = stats.total > 0 ? (count / stats.total) * 100 : 0;
                      const config = PIPELINE_COLORS[status] || PIPELINE_COLORS.NEW;

                      return (
                        <motion.div key={status} variants={scaleIn}>
                          <div className="flex items-center justify-between mb-1.5">
                            <div className="flex items-center gap-2">
                              <div aria-hidden="true" className="size-2 rounded-full" style={{ backgroundColor: config.color }} />
                              <span className="text-sm font-medium">{status}</span>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="text-sm font-bold tabular-nums">{count}</span>
                              <span className="w-12 text-right text-xs tabular-nums text-muted-foreground">{pct.toFixed(1)}%</span>
                            </div>
                          </div>
                          <div
                            className="h-2 rounded-full bg-muted overflow-hidden"
                            role="progressbar"
                            aria-valuenow={count}
                            aria-valuemin={0}
                            aria-valuemax={maxPipelineCount}
                            aria-label={`${status} pipeline count`}
                          >
                            <motion.div
                              className="h-full rounded-full"
                              style={{ backgroundColor: config.color }}
                              initial={{ width: 0 }}
                              animate={{ width: `${(count / maxPipelineCount) * 100}%` }}
                              transition={{ duration: 0.6, delay: 0.3 }}
                            />
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div variants={fadeUp}>
              <Card className="h-full">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <IconChip icon={TrendingUp} size="sm" />
                    Conversion Funnel
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col items-center gap-2 py-4">
                    {["NEW", "CONTACTED", "INTERESTED", "QUALIFIED", "CONVERTED"].map((status, i, arr) => {
                      const count = stats.byStatus[status as keyof typeof stats.byStatus] ?? 0;
                      const maxCount = stats.byStatus.NEW || 1;
                      const widthPct = Math.max(20, (count / maxCount) * 100);
                      const config = PIPELINE_COLORS[status];

                      return (
                        <motion.div
                          key={status}
                          className="relative flex flex-col items-center w-full"
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: i * 0.1 }}
                        >
                          <div
                            className="flex h-11 items-center justify-center gap-2 rounded-md"
                            style={{
                              width: `${widthPct}%`,
                              backgroundColor: `color-mix(in oklab, ${config.color} 12%, transparent)`,
                              borderLeft: `3px solid ${config.color}`,
                            }}
                          >
                            <span className="text-sm font-semibold text-foreground">
                              {status}
                            </span>
                            <Badge variant="secondary" className="tabular-nums">{count}</Badge>
                          </div>
                          {i < arr.length - 1 && (
                            <ArrowDown className="my-1 size-4 text-subtle-foreground" aria-hidden="true" />
                          )}
                        </motion.div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
            </div>
          </>
        )}
      </motion.div>
      )}
    </PageWrapper>
  );
}
