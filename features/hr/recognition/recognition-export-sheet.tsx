"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Download, Loader2, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import type { RecognitionExportFilters } from "@/lib/hr/recognition-export-filters";
import {
  buildRecognitionScopeLabel,
} from "@/lib/hr/recognition-export-filters";
import {
  ExportMailFields,
  useExportMailPeople,
  useExportMailRecipients,
} from "@/components/hr/export-mail-form";

export interface RecognitionExportSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultTab?: "download" | "email";
  filters: RecognitionExportFilters;
  rowCount: number;
  canEmailExport: boolean;
  onDownloadCsv: () => void;
}

export function RecognitionExportSheet({
  open,
  onOpenChange,
  defaultTab = "download",
  filters,
  rowCount,
  canEmailExport,
  onDownloadCsv,
}: RecognitionExportSheetProps) {
  const [tab, setTab] = useState<"download" | "email">(defaultTab);
  const [downloading, setDownloading] = useState(false);
  const [sending, setSending] = useState(false);
  const { people, hrEmails, ceoEmails } = useExportMailPeople();
  const mail = useExportMailRecipients();
  const resetMail = mail.reset;

  const scopeLabel = useMemo(() => buildRecognitionScopeLabel(filters), [filters]);
  const hasRows = rowCount > 0;

  useEffect(() => {
    if (!open) return;
    setTab(defaultTab);
    resetMail();
  }, [open, defaultTab, resetMail]);

  const buildEmailBody = useCallback(() => {
    const body: Record<string, unknown> = { ...filters };
    if (!body.dateFrom) delete body.dateFrom;
    if (!body.dateTo) delete body.dateTo;
    if (typeof body.searchQuery === "string" && !body.searchQuery.trim()) delete body.searchQuery;
    return body;
  }, [filters]);

  const handleDownload = () => {
    if (!hasRows) {
      toast.error("No records match the current filters.");
      return;
    }
    setDownloading(true);
    try {
      onDownloadCsv();
      toast.success("Recognition history exported", {
        description: `${rowCount} record(s) downloaded`,
      });
      onOpenChange(false);
    } catch {
      toast.error("Export failed");
    } finally {
      setDownloading(false);
    }
  };

  const handleSendEmail = async () => {
    if (!hasRows) {
      toast.error("No records match the current filters.");
      return;
    }
    const err = mail.validateRecipients();
    if (err) {
      toast.error(err);
      return;
    }
    setSending(true);
    try {
      const res = await fetch("/api/hr/recognition/export/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          ...buildEmailBody(),
          to: mail.to,
          cc: mail.cc.length ? mail.cc : undefined,
          bcc: mail.bcc.length ? mail.bcc : undefined,
          subject: mail.subject.trim() || undefined,
          message: mail.message.trim() || undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((data as { error?: string }).error ?? "Failed to send");
      const payload = data as { records?: number };
      toast.success("Recognition report sent", {
        description: `CSV attached · ${payload.records ?? rowCount} record(s)`,
      });
      onOpenChange(false);
    } catch (e) {
      toast.error(getErrorMessage(e));
    } finally {
      setSending(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-full flex-col gap-0 overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>Export recognition history</SheetTitle>
          <SheetDescription>
            Download or email a CSV of the filtered recognition records from the history tab.
          </SheetDescription>
        </SheetHeader>

        <div className="mt-4 flex flex-1 flex-col gap-4 px-1 pb-6">
          <div className="rounded-lg border bg-muted/30 p-3 text-sm">
            <p className="font-medium text-sm mb-1">Current filters</p>
            <p className="text-xs text-muted-foreground">{scopeLabel}</p>
            <p className="text-xs font-medium text-foreground mt-2">
              {hasRows
                ? `${rowCount} record${rowCount === 1 ? "" : "s"} in this export.`
                : "No records match the current filters."}
            </p>
          </div>

          <Tabs value={tab} onValueChange={(v) => setTab(v as "download" | "email")} className="flex-1">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="download" className="gap-1.5">
                <Download className="h-3.5 w-3.5" />
                Download CSV
              </TabsTrigger>
              <TabsTrigger value="email" className="gap-1.5" disabled={!canEmailExport}>
                <Mail className="h-3.5 w-3.5" />
                Send mail
              </TabsTrigger>
            </TabsList>

            <TabsContent value="download" className="mt-4 space-y-3">
              <p className="text-xs text-muted-foreground">
                Exports date, people, department, category, and message for each recognition in the current view.
              </p>
              <Button
                className="w-full gap-2"
                onClick={handleDownload}
                disabled={downloading || !hasRows}
              >
                {downloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                {hasRows ? `Download CSV (${rowCount})` : "Download CSV"}
              </Button>
            </TabsContent>

            <TabsContent value="email" className="mt-4">
              {!canEmailExport ? (
                <p className="text-sm text-muted-foreground">Only CEO, HR, or Admin can email recognition reports.</p>
              ) : (
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
                  subjectPlaceholder={`Default: Recognition history – ${scopeLabel}`}
                  sendLabel="Send email with CSV"
                  sending={sending}
                  sendDisabled={!hasRows}
                  onSend={() => void handleSendEmail()}
                />
              )}
            </TabsContent>
          </Tabs>
        </div>
      </SheetContent>
    </Sheet>
  );
}
