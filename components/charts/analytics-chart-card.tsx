"use client";

import { useCallback } from "react";
import { Download } from "lucide-react";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { fadeUp } from "@/lib/motion-variants";

async function downloadXLSX(data: Record<string, unknown>[], filename: string) {
  if (data.length === 0) return;
  const ExcelJS = (await import("exceljs")).default;
  const workbook = new ExcelJS.Workbook();
  const ws = workbook.addWorksheet("Data");
  const headers = Object.keys(data[0]);
  ws.columns = headers.map((h) => ({ header: h, key: h, width: Math.max(h.length + 4, 12) }));
  ws.getRow(1).font = { bold: true };
  for (const row of data) {
    ws.addRow(headers.map((h) => row[h] ?? ""));
  }
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${filename}.xlsx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

interface AnalyticsChartCardProps {
  title: string;
  data: Record<string, unknown>[];
  filename: string;
  children: React.ReactNode;
  subtitle?: React.ReactNode;
  /** Legend chips row under the header. */
  legend?: React.ReactNode;
  /** Extra header controls (e.g. period select), left of the download button. */
  actions?: React.ReactNode;
  /** Accessible chart description; defaults to `title`. */
  ariaLabel?: string;
  /** Body classes; default reserves 280px (`min-h-70`). */
  bodyClassName?: string;
}

/** Single analytics chart shell (§6.2): title, subtitle, legend, actions + XLSX download, 280px body. */
export function AnalyticsChartCard({
  title,
  data,
  filename,
  children,
  subtitle,
  legend,
  actions,
  ariaLabel,
  bodyClassName,
}: AnalyticsChartCardProps) {
  const handleDownload = useCallback(() => downloadXLSX(data, filename), [data, filename]);
  return (
    <motion.div variants={fadeUp} className="h-full">
      <Card className="h-full">
        <div className="flex items-start gap-3 px-5 pt-5 pb-3">
          <div className="min-w-0 flex-1">
            <h3 className="truncate font-sans text-sm font-semibold tracking-normal">{title}</h3>
            {subtitle && <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>}
          </div>
          <div className="flex shrink-0 items-center gap-1">
            {actions}
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={handleDownload}
              disabled={data.length === 0}
              aria-label={`Download ${title} as Excel`}
            >
              <Download className="size-3.5" />
            </Button>
          </div>
        </div>
        {legend && <div className="flex flex-wrap items-center gap-2 px-5 pb-3">{legend}</div>}
        <div className="flex-1 px-5 pb-5">
          <div role="img" aria-label={ariaLabel ?? title} className={cn("min-h-70", bodyClassName)}>
            {children}
          </div>
        </div>
      </Card>
    </motion.div>
  );
}
