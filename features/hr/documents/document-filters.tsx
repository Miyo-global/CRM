"use client";

import { useMemo } from "react";
import { Search, HelpCircle, HardDrive } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { SearchableCombobox } from "@/components/ui/searchable-combobox";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { BUILT_IN_CATEGORY_TABS } from "@/lib/hr/document-library-constants";

const ALL_TYPES_LABEL = "All types";

export const DOCUMENT_TYPES = [
  { value: "CONTRACT", label: "Contract" },
  { value: "CERTIFICATE", label: "Certificate" },
  { value: "ID_PROOF", label: "ID Proof" },
  { value: "PAYSLIP", label: "Payslip" },
  { value: "POLICY", label: "Policy" },
  { value: "OFFER_LETTER", label: "Offer Letter" },
  { value: "RESUME", label: "Resume" },
  { value: "OTHER", label: "Other" },
];

export interface DocumentFiltersProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  selectedType: string;
  onTypeChange: (value: string) => void;
  selectedCategory: string;
  onCategoryChange: (value: string) => void;
  customFolderNames: string[];
  storagePercent?: number;
  maxStorageGB?: number;
  usedStorageGB?: number;
}

export function DocumentFilters({
  searchTerm,
  onSearchChange,
  selectedType,
  onTypeChange,
  selectedCategory,
  onCategoryChange,
  customFolderNames,
  storagePercent,
  maxStorageGB = 20,
  usedStorageGB,
}: DocumentFiltersProps) {
  const folderOptions = [
    ...BUILT_IN_CATEGORY_TABS,
    ...customFolderNames.filter(
      (name) => !(BUILT_IN_CATEGORY_TABS as readonly string[]).includes(name),
    ),
  ];

  const typeOptions = useMemo(
    () => [ALL_TYPES_LABEL, ...DOCUMENT_TYPES.map((t) => t.label)],
    [],
  );

  const selectedTypeLabel =
    selectedType === "all"
      ? ALL_TYPES_LABEL
      : DOCUMENT_TYPES.find((t) => t.value === selectedType)?.label ?? ALL_TYPES_LABEL;

  const handleTypeLabelChange = (label: string) => {
    if (label === ALL_TYPES_LABEL) {
      onTypeChange("all");
      return;
    }
    const match = DOCUMENT_TYPES.find((t) => t.label === label);
    onTypeChange(match ? match.value : "all");
  };

  return (
    <Card className="shadow-sm border">
      <CardContent className="p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:gap-4 w-full">
          <div className="relative flex-1 min-w-0">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              placeholder="Search by name, tag, or content..."
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-9 border-0 bg-muted/50 focus-visible:bg-background w-full"
              aria-label="Search documents"
            />
          </div>

          <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:shrink-0">
            <div className="flex items-center gap-2 min-w-[200px] sm:min-w-[220px]">
              <span className="text-xs font-medium text-muted-foreground whitespace-nowrap flex items-center gap-1">
                Folder / view
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button type="button" className="text-muted-foreground hover:text-foreground">
                        <HelpCircle className="h-3.5 w-3.5" aria-label="Folder help" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="max-w-xs text-xs">
                      Custom folders group files by category. Quick views (Contracts, Policies, etc.)
                      filter by document type.
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </span>
              <SearchableCombobox
                options={folderOptions}
                value={selectedCategory}
                onValueChange={onCategoryChange}
                placeholder="All Files"
                searchPlaceholder="Search folders…"
                emptyMessage="No folders found."
                className="flex-1"
                aria-label="Filter by folder or view"
              />
            </div>

            <div className="flex items-center gap-2 min-w-[200px] sm:min-w-[220px]">
              <span className="text-xs font-medium text-muted-foreground whitespace-nowrap">
                Document type
              </span>
              <SearchableCombobox
                options={typeOptions}
                value={selectedTypeLabel}
                onValueChange={handleTypeLabelChange}
                placeholder="All types"
                searchPlaceholder="Search types…"
                emptyMessage="No types found."
                className="flex-1 min-w-[7.5rem]"
                aria-label="Filter by document type"
              />
            </div>
          </div>

          {typeof storagePercent === "number" && (
            <div
              className="flex items-center gap-2 rounded-lg border bg-muted/30 px-3 py-2 shrink-0 min-w-[200px]"
              title={`${usedStorageGB?.toFixed(2) ?? "0"} GB of ${maxStorageGB} GB used`}
            >
              <HardDrive
                className={`h-4 w-4 shrink-0 ${
                  storagePercent > 80
                    ? "text-red-500"
                    : storagePercent > 50
                      ? "text-amber-500"
                      : "text-emerald-500"
                }`}
                aria-hidden
              />
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
                  Storage
                </p>
                <div className="flex items-center gap-2">
                  <div className="h-1.5 flex-1 rounded-full bg-muted overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        storagePercent > 80
                          ? "bg-red-500"
                          : storagePercent > 50
                            ? "bg-amber-500"
                            : "bg-emerald-500"
                      }`}
                      style={{ width: `${storagePercent}%` }}
                    />
                  </div>
                  <span className="text-xs font-semibold tabular-nums">{storagePercent}%</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
