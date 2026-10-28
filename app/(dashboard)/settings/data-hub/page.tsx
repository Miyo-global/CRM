"use client";

import Link from "next/link";
import { useState, useCallback } from "react";
import { Download, FileSpreadsheet, Users, CreditCard, Package } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { DashboardGate } from "@/components/shared/dashboard-gate";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { toast } from "sonner";
import { getTodayString } from "@/lib/date-utils";

interface ExportEntity {
  id: string;
  label: string;
  icon: React.ElementType;
  description: string;
  exportEndpoint: string;
  color: string;
}

const ENTITIES: ExportEntity[] = [
  {
    id: "employees",
    label: "Employees",
    icon: Users,
    description: "Export the employee directory with designation, department, role and status (Excel).",
    exportEndpoint: "/reports/headcount?format=xlsx",
    color: "text-plum-strong",
  },
  {
    id: "payroll",
    label: "Payroll",
    icon: CreditCard,
    description: "Export this month\u2019s payroll with gross, LOP days, professional tax and net pay (Excel).",
    exportEndpoint: "/reports/payroll-summary?format=xlsx",
    color: "text-brand-text",
  },
  {
    id: "expenses",
    label: "Expenses",
    icon: FileSpreadsheet,
    description: "Export expense claims with status, category, and amounts (CSV).",
    exportEndpoint: "/hr/expenses/export",
    color: "text-teal-strong",
  },
  {
    id: "assets",
    label: "Assets",
    icon: Package,
    description: "Export asset inventory with assigned employees and status (CSV).",
    exportEndpoint: "/hr/assets/export",
    color: "text-subtle-foreground",
  },
];

export default function DataHubPage() {
  return (
    <DashboardGate allowedRoles={["CEO", "ADMIN"]}>
      <DataHubContent />
    </DashboardGate>
  );
}

function DataHubContent() {
  const [exportingIds, setExportingIds] = useState<Set<string>>(new Set());
  // Every card dumps personal or salary data, so each download is confirmed.
  const [confirmEntity, setConfirmEntity] = useState<ExportEntity | null>(null);

  const handleExport = useCallback(async (entity: ExportEntity) => {
    setExportingIds(prev => new Set([...prev, entity.id]));
    try {
      const response = await fetch(`/api${entity.exportEndpoint}`, { method: "GET" });
      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? "Export failed");
      }
      const blob = await response.blob();
      // The filename comes from the response, so a CSV export is not saved as
      // .xlsx and an employee export is not silently dropped (QA-0031).
      const disposition = response.headers.get("Content-Disposition") ?? "";
      const named = /filename="?([^";]+)"?/.exec(disposition)?.[1];
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = named ?? `${entity.id}-export-${getTodayString()}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`${entity.label} export downloaded`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : `Failed to export ${entity.label}`);
    } finally {
      setExportingIds(prev => { const n = new Set(prev); n.delete(entity.id); return n; });
    }
  }, []);

  return (
    // Nothing here imports, so the page says export (BUG-15, R2-SYS-05) and
    // points to the one bulk import that exists.
    <PageWrapper
      title="Data export"
      subtitle={
        <>
          Download HR records as Excel or CSV. To import expense claims, use{" "}
          <Link href="/hr/expenses" className="text-brand-text hover:underline">
            Expenses
          </Link>
          .
        </>
      }
    >
      <div
        className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
      >
        {ENTITIES.map(entity => {
          const isExporting = exportingIds.has(entity.id);

          return (
            <Card key={entity.id} className="h-full flex flex-col">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <span className={`flex size-9 shrink-0 items-center justify-center rounded-full bg-muted ${entity.color}`}>
                    <entity.icon className="size-4.5" aria-hidden />
                  </span>
                  <CardTitle className="text-sm">{entity.label}</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col gap-3">
                <p className="text-xs text-muted-foreground flex-1">{entity.description}</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => setConfirmEntity(entity)}
                  disabled={isExporting}
                  loading={isExporting}
                >
                  {!isExporting && <Download aria-hidden />}
                  Export
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
      <ConfirmDialog
        open={confirmEntity !== null}
        onOpenChange={(open) => {
          if (!open) setConfirmEntity(null);
        }}
        title={`Export ${confirmEntity?.label.toLowerCase() ?? ""}?`}
        description={`${confirmEntity?.description ?? ""} The file holds employee data; store and share it accordingly.`}
        confirmLabel="Export"
        onConfirm={() => {
          if (confirmEntity) void handleExport(confirmEntity);
          setConfirmEntity(null);
        }}
      />
    </PageWrapper>
  );
}
