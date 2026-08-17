"use client";

import { useCallback } from "react";
import {
  FileSpreadsheet, CheckCircle2, AlertCircle, Loader2, Download,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { CURRENCY_SYMBOL, DEFAULT_LOCALE } from "@/lib/constants/locale";

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

interface CategoryMappingRowProps {
  original: string;
  mapped: string;
  onValueChange: (original: string, value: string) => void;
}

function CategoryMappingRow({ original, mapped, onValueChange }: CategoryMappingRowProps) {
  const handleChange = useCallback(
    (v: string) => onValueChange(original, v),
    [original, onValueChange],
  );
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-muted-foreground truncate w-24">&quot;{original}&quot;</span>
      <span className="text-xs text-muted-foreground">→</span>
      <Select value={mapped} onValueChange={handleChange}>
        <SelectTrigger className="h-7 text-xs w-36">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {ALLOWED_CATEGORIES.map((cat) => (
            <SelectItem key={cat} value={cat} className="text-xs">{cat}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

interface ImportValidationPreviewProps {
  parsedRows: ParsedRow[];
  isParsing: boolean;
  categoryMapping: Record<string, string>;
  onCategoryMappingChange: (original: string, value: string) => void;
  onDownloadValidation: () => void;
}

export function ImportValidationPreview({
  parsedRows,
  isParsing,
  categoryMapping,
  onCategoryMappingChange,
  onDownloadValidation,
}: ImportValidationPreviewProps) {
  const validCount = parsedRows.filter((r) => r.valid).length;
  const invalidCount = parsedRows.filter((r) => !r.valid).length;

  return (
    <div className="rounded-lg border border-dashed border-border p-4 space-y-3">
      <div className="flex items-center gap-2">
        <div className="h-6 w-6 rounded-full bg-gold/10 flex items-center justify-center text-xs font-bold text-gold">
          3
        </div>
        <Label className="text-sm font-semibold">Validation Preview</Label>
      </div>

      {isParsing ? (
        <div className="pl-8 flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Parsing file...
        </div>
      ) : (
        <>
          <div className="pl-8 flex items-center gap-3">
            <Badge variant="secondary" className="gap-1">
              <FileSpreadsheet className="h-3 w-3" />
              {parsedRows.length} rows
            </Badge>
            <Badge className="gap-1 bg-emerald-500/10 text-emerald-600 border-emerald-200 dark:border-emerald-800">
              <CheckCircle2 className="h-3 w-3" />
              {validCount} valid
            </Badge>
            {invalidCount > 0 && (
              <Badge variant="destructive" className="gap-1">
                <AlertCircle className="h-3 w-3" />
                {invalidCount} invalid
              </Badge>
            )}
            <Button type="button" variant="outline" size="sm" className="h-7 text-xs gap-1.5" onClick={onDownloadValidation}>
              <Download className="h-3.5 w-3.5" />
              Download Validation
            </Button>
          </div>

          {Object.keys(categoryMapping).length > 0 && (
            <div className="pl-8 space-y-2">
              <Label className="text-xs font-medium text-muted-foreground">Category Mapping</Label>
              <p className="text-xs text-muted-foreground">
                Some categories in your file don&apos;t match. Map them below:
              </p>
              {Object.entries(categoryMapping).map(([original, mapped]) => (
                <CategoryMappingRow
                  key={original}
                  original={original}
                  mapped={mapped}
                  onValueChange={onCategoryMappingChange}
                />
              ))}
            </div>
          )}

          <div className="pl-8">
            <ScrollArea className="h-48 rounded-md border">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="px-2 py-1.5 text-left font-medium">#</th>
                    <th className="px-2 py-1.5 text-left font-medium">Date</th>
                    <th className="px-2 py-1.5 text-left font-medium">Category</th>
                    <th className="px-2 py-1.5 text-right font-medium">Amount</th>
                    <th className="px-2 py-1.5 text-left font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {parsedRows.slice(0, 50).map((row, idx) => (
                    <tr key={idx} className={cn("border-b", !row.valid && "bg-destructive/5")}>
                      <td className="px-2 py-1 text-muted-foreground">{row.rowNumber || idx + 1}</td>
                      <td className="px-2 py-1">{row.expenseDate || ""}</td>
                      <td className="px-2 py-1">{row.category}</td>
                      <td className="px-2 py-1 text-right font-medium">
                        {row.amount > 0 ? `${CURRENCY_SYMBOL}${row.amount.toLocaleString(DEFAULT_LOCALE)}` : ""}
                      </td>
                      <td className="px-2 py-1">
                        {row.valid ? (
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                        ) : (
                          <span className="text-destructive" title={row.error}>
                            <AlertCircle className="h-3.5 w-3.5 inline mr-1" />
                            {row.error}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </ScrollArea>
            {parsedRows.length > 50 && (
              <p className="text-xs text-muted-foreground mt-1 text-center">
                Showing first 50 of {parsedRows.length} rows
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
}
