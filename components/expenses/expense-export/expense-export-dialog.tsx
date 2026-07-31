"use client";

import { useState, useMemo, useCallback } from "react";
import {
  Download,
  FileSpreadsheet,
  FileText,
  File,
  Loader2,
  CheckCircle2,
  Mail,
  CalendarIcon,
  ChevronsUpDown,
} from "lucide-react";
import { DatePicker } from "@/components/ui/date-picker";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import {
  exportExpenses,
  emailExpenseReport,
  type ExportFilters,
} from "@/server/actions/expense-export";
import type { ExpenseFilters } from "@/server/actions/expense-query";
import { usePdfRenderer } from "./pdf-renderer";
import { downloadCSV, downloadXLSX } from "./xlsx-renderer";
import { getTodayString } from "@/lib/date-utils";
import {
  formatEmployeeOptionLabel,
  validateExpenseExportDateRange,
} from "@/lib/validations/expense";
import { parseISO, isValid, startOfDay } from "date-fns";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ExportMailFields,
  useExportMailPeople,
  useExportMailRecipients,
} from "@/components/hr/export-mail-form";

interface EmployeeOption {
  id: string;
  firstName?: string | null;
  lastName?: string | null;
  name?: string | null;
  email?: string | null;
}

export interface ExpenseExportDialogProps {
  filters: ExpenseFilters;
  trigger?: React.ReactNode;
  categories?: { id: number; name: string }[];
  paymentMethods?: string[];
  employees?: EmployeeOption[];
}

type ExportFormat = "csv" | "xlsx" | "pdf";

const FORMAT_OPTIONS: {
  value: ExportFormat;
  label: string;
  description: string;
  icon: typeof FileText;
}[] = [
  {
    value: "csv",
    label: "CSV",
    description: "Comma-separated values, compatible with Excel and Google Sheets",
    icon: File,
  },
  {
    value: "xlsx",
    label: "Excel (XLSX)",
    description: "Microsoft Excel format with multiple sheets and formatting",
    icon: FileSpreadsheet,
  },
];

const DEFAULT_PAYMENT_METHODS = [
  "Cash",
  "Bank Transfer",
  "UPI",
  "Credit Card",
  "Debit Card",
  "Cheque",
  "Other",
];

function ExportEmployeeFilter({
  employees,
  value,
  onChange,
}: {
  employees: EmployeeOption[];
  value: string[];
  onChange: (ids: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const t = search.trim().toLowerCase();
    if (!t) return employees;
    return employees.filter((e) => {
      const label = formatEmployeeOptionLabel(e).toLowerCase();
      return label.includes(t) || (e.email?.toLowerCase().includes(t) ?? false);
    });
  }, [employees, search]);

  const summary = useMemo(() => {
    if (value.length === 0 || value.length >= employees.length) {
      return "All employees";
    }
    if (value.length === 1) {
      const e = employees.find((x) => x.id === value[0]);
      return e ? formatEmployeeOptionLabel(e) : "1 selected";
    }
    return `${value.length} selected`;
  }, [value, employees]);

  const toggle = useCallback(
    (id: string, checked: boolean) => {
      if (checked) onChange([...value, id]);
      else onChange(value.filter((x) => x !== id));
    },
    [value, onChange],
  );

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setSearch("");
      }}
    >
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          aria-label="Filter export by employee"
          className="h-9 w-full justify-between gap-2 px-3 text-xs font-normal min-w-0"
        >
          <span className="truncate text-left">{summary}</span>
          <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[min(320px,calc(100vw-2rem))] p-0" align="start">
        <div className="border-b p-2">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name or email…"
            className="h-8 text-xs"
            aria-label="Search employees"
          />
        </div>
        <div className="flex flex-wrap gap-1 border-b px-2 py-1.5">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 text-xs"
            onClick={() => onChange([])}
          >
            All
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 text-xs"
            onClick={() => onChange(employees.map((e) => e.id))}
          >
            Select all
          </Button>
        </div>
        <ScrollArea className="h-[min(240px,40vh)]">
          <div className="p-1">
            {filtered.length === 0 ? (
              <p className="px-2 py-6 text-center text-xs text-muted-foreground">No matches</p>
            ) : (
              filtered.map((e) => {
                const checked = value.includes(e.id);
                return (
                  <label
                    key={e.id}
                    className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-2 text-sm hover:bg-muted/60"
                  >
                    <Checkbox
                      checked={checked}
                      onCheckedChange={(c) => toggle(e.id, Boolean(c))}
                      aria-label={formatEmployeeOptionLabel(e)}
                    />
                    <span className="min-w-0 flex-1 truncate">{formatEmployeeOptionLabel(e)}</span>
                  </label>
                );
              })
            )}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}

