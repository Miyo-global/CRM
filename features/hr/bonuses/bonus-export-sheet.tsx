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
import { downloadXlsx } from "@/lib/export/xlsx-utils";
import { buildBonusXlsxSheets } from "@/lib/hr/bonus-export";
import { buildBonusScopeLabel, bonusExportFilename, type BonusListFilters } from "@/lib/hr/bonus-filters";
import type { BonusRow } from "@/lib/hr/bonus-filters";
import {
  ExportMailFields,
  useExportMailPeople,
  useExportMailRecipients,
} from "@/components/hr/export-mail-form";

export interface BonusExportSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultTab?: "download" | "email";
  filters: BonusListFilters;
  rows: BonusRow[];
  canEmailExport: boolean;
}

export function BonusExportSheet({
  open,
  onOpenChange,
  defaultTab = "download",
  filters,
  rows,
  canEmailExport,
}: BonusExportSheetProps) {
  const [tab, setTab] = useState<"download" | "email">(defaultTab);
  const [downloading, setDownloading] = useState(false);
  const [sending, setSending] = useState(false);
  const { people, hrEmails, ceoEmails } = useExportMailPeople();
  const mail = useExportMailRecipients();
  const resetMail = mail.reset;

  const scopeLabel = useMemo(() => buildBonusScopeLabel(filters), [filters]);
  const rowCount = rows.length;
  const hasRows = rowCount > 0;

  useEffect(() => {
    if (!open) return;
    setTab(defaultTab);
    resetMail();
  }, [open, defaultTab, resetMail]);

  const buildEmailBody = useCallback(() => {
    const body: Record<string, unknown> = {
      search: filters.search.trim() || undefined,
      status: filters.status,
      type: filters.type,
      userId: filters.userId,
      dateFrom: filters.dateFrom || undefined,
      dateTo: filters.dateTo || undefined,
    };
    return body;
  }, [filters]);

  const handleDownload = async () => {
    if (!hasRows) {
      toast.error("No records match the current filters.");
      return;
    }
    setDownloading(true);
    try {
      await downloadXlsx(bonusExportFilename(), buildBonusXlsxSheets(rows));
      toast.success("Bonus report exported", {
        description: `${rowCount} record${rowCount === 1 ? "" : "s"} downloaded`,
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
      const res = await fetch("/api/hr/bonuses/export/email", {
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
      toast.success("Bonus report sent", {
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
          <SheetTitle>Export bonus report</SheetTitle>
          <SheetDescription>
            Download or email bonuses matching the current filters.
          </SheetDescription>
        </SheetHeader>

        <div className="mt-4 flex flex-1 flex-col gap-4 px-1 pb-6">
          <div className="rounded-lg border bg-muted/30 p-3 text-sm">
            <p className="mb-1 text-sm font-medium">Current filters</p>
            <p className="text-xs text-muted-foreground">{scopeLabel}</p>
            <p className="mt-2 text-xs font-medium text-foreground">
              {hasRows
                ? `${rowCount} record${rowCount === 1 ? "" : "s"} in this export.`
                : "No records match the current filters."}
            </p>
          </div>

          <Tabs value={tab} onValueChange={(v) => setTab(v as "download" | "email")} className="flex-1">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="download" className="gap-1.5">
                <Download className="h-3.5 w-3.5" />
                Download
              </TabsTrigger>
              <TabsTrigger value="email" className="gap-1.5" disabled={!canEmailExport}>
                <Mail className="h-3.5 w-3.5" />
                Send mail
              </TabsTrigger>
            </TabsList>

            <TabsContent value="download" className="mt-4 space-y-3">
              <p className="text-xs text-muted-foreground">
                Exports employee, type, amount, status, reason, and created date for each bonus.
              </p>
              <Button className="w-full gap-2" onClick={() => void handleDownload()} disabled={downloading || !hasRows}>
                {downloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                {hasRows ? `Download Excel (${rowCount})` : "Download Excel"}
              </Button>
            </TabsContent>

            <TabsContent value="email" className="mt-4">
              {!canEmailExport ? (
                <p className="text-sm text-muted-foreground">Only bonus managers can email bonus reports.</p>
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
                  subjectPlaceholder={`Default: Bonus report – ${scopeLabel}`}
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
