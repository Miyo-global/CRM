"use client";

import { useMemo } from "react";
import { Search, HelpCircle, HardDrive } from "lucide-react";
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
    <div className="flex w-full flex-wrap items-center gap-2">
      <div className="relative w-full sm:w-64">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-subtle-foreground"
          aria-hidden="true"
        />
        <Input
          type="search"
          data-page-search
          placeholder="Search by name, tag, or content..."
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-9"
          aria-label="Search documents"
        />
      </div>

      <div className="flex w-full items-center gap-2 sm:w-auto">
        <span className="flex items-center gap-1 whitespace-nowrap text-xs font-medium text-muted-foreground">
          Folder / view
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <button type="button" className="rounded-sm text-subtle-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  <HelpCircle className="size-3.5" aria-label="Folder help" />
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
          className="min-w-0 flex-1 sm:w-44 sm:flex-none"
          aria-label="Filter by folder or view"
        />
      </div>

      <div className="flex w-full items-center gap-2 sm:w-auto">
        <span className="whitespace-nowrap text-xs font-medium text-muted-foreground">
          Document type
        </span>
        <SearchableCombobox
          options={typeOptions}
          value={selectedTypeLabel}
          onValueChange={handleTypeLabelChange}
          placeholder="All types"
          searchPlaceholder="Search types…"
          emptyMessage="No types found."
          className="min-w-0 flex-1 sm:w-40 sm:flex-none"
          aria-label="Filter by document type"
        />
      </div>

          {typeof storagePercent === "number" && (
            <div
              className="flex w-full items-center gap-2 rounded-md border border-border bg-surface-sunken/40 px-3 py-1.5 sm:ml-auto sm:w-52"
              title={`${usedStorageGB?.toFixed(2) ?? "0"} GB of ${maxStorageGB} GB used`}
            >
              <HardDrive
                className={`size-4 shrink-0 ${
                  storagePercent > 80
                    ? "text-danger-strong"
                    : storagePercent > 50
                      ? "text-warning-strong"
                      : "text-success-strong"
                }`}
                aria-hidden
              />
              <div className="min-w-0 flex-1">
                <p className="text-2xs font-medium text-muted-foreground uppercase tracking-wide">
                  Storage
                </p>
                <div className="flex items-center gap-2">
                  <div className="h-1.5 flex-1 rounded-full bg-muted overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        storagePercent > 80
                          ? "bg-danger-500"
                          : storagePercent > 50
                            ? "bg-warning-500"
                            : "bg-success-500"
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
  );
}