export function ExpenseExportDialog({
  filters,
  trigger,
  categories = [],
  paymentMethods = DEFAULT_PAYMENT_METHODS,
  employees,
}: ExpenseExportDialogProps) {

  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"download" | "email">("download");

  const [format, setFormat] = useState<ExportFormat>("xlsx");
  const [includeHeader, setIncludeHeader] = useState(true);
  const [includeTotals, setIncludeTotals] = useState(true);

  const [isExporting, setIsExporting] = useState(false);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [exportComplete, setExportComplete] = useState(false);

  const { people, hrEmails, ceoEmails } = useExportMailPeople();
  const mail = useExportMailRecipients();

  const [dateFrom, setDateFrom] = useState(filters.startDate || "");
  const [dateTo, setDateTo] = useState(filters.endDate || "");
  const [exportCategory, setExportCategory] = useState("all");
  const [exportPayment, setExportPayment] = useState("all");
  const [exportStatus, setExportStatus] = useState(
    filters.status && filters.status !== "all" ? String(filters.status) : "all"
  );
  const [exportEmployeeIds, setExportEmployeeIds] = useState<string[]>(() =>
    filters.userId ? [filters.userId] : [],
  );

  const { downloadPDF, pdfPortal } = usePdfRenderer();

  const todayStr = getTodayString();
  const maxSelectableDate = useMemo(() => startOfDay(new Date()), []);

  const dateFromBoundary = useMemo(() => {
    if (!dateFrom?.trim()) return undefined;
    const d = parseISO(dateFrom);
    return isValid(d) ? startOfDay(d) : undefined;
  }, [dateFrom]);

  const dateToBoundary = useMemo(() => {
    if (!dateTo?.trim()) return undefined;
    const d = parseISO(dateTo);
    return isValid(d) ? startOfDay(d) : undefined;
  }, [dateTo]);

  const fromPickerMaxDate = useMemo(() => {
    if (dateToBoundary && dateToBoundary <= maxSelectableDate) return dateToBoundary;
    return maxSelectableDate;
  }, [dateToBoundary, maxSelectableDate]);

  const dateRangeError = validateExpenseExportDateRange(dateFrom, dateTo, todayStr);

  const normalizedExportUserIds = useMemo(() => {
    if (!employees?.length || exportEmployeeIds.length === 0) return undefined;
    if (exportEmployeeIds.length >= employees.length) return undefined;
    return exportEmployeeIds;
  }, [employees, exportEmployeeIds]);

  const spentByDisplay = useMemo((): string | undefined => {
    if (normalizedExportUserIds?.length) {
      const labels = normalizedExportUserIds
        .map((id) => employees!.find((e) => e.id === id))
        .filter(Boolean)
        .map((e) => formatEmployeeOptionLabel(e!));
      if (labels.length <= 2) return labels.join(", ");
      return `${labels.slice(0, 2).join(", ")} +${labels.length - 2} more`;
    }
    if (filters.userId) {
      const e = employees?.find((x) => x.id === filters.userId);
      return e ? formatEmployeeOptionLabel(e) : filters.userId;
    }
    return undefined;
  }, [normalizedExportUserIds, employees, filters.userId]);

  const exportFilters = useMemo(
    (): ExportFilters => ({
      startDate: dateFrom || filters.startDate,
      endDate: dateTo || filters.endDate,
      month: filters.month,
      categoryId: filters.categoryId,
      category: exportCategory !== "all" ? exportCategory : filters.category,
      status: exportStatus !== "all" ? exportStatus : filters.status,
      userIds: normalizedExportUserIds,
      userId: normalizedExportUserIds ? undefined : filters.userId,
      paymentMethod: exportPayment !== "all" ? exportPayment : filters.paymentMethod,
      minAmount: filters.minAmount,
      maxAmount: filters.maxAmount,
      search: filters.search,
    }),
    [
      dateFrom,
      dateTo,
      filters,
      exportCategory,
      exportPayment,
      exportStatus,
      normalizedExportUserIds,
    ],
  );

  const periodLabel = useMemo(() => {
    if (dateFrom && dateTo) return `${dateFrom} to ${dateTo}`;
    if (dateFrom) return `From ${dateFrom}`;
    return "All Time";
  }, [dateFrom, dateTo]);

  const resetDialogState = () => {
    setTab("download");
    setFormat("xlsx");
    setIncludeHeader(true);
    setIncludeTotals(true);
    setIsExporting(false);
    setIsSendingEmail(false);
    setExportComplete(false);
    mail.reset();
    setDateFrom(filters.startDate || "");
    setDateTo(filters.endDate || "");
    setExportCategory("all");
    setExportPayment("all");
    setExportStatus(filters.status && filters.status !== "all" ? String(filters.status) : "all");
    setExportEmployeeIds(filters.userId ? [filters.userId] : []);
  };

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (!nextOpen) {
      resetDialogState();
    }
  };

  const handleSendEmail = async () => {
    if (dateRangeError) {
      toast.error(dateRangeError);
      return;
    }
    const recipientError = mail.validateRecipients();
    if (recipientError) {
      toast.error(recipientError);
      return;
    }
    setIsSendingEmail(true);
    try {
      const result = await emailExpenseReport(exportFilters, {
        to: mail.to,
        cc: mail.cc.length ? mail.cc : undefined,
        bcc: mail.bcc.length ? mail.bcc : undefined,
        subject: mail.subject.trim() || undefined,
        message: mail.message.trim() || undefined,
      });
      if (result.success) {
        toast.success("Expense report emailed successfully!");
        setOpen(false);
      } else {
        toast.error(result.error || "Failed to send email");
      }
    } catch {
      toast.error("Failed to send email");
    } finally {
      setIsSendingEmail(false);
    }
  };

  const handleExport = async () => {
    if (dateRangeError) {
      toast.error(dateRangeError);
      return;
    }
    setIsExporting(true);
    setExportComplete(false);

    try {
      const result = await exportExpenses({
        format,
        filters: exportFilters,
        includeHeader,
        includeTotals,
        title: "Expense Report",
        spentByDisplay,
      });

      if (!result.success) {
        toast.error(result.error);
        return;
      }

      switch (result.format) {
        case "csv":
          downloadCSV(result.data, result.filename);
          break;
        case "xlsx":
          await downloadXLSX(result.data, result.filename);
          break;
        case "pdf":
          await downloadPDF(result.data, result.filename);
          break;
      }

      setExportComplete(true);
      toast.success("Export downloaded successfully!");
      setTimeout(() => {
        handleOpenChange(false);
      }, 1500);
    } catch {
      toast.error("Failed to export expenses");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <>
      <Sheet open={open} onOpenChange={handleOpenChange}>
        <SheetTrigger asChild>
          {trigger || (
            <Button variant="outline" className="gap-2">
              <Download className="h-4 w-4" />
              Export
            </Button>
          )}
        </SheetTrigger>

        <SheetContent className="sm:max-w-lg overflow-y-auto p-6">
          <SheetHeader className="mb-6">
            <SheetTitle className="text-xl font-semibold flex items-center gap-2">
              <Download className="h-5 w-5 text-primary" />
              Export Expenses
            </SheetTitle>
            <SheetDescription>
              Export your filtered expenses to your preferred format.
            </SheetDescription>
          </SheetHeader>

          <div className="space-y-5">

            <div className="space-y-3">
              <Label className="text-sm font-medium flex items-center gap-1.5">
                <CalendarIcon className="h-3.5 w-3.5 text-muted-foreground" />
                Date Range
              </Label>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs text-muted-foreground mb-1 block">From</Label>
                  <DatePicker
                    value={dateFrom}
                    onChange={setDateFrom}
                    placeholder="From date"
                    toDate={fromPickerMaxDate}
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground mb-1 block">To</Label>
                  <DatePicker
                    value={dateTo}
                    onChange={setDateTo}
                    placeholder="To date"
                    fromDate={dateFromBoundary}
                    toDate={maxSelectableDate}
                  />
                </div>
              </div>
              {dateRangeError && (
                <p className="text-xs text-destructive">{dateRangeError}</p>
              )}
              {(dateFrom || dateTo) && (
                <button
                  onClick={() => {
                    setDateFrom("");
                    setDateTo("");
                  }}
                  className="text-xs text-primary hover:underline"
                >
                  Clear dates
                </button>
              )}
            </div>

            <div className={`grid gap-3 ${employees?.length ? "grid-cols-2 sm:grid-cols-4" : "grid-cols-3"}`}>
              <div>
                <Label className="text-xs text-muted-foreground mb-1 block">Status</Label>
                <Select value={exportStatus} onValueChange={setExportStatus}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="PENDING">Pending</SelectItem>
                    <SelectItem value="APPROVED">Approved</SelectItem>
                    <SelectItem value="REJECTED">Rejected</SelectItem>
                    <SelectItem value="PAID">Paid</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground mb-1 block">Category</Label>
                <Select value={exportCategory} onValueChange={setExportCategory}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.name}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground mb-1 block">Payment</Label>
                <Select value={exportPayment} onValueChange={setExportPayment}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Methods</SelectItem>
                    {paymentMethods.map((m) => (
                      <SelectItem key={m} value={m}>
                        {m}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {employees && employees.length > 0 && (
                <div className="min-w-0 sm:min-w-[168px]">
                  <Label className="text-xs text-muted-foreground mb-1 block">Spent by</Label>
                  <ExportEmployeeFilter
                    employees={employees}
                    value={exportEmployeeIds}
                    onChange={setExportEmployeeIds}
                  />
                </div>
              )}
            </div>

            <div className="space-y-3">
              <Label className="text-sm font-medium">Export Format</Label>
              <RadioGroup
                value={format}
                onValueChange={(v: string) => setFormat(v as ExportFormat)}
                className="grid gap-3"
              >
                {FORMAT_OPTIONS.map((option) => (
                  <label
                    key={option.value}
                    className={`flex items-start gap-3 p-4 border rounded-lg cursor-pointer transition-colors hover:bg-muted/50 ${
                      format === option.value ? "border-primary bg-primary/5" : "border-border"
                    }`}
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

            <div className="space-y-4 pt-2">
              <div className="flex items-center justify-between rounded-lg border p-4 bg-muted/30">
                <div className="space-y-0.5">
                  <Label className="text-sm font-medium">Include Header</Label>
                  <p className="text-xs text-muted-foreground">
                    Add title, date, and filter information
                  </p>
                </div>
                <Switch checked={includeHeader} onCheckedChange={setIncludeHeader} />
              </div>
              {!includeHeader && (
                <p className="text-xs text-muted-foreground -mt-2">
                  Header metadata will be omitted from the exported file.
                </p>
              )}
              <div className="flex items-center justify-between rounded-lg border p-4 bg-muted/30">
                <div className="space-y-0.5">
                  <Label className="text-sm font-medium">Include Totals</Label>
                  <p className="text-xs text-muted-foreground">Add summary totals at the end</p>
                </div>
                <Switch checked={includeTotals} onCheckedChange={setIncludeTotals} />
              </div>
            </div>

            {Object.values(exportFilters).some((v) => v !== undefined && v !== "") && (
              <div className="p-4 bg-muted/30 rounded-lg border text-sm">
                <p className="font-medium text-sm mb-2">Applied Filters:</p>
                <ul className="text-muted-foreground space-y-1 text-xs">
                  {exportFilters.startDate && (
                    <li>
                      Date: {exportFilters.startDate}
                      {exportFilters.endDate && ` to ${exportFilters.endDate}`}
                    </li>
                  )}
                  {exportFilters.status && exportFilters.status !== "all" && (
                    <li>Status: {exportFilters.status}</li>
                  )}
                  {exportFilters.category && <li>Category: {exportFilters.category}</li>}
                  {exportFilters.paymentMethod && (
                    <li>Payment: {exportFilters.paymentMethod}</li>
                  )}
                  {spentByDisplay && <li>Spent by: {spentByDisplay}</li>}
                  {exportFilters.search && (
                    <li>Search: &ldquo;{exportFilters.search}&rdquo;</li>
                  )}
                </ul>
              </div>
            )}
          </div>

          <Tabs value={tab} onValueChange={(v) => setTab(v as "download" | "email")} className="flex-1">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="download" className="gap-1.5">
                <Download className="h-3.5 w-3.5" />
                Download {format.toUpperCase()}
              </TabsTrigger>
              <TabsTrigger value="email" className="gap-1.5">
                <Mail className="h-3.5 w-3.5" />
                Send mail
              </TabsTrigger>
            </TabsList>

            <TabsContent value="download" className="mt-4 space-y-3">
              <p className="text-xs text-muted-foreground">
                Downloads the expense report for the selected filters as{" "}
                {format === "csv" ? "CSV" : "Excel"}.
              </p>
              <Button
                onClick={handleExport}
                disabled={isExporting || exportComplete || isSendingEmail || !!dateRangeError}
                className="w-full gap-2"
              >
                {isExporting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Exporting...
                  </>
                ) : exportComplete ? (
                  <>
                    <CheckCircle2 className="h-4 w-4" />
                    Done!
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4" />
                    Export {format.toUpperCase()}
                  </>
                )}
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
                subjectPlaceholder={`Default: Expense report – ${periodLabel}`}
                sendLabel="Send email with Excel"
                sending={isSendingEmail}
                sendDisabled={isExporting || !!dateRangeError}
                onSend={() => void handleSendEmail()}
              />
            </TabsContent>
          </Tabs>
        </SheetContent>
      </Sheet>

      {pdfPortal}
    </>
  );
}
