"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { IconChip } from "@/components/ui/icon-chip";
import { Button } from "@/components/ui/button";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { FileSpreadsheet, FileText, Download } from "lucide-react";
import { toast } from "sonner";
import { DashboardGate } from "@/components/shared/dashboard-gate";

const REPORTS = [
  {
    id: "sales-performance",
    title: "Sales Performance Report",
    description: "Monthly sales rep performance with leads, conversions, and revenue",
    formats: ["xlsx", "pdf"],
    icon: FileSpreadsheet,
  },
  {
    id: "campaign-roi",
    title: "Campaign ROI Report",
    description: "Campaign budget vs spend, leads generated, and cost per lead",
    formats: ["xlsx"],
    icon: FileSpreadsheet,
  },
  {
    id: "incentive-summary",
    title: "Incentive Summary",
    description: "All incentives with status, amounts, and approval details",
    formats: ["xlsx"],
    icon: FileSpreadsheet,
  },
  {
    id: "target-achievement",
    title: "Target Achievement Report",
    description: "Target vs actual performance with visual progress indicators",
    formats: ["pdf"],
    icon: FileText,
  },
];

export default function ReportsPage() {
  const [downloading, setDownloading] = useState<string | null>(null);

  const handleDownload = async (reportId: string, format: string) => {
    setDownloading(`${reportId}-${format}`);
    try {

      if (format === "xlsx") {
        const { downloadXlsx } = await import("@/lib/export/xlsx-utils");
        if (reportId === "sales-performance") {
          await downloadXlsx("sales-performance.xlsx", [{
            name: "Sales Performance",
            columns: [
              { header: "Sales Rep", key: "name", width: 20 },
              { header: "Leads Assigned", key: "leadsAssigned", width: 15 },
              { header: "Leads Converted", key: "leadsConverted", width: 15 },
              { header: "Conversion Rate (%)", key: "conversionRate", width: 18 },
              { header: "Revenue", key: "totalRevenue", width: 18 },
            ],
            rows: [{ name: "Sample", leadsAssigned: 0, leadsConverted: 0, conversionRate: 0, totalRevenue: 0 }],
          }]);
        } else if (reportId === "campaign-roi") {
          await downloadXlsx("campaign-roi.xlsx", [{
            name: "Campaign ROI",
            columns: [
              { header: "Campaign", key: "name", width: 25 },
              { header: "Status", key: "status", width: 12 },
              { header: "Budget", key: "budget", width: 15 },
              { header: "Spent", key: "spent", width: 15 },
              { header: "Leads", key: "leads", width: 10 },
            ],
            rows: [],
          }]);
        } else if (reportId === "incentive-summary") {
          await downloadXlsx("incentive-summary.xlsx", [{
            name: "Incentives",
            columns: [
              { header: "Sales Rep", key: "salesRep", width: 20 },
              { header: "Client", key: "client", width: 20 },
              { header: "Investment", key: "investment", width: 15 },
              { header: "Status", key: "status", width: 12 },
            ],
            rows: [],
          }]);
        }
        toast.success("Report downloaded");
      } else if (format === "pdf") {
        toast.info("PDF report generation — connect to live data for actual reports");
      }
    } catch {
      toast.error("Download failed");
    } finally {
      setDownloading(null);
    }
  };

  return (
    <DashboardGate allowedRoles={["HR", "SALES"]}>
    <PageWrapper
      title="Report center"
    >
      <div className="grid grid-cols-12 gap-4 xl:gap-6">
        {REPORTS.map(report => (
          <Card key={report.id} className="col-span-12 gap-4 p-5 md:col-span-6">
            <div className="flex items-start gap-3">
              <IconChip icon={report.icon} tone={report.formats.includes("xlsx") ? "success" : "danger"} />
              <div className="min-w-0">
                <h2 className="font-sans text-base font-semibold tracking-normal text-foreground">{report.title}</h2>
                <p className="mt-0.5 text-sm text-muted-foreground">{report.description}</p>
              </div>
            </div>
            <div className="mt-auto flex flex-wrap gap-2 border-t border-border pt-4">
              {report.formats.map(format => {
                const busy = downloading === `${report.id}-${format}`;
                return (
                  <Button
                    key={format}
                    size="sm"
                    variant="outline"
                    loading={busy}
                    onClick={() => handleDownload(report.id, format)}
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
