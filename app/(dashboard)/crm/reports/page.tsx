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
import { cn } from "@/lib/utils";
import { staggerContainer, fadeUp, scaleIn } from "@/lib/motion-variants";
import { useLeadStats, useSlaAlerts } from "@/lib/api/hooks/leads";
import { toast } from "sonner";
import { CURRENCY_SYMBOL, DEFAULT_LOCALE } from "@/lib/constants/locale";

const PIPELINE_COLORS: Record<string, { color: string; bg: string }> = {
  NEW: { color: "#3B82F6", bg: "bg-blue-500/10" },
  CONTACTED: { color: "#0EA5E9", bg: "bg-sky-500/10" },
  INTERESTED: { color: "#F59E0B", bg: "bg-amber-500/10" },
  QUALIFIED: { color: "#8B5CF6", bg: "bg-purple-500/10" },
  CONVERTED: { color: "#10B981", bg: "bg-emerald-500/10" },
  LOST: { color: "#EF4444", bg: "bg-red-500/10" },
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

  const { data: stats, isLoading } = useLeadStats(statsInput);
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
      <div className="space-y-6 p-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-16 w-full" />
        <div className="grid gap-4 md:grid-cols-3">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-32" />)}
        </div>
        <Skeleton className="h-80" />
      </div>
    );
  }

  return (
    <PageWrapper
      title="CRM Reports"
      subtitle="Analytics, pipeline insights, and exportable reports"
      filters={
        <>
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
            <Filter className="h-4 w-4 mr-1" />
            Apply
          </Button>
          {(appliedFrom || appliedTo) && (
            <Button variant="ghost" size="sm" onClick={() => { setDateFrom(""); setDateTo(""); setAppliedFrom(""); setAppliedTo(""); }}>
              <X className="h-4 w-4 mr-1" />
              Clear
            </Button>
          )}
        </>
      }
      actions={
        <>
          <Button variant="outline" onClick={handleExportExcel}>
            <FileSpreadsheet className="h-4 w-4 mr-2" />
            Excel
          </Button>
          <Button variant="outline" onClick={handleExportPDF}>
            <FileDown className="h-4 w-4 mr-2" />
            PDF
          </Button>
        </>
      }
    >
      <motion.div
        className="space-y-6"
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
      >
        {slaData && slaData.total > 0 && (
          <motion.div variants={fadeUp}>
            <Card className="shadow-noir border-red-500/20">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2 text-red-400">
                  <AlertTriangle className="h-4 w-4" />
                  SLA Breached — {slaData.total} leads not contacted in 24h+
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-[200px] overflow-y-auto">
                  {slaData.leads.slice(0, 10).map((lead) => (
                    <div key={lead.leadId} className="flex items-center justify-between p-2 rounded-lg bg-red-500/5 border border-red-500/10">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1.5 text-sm font-medium">{lead.leadName}</div>
                        <Badge variant="outline" className="text-[10px]">{lead.status}</Badge>
                        {lead.priority && (
                          <Badge variant="outline" className={cn("text-[10px]",
                            lead.priority === "HOT" && "border-red-500/50 text-red-500",
                            lead.priority === "WARM" && "border-amber-500/50 text-amber-500",
                            lead.priority === "COLD" && "border-blue-400/50 text-blue-400",
                          )}>{lead.priority}</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
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
            <motion.div variants={fadeUp} className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
              {[
                { label: "Total Leads", value: stats.total, icon: Users, color: "text-blue-400" },
                { label: "Conversion Rate", value: `${stats.conversionRate}%`, icon: TrendingUp, color: "text-emerald-400" },
                { label: "Potential Value", value: `${CURRENCY_SYMBOL}${(stats.totalPotentialValue / 100000).toFixed(1)}L`, icon: Target, color: "text-gold" },
                { label: "Unassigned", value: stats.unassigned, icon: UserCheck, color: "text-red-400" },
                { label: "New This Month", value: stats.thisMonth, icon: Calendar, color: "text-purple-400" },
              ].map(s => (
                <Card key={s.label} className="shadow-noir">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <s.icon className={cn("h-5 w-5", s.color)} />
                      <span className="text-2xl font-bold tabular-nums">{s.value}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
                  </CardContent>
                </Card>
              ))}
            </motion.div>

            <motion.div variants={fadeUp}>
              <Card className="shadow-noir">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <BarChart3 className="h-4 w-4 text-gold" />
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
                              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: config.color }} />
                              <span className="text-sm font-medium">{status}</span>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="text-sm font-bold tabular-nums">{count}</span>
                              <span className="text-xs text-muted-foreground w-12 text-right">{pct.toFixed(1)}%</span>
                            </div>
                          </div>
                          <div
                            className="h-3 rounded-full bg-muted overflow-hidden"
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
              <Card className="shadow-noir">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-gold" />
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
                            className="h-12 rounded-lg flex items-center justify-center gap-2 transition-all"
                            style={{
                              width: `${widthPct}%`,
                              backgroundColor: config.color + "20",
                              borderLeft: `3px solid ${config.color}`,
                            }}
                          >
                            <span className="text-sm font-semibold" style={{ color: config.color }}>
                              {status}
                            </span>
                            <Badge variant="secondary" className="text-xs">{count}</Badge>
                          </div>
                          {i < arr.length - 1 && (
                            <ArrowDown className="h-4 w-4 text-muted-foreground/30 my-1" />
                          )}
                        </motion.div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </>
        )}
      </motion.div>
    </PageWrapper>
  );
}
