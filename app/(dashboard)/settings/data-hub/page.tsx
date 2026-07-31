"use client";

import { useState, useCallback, useRef } from "react";
import { motion } from "framer-motion";
import {
  Upload, Download, FileSpreadsheet, Users, Handshake, Contact2,
  Building2, CreditCard, Package, CheckCircle2, AlertCircle, Loader2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { DashboardGate } from "@/components/shared/dashboard-gate";
import { staggerContainer, fadeUp } from "@/lib/motion-variants";
import { apiClient } from "@/lib/api-client";
import { toast } from "sonner";

interface ImportEntity {
  id: string;
  label: string;
  icon: React.ElementType;
  description: string;
  templateUrl?: string;
  importEndpoint?: string;
  exportEndpoint?: string;
  color: string;
  supported: { import: boolean; export: boolean };
}

const ENTITIES: ImportEntity[] = [
  {
    id: "leads",
    label: "Leads",
    icon: Contact2,
    description: "Import leads from CSV/XLSX. Auto-detect columns, assign to reps.",
    templateUrl: "/templates/leads-template.xlsx",
    importEndpoint: "/leads/import",
    exportEndpoint: "/leads/export",
    color: "text-blue-400",
    supported: { import: true, export: true },
  },
  {
    id: "contacts",
    label: "Contacts",
    icon: Users,
    description: "Bulk import CRM contacts with phone, email, and organization.",
    importEndpoint: "/contacts/import",
    exportEndpoint: "/contacts/export",
    color: "text-emerald-400",
    supported: { import: false, export: true },
  },
  {
    id: "deals",
    label: "Deals",
    icon: Handshake,
    description: "Export deal pipeline with stage, value, probability, and close dates.",
    exportEndpoint: "/deals/export",
    color: "text-amber-400",
    supported: { import: false, export: true },
  },
  {
    id: "employees",
    label: "Employees",
    icon: Users,
    description: "Export employee directory with roles, departments, and contact info.",
    exportEndpoint: "/hr/employees/export",
    color: "text-purple-400",
    supported: { import: false, export: true },
  },
  {
    id: "payroll",
    label: "Payroll",
    icon: CreditCard,
    description: "Export payroll records with breakdown, deductions, and net pay.",
    exportEndpoint: "/hr/payroll/export",
    color: "text-gold",
    supported: { import: false, export: true },
  },
  {
    id: "expenses",
    label: "Expenses",
    icon: FileSpreadsheet,
    description: "Export expense claims with status, category, and amounts.",
    exportEndpoint: "/hr/expenses/export",
    color: "text-cyan-400",
    supported: { import: false, export: true },
  },
  {
    id: "clients",
    label: "Clients",
    icon: Building2,
    description: "Export client accounts with health score and activity data.",
    exportEndpoint: "/clients/export",
    color: "text-rose-400",
    supported: { import: false, export: true },
  },
  {
    id: "assets",
    label: "Assets",
    icon: Package,
    description: "Export asset inventory with assigned employees and status.",
    exportEndpoint: "/hr/assets/export",
    color: "text-slate-400",
    supported: { import: false, export: true },
  },
];

interface UploadState {
  status: "idle" | "uploading" | "success" | "error";
  progress: number;
  message: string;
}

export default function DataHubPage() {
  return (
    <DashboardGate allowedRoles={["CEO", "HR"]}>
      <DataHubContent />
    </DashboardGate>
  );
}

function DataHubContent() {
  const [uploadStates, setUploadStates] = useState<Record<string, UploadState>>({});
  const [exportingIds, setExportingIds] = useState<Set<string>>(new Set());
  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const setUploadState = useCallback((id: string, state: Partial<UploadState>) => {
    setUploadStates(prev => ({
      ...prev,
      [id]: { ...(prev[id] ?? { status: "idle", progress: 0, message: "" }), ...state },
    }));
  }, []);

  const handleImportClick = useCallback((id: string) => {
    fileRefs.current[id]?.click();
  }, []);

  const handleFileChange = useCallback(async (entityId: string, endpoint: string, file: File) => {
    setUploadState(entityId, { status: "uploading", progress: 10, message: "Uploading..." });

    const formData = new FormData();
    formData.append("file", file);

    try {
      setUploadState(entityId, { progress: 40 });
      const result = await apiClient.post<{ imported: number; skipped: number; errors: string[] }>(
        endpoint,
        formData as unknown as Record<string, unknown>
      );
      setUploadState(entityId, {
        status: "success",
        progress: 100,
        message: `Imported ${result.imported} records${result.skipped > 0 ? `, ${result.skipped} skipped` : ""}`,
      });
      toast.success(`${result.imported} records imported`);
      setTimeout(() => setUploadState(entityId, { status: "idle", progress: 0, message: "" }), 4000);
    } catch {
      setUploadState(entityId, { status: "error", progress: 0, message: "Import failed. Check the file format." });
      toast.error("Import failed");
      setTimeout(() => setUploadState(entityId, { status: "idle", progress: 0, message: "" }), 4000);
    }
  }, [setUploadState]);

  const handleExport = useCallback(async (entity: ImportEntity) => {
    if (!entity.exportEndpoint) return;
    setExportingIds(prev => new Set([...prev, entity.id]));
    try {
      const response = await fetch(`/api${entity.exportEndpoint}`, { method: "GET" });
      if (!response.ok) throw new Error("Export failed");
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${entity.id}-export-${new Date().toISOString().split("T")[0]}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`${entity.label} export downloaded`);
    } catch {
      toast.error(`Failed to export ${entity.label}`);
    } finally {
      setExportingIds(prev => { const n = new Set(prev); n.delete(entity.id); return n; });
    }
  }, []);

  return (
    <PageWrapper
      title="Data Import / Export Hub"
      subtitle="Centralized hub for importing data into and exporting data from the platform"
    >
      <motion.div
        className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
      >
        {ENTITIES.map(entity => {
          const upload = uploadStates[entity.id] ?? { status: "idle", progress: 0, message: "" };
          const isExporting = exportingIds.has(entity.id);

          return (
            <motion.div key={entity.id} variants={fadeUp}>
              <Card className="shadow-noir h-full flex flex-col">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <entity.icon className={`h-5 w-5 ${entity.color}`} />
                      <CardTitle className="text-sm">{entity.label}</CardTitle>
                    </div>
                    <div className="flex gap-1">
                      {entity.supported.import && (
                        <Badge variant="secondary" className="text-[9px] px-1">Import</Badge>
                      )}
                      {entity.supported.export && (
                        <Badge variant="outline" className="text-[9px] px-1">Export</Badge>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col gap-3">
                  <p className="text-xs text-muted-foreground flex-1">{entity.description}</p>

                  {upload.status !== "idle" && (
                    <div className="space-y-1.5">
                      {upload.status === "uploading" && (
                        <Progress value={upload.progress} className="h-1.5" />
                      )}
                      <div className={`flex items-center gap-1.5 text-xs ${
                        upload.status === "success" ? "text-emerald-400" :
                        upload.status === "error" ? "text-red-400" : "text-muted-foreground"
                      }`}>
                        {upload.status === "uploading" && <Loader2 className="h-3 w-3 animate-spin" />}
                        {upload.status === "success" && <CheckCircle2 className="h-3 w-3" />}
                        {upload.status === "error" && <AlertCircle className="h-3 w-3" />}
                        {upload.message}
                      </div>
                    </div>
                  )}

                  <div className="flex gap-2">
                    {entity.supported.import && entity.importEndpoint && (
                      <>
                        <input
                          ref={el => { fileRefs.current[entity.id] = el; }}
                          type="file"
                          accept=".csv,.xlsx,.xls"
                          className="hidden"
                          onChange={e => {
                            const file = e.target.files?.[0];
                            if (file && entity.importEndpoint) {
                              handleFileChange(entity.id, entity.importEndpoint, file);
                            }
                            e.target.value = "";
                          }}
                          aria-label={`Import ${entity.label}`}
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1 text-xs h-8"
                          onClick={() => handleImportClick(entity.id)}
                          disabled={upload.status === "uploading"}
                        >
                          {upload.status === "uploading"
                            ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            : <Upload className="h-3.5 w-3.5 mr-1" />}
                          Import
                        </Button>
                      </>
                    )}
                    {entity.supported.export && entity.exportEndpoint && (
                      <Button
                        variant="outline"
                        size="sm"
                        className={`text-xs h-8 ${entity.supported.import ? "flex-1" : "w-full"}`}
                        onClick={() => handleExport(entity)}
                        disabled={isExporting}
                      >
                        {isExporting
                          ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                          : <Download className="h-3.5 w-3.5 mr-1" />}
                        Export
                      </Button>
                    )}
                  </div>

                  {entity.templateUrl && (
                    <a
                      href={entity.templateUrl}
                      download
                      className="text-[10px] text-muted-foreground hover:text-gold transition-colors flex items-center gap-1"
                    >
                      <FileSpreadsheet className="h-3 w-3" />
                      Download template
                    </a>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </motion.div>
    </PageWrapper>
  );
}
