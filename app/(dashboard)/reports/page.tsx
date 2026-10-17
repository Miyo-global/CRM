"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { IconChip } from "@/components/ui/icon-chip";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Users, CalendarDays, Clock, IndianRupee, Download, type LucideIcon } from "lucide-react";
import { toast } from "sonner";
import { DashboardGate } from "@/components/shared/dashboard-gate";
import { getTodayString } from "@/lib/date-utils";

interface ReportDefinition {
  id: string;
  title: string;
  description: string;
  icon: LucideIcon;
  /** Whether the report covers a single month. */
  monthly: boolean;
}

/**
 * HR reports, each built from live data and downloaded as a real file.
 *
 * The page used to list sales placeholders (sales performance, campaign ROI)
 * whose XLSX held sample rows and whose PDF buttons produced nothing at all
 * (QA-0029, QA-D004).
 */
const REPORTS: ReportDefinition[] = [
  {
    id: "headcount",
    title: "Headcount",
    description: "Every employee with designation, department, system role, joining date and status.",
    icon: Users,
    monthly: false,
  },
  {
    id: "attendance-summary",
    title: "Attendance summary",
    description: "Present, late and absent days per employee for a month, with hours worked.",
    icon: CalendarDays,
    monthly: true,
  },
  {
    id: "leave-register",
    title: "Leave register",
    description: "Leave requests starting in the month, with type, dates, status and LOP days.",
    icon: Clock,
    monthly: true,
  },
  {
    id: "payroll-summary",
    title: "Payroll summary",
    description: "Gross, LOP days, professional tax and net payable per employee for a month.",
    icon: IndianRupee,
    monthly: true,
  },
];

function currentMonth(): string {
  return new Date().toISOString().slice(0, 7);
}

export default function ReportsPage() {
  const [month, setMonth] = useState(currentMonth);
  const [downloading, setDownloading] = useState<string | null>(null);

  const handleDownload = async (report: ReportDefinition, format: "xlsx" | "pdf") => {
    const key = `${report.id}-${format}`;
    setDownloading(key);
    try {
      const params = new URLSearchParams({ format });
      if (report.monthly) params.set("month", month);
      const res = await fetch(`/api/reports/${report.id}?${params.toString()}`);
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? "Report failed");
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${report.id}-${getTodayString()}.${format}`;
      link.click();
      URL.revokeObjectURL(url);
      toast.success(`${report.title} downloaded`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Download failed");
    } finally {
      setDownloading(null);
    }
  };

  return (
    <DashboardGate allowedRoles={["HR"]}>
      <PageWrapper
        title="Report center"
        filters={
          <div className="flex items-center gap-2">
            <label htmlFor="report-month" className="text-sm text-muted-foreground">
              Month
            </label>
            <Input
              id="report-month"
              type="month"
              value={month}
              onChange={(e) => {
                if (e.target.value) setMonth(e.target.value);
              }}
              className="w-44 tabular-nums"
            />
          </div>
        }
      >
        <div className="grid grid-cols-12 gap-4 xl:gap-6">
          {REPORTS.map((report) => (
            <Card key={report.id} className="col-span-12 gap-4 p-5 md:col-span-6">
              <div className="flex items-start gap-3">
                <IconChip icon={report.icon} tone="neutral" />
                <div className="min-w-0">
                  <h2 className="font-sans text-base font-semibold tracking-normal text-foreground">
                    {report.title}
                  </h2>
                  <p className="mt-0.5 text-sm text-muted-foreground">{report.description}</p>
                  {report.monthly && (
                    <p className="mt-1 text-xs text-muted-foreground">Covers {month}.</p>
                  )}
                </div>
              </div>
              <div className="mt-auto flex flex-wrap gap-2 border-t border-border pt-4">
                {(["xlsx", "pdf"] as const).map((format) => {
                  const busy = downloading === `${report.id}-${format}`;
                  return (
                    <Button
                      key={format}
                      size="sm"
                      variant="outline"
                      loading={busy}
                      onClick={() => void handleDownload(report, format)}
                    >
                      {!busy && <Download aria-hidden="true" />}
                      {format.toUpperCase()}
                    </Button>
                  );
                })}
              </div>
            </Card>
          ))}
        </div>
      </PageWrapper>
    </DashboardGate>
  );
}
