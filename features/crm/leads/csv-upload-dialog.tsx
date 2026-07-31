"use client";

import { useState, useCallback, useMemo } from "react";
import { Upload, FileText, Download, AlertCircle, CheckCircle2, X, ArrowRight, ChevronLeft } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useBulkImportLeads } from "@/lib/api/hooks/leads";
import { toast } from "sonner";
import { ACCEPTED_EXTENSIONS, CRM_FIELDS, type ParsedLead } from "./csv-upload/types";
import { matchHeader, getFileExtension, extractCSV, extractExcel, applyMapping } from "./csv-upload/file-parsers";

export function CsvUploadDialog({ onSuccess }: { onSuccess?: () => void }) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<"upload" | "mapping" | "preview">("upload");

  const [rawHeaders, setRawHeaders] = useState<string[]>([]);
  const [rawRows, setRawRows] = useState<string[][]>([]);
  const [fieldMappings, setFieldMappings] = useState<Record<number, string>>({});
  const [fileName, setFileName] = useState("");
  const [isParsing, setIsParsing] = useState(false);

  const [parsed, setParsed] = useState<ParsedLead[] | null>(null);
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const [autoDistribute, setAutoDistribute] = useState(true);

  const [importResult, setImportResult] = useState<{
    imported: number;
    skipped: number;
    updated: number;
    errors: { row: number; message: string }[];
    duplicatesFound: number;
    distributed?: number;
    salesPeopleCount?: number;
  } | null>(null);

  const bulkImport = useBulkImportLeads();

  const handleFile = useCallback(async (file: File) => {
    const ext = getFileExtension(file.name);
    if (!(ACCEPTED_EXTENSIONS as readonly string[]).includes(ext)) {
      toast.error("Unsupported file format. Use .csv, .xlsx, or .xls");
      return;
    }

    setFileName(file.name);
    setIsParsing(true);

    try {
      let headers: string[] = [];
      let rows: string[][] = [];

      if (ext === ".csv") {
        const text = await file.text();
        ({ headers, rows } = extractCSV(text));
      } else {
        const buffer = await file.arrayBuffer();
        ({ headers, rows } = await extractExcel(buffer));
      }

      if (headers.length === 0) {
        toast.error("Could not read file headers. Check the file format.");
        return;
      }

      const mappings: Record<number, string> = {};
      headers.forEach((h, i) => {
        const field = matchHeader(h);
        mappings[i] = field ?? "_skip";
      });

      setRawHeaders(headers);
      setRawRows(rows);
      setFieldMappings(mappings);
      setStep("mapping");
    } catch {
      toast.error("Failed to parse file. Please check the format.");
    } finally {
      setIsParsing(false);
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const file = e.dataTransfer.files[0];
      if (file) {
        const ext = getFileExtension(file.name);
        if ((ACCEPTED_EXTENSIONS as readonly string[]).includes(ext)) handleFile(file);
        else toast.error("Please drop a .csv, .xlsx, or .xls file");
      }
    },
    [handleFile],
  );

  const hasNameMapped = useMemo(
    () => Object.values(fieldMappings).includes("name"),
    [fieldMappings],
  );

  const handleConfirmMapping = useCallback(() => {
    const { leads, errors } = applyMapping(rawHeaders, rawRows, fieldMappings);
    setParsed(leads);
    setParseErrors(errors);
    setStep("preview");
  }, [rawHeaders, rawRows, fieldMappings]);

  const handleImport = useCallback(() => {
    if (!parsed?.length) return;
    bulkImport.mutate(
      {
        leads: parsed.map((l) => ({
          name: l.name,
          email: l.email || "",
          phone: l.phone,
          company: l.company,
          source: l.source as "referral" | "campaign" | "cold_call" | "website" | "social_media" | "walk_in" | "other" | undefined,
          notes: l.notes,
          city: l.city,
          designation: l.designation,
          referredBy: l.referredBy,
          potentialValue: l.potentialValue,
          investmentInterest: l.investmentInterest,
          whatsappNumber: l.whatsappNumber,
          website: l.website,
          priority: l.priority as "HOT" | "WARM" | "COLD" | undefined,
          tags: l.tags ? l.tags.split(",").map((t) => t.trim()) : undefined,
        })),
        autoDistribute,
      },
      {
        onSuccess: (data) => {
          setImportResult(data);
          if (data.imported > 0) {
            toast.success(`Imported ${data.imported} leads${data.skipped ? `, ${data.skipped} skipped` : ""}`);
            onSuccess?.();
          } else if (data.skipped > 0) {
            toast.warning(`All ${data.skipped} leads were duplicates and skipped`);
          }
        },
        onError: (err) => toast.error(err.message),
      },
    );
  }, [parsed, autoDistribute, bulkImport, onSuccess]);

  const downloadTemplate = useCallback(() => {
    const csv =
      "name,email,phone,company,source,notes,city,designation,priority,potential value,referred by\n" +
      "John Doe,john@example.com,+919876543210,Acme Corp,website,Interested in premium plan,Hyderabad,CEO,HOT,500000,Ravi Kumar\n";
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "leads-template.csv";
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  const reset = useCallback(() => {
    setStep("upload");
    setRawHeaders([]);
    setRawRows([]);
    setFieldMappings({});
    setParsed(null);
    setParseErrors([]);
    setFileName("");
    setIsParsing(false);
    setImportResult(null);
    setAutoDistribute(true);
  }, []);


  const stepLabel =
    step === "upload" ? "Step 1 of 3 — Upload File" :
    step === "mapping" ? "Step 2 of 3 — Map Columns" :
    "Step 3 of 3 — Review & Import";

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset(); }}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Upload className="h-4 w-4 mr-2" />
          Import Leads
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader className="mb-1">
          <DialogTitle>Import Leads</DialogTitle>
          <p className="text-xs text-muted-foreground">{stepLabel}</p>
        </DialogHeader>

        <div className="flex items-center gap-1 mb-4">
          {["upload", "mapping", "preview"].map((s, i) => (
            <div key={s} className="flex items-center gap-1">
              <div
                className={`h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-bold transition-colors ${
                  step === s
                    ? "bg-gold text-white"
                    : i < ["upload", "mapping", "preview"].indexOf(step)
                    ? "bg-gold/30 text-gold"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {i + 1}
              </div>
              {i < 2 && <div className="h-px w-6 bg-border" />}
            </div>
          ))}
        </div>

        {step === "upload" && !isParsing && (
          <div className="space-y-4">
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-gold/50 transition-colors"
            >
              <Upload className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
              <p className="text-sm font-medium mb-1">Drop your file here</p>
              <p className="text-xs text-muted-foreground mb-3">Supports .csv, .xlsx, and .xls</p>
              <input
                type="file"
                accept=".csv,.xlsx,.xls,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
                className="hidden"
                id="lead-file-upload"
                aria-label="Upload leads file"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFile(file);
                }}
              />
              <Button variant="outline" size="sm" onClick={() => document.getElementById("lead-file-upload")?.click()}>
                <FileText className="h-4 w-4 mr-2" />
                Browse Files
              </Button>
            </div>
            <div className="flex items-center justify-between px-1">
              <p className="text-xs text-muted-foreground">
                Required: <code className="text-foreground">name</code>. Optional: email, phone, company, source, city, designation, priority, notes
              </p>
              <Button variant="ghost" size="sm" onClick={downloadTemplate}>
                <Download className="h-3.5 w-3.5 mr-1" />
                Template
              </Button>
            </div>
          </div>
        )}

        {isParsing && (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="h-8 w-8 border-2 border-gold border-t-transparent rounded-full animate-spin mb-3" />
            <p className="text-sm text-muted-foreground">Parsing {fileName}...</p>
          </div>
        )}

        {step === "mapping" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-gold" />
                <span className="text-sm font-medium">{fileName}</span>
                <Badge variant="secondary">{rawRows.length} rows detected</Badge>
              </div>
              <Button variant="ghost" size="sm" onClick={reset}>
                <X className="h-4 w-4 mr-1" />
                Change File
              </Button>
            </div>

            <p className="text-xs text-muted-foreground">
              Review the auto-detected column mappings below. Adjust any that are incorrect or skip columns you don&apos;t need.
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
                  {rawHeaders.map((header, i) => {
                    const previewVal = rawRows[0]?.[i];
                    return (
                      <TableRow key={i}>
                        <TableCell className="text-xs">
                          <span className="font-medium">{header || `(column ${i + 1})`}</span>
                          {previewVal && (
                            <span className="block text-[10px] text-muted-foreground truncate max-w-[160px]">
                              e.g. {previewVal}
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-center text-muted-foreground px-1">
                          <ArrowRight className="h-3.5 w-3.5" />
                        </TableCell>
                        <TableCell>
                          <Select
                            value={fieldMappings[i] ?? "_skip"}
                            onValueChange={(v) =>
                              setFieldMappings((prev) => ({ ...prev, [i]: v }))
                            }
                          >
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
                  })}
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
              <Button variant="outline" size="sm" onClick={reset} className="gap-1">
                <ChevronLeft className="h-3.5 w-3.5" />
                Back
              </Button>
              <Button
                className="flex-1 bg-gold hover:bg-gold/80 text-white gap-1"
                disabled={!hasNameMapped}
                onClick={handleConfirmMapping}
              >
                Apply Mapping
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {step === "preview" && parsed !== null && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-gold" />
                <span className="text-sm font-medium">{fileName}</span>
                <Badge variant="secondary">{parsed.length} leads</Badge>
              </div>
              {!importResult && (
                <Button variant="ghost" size="sm" onClick={() => setStep("mapping")}>
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Edit Mapping
                </Button>
              )}
            </div>

            {parseErrors.length > 0 && (
              <div className="bg-destructive/5 border border-destructive/20 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-1">
                  <AlertCircle className="h-4 w-4 text-destructive" />
                  <span className="text-sm font-medium text-destructive">{parseErrors.length} warnings</span>
                </div>
                {parseErrors.slice(0, 5).map((err, i) => (
                  <p key={i} className="text-xs text-muted-foreground">{err}</p>
                ))}
                {parseErrors.length > 5 && (
                  <p className="text-xs text-muted-foreground mt-1">...and {parseErrors.length - 5} more</p>
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
                      <TableRow key={i}>
                        <TableCell className="text-xs font-medium">{lead.name}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{lead.email || ""}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{lead.phone || ""}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{lead.company || ""}</TableCell>
                        <TableCell className="text-xs">
                          {lead.source ? <Badge variant="outline" className="text-[10px]">{lead.source}</Badge> : ""}
                        </TableCell>
                        <TableCell className="text-xs">
                          {lead.priority ? <Badge variant="outline" className="text-[10px]">{lead.priority}</Badge> : ""}
                        </TableCell>
                      </TableRow>
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
                  <p className="text-sm font-medium text-green-700 dark:text-green-400">Import Complete</p>
                  <p className="text-xs text-muted-foreground">
                    {importResult.imported} imported, {importResult.skipped} skipped, {importResult.updated} updated
                  </p>
                  {importResult.distributed && importResult.distributed > 0 && (
                    <p className="text-xs text-blue-600 dark:text-blue-400 font-medium">
                      {importResult.distributed} leads distributed to {importResult.salesPeopleCount} sales rep
                      {(importResult.salesPeopleCount ?? 0) > 1 ? "s" : ""} (
                      {Math.floor(importResult.distributed / (importResult.salesPeopleCount || 1))} each)
                    </p>
                  )}
                  {importResult.errors.length > 0 && (
                    <div className="mt-2 space-y-0.5">
                      {importResult.errors.slice(0, 5).map((err, i) => (
                        <p key={i} className="text-xs text-destructive">Row {err.row}: {err.message}</p>
                      ))}
                      {importResult.errors.length > 5 && (
                        <p className="text-xs text-muted-foreground">
                          ...and {importResult.errors.length - 5} more errors
                        </p>
                      )}
                    </div>
                  )}
                </div>
                <Button className="w-full" variant="outline" onClick={() => { setOpen(false); reset(); }}>
                  Close
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                <label className="flex items-center gap-2.5 rounded-lg border bg-muted/30 px-3 py-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={autoDistribute}
                    onChange={(e) => setAutoDistribute(e.target.checked)}
                    className="h-4 w-4 rounded border-input accent-gold"
                  />
                  <div>
                    <p className="text-sm font-medium leading-none">Auto-distribute to sales team</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      Evenly split imported leads across active sales reps
                    </p>
                  </div>
                </label>

                <Button
                  className="w-full bg-gold hover:bg-gold/80 text-white"
                  onClick={handleImport}
                  disabled={bulkImport.isPending || !parsed?.length}
                >
                  {bulkImport.isPending ? (
                    <span className="flex items-center gap-2">
                      <span className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Importing...
                    </span>
                  ) : (
                    <>
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      Import {parsed?.length || 0} Leads
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
