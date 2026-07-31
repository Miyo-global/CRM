"use client";

import { useState, useCallback, useMemo } from "react";
import { Download, Loader2, Mail } from "lucide-react";
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
import { Input } from "@/components/ui/input";
import { SearchableCombobox } from "@/components/ui/searchable-combobox";
import { toast } from "sonner";
import { useHrEmployees } from "@/lib/api/hooks/hr";
import type { DocumentExportFilters } from "@/lib/hr/documents-export-filters";
import { formatDocumentExportLabel } from "@/lib/hr/documents-export-filters";
import { DOCUMENT_TYPES } from "@/features/hr/documents/document-filters";
import { getErrorMessage } from "@/lib/get-error-message";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Employee, Document } from "@/types/hr";
import {
  ExportMailFields,
  useExportMailPeople,
  useExportMailRecipients,
} from "@/components/hr/export-mail-form";

export interface DocumentExportSheetProps {
  isDocumentsAdmin: boolean;
  canEmailPack: boolean;
  initialType?: string;
  initialCategory?: string;
  documents?: Document[];
}

export function DocumentExportSheet({
  isDocumentsAdmin,
  canEmailPack,
  initialType,
  initialCategory,
  documents = [],
}: DocumentExportSheetProps) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"export" | "email">("export");
  const [type, setType] = useState<string>("");
  const [category, setCategory] = useState("");
  const [tag, setTag] = useState("");
  const [createdFrom, setCreatedFrom] = useState("");
  const [createdTo, setCreatedTo] = useState("");
  const [filterUserId, setFilterUserId] = useState<string>("");
  const [uploadedBy, setUploadedBy] = useState<string>("");
  const [exporting, setExporting] = useState(false);
  const [sending, setSending] = useState(false);

  const { people, hrEmails, ceoEmails } = useExportMailPeople();
  const mail = useExportMailRecipients();

  const { data: employees = [] } = useHrEmployees(undefined);

  const employeeList = useMemo(
    () =>
      (employees as Employee[]).map((e) => ({
        id: e.id,
        label: e.firstName ? `${e.firstName} ${e.lastName ?? ""}`.trim() : e.name ?? e.id,
      })),
    [employees],
  );

  const employeeOptions = useMemo(
    () => ["All employees", ...employeeList.map((e) => e.label)],
    [employeeList],
  );

  const uploadedByOptions = useMemo(
    () => ["Anyone", ...employeeList.map((e) => e.label)],
    [employeeList],
  );

  const selectedOwnerLabel =
    filterUserId
      ? employeeList.find((e) => e.id === filterUserId)?.label ?? "All employees"
      : "All employees";

  const selectedUploaderLabel =
    uploadedBy
      ? employeeList.find((e) => e.id === uploadedBy)?.label ?? "Anyone"
      : "Anyone";

  const typeOptions = useMemo(
    () => ["Any type", ...DOCUMENT_TYPES.map((t) => t.label)],
    [],
  );

  const selectedTypeLabel =
    type && type !== "all"
      ? DOCUMENT_TYPES.find((t) => t.value === type)?.label ?? "Any type"
      : "Any type";

  const handleTypeLabelChange = (label: string) => {
    if (label === "Any type") {
      setType("");
      return;
    }
    const match = DOCUMENT_TYPES.find((t) => t.label === label);
    setType(match?.value ?? "");
  };

  const buildFilters = useCallback((): DocumentExportFilters => {
    const f: DocumentExportFilters = {};
    if (type && type !== "all") {
      const t = DOCUMENT_TYPES.find((x) => x.value === type)?.value;
      if (t) f.type = t as DocumentExportFilters["type"];
    }
    if (category.trim()) f.category = category.trim();
    if (tag.trim()) f.tag = tag.trim();
    if (createdFrom) f.createdFrom = createdFrom;
    if (createdTo) f.createdTo = createdTo;
    if (isDocumentsAdmin && filterUserId) f.filterUserId = filterUserId;
    if (isDocumentsAdmin && uploadedBy) f.uploadedBy = uploadedBy;
    return f;
  }, [type, category, tag, createdFrom, createdTo, filterUserId, uploadedBy, isDocumentsAdmin]);

  const filterSummary = useMemo(() => formatDocumentExportLabel(buildFilters()), [buildFilters]);

  const matchCount = useMemo(() => {
    const f = buildFilters();
    const tagQ = f.tag?.toLowerCase();
    const catQ = f.category?.toLowerCase();
    return documents.filter((d) => {
      if (!d.fileUrl) return false;
      if (f.type && d.type !== f.type) return false;
      if (catQ && !(d.category?.toLowerCase().includes(catQ))) return false;
      if (tagQ && !(d.tags?.some((t) => t.toLowerCase().includes(tagQ)))) return false;
      if (f.filterUserId && d.userId !== f.filterUserId) return false;
      if (f.uploadedBy && d.uploadedBy !== f.uploadedBy) return false;
      if (f.createdFrom || f.createdTo) {
        if (!d.createdAt) return false;
        const day = new Date(d.createdAt).toISOString().slice(0, 10);
        if (f.createdFrom && day < f.createdFrom) return false;
        if (f.createdTo && day > f.createdTo) return false;
      }
      return true;
    }).length;
  }, [documents, buildFilters]);

  const hasMatches = matchCount > 0;

  const resetFromInitial = useCallback(() => {
    setType(initialType && initialType !== "all" ? initialType : "");
    setCategory(initialCategory && initialCategory !== "All Files" ? initialCategory : "");
    setTag("");
    setCreatedFrom("");
    setCreatedTo("");
    setFilterUserId("");
    setUploadedBy("");
    mail.reset();
    setTab("export");
  }, [initialType, initialCategory, mail]);

  const handleOpenChange = (v: boolean) => {
    setOpen(v);
    if (v) resetFromInitial();
  };

  const handleDownloadZip = async () => {
    if (createdFrom && createdTo && createdFrom > createdTo) {
      toast.error('"Created from" must be on or before "Created to"');
      return;
    }
    setExporting(true);
    try {
      const filters = buildFilters();
      const res = await fetch("/api/hr/documents/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(filters),
      });
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error((errBody as { error?: string }).error ?? res.statusText);
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `documents-export-${new Date().toISOString().slice(0, 10)}.zip`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      const inc = res.headers.get("X-Documents-Export-Count");
      const skip = res.headers.get("X-Documents-Export-Skipped");
      toast.success("Export downloaded", {
        description: `Included ${inc ?? "?"} file(s)${skip && skip !== "0" ? ` · skipped ${skip}` : ""}`,
      });
      setOpen(false);
    } catch (e) {
      toast.error(getErrorMessage(e));
    } finally {
      setExporting(false);
    }
  };

  const handleSendEmail = async () => {
    if (createdFrom && createdTo && createdFrom > createdTo) {
      toast.error('"Created from" must be on or before "Created to"');
      return;
    }
    const recipientError = mail.validateRecipients();
    if (recipientError) {
      toast.error(recipientError);
      return;
    }
    setSending(true);
    try {
      const filters = buildFilters();
      const res = await fetch("/api/hr/documents/export/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          ...filters,
          to: mail.to,
          cc: mail.cc.length ? mail.cc : undefined,
          bcc: mail.bcc.length ? mail.bcc : undefined,
          subject: mail.subject.trim() || undefined,
          message: mail.message.trim() || undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error((data as { error?: string }).error ?? "Failed to send");
      }
      const payload = data as { included?: number; skipped?: number };
      toast.success("Email sent", {
        description: `ZIP attached · ${payload.included ?? 0} file(s)`,
      });
      setOpen(false);
    } catch (e) {
      toast.error(getErrorMessage(e));
    } finally {
      setSending(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Download className="h-4 w-4" />
          <span className="hidden sm:inline">Export / Share</span>
          <span className="sm:hidden">Export</span>
        </Button>
      </SheetTrigger>
      <SheetContent className="flex w-full flex-col gap-0 overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>Export &amp; share documents</SheetTitle>
          <SheetDescription>
            Filter the library, download a ZIP of originals, or email a ZIP to selected recipients.
          </SheetDescription>
        </SheetHeader>

        <div className="mt-4 flex flex-1 flex-col gap-4 px-1 pb-6">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Document type</Label>
              <SearchableCombobox
                options={typeOptions}
                value={selectedTypeLabel}
                onValueChange={handleTypeLabelChange}
                placeholder="Any type"
                searchPlaceholder="Search types…"
                emptyMessage="No types found."
                aria-label="Export document type filter"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Category / folder (contains)</Label>
              <Input
                className="h-9"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="e.g. Employment"
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label className="text-xs">Tag (contains)</Label>
              <Input className="h-9" value={tag} onChange={(e) => setTag(e.target.value)} placeholder="e.g. tax" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Created from</Label>
              <Input className="h-9" type="date" value={createdFrom} onChange={(e) => setCreatedFrom(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Created to</Label>
              <Input className="h-9" type="date" value={createdTo} onChange={(e) => setCreatedTo(e.target.value)} />
            </div>
            {isDocumentsAdmin ? (
              <>
                <div className="space-y-1.5">
                  <Label className="text-xs">Document owner (employee)</Label>
                  <SearchableCombobox
                    options={employeeOptions}
                    value={selectedOwnerLabel}
                    onValueChange={(label) => {
                      if (label === "All employees") {
                        setFilterUserId("");
                        return;
                      }
                      const match = employeeList.find((e) => e.label === label);
                      setFilterUserId(match?.id ?? "");
                    }}
                    placeholder="All employees"
                    searchPlaceholder="Search employees…"
                    emptyMessage="No employees found."
                    aria-label="Export document owner filter"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Uploaded by</Label>
                  <SearchableCombobox
                    options={uploadedByOptions}
                    value={selectedUploaderLabel}
                    onValueChange={(label) => {
                      if (label === "Anyone") {
                        setUploadedBy("");
                        return;
                      }
                      const match = employeeList.find((e) => e.label === label);
                      setUploadedBy(match?.id ?? "");
                    }}
                    placeholder="Anyone"
                    searchPlaceholder="Search employees…"
                    emptyMessage="No employees found."
                    aria-label="Export uploaded by filter"
                  />
                </div>
              </>
            ) : null}
          </div>

          <Tabs value={tab} onValueChange={(v) => setTab(v as "export" | "email")} className="flex-1">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="export" className="gap-1.5">
                <Download className="h-3.5 w-3.5" />
                Download ZIP
              </TabsTrigger>
              <TabsTrigger value="email" className="gap-1.5" disabled={!canEmailPack}>
                <Mail className="h-3.5 w-3.5" />
                Send mail
              </TabsTrigger>
            </TabsList>
            <TabsContent value="export" className="mt-4 space-y-3">
              <p className="text-xs text-muted-foreground">
                Builds a ZIP of up to 100 matching files (original formats). Files that cannot be read from storage are
                skipped.
              </p>
              <p className="text-xs font-medium text-foreground">
                {hasMatches
                  ? `${matchCount} file${matchCount === 1 ? "" : "s"} match the current filters.`
                  : "No files match the current filters."}
              </p>
              <Button
                className="w-full gap-2"
                onClick={() => void handleDownloadZip()}
                disabled={exporting || !hasMatches}
              >
                {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                {hasMatches ? `Download ZIP (${matchCount})` : "Download ZIP"}
              </Button>
            </TabsContent>
            <TabsContent value="email" className="mt-4">
              {!canEmailPack ? (
                <p className="text-sm text-muted-foreground">Only CEO, HR, or Admin can email document packs.</p>
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
                  subjectPlaceholder={`Default: Document report – ${filterSummary}`}
                  sendLabel="Send email with ZIP"
                  sending={sending}
                  sendDisabled={!hasMatches}
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
