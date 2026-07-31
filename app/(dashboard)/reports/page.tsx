"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { FileSpreadsheet, FileText, Download, Loader2 } from "lucide-react";
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
      title="Report Center"
      subtitle="Generate and download Excel and PDF reports"
    >
      <div className="grid gap-4 md:grid-cols-2">
        {REPORTS.map(report => (
          <Card key={report.id}>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
                  <report.icon className="h-5 w-5 text-gold" />
                </div>
                <div>
                  <CardTitle className="text-sm">{report.title}</CardTitle>
                  <p className="text-xs text-muted-foreground mt-0.5">{report.description}</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pb-4">
              <div className="flex gap-2">
                {report.formats.map(format => (
                  <Button
                    key={format}
                    size="sm"
                    variant="outline"
                    disabled={downloading === `${report.id}-${format}`}
                    onClick={() => handleDownload(report.id, format)}
                  >
                    {downloading === `${report.id}-${format}` ? (
                      <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                    ) : (
                      <Download className="h-3.5 w-3.5 mr-1" />
                    )}
                    {format.toUpperCase()}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </PageWrapper>
    </DashboardGate>
  );
}
