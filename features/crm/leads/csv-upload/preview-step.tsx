"use client";

import { memo, useCallback } from "react";
import {
  FileText,
  AlertCircle,
  CheckCircle2,
  ChevronLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { type ParsedLead, type ImportResult } from "./types";


interface LeadRowProps {
  lead: ParsedLead;
}

const LeadRow = memo(function LeadRow({ lead }: LeadRowProps) {
  return (
    <TableRow>
      <TableCell className="text-xs font-medium">{lead.name}</TableCell>
      <TableCell className="text-xs text-muted-foreground">
        {lead.email || ""}
      </TableCell>
      <TableCell className="text-xs text-muted-foreground">
        {lead.phone || ""}
      </TableCell>
      <TableCell className="text-xs text-muted-foreground">
        {lead.company || ""}
      </TableCell>
      <TableCell className="text-xs">
        {lead.source ? (
          <Badge variant="outline" className="text-[10px]">
            {lead.source}
          </Badge>
        ) : (
          ""
        )}
      </TableCell>
      <TableCell className="text-xs">
        {lead.priority ? (
          <Badge variant="outline" className="text-[10px]">
            {lead.priority}
          </Badge>
        ) : (
          ""
        )}
      </TableCell>
    </TableRow>
  );
});


interface ParseErrorItemProps {
  message: string;
}

const ParseErrorItem = memo(function ParseErrorItem({
  message,
}: ParseErrorItemProps) {
  return <p className="text-xs text-muted-foreground">{message}</p>;
});


interface ImportErrorItemProps {
  row: number;
  message: string;
}

const ImportErrorItem = memo(function ImportErrorItem({
  row,
  message,
}: ImportErrorItemProps) {
  return (
    <p className="text-xs text-destructive">
      Row {row}: {message}
    </p>
  );
});


interface PreviewStepProps {
  fileName: string;
  parsed: ParsedLead[];
  parseErrors: string[];
  importResult: ImportResult | null;
  autoDistribute: boolean;
  isImporting: boolean;
  onAutoDistributeChange: (value: boolean) => void;
  onImport: () => void;
  onEditMapping: () => void;
  onClose: () => void;
}

export const PreviewStep = memo(function PreviewStep({
  fileName,
  parsed,
  parseErrors,
  importResult,
  autoDistribute,
  isImporting,
  onAutoDistributeChange,
  onImport,
  onEditMapping,
  onClose,
}: PreviewStepProps) {
  const handleCheckboxChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onAutoDistributeChange(e.target.checked);
    },
    [onAutoDistributeChange],
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-gold" />
          <span className="text-sm font-medium">{fileName}</span>
          <Badge variant="secondary">{parsed.length} leads</Badge>
        </div>
        {!importResult && (
          <Button variant="ghost" size="sm" onClick={onEditMapping}>
            <ChevronLeft className="h-4 w-4 mr-1" />
            Edit Mapping
          </Button>
        )}
      </div>

      {parseErrors.length > 0 && (
        <div className="bg-destructive/5 border border-destructive/20 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-1">
            <AlertCircle className="h-4 w-4 text-destructive" />
            <span className="text-sm font-medium text-destructive">
              {parseErrors.length} warnings
            </span>
          </div>
          {parseErrors.slice(0, 5).map((err, i) => (
            <ParseErrorItem key={i} message={err} />
          ))}
          {parseErrors.length > 5 && (
            <p className="text-xs text-muted-foreground mt-1">
              ...and {parseErrors.length - 5} more
            </p>
          )}
        </div>
      )}

      {parsed.length > 0 && (
        <div className="border rounded-lg overflow-hidden max-h-[260px] overflow-y-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">Name</TableHead>
                <TableHead className="text-xs">Email</TableHead>
                <TableHead className="text-xs">Phone</TableHead>
                <TableHead className="text-xs">Company</TableHead>
                <TableHead className="text-xs">Source</TableHead>
                <TableHead className="text-xs">Priority</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {parsed.slice(0, 20).map((lead, i) => (
                <LeadRow key={i} lead={lead} />
              ))}
            </TableBody>
          </Table>
          {parsed.length > 20 && (
            <p className="text-xs text-center text-muted-foreground py-2">
              ...and {parsed.length - 20} more
            </p>
          )}
        </div>
      )}

      {importResult ? (
        <div className="space-y-3">
          <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3 space-y-1">
            <p className="text-sm font-medium text-green-700 dark:text-green-400">
              Import Complete
            </p>
            <p className="text-xs text-muted-foreground">
              {importResult.imported} imported, {importResult.skipped} skipped,{" "}
              {importResult.updated} updated
            </p>
            {importResult.distributed != null && importResult.distributed > 0 && (
              <p className="text-xs text-blue-600 dark:text-blue-400 font-medium">
                {importResult.distributed} leads distributed to{" "}
                {importResult.salesPeopleCount} sales rep
                {(importResult.salesPeopleCount ?? 0) > 1 ? "s" : ""} (
                {Math.floor(
                  importResult.distributed / (importResult.salesPeopleCount || 1),
                )}{" "}
                each)
              </p>
            )}
            {importResult.errors.length > 0 && (
              <div className="mt-2 space-y-0.5">
                {importResult.errors.slice(0, 5).map((err, i) => (
                  <ImportErrorItem key={i} row={err.row} message={err.message} />
                ))}
                {importResult.errors.length > 5 && (
                  <p className="text-xs text-muted-foreground">
                    ...and {importResult.errors.length - 5} more errors
                  </p>
                )}
              </div>
            )}
          </div>
          <Button
            className="w-full"
            variant="outline"
            onClick={onClose}
          >
            Close
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          <label className="flex items-center gap-2.5 rounded-lg border bg-muted/30 px-3 py-2.5 cursor-pointer">
            <input
              type="checkbox"
              checked={autoDistribute}
              onChange={handleCheckboxChange}
              className="h-4 w-4 rounded border-input accent-gold"
            />
            <div>
              <p className="text-sm font-medium leading-none">
                Auto-distribute to sales team
              </p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Evenly split imported leads across active sales reps
              </p>
            </div>
          </label>

          <Button
            className="w-full bg-gold hover:bg-gold/80 text-white"
            onClick={onImport}
            disabled={isImporting || !parsed.length}
          >
            {isImporting ? (
              <span className="flex items-center gap-2">
                <span className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Importing...
              </span>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Import {parsed.length} Leads
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
});
