"use client";

import { useState } from "react";
import { ChevronDown, Download, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  downloadCsv,
  downloadXlsx,
  withExtension,
  type SheetDefinition,
} from "@/lib/export/xlsx-utils";
import { getErrorMessage } from "@/lib/get-error-message";

interface ExportButtonProps {
  /** Base filename; the chosen format sets the extension. */
  filename: string;
  sheets: SheetDefinition[];
  label?: string;
  disabled?: boolean;
}

/**
 * The one export affordance.
 *
 * Exports used to differ page by page — an instant download here, a dialog
 * there, a menu elsewhere, sometimes with an .xlsx name on CSV bytes
 * (QA-D002). This offers both formats, names the file from the caller's base
 * name, and reports the result the same way everywhere.
 */
export function ExportButton({ filename, sheets, label = "Export", disabled }: ExportButtonProps) {
  const [loading, setLoading] = useState(false);

  async function handleExport(format: "xlsx" | "csv") {
    if (loading) return;
    setLoading(true);
    const name = withExtension(filename, format);
    try {
      if (format === "xlsx") {
        await downloadXlsx(name, sheets);
      } else {
        downloadCsv(name, sheets);
      }
      toast.success(`Exported ${name}`);
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }

  const isEmpty = sheets.every((s) => s.rows.length === 0);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          disabled={disabled || loading || isEmpty}
          aria-busy={loading || undefined}
        >
          {loading ? (
            <Loader2 className="animate-spin" aria-hidden="true" />
          ) : (
            <Download aria-hidden="true" />
          )}
          {loading ? "Exporting…" : label}
          <ChevronDown className="size-3.5" aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => void handleExport("xlsx")}>
          Excel (.xlsx)
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => void handleExport("csv")}>
          CSV (.csv)
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
