"use client";

import { useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { downloadXlsx, type SheetDefinition } from "@/lib/export/xlsx-utils";

interface ExportButtonProps {
  filename: string;
  sheets: SheetDefinition[];
  label?: string;
  disabled?: boolean;
}

export function ExportButton({ filename, sheets, label = "Export", disabled }: ExportButtonProps) {
  const [loading, setLoading] = useState(false);

  async function handleExport() {
    if (loading) return;
    setLoading(true);
    try {
      await downloadXlsx(filename, sheets);
    } finally {
      setLoading(false);
    }
  }

  const isEmpty = sheets.every((s) => s.rows.length === 0);

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleExport}
      disabled={disabled || loading || isEmpty}
      aria-busy={loading || undefined}
    >
      {loading ? <Loader2 className="animate-spin" aria-hidden="true" /> : <Download aria-hidden="true" />}
      {loading ? "Exporting…" : label}
    </Button>
  );
}
