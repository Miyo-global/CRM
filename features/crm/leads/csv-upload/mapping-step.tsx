"use client";

import { memo, useCallback } from "react";
import { FileText, ArrowRight, AlertCircle, ChevronLeft, X } from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CRM_FIELDS } from "./types";


interface MappingRowProps {
  header: string;
  colIndex: number;
  previewValue: string | undefined;
  mappedField: string;
  onValueChange: (colIndex: number, value: string) => void;
}

const MappingRow = memo(function MappingRow({
  header,
  colIndex,
  previewValue,
  mappedField,
  onValueChange,
}: MappingRowProps) {
  const handleChange = useCallback(
    (v: string) => onValueChange(colIndex, v),
    [colIndex, onValueChange],
  );

  return (
    <TableRow>
      <TableCell className="text-xs">
        <span className="font-medium">{header || `(column ${colIndex + 1})`}</span>
        {previewValue && (
          <span className="block text-[10px] text-muted-foreground truncate max-w-[160px]">
            e.g. {previewValue}
          </span>
        )}
      </TableCell>
      <TableCell className="text-center text-muted-foreground px-1">
        <ArrowRight className="h-3.5 w-3.5" />
      </TableCell>
      <TableCell>
        <Select value={mappedField} onValueChange={handleChange}>
          <SelectTrigger className="h-7 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {CRM_FIELDS.map((f) => (
              <SelectItem key={f.value} value={f.value} className="text-xs">
                {f.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </TableCell>
    </TableRow>
  );
});


interface MappingStepProps {
  fileName: string;
  rawHeaders: string[];
  rawRows: string[][];
  fieldMappings: Record<number, string>;
  hasNameMapped: boolean;
  onMappingChange: (colIndex: number, value: string) => void;
  onConfirm: () => void;
  onBack: () => void;
}

export const MappingStep = memo(function MappingStep({
  fileName,
  rawHeaders,
  rawRows,
  fieldMappings,
  hasNameMapped,
  onMappingChange,
  onConfirm,
  onBack,
}: MappingStepProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-gold" />
          <span className="text-sm font-medium">{fileName}</span>
          <Badge variant="secondary">{rawRows.length} rows detected</Badge>
        </div>
        <Button variant="ghost" size="sm" onClick={onBack}>
          <X className="h-4 w-4 mr-1" />
          Change File
        </Button>
      </div>

      <p className="text-xs text-muted-foreground">
        Review the auto-detected column mappings below. Adjust any that are
        incorrect or skip columns you don&apos;t need.
      </p>

      <ScrollArea className="max-h-[320px] border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-xs w-1/2">CSV Column</TableHead>
              <TableHead className="text-xs w-8 text-center"></TableHead>
              <TableHead className="text-xs">Maps To CRM Field</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rawHeaders.map((header, i) => (
              <MappingRow
                key={i}
                header={header}
                colIndex={i}
                previewValue={rawRows[0]?.[i]}
                mappedField={fieldMappings[i] ?? "_skip"}
                onValueChange={onMappingChange}
              />
            ))}
          </TableBody>
        </Table>
      </ScrollArea>

      {!hasNameMapped && (
        <div className="flex items-center gap-2 p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
          <AlertCircle className="h-4 w-4 text-amber-600 shrink-0" />
          <p className="text-xs text-amber-700 dark:text-amber-400">
            Map at least one column to <strong>Name</strong> to continue.
          </p>
        </div>
      )}

      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={onBack} className="gap-1">
          <ChevronLeft className="h-3.5 w-3.5" />
          Back
        </Button>
        <Button
          className="flex-1 bg-gold hover:bg-gold/80 text-white gap-1"
          disabled={!hasNameMapped}
          onClick={onConfirm}
        >
          Apply Mapping
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
});
