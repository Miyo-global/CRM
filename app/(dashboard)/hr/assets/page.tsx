"use client";

import { useState, useCallback, useMemo, useEffect } from "react";
import { format } from "date-fns";
import { parseCalendarDate } from "@/lib/date-utils";
import {
  Laptop,
  Plus,
  Package,
  CheckCircle2,
  Wrench,
  Pencil,
  Trash2,
  X,
  RotateCcw,
  Archive,
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
import {
  Tabs,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { StatusPill } from "@/components/ui/status-pill";
import { EmptyState } from "@/components/ui/empty-state";
import { QueryErrorState } from "@/components/ui/query-error-state";
import { StatsStrip } from "@/components/shared/stats-strip";
import { ListToolbar } from "@/components/shared/list-toolbar";
import type { Tone } from "@/lib/design/tones";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { DatePicker } from "@/components/ui/date-picker";
import { HrSheet } from "@/features/hr/hr-sheet";
import { useHrAssets, useCreateAsset, useUpdateAsset, useDeleteAsset, useHrEmployees } from "@/lib/api/hooks";
import {
  assetCreateSchema,
  assetFormSchema,
  DUPLICATE_SERIAL_MESSAGE,
  ASSET_NOTES_MAX_CHARS,
  ASSET_PURCHASE_COST_MAX_INR,
} from "@/lib/validations/hr-assets";
import {
  needsAssetReassignmentReason,
  validateReassignmentReason,
  ASSET_REASSIGN_REASON_MAX_CHARS,
} from "@/lib/hr/asset-assignment-lifecycle";
import { ConfirmActionDialog } from "@/features/hr/confirm-action-dialog";
import { getErrorMessage } from "@/lib/get-error-message";
import { toast } from "sonner";
import type { Asset, AssetStatus } from "@/types/hr";
import {
  buildAssetsCsvString,
  assetRowsToXlsxSheets,
  type AssetExportRow,
} from "@/lib/hr/assets-export-format";
import { AssetExportSheet } from "@/features/hr/assets/asset-export-sheet";
import { EmployeeAssignCombobox } from "@/components/hr/employee-assign-combobox";
import { EmployeeAssignedAssetsPanel } from "@/features/hr/assets/employee-assigned-assets-panel";
import { DataTablePagination } from "@/components/shared/data-table-pagination";
import { DEFAULT_PAGE_SIZE, type PageSizeOption } from "@/lib/pagination-constants";
import { CURRENCY_SYMBOL, DEFAULT_LOCALE } from "@/lib/constants/locale";

function fmt(amount: string | number | null) {
  if (amount === null || amount === undefined) return "";
  return `${CURRENCY_SYMBOL}${Number(amount).toLocaleString(DEFAULT_LOCALE, { minimumFractionDigits: 0 })}`;
}

/** R3-SA-08: a name, never the raw user id. */
function assigneeName(a: Asset, employeeList: Array<{ id: string; name: string }>): string {
  if (!a.assignedTo) return "";
  return a.assignedUser?.name ?? employeeList.find((e) => e.id === a.assignedTo)?.name ?? "Unknown employee";
}

function assetsToExportRows(
  list: Asset[],
  employeeList: Array<{ id: string; name: string }>
): AssetExportRow[] {
  return list.map((a) => ({
    name: a.name ?? "",
    type: a.type ?? "",
    serialNumber: a.serialNumber ?? "",
    status: a.status ?? "",
    assignedToName: assigneeName(a, employeeList),
    purchaseCost: a.purchaseCost != null ? String(a.purchaseCost) : "",
    purchaseDate: a.purchaseDate ?? "",
    notes: a.notes ?? "",
  }));
}

const STATUS_BADGE: Record<string, { label: string; tone: Tone }> = {
  AVAILABLE: { label: "Available", tone: "success" },
  ASSIGNED: { label: "Assigned", tone: "brand" },
  MAINTENANCE: { label: "Maintenance", tone: "warning" },
  RETIRED: { label: "Retired", tone: "neutral" },
};

type ReturnAssetState = { assetId: number; assetName: string } | null;

const ASSET_TYPES = [
  "Laptop",
  "Desktop",
  "Monitor",
  "Phone",
  "Tablet",
  "Headset",
  "Keyboard",
  "Mouse",
  "Other",
] as const;

/** Preset dropdown values only (excludes "Other"). */
const ASSET_TYPE_PRESETS = ASSET_TYPES.filter((t) => t !== "Other");

/** Calendar / picker: org asset purchases from Oct 2025 onward. */
const ASSET_PURCHASE_FROM_DATE = new Date(2025, 9, 1);

function resolveAssetType(type: string, customType: string) {
  return type === "Other" ? customType.trim() : type;
}

function findDuplicateSerial(items: Asset[], serial: string, excludeId?: number) {
  const norm = serial.trim().toUpperCase();
  if (!norm) return null;
  return (
    items.find(
      (a) =>
        a.serialNumber?.trim().toUpperCase() === norm &&
        (excludeId === undefined || a.id !== excludeId),
    ) ?? null
  );
}

function sanitizeAssetSerialInput(value: string) {
  return value.replace(/[^A-Za-z0-9-]/g, "").toUpperCase().slice(0, 64);
}

export default function HrAssetsPage() {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editAsset, setEditAsset] = useState<Asset | null>(null);
  const [deleteAssetId, setDeleteAssetId] = useState<number | null>(null);
  const [returnAsset, setReturnAsset] = useState<ReturnAssetState>(null);
  const [statusFilter, setStatusFilter] = useState<string | undefined>();
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<PageSizeOption>(DEFAULT_PAGE_SIZE);

  const [name, setName] = useState("");
  const [type, setType] = useState<string>("Laptop");
  const [customType, setCustomType] = useState("");
  const [status, setStatus] = useState("AVAILABLE");
  const [serialNumber, setSerialNumber] = useState("");
  const [brand, setBrand] = useState("");
  const [model, setModel] = useState("");
  const [assignedTo, setAssignedTo] = useState<string>("");
  const [purchaseDate, setPurchaseDate] = useState("");
  const [purchaseCost, setPurchaseCost] = useState("");
  const [notes, setNotes] = useState("");
  const [reassignmentReason, setReassignmentReason] = useState("");

  const { data, isLoading, isError, error, refetch } = useHrAssets();
  const { data: employeesData } = useHrEmployees();
  const createAsset = useCreateAsset();
  const updateAsset = useUpdateAsset();
  const deleteAsset = useDeleteAsset();

  const items: Asset[] = Array.isArray(data) ? data : [];

  const employees = employeesData as { data?: Array<{ id: string; name: string }>; items?: Array<{ id: string; name: string }> } | Array<{ id: string; name: string }> | undefined;
  const employeeList: Array<{ id: string; name: string }> = Array.isArray(employees) ? employees : (employees?.data ?? employees?.items ?? []);

  const resolvedType = useMemo(() => resolveAssetType(type, customType), [type, customType]);

  const assignedAssetsForEmployee = useMemo(() => {
    if (!assignedTo) return [];
    return items.filter(
      (a) => a.assignedTo === assignedTo && a.status === "ASSIGNED",
    );
  }, [items, assignedTo]);

  const needsReassignmentReason = useMemo(() => {
    if (!editAsset || status !== "ASSIGNED" || !assignedTo.trim()) return false;
    return needsAssetReassignmentReason({
      priorAssignmentCount: editAsset.assignmentCount ?? 0,
      previousAssigneeId: editAsset.assignedTo,
      nextAssigneeId: assignedTo,
    });
  }, [editAsset, status, assignedTo]);

  const filteredItems = useMemo(() => {
    const rows = statusFilter ? items.filter((a) => a.status === statusFilter) : items;
    const q = searchQuery.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((a) => {
      const assignee = assigneeName(a, employeeList);
      const statusLabel = STATUS_BADGE[a.status ?? "AVAILABLE"]?.label ?? a.status ?? "";
      return (
        a.name?.toLowerCase().includes(q) ||
        a.type?.toLowerCase().includes(q) ||
        a.serialNumber?.toLowerCase().includes(q) ||
        assignee.toLowerCase().includes(q) ||
        statusLabel.toLowerCase().includes(q) ||
        a.notes?.toLowerCase().includes(q)
      );
    });
  }, [items, statusFilter, searchQuery, employeeList]);

  const hasActiveFilters = !!statusFilter || !!searchQuery.trim();

  useEffect(() => {
    setPage(1);
  }, [statusFilter, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filteredItems.length / pageSize));
  const safePage = Math.min(page, totalPages);

  const paginatedItems = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return filteredItems.slice(start, start + pageSize);
  }, [filteredItems, safePage, pageSize]);

  const handlePageSizeChange = useCallback((size: number) => {
    setPageSize(size as PageSizeOption);
    setPage(1);
  }, []);

  const counts = items.reduce(
    (acc, a) => {
      if (a.status === "AVAILABLE") acc.available++;
      else if (a.status === "ASSIGNED") acc.assigned++;
      else if (a.status === "MAINTENANCE") acc.maintenance++;
      else if (a.status === "RETIRED") acc.retired++;
      acc.total++;
      return acc;
    },
    { total: 0, available: 0, assigned: 0, maintenance: 0, retired: 0 }
  );

  const resetForm = useCallback(() => {
    setName("");
    setType("Laptop");
    setCustomType("");
    setStatus("AVAILABLE");
    setSerialNumber("");
    setBrand("");
    setModel("");
    setAssignedTo("");
    setPurchaseDate("");
    setPurchaseCost("");
    setNotes("");
    setReassignmentReason("");
  }, []);

  const handleExportCsvLocal = useCallback(() => {
    try {
      const rows = assetsToExportRows(filteredItems, employeeList);
      const csv = buildAssetsCsvString(rows);
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `assets-export-${format(new Date(), "yyyy-MM-dd")}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error("Export failed");
    }
  }, [filteredItems, employeeList]);

  const handleExportExcelLocal = useCallback(async () => {
    try {
      const { downloadXlsx } = await import("@/lib/export/xlsx-utils");
      const rows = assetsToExportRows(filteredItems, employeeList);
      await downloadXlsx(`assets-export-${format(new Date(), "yyyy-MM-dd")}.xlsx`, assetRowsToXlsxSheets(rows));
    } catch {
      toast.error("Export failed");
    }
  }, [filteredItems, employeeList]);

  const loadFormFromAsset = useCallback((a: Asset) => {
    setName(a.name ?? "");
    const storedType = (a.type ?? "").trim();
    if (!storedType) {
      setType("Laptop");
      setCustomType("");
    } else if ((ASSET_TYPE_PRESETS as readonly string[]).includes(storedType)) {
      setType(storedType);
      setCustomType("");
    } else {
      setType("Other");
      setCustomType(storedType);
    }
    setStatus(a.status ?? "AVAILABLE");
    setSerialNumber(a.serialNumber ?? "");
    setBrand(a.brand ?? "");
    setModel(a.model ?? "");
    setAssignedTo(a.assignedTo ?? "");
    setPurchaseDate(a.purchaseDate ?? "");
    if (a.purchaseCost != null && a.purchaseCost !== "") {
      const n = Number(a.purchaseCost);
      setPurchaseCost(
        Number.isFinite(n)
          ? String(Math.min(Math.max(0, n), ASSET_PURCHASE_COST_MAX_INR))
          : "",
      );
    } else {
      setPurchaseCost("");
    }
    setNotes(a.notes ?? "");
    setReassignmentReason("");
  }, []);

  const buildFormInput = useCallback(() => {
    const resolvedType = resolveAssetType(type, customType);
    if (type === "Other" && resolvedType === "") {
      toast.error("Please specify the asset type");
      return null;
    }
    return {
      name: name.trim(),
      type: resolvedType,
      serialNumber: serialNumber.trim(),
      brand: brand.trim(),
      model: model.trim(),
      purchaseDate,
      purchaseCost: purchaseCost.trim() === "" ? "" : purchaseCost.trim().replace(/,/g, ""),
      notes: notes.trim() || undefined,
    };
  }, [name, type, customType, serialNumber, brand, model, purchaseDate, purchaseCost, notes]);

  const buildCreatePayload = useCallback(() => {
    const base = buildFormInput();
    if (!base) return null;
    const parsed = assetCreateSchema.safeParse(base);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Invalid input");
      return null;
    }
    const dup = findDuplicateSerial(items, parsed.data.serialNumber ?? "");
    if (dup) {
      toast.error(DUPLICATE_SERIAL_MESSAGE);
      return null;
    }
    return parsed.data;
  }, [buildFormInput, items]);

  const buildEditPayload = useCallback(() => {
    const base = buildFormInput();
    if (!base) return null;
    const parsed = assetFormSchema.safeParse({
      ...base,
      status,
      assignedTo: status === "ASSIGNED" ? assignedTo.trim() || undefined : undefined,
    });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Invalid input");
      return null;
    }
    const dup = findDuplicateSerial(
      items,
      parsed.data.serialNumber ?? "",
      editAsset?.id,
    );
    if (dup) {
      toast.error(DUPLICATE_SERIAL_MESSAGE);
      return null;
    }
    return parsed.data;
  }, [buildFormInput, status, assignedTo, items, editAsset?.id]);

  const handleTypeSelectChange = useCallback((value: string) => {
    setType(value);
    if (value !== "Other") setCustomType("");
  }, []);

  const handleStatusChange = useCallback((value: string) => {
    setStatus(value);
    if (value !== "ASSIGNED") setAssignedTo("");
  }, []);

  const handleCreate = useCallback(() => {
    const payload = buildCreatePayload();
    if (!payload) return;
    createAsset.mutate(
      {
        name: payload.name,
        type: payload.type,
        serialNumber: payload.serialNumber,
        brand: payload.brand,
        model: payload.model,
        purchaseDate: payload.purchaseDate,
        purchaseCost: payload.purchaseCost,
        notes: payload.notes,
      },
      {
        onSuccess: () => { toast.success("Asset added"); setSheetOpen(false); resetForm(); },
        onError: (e) => toast.error(getErrorMessage(e)),
      },
    );
  }, [buildCreatePayload, createAsset, resetForm]);

  const handleUpdate = useCallback(() => {
    if (!editAsset) return;
    const payload = buildEditPayload();
    if (!payload) return;

    const reasonError = validateReassignmentReason(
      reassignmentReason,
      needsReassignmentReason,
    );
    if (reasonError) {
      toast.error(reasonError);
      return;
    }

    updateAsset.mutate(
      {
        assetId: editAsset.id,
        name: payload.name,
        type: payload.type,
        status: payload.status as AssetStatus,
        serialNumber: payload.serialNumber,
        brand: payload.brand,
        model: payload.model,
        assignedTo: payload.status === "ASSIGNED" ? payload.assignedTo : "",
        purchaseDate: payload.purchaseDate,
        purchaseCost: payload.purchaseCost,
        notes: payload.notes,
        reassignmentReason: needsReassignmentReason
          ? reassignmentReason.trim()
          : undefined,
      },
      {
        onSuccess: () => {
          toast.success("Asset updated");
          setEditAsset(null);
          resetForm();
        },
        onError: (e) => toast.error(getErrorMessage(e)),
      },
    );
  }, [editAsset, buildEditPayload, updateAsset, resetForm, reassignmentReason, needsReassignmentReason]);

  const handleConfirmDelete = useCallback(() => {
    if (deleteAssetId === null) return;
    deleteAsset.mutate(deleteAssetId, {
      onSuccess: () => {
        toast.success("Asset deleted");
        setDeleteAssetId(null);
      },
      onError: (e) => toast.error(getErrorMessage(e)),
    });
  }, [deleteAssetId, deleteAsset]);

  const handleConfirmReturn = useCallback(() => {
    if (!returnAsset) return;
    updateAsset.mutate(
      {
        assetId: returnAsset.assetId,
        status: "AVAILABLE",
        assignedTo: "",
      },
      {
        onSuccess: () => {
          toast.success("Asset returned to inventory");
          setReturnAsset(null);
        },
        onError: (e) => toast.error(getErrorMessage(e)),
      },
    );
  }, [returnAsset, updateAsset]);

  const assetDetailFields = (
    <>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Asset Name</label>
            <Input value={name} onChange={(e) => setName(e.target.value)} maxLength={120} placeholder="e.g. MacBook Pro 16-inch" />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Type</label>
            <Select value={type} onValueChange={handleTypeSelectChange}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {ASSET_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {type === "Other" ? (
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Specify type</label>
              <Input
                value={customType}
                onChange={(e) => setCustomType(e.target.value)}
                placeholder="e.g. Docking station"
                maxLength={64}
              />
              <p className="text-xs text-muted-foreground text-right">{customType.length}/64</p>
            </div>
          ) : null}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Brand</label>
              <Input
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                placeholder="e.g. Apple"
                maxLength={64}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Model</label>
              <Input
                value={model}
                onChange={(e) => setModel(e.target.value)}
                placeholder="e.g. MacBook Pro M3"
                maxLength={64}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Serial Number</label>
            <Input
              value={serialNumber}
              onChange={(e) => setSerialNumber(sanitizeAssetSerialInput(e.target.value))}
              placeholder="Letters, numbers, hyphens"
              maxLength={64}
              className="font-mono"
              autoCapitalize="none"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Purchase Date</label>
              <DatePicker
                value={purchaseDate}
                onChange={setPurchaseDate}
                placeholder="Pick date"
                fromDate={ASSET_PURCHASE_FROM_DATE}
                // Purchased today at the latest; the schema rejects a future date too (R2-HR-10).
                toDate={new Date()}
                fromYear={2025}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Purchase Cost (₹)</label>
              <Input
                value={purchaseCost}
                onChange={(e) => setPurchaseCost(e.target.value)}
                type="text"
                inputMode="decimal"
                placeholder="Enter amount"
                autoComplete="off"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Notes (optional)</label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value.slice(0, ASSET_NOTES_MAX_CHARS))}
              placeholder="Optional notes..."
              rows={2}
              maxLength={ASSET_NOTES_MAX_CHARS}
            />
            <p className="text-xs text-muted-foreground text-right">
              {notes.length}/{ASSET_NOTES_MAX_CHARS}
            </p>
          </div>
    </>
  );

  return (
    <PageWrapper
      title="Assets"
      actions={
        <div className="flex items-center gap-2 flex-wrap justify-end">
          <AssetExportSheet
            statusFilter={statusFilter}
            onStatusFilterChange={setStatusFilter}
            rowCount={filteredItems.length}
            onExportCsv={handleExportCsvLocal}
            onExportXlsx={() => void handleExportExcelLocal()}
          />
          <Button size="sm" onClick={() => setSheetOpen(true)}>
            <Plus className="size-3.5" aria-hidden="true" />
            Add Asset
          </Button>
        </div>
      }
      badge={isLoading ? undefined : counts.total}
      filters={
        <ListToolbar
          className="w-full"
          search={{ value: searchQuery, onChange: setSearchQuery, placeholder: "Search name, type, serial, assignee…" }}
          filters={
            searchQuery ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setSearchQuery("")}
                aria-label="Clear search"
              >
                <X className="size-3.5" aria-hidden="true" />
              </Button>
            ) : null
          }
          view={
            <Tabs value={statusFilter ?? "all"} onValueChange={(v) => setStatusFilter(v === "all" ? undefined : v)}>
              <TabsList>
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="AVAILABLE">Available</TabsTrigger>
                <TabsTrigger value="ASSIGNED">Assigned</TabsTrigger>
                <TabsTrigger value="MAINTENANCE">Maintenance</TabsTrigger>
                <TabsTrigger value="RETIRED">Retired</TabsTrigger>
              </TabsList>
            </Tabs>
          }
        />
      }
    >
      {isError ? (
        <QueryErrorState error={error} onRetry={() => void refetch()} />
      ) : (
      <div className="space-y-6">
        <StatsStrip
          items={[
            { label: "Total Assets", value: counts.total, icon: Package },
            { label: "Available", value: counts.available, icon: CheckCircle2, tone: "success" },
            { label: "Assigned", value: counts.assigned, icon: Laptop, tone: "brand" },
            { label: "Maintenance", value: counts.maintenance, icon: Wrench, tone: "warning" },
            { label: "Retired", value: counts.retired, icon: Archive, tone: "neutral" },
          ]}
        />

        {!isLoading && filteredItems.length === 0 ? (
          hasActiveFilters ? (
            <EmptyState
              title="No results for these filters"
              description="No assets match your filters."
              action={{ label: "Clear filters", onClick: () => { setStatusFilter(undefined); setSearchQuery(""); } }}
            />
          ) : (
            <EmptyState
              title="No assets found."
              action={{ label: "Add Asset", onClick: () => setSheetOpen(true) }}
            />
          )
        ) : (
        <div className="overflow-hidden rounded-lg border border-border bg-card shadow-xs">
          <div className="flex items-center justify-between border-b border-border px-4 py-2">
            <p className="text-xs tabular-nums text-muted-foreground">
              {filteredItems.length} asset{filteredItems.length !== 1 ? "s" : ""}
              {hasActiveFilters ? " (filtered)" : ""}
            </p>
          </div>
          <ScrollArea className="w-full" type="auto">
            <div className="min-w-200">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Serial</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Assigned To</TableHead>
                    <TableHead className="text-right">Cost</TableHead>
                    <TableHead>Purchased</TableHead>
                    <TableHead className="w-22 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow><TableCell colSpan={8} className="py-8 text-center text-muted-foreground">Loading...</TableCell></TableRow>
                  ) : paginatedItems.map((a) => {
                    const badge = STATUS_BADGE[a.status ?? "AVAILABLE"] ?? { label: a.status ?? "", tone: "neutral" as const };
                    return (
                      <TableRow key={a.id}>
                        <TableCell>
                          <div className="flex min-w-0 items-center gap-2.5">
                            <span className="truncate text-sm font-medium" title={a.name ?? undefined}>{a.name}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm"><Badge variant="outline">{a.type}</Badge></TableCell>
                        <TableCell className="font-mono text-xs text-muted-foreground">{a.serialNumber ?? ""}</TableCell>
                        <TableCell><StatusPill tone={badge.tone} dot>{badge.label}</StatusPill></TableCell>
                        <TableCell className="text-sm">
                          {assigneeName(a, employeeList)}
                        </TableCell>
                        <TableCell className="text-right text-sm tabular-nums">{fmt(a.purchaseCost)}</TableCell>
                        <TableCell className="text-xs tabular-nums text-muted-foreground">
                          {a.purchaseDate ? format(parseCalendarDate(a.purchaseDate), "dd MMM yyyy") : ""}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            {a.status === "ASSIGNED" ? (
                              <Button
                                type="button"
                                size="icon-sm"
                                variant="ghost"
                                className="text-muted-foreground"
                                aria-label="Return asset to inventory"
                                title="Return to inventory"
                                onClick={() => setReturnAsset({ assetId: a.id, assetName: a.name ?? "Asset" })}
                              >
                                <RotateCcw className="size-4" />
                              </Button>
                            ) : null}
                            <Button
                              type="button"
                              size="icon-sm"
                              variant="ghost"
                              aria-label="Edit asset"
                              onClick={() => {
                                loadFormFromAsset(a);
                                setEditAsset(a);
                              }}
                            >
                              <Pencil className="size-4" />
                            </Button>
                            <Button
                              type="button"
                              size="icon-sm"
                              variant="ghost"
                              className="text-destructive hover:text-destructive"
                              aria-label="Delete asset"
                              onClick={() => setDeleteAssetId(a.id)}
                            >
                              <Trash2 className="size-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </ScrollArea>
          {!isLoading && filteredItems.length > 0 ? (
            <div className="border-t border-border bg-surface-sunken/40 px-2">
              <DataTablePagination
                page={safePage}
                totalPages={totalPages}
                total={filteredItems.length}
                limit={pageSize}
                onPageChange={setPage}
                onLimitChange={handlePageSizeChange}
              />
            </div>
          ) : null}
        </div>
        )}
      </div>
      )}

      <HrSheet open={sheetOpen} onOpenChange={setSheetOpen} title="Add asset" description="Register asset details in inventory. Assign to an employee afterward from Edit." onSubmit={handleCreate} submitLabel="Add Asset" isPending={createAsset.isPending}>
        {assetDetailFields}
      </HrSheet>

      <HrSheet
        open={editAsset !== null}
        onOpenChange={(open) => {
          if (!open) {
            setEditAsset(null);
            resetForm();
          }
        }}
        title="Edit asset"
        description="Update inventory details, then manage assignment and status below."
        onSubmit={handleUpdate}
        submitLabel="Save changes"
        isPending={updateAsset.isPending}
      >
        {assetDetailFields}
        <div className="border-t border-border pt-4 space-y-3">
          <div>
            <p className="text-sm font-medium">Assignment &amp; lifecycle</p>
            <p className="text-xs text-muted-foreground">
              Assign to an employee, return to inventory, or change operational status.
            </p>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Status</label>
            <Select value={status} onValueChange={handleStatusChange}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="AVAILABLE">Available (returned)</SelectItem>
                <SelectItem value="ASSIGNED">Assigned</SelectItem>
                <SelectItem value="MAINTENANCE">Maintenance</SelectItem>
                <SelectItem value="RETIRED">Retired</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {status === "ASSIGNED" ? (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Assign To</label>
                <EmployeeAssignCombobox
                  employees={employeeList}
                  value={assignedTo}
                  onValueChange={setAssignedTo}
                  placeholder="Select employee"
                  disabled={updateAsset.isPending}
                />
              </div>
              {assignedTo ? (
                <EmployeeAssignedAssetsPanel
                  assets={assignedAssetsForEmployee}
                  selectedAssetId={editAsset?.id ?? null}
                  emptyMessage="No other assets are assigned to this employee."
                />
              ) : null}
              {needsReassignmentReason ? (
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Reason for reassignment</label>
                  <Textarea
                    value={reassignmentReason}
                    onChange={(e) =>
                      setReassignmentReason(
                        e.target.value.slice(0, ASSET_REASSIGN_REASON_MAX_CHARS),
                      )
                    }
                    placeholder="Why is this asset being assigned to a different employee?"
                    rows={3}
                    maxLength={ASSET_REASSIGN_REASON_MAX_CHARS}
                    disabled={updateAsset.isPending}
                  />
                  <p className="text-xs text-muted-foreground">
                    Required because this asset was previously assigned to someone else.
                  </p>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      </HrSheet>

      <ConfirmActionDialog
        open={deleteAssetId !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteAssetId(null);
        }}
        title="Delete asset?"
        description="This will permanently remove the asset from inventory."
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={handleConfirmDelete}
        isPending={deleteAsset.isPending}
      />

      <ConfirmActionDialog
        open={returnAsset !== null}
        onOpenChange={(open) => {
          if (!open) setReturnAsset(null);
        }}
        title="Return asset?"
        description={`"${returnAsset?.assetName ?? "Asset"}" will be unassigned and marked as Available.`}
        confirmLabel="Return to inventory"
        variant="default"
        onConfirm={handleConfirmReturn}
        isPending={updateAsset.isPending}
      />
    </PageWrapper>
  );
}
