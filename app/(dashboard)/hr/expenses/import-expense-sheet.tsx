"use client";

import { useState, useRef, useCallback } from "react";
import { format } from "date-fns";
import {
  Upload, Download, FileSpreadsheet, X, CheckCircle2, FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { HrSheet } from "@/features/hr/hr-sheet";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { ImportValidationPreview } from "@/features/hr/expenses/import-validation-preview";
import { getErrorMessage } from "@/lib/get-error-message";
import {
  IMPORT_ALLOWED_EXTENSIONS,
  IMPORT_ALLOWED_MIME_TYPES,
  IMPORT_MAX_FILE_SIZE_BYTES,
  validateFileTypeAndSize,
} from "@/lib/files/expense-file-validation";

const TEMPLATE_COLUMNS = [
  "category", "amount", "description", "merchant", "payment_method", "expense_date",
] as const;

const ALLOWED_CATEGORIES = [
  "Travel", "Food", "Office Supplies", "Software", "Hardware", "Marketing",
  "Entertainment", "Utilities", "Rent", "Insurance", "Salary", "Miscellaneous", "Other",
];

interface ParsedRow {
  rowNumber: number;
  category: string;
  amount: number;
  description: string;
  merchant: string;
  paymentMethod: string;
  expenseDate: string;
  valid: boolean;
  error?: string;
}

interface ImportExpenseSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function ImportExpenseSheet({ open, onOpenChange, onSuccess }: ImportExpenseSheetProps) {
  const [file, setFile] = useState<File | null>(null);
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [categoryMapping, setCategoryMapping] = useState<Record<string, string>>({});
  const [autoApprove, setAutoApprove] = useState(true);
  const [isImporting, setIsImporting] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [importResult, setImportResult] = useState<{
    success: boolean; count: number; skipped: number;
    skippedReasons?: Array<{ row: number; reason: string }>;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetState = useCallback(() => {
    setFile(null);
    setParsedRows([]);
    setCategoryMapping({});
    setAutoApprove(true);
    setImportResult(null);
    setIsImporting(false);
    setIsParsing(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, []);

  const handleSheetOpenChange = useCallback((o: boolean) => {
    if (!o) resetState();
    onOpenChange(o);
  }, [resetState, onOpenChange]);

  const handleClickUploadArea = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleCancel = useCallback(() => {
    resetState();
    onOpenChange(false);
  }, [resetState, onOpenChange]);

  const handleCategoryMappingChange = useCallback((original: string, value: string) => {
    setCategoryMapping((prev) => ({ ...prev, [original]: value }));
  }, []);

  const parseFile = useCallback(async (selectedFile: File) => {
    setIsParsing(true);
    try {
      const text = await selectedFile.text();
      const lines = text.split("\n").filter((l) => l.trim());
      if (lines.length < 2) {
        toast.error("File must have a header and at least one data row");
        setFile(null);
        setIsParsing(false);
        return;
      }

      const headers = lines[0].split(",").map((h) => h.trim().toLowerCase().replace(/['"]/g, ""));
      const dataLines = lines.slice(1);
      const allowedSet = new Set(ALLOWED_CATEGORIES.map((c) => c.toLowerCase()));
      const unmappedCategories = new Set<string>();

      const today = format(new Date(), "yyyy-MM-dd");
      const parsed: ParsedRow[] = dataLines.map((line, index) => {
        const values = line.split(",").map((v) => v.trim().replace(/^["']|["']$/g, ""));
        const record: Record<string, string> = {};
        headers.forEach((h, i) => { record[h] = values[i] || ""; });

        const rawCategory = record.category || "Other";
        const amount = parseFloat(record.amount);
        const description = record.description || "";
        const merchant = record.merchant || "";
        const paymentMethod = record.paymentmethod || record["payment_method"] || record["payment method"] || "";
        const expenseDate = record.expensedate || record["expense_date"] || record["expense date"] || record.date || "";

        const errors: string[] = [];
        if (isNaN(amount) || amount <= 0) errors.push("Invalid amount");
        if (!rawCategory) errors.push("Missing category");
        if (!allowedSet.has(rawCategory.toLowerCase())) unmappedCategories.add(rawCategory);
        if (!/^\d{4}-\d{2}-\d{2}$/.test(expenseDate)) errors.push("Invalid date (use YYYY-MM-DD)");
        if (/^\d{4}-\d{2}-\d{2}$/.test(expenseDate) && expenseDate > today) {
          errors.push("Expense date cannot be in the future");
        }

        return {
          rowNumber: index + 2,
          category: rawCategory,
          amount: isNaN(amount) ? 0 : amount,
          description,
          merchant,
          paymentMethod,
          expenseDate,
          valid: errors.length === 0,
          error: errors.length > 0 ? errors.join("; ") : undefined,
        };
      });

      setParsedRows(parsed);

      const mapping: Record<string, string> = {};
      unmappedCategories.forEach((cat) => {
        const lower = cat.toLowerCase();
        const match = ALLOWED_CATEGORIES.find((c) => c.toLowerCase() === lower);
        mapping[cat] = match || "Other";
      });
      setCategoryMapping(mapping);
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsParsing(false);
    }
  }, []);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    const validationError = validateFileTypeAndSize({
      file: selectedFile,
      allowedMimeTypes: IMPORT_ALLOWED_MIME_TYPES,
      allowedExtensions: IMPORT_ALLOWED_EXTENSIONS,
      maxSizeBytes: IMPORT_MAX_FILE_SIZE_BYTES,
    });
    if (validationError) {
      toast.error(validationError === "File type not supported" ? "Please select a CSV or Excel file" : validationError);
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    setFile(selectedFile);
    setImportResult(null);
    if (selectedFile.name.endsWith(".csv")) {
      parseFile(selectedFile);
    } else {
      setParsedRows([]);
    }
  }, [parseFile]);

  const handleDownloadTemplate = useCallback(async () => {
    try {
      const { downloadXlsx } = await import("@/lib/export/xlsx-utils");
      await downloadXlsx(`expense_import_template_${format(new Date(), "yyyy-MM-dd")}.xlsx`, [{
        name: "Expenses",
        columns: TEMPLATE_COLUMNS.map((col) => ({
          header: col.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
          key: col,
          width: 18,
        })),
        rows: [],
      }]);
      toast.success("Template downloaded");
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  }, []);

  const handleImport = useCallback(async () => {
    if (!file) return;
    setIsImporting(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("autoApprove", String(autoApprove));
      if (Object.keys(categoryMapping).length > 0) {
        formData.append("categoryMapping", JSON.stringify(categoryMapping));
      }
      const response = await fetch("/api/expenses/import", { method: "POST", body: formData });
      const result = await response.json();
      if (response.ok && result.success) {
        setImportResult({
          success: true,
          count: result.count ?? 0,
          skipped: result.skipped ?? 0,
          skippedReasons: Array.isArray(result.skippedReasons) ? result.skippedReasons : [],
        });
        toast.success(`Imported ${result.count ?? 0} expense(s) successfully`);
        onSuccess();
      } else {
        toast.error(result.error || "Failed to import expenses");
        setImportResult(null);
      }
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsImporting(false);
    }
  }, [file, categoryMapping, autoApprove, onSuccess]);

  const validCount = parsedRows.filter((r) => r.valid).length;

  const handleDownloadValidation = useCallback(() => {
    if (parsedRows.length === 0) {
      toast.error("No parsed rows to download");
      return;
    }
    const header = ["row", "date", "category", "amount", "status", "issues"];
    const rows = parsedRows.map((row) => [
      row.rowNumber,
      row.expenseDate || "",
      row.category || "",
      row.amount > 0 ? row.amount.toString() : "",
      row.valid ? "valid" : "invalid",
      row.error || "",
    ]);
    const csv = [header, ...rows]
      .map((line) => line.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `expense-import-validation-${format(new Date(), "yyyy-MM-dd")}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
    toast.success("Validation report downloaded");
  }, [parsedRows]);

  return (
    <HrSheet
      open={open}
      onOpenChange={handleSheetOpenChange}
      title="Import Expenses"
      description="Upload a CSV file to bulk-import expenses."
      onSubmit={handleImport}
      submitLabel={
        importResult
          ? "Close"
          : isImporting
            ? "Importing..."
            : `Import${validCount > 0 ? ` (${validCount} rows)` : ""}`
      }
      isPending={isImporting || isParsing}
    >
      <div className="space-y-4">
        <div className="rounded-lg border border-dashed border-border p-4 space-y-3">
            <div className="flex items-center gap-2">
              <div className="h-6 w-6 rounded-full bg-gold/10 flex items-center justify-center text-xs font-bold text-gold">1</div>
              <Label className="text-sm font-semibold">Download Template</Label>
            </div>
            <p className="text-xs text-muted-foreground pl-8">
              Download the Excel template to ensure your data is in the correct format.
              The template includes sample rows to guide you.
            </p>
            <div className="pl-8">
              <Button variant="outline" size="sm" className="gap-2" onClick={handleDownloadTemplate}>
                <Download className="h-3.5 w-3.5" />
                Download Template (.xlsx)
              </Button>
            </div>
            <div className="pl-8">
              <details className="text-xs text-muted-foreground">
                <summary className="cursor-pointer hover:text-foreground transition-colors">View required columns</summary>
                <div className="mt-2 space-y-1 pl-2 border-l-2 border-border">
                  <p><span className="font-medium text-foreground">category</span> — {ALLOWED_CATEGORIES.join(", ")}</p>
                  <p><span className="font-medium text-foreground">amount</span> — Positive number</p>
                  <p><span className="font-medium text-foreground">description</span> — Text (optional)</p>
                  <p><span className="font-medium text-foreground">merchant</span> — Vendor name (optional)</p>
                  <p><span className="font-medium text-foreground">payment_method</span> — Cash, UPI, Company Card, etc. (optional)</p>
                  <p><span className="font-medium text-foreground">expense_date</span> — YYYY-MM-DD format</p>
                </div>
              </details>
            </div>
          </div>

          {!file ? (
            <div className="rounded-lg border border-dashed border-border p-4 space-y-3">
              <div className="flex items-center gap-2">
                <div className="h-6 w-6 rounded-full bg-gold/10 flex items-center justify-center text-xs font-bold text-gold">2</div>
                <Label className="text-sm font-semibold">Upload File</Label>
              </div>

              <div className="pl-8 cursor-pointer min-h-[92px]" onClick={handleClickUploadArea}>
                <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/25 p-6 transition-colors hover:border-gold/50 hover:bg-gold/5">
                  <FileSpreadsheet className="h-8 w-8 text-muted-foreground/50 mb-2" />
                  <p className="text-sm font-medium text-foreground">Click to upload</p>
                  <p className="text-xs text-muted-foreground mt-1">CSV or Excel (.xlsx, .xls) — Max 5MB</p>
                </div>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept=".csv,.xlsx,.xls"
                onChange={handleFileChange}
                aria-label="Upload expense file"
              />
            </div>
          ) : (
            <div className="-mx-4 -mt-4 px-4 pt-4 pb-3 bg-background border-b mb-4">
              <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/30 p-3">
                <FileText className="h-8 w-8 text-gold shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{file.name}</p>
                  <p className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(1)} KB uploaded</p>
                </div>
                <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={resetState} aria-label="Remove file">
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept=".csv,.xlsx,.xls"
                onChange={handleFileChange}
                aria-label="Upload expense file"
              />
            </div>
          )}

          <div className="rounded-lg border border-border p-4 space-y-3">
            <div className="space-y-1">
              <p className="text-sm font-semibold">Approval Setting</p>
              <p className="text-xs text-muted-foreground">
                Choose whether imported expenses should be approved immediately.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="auto-approve-expenses"
                checked={autoApprove}
                onCheckedChange={(checked) => setAutoApprove(checked === true)}
              />
              <Label htmlFor="auto-approve-expenses" className="text-sm cursor-pointer">
                Auto-approve imported expenses
              </Label>
            </div>
          </div>

          {file && parsedRows.length > 0 && (
            <ImportValidationPreview
              parsedRows={parsedRows}
              isParsing={isParsing}
              categoryMapping={categoryMapping}
              onCategoryMappingChange={handleCategoryMappingChange}
              onDownloadValidation={handleDownloadValidation}
            />
          )}

          {importResult && (
            <div className={cn(
              "rounded-lg border p-4",
              importResult.success
                ? "border-emerald-200 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-900/20"
                : "border-destructive bg-destructive/10",
            )}>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                <div>
                  <p className="text-sm font-medium">Successfully imported {importResult.count} expense(s)</p>
                  {importResult.skipped > 0 && (
                    <p className="text-xs text-muted-foreground">{importResult.skipped} row(s) skipped due to validation errors</p>
                  )}
                </div>
              </div>
              {importResult.skipped > 0 && (importResult.skippedReasons?.length ?? 0) > 0 && (
                <details className="mt-3 border-t border-emerald-200/60 pt-3 text-xs">
                  <summary className="cursor-pointer font-medium text-foreground">
                    View skipped row reasons
                  </summary>
                  <div className="mt-2 max-h-40 overflow-auto space-y-1 rounded-md bg-background/60 p-2">
                    {importResult.skippedReasons?.map((item, idx) => (
                      <p key={`${item.row}-${idx}`} className="text-muted-foreground">
                        Row {item.row}: {item.reason}
                      </p>
                    ))}
                  </div>
                </details>
              )}
            </div>
          )}

      </div>
    </HrSheet>
  );
}
