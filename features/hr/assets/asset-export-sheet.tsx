"use client";

import { useCallback, useState } from "react";
import {
  Download,
  FileSpreadsheet,
  File as FileIcon,
  Loader2,
  Mail,
  Layers,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { getErrorMessage } from "@/lib/get-error-message";
import { assetsStatusLabel } from "@/lib/hr/assets-export-filters";
import {
  ExportMailFields,
  useExportMailPeople,
  useExportMailRecipients,
} from "@/components/hr/export-mail-form";

type ExportFormat = "csv" | "xlsx";

const FORMAT_OPTIONS: {
  value: ExportFormat;
  label: string;
  description: string;
  icon: LucideIcon;
}[] = [
  {
    value: "csv",
    label: "CSV",
    description: "Comma-separated values — works in Excel, Sheets, and CRM tools",
    icon: FileIcon,
  },
  {
    value: "xlsx",
    label: "Excel (XLSX)",
    description: "Formatted spreadsheet with columns sized for printing",
    icon: FileSpreadsheet,
  },
];

export interface AssetExportSheetProps {
  statusFilter: string | undefined;
  onStatusFilterChange: (v: string | undefined) => void;
  rowCount: number;
  onExportCsv: () => void;
  onExportXlsx: () => void | Promise<void>;
}

export function AssetExportSheet({
  statusFilter,
  onStatusFilterChange,
  rowCount,
  onExportCsv,
  onExportXlsx,
}: AssetExportSheetProps) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"download" | "email">("download");
  const [format, setFormat] = useState<ExportFormat>("xlsx");
  const [isExporting, setIsExporting] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const { people, hrEmails, ceoEmails } = useExportMailPeople();
  const mail = useExportMailRecipients();

  const statusLabel = assetsStatusLabel(statusFilter);
  const hasRows = rowCount > 0;

  const resetState = useCallback(() => {
    setTab("download");
    setFormat("xlsx");
    mail.reset();
  }, [mail]);

  const handleOpenChange = (v: boolean) => {
    setOpen(v);
    if (v) resetState();
  };

  const handleDownload = async () => {
    if (!hasRows) {
      toast.error("No assets in the current view to export.");
      return;
    }
    setIsExporting(true);
    try {
      if (format === "csv") onExportCsv();
      else await onExportXlsx();
      toast.success("Export downloaded successfully!");
      setOpen(false);
    } catch {
      toast.error("Export failed");
    } finally {
      setIsExporting(false);
    }
  };

  const handleSendEmail = async () => {
    if (!hasRows) {
      toast.error("No assets in the current view to export.");
      return;
    }
    const err = mail.validateRecipients();
    if (err) {
      toast.error(err);
      return;
    }
    setIsSending(true);
    try {
      const res = await fetch("/api/hr/assets/export/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          format,
          ...(statusFilter && ["AVAILABLE", "ASSIGNED", "MAINTENANCE", "RETIRED"].includes(statusFilter)
            ? { status: statusFilter }
            : {}),
          to: mail.to,
          cc: mail.cc.length ? mail.cc : undefined,
          bcc: mail.bcc.length ? mail.bcc : undefined,
          subject: mail.subject.trim() || undefined,
          message: mail.message.trim() || undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((data as { error?: string }).error ?? "Failed to send");
      const payload = data as { sentTo?: number; rowCount?: number; format?: string };
      toast.success("Assets export sent", {
        description: `${(payload.format ?? format).toUpperCase()} attached · ${payload.rowCount ?? rowCount} row(s) · ${payload.sentTo ?? mail.to.length} recipient(s)`,
      });
      setOpen(false);
    } catch (e) {
      toast.error(getErrorMessage(e));
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" type="button" className="gap-2">
          <Download className="h-3.5 w-3.5" />
          Export
        </Button>
      </SheetTrigger>

      <SheetContent className="flex w-full flex-col gap-0 overflow-y-auto sm:max-w-lg p-6">
        <SheetHeader className="mb-4 shrink-0">
          <SheetTitle className="text-xl font-semibold flex items-center gap-2">
            <Download className="h-5 w-5 text-primary" />
            Export assets
          </SheetTitle>
          <SheetDescription>
            Download or email the inventory export with To, CC, and BCC recipients.
          </SheetDescription>
        </SheetHeader>

        <div className="flex flex-1 flex-col gap-4">
          <div className="space-y-2">
            <Label className="text-sm font-medium flex items-center gap-1.5">
              <Layers className="h-3.5 w-3.5 text-muted-foreground" />
              Inventory scope
            </Label>
            <Select
              value={statusFilter ?? "all"}
              onValueChange={(v) => onStatusFilterChange(v === "all" ? undefined : v)}
            >
              <SelectTrigger className="h-10">
                <SelectValue placeholder="All assets" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All assets</SelectItem>
                <SelectItem value="AVAILABLE">Available</SelectItem>
                <SelectItem value="ASSIGNED">Assigned</SelectItem>
                <SelectItem value="MAINTENANCE">Maintenance</SelectItem>
                <SelectItem value="RETIRED">Retired</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              <strong>{rowCount}</strong> row{rowCount === 1 ? "" : "s"} · Status: {statusLabel}
            </p>
          </div>

          <div className="space-y-3">
            <Label className="text-sm font-medium">Export format</Label>
            <RadioGroup
              value={format}
              onValueChange={(v) => setFormat(v as ExportFormat)}
              className="grid gap-3"
            >
              {FORMAT_OPTIONS.map((option) => (
                <label
                  key={option.value}
                  className={cn(
                    "flex items-start gap-3 p-4 border rounded-lg cursor-pointer transition-colors hover:bg-muted/50",
                    format === option.value ? "border-primary bg-primary/5" : "border-border",
                  )}
                >
                  <RadioGroupItem value={option.value} className="mt-0.5" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <option.icon className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium text-sm">{option.label}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{option.description}</p>
                  </div>
                </label>
              ))}
            </RadioGroup>
          </div>

          <Tabs value={tab} onValueChange={(v) => setTab(v as "download" | "email")} className="flex-1">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="download" className="gap-1.5">
                <Download className="h-3.5 w-3.5" />
                Download
              </TabsTrigger>
              <TabsTrigger value="email" className="gap-1.5">
                <Mail className="h-3.5 w-3.5" />
                Send mail
              </TabsTrigger>
            </TabsList>

            <TabsContent value="download" className="mt-4 space-y-3">
              <p className="text-xs text-muted-foreground">
                Downloads {format === "csv" ? "CSV" : "Excel"} for the selected inventory scope.
              </p>
              <Button
                className="w-full gap-2"
                onClick={() => void handleDownload()}
                disabled={isExporting || isSending || !hasRows}
              >
                {isExporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                Download {format === "csv" ? "CSV" : "Excel"}
              </Button>
            </TabsContent>

            <TabsContent value="email" className="mt-4">
              <ExportMailFields
                people={people}
                hrEmails={hrEmails}
                ceoEmails={ceoEmails}
                to={mail.to}
                cc={mail.cc}
                bcc={mail.bcc}
                subject={mail.subject}
                message={mail.message}
                onToChange={mail.setTo}
                onCcChange={mail.setCc}
                onBccChange={mail.setBcc}
                onSubjectChange={mail.setSubject}
                onMessageChange={mail.setMessage}
                onAddToRecipients={mail.addToRecipients}
                subjectPlaceholder={`Default: Assets export (${statusLabel})`}
                sendLabel={`Send email with ${format === "csv" ? "CSV" : "Excel"}`}
                sending={isSending}
                sendDisabled={isExporting || !hasRows}
                onSend={() => void handleSendEmail()}
              />
            </TabsContent>
          </Tabs>
        </div>
      </SheetContent>
    </Sheet>
  );
}
