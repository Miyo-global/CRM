"use client";

import { useState } from "react";
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
      className="gap-2"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-4 w-4"
        aria-hidden="true"
      >
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <polyline points="7 10 12 15 17 10" />
        <line x1="12" y1="15" x2="12" y2="3" />
      </svg>
      {loading ? "Exporting…" : label}
    </Button>
  );
}
