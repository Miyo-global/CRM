"use client";

import { memo, useCallback, useRef } from "react";
import { Upload, FileText, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { ACCEPTED_EXTENSIONS } from "./types";
import { getFileExtension } from "./file-parsers";

interface UploadStepProps {
  isParsing: boolean;
  fileName: string;
  onFile: (file: File) => void;
  onDownloadTemplate: () => void;
}

export const UploadStep = memo(function UploadStep({
  isParsing,
  fileName,
  onFile,
  onDownloadTemplate,
}: UploadStepProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const file = e.dataTransfer.files[0];
      if (!file) return;
      const ext = getFileExtension(file.name);
      if (ACCEPTED_EXTENSIONS.includes(ext as (typeof ACCEPTED_EXTENSIONS)[number])) {
        onFile(file);
      } else {
        toast.error("Please drop a .csv, .xlsx, or .xls file");
      }
    },
    [onFile],
  );

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) onFile(file);
    },
    [onFile],
  );

  const handleBrowseClick = useCallback(() => {
    inputRef.current?.click();
  }, []);

  if (isParsing) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <div className="h-8 w-8 border-2 border-gold border-t-transparent rounded-full animate-spin mb-3" />
        <p className="text-sm text-muted-foreground">Parsing {fileName}...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
        className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-gold/50 transition-colors"
      >
        <Upload className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
        <p className="text-sm font-medium mb-1">Drop your file here</p>
        <p className="text-xs text-muted-foreground mb-3">
          Supports .csv, .xlsx, and .xls
        </p>
        <input
          ref={inputRef}
          type="file"
          accept=".csv,.xlsx,.xls,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
          className="hidden"
          id="lead-file-upload"
          aria-label="Upload leads file"
          onChange={handleInputChange}
        />
        <Button variant="outline" size="sm" onClick={handleBrowseClick}>
          <FileText className="h-4 w-4 mr-2" />
          Browse Files
        </Button>
      </div>
      <div className="flex items-center justify-between px-1">
        <p className="text-xs text-muted-foreground">
          Required: <code className="text-foreground">name</code>. Optional:
          email, phone, company, source, city, designation, priority, notes
        </p>
        <Button variant="ghost" size="sm" onClick={onDownloadTemplate}>
          <Download className="h-3.5 w-3.5 mr-1" />
          Template
        </Button>
      </div>
    </div>
  );
});
