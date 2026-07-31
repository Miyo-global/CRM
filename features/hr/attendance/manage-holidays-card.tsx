"use client";

import { useState, memo, useCallback, useMemo, useEffect } from "react";
import { format } from "date-fns";
import { formatDisplayDate, fromISODateString, getTodayString } from "@/lib/date-utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DatePicker } from "@/components/ui/date-picker";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useHrHolidaysForYear,
  useAddHoliday,
  useDeleteHoliday,
  useUpdateHoliday,
} from "@/lib/api/hooks/hr";
import { toast } from "sonner";
import {
  Loader2,
  Plus,
  Trash2,
  PartyPopper,
  Pencil,
  Check,
  X,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { createHolidaySchema, HOLIDAY_MESSAGE_MAX } from "@/lib/validations/holidays";
import { sanitizeSimpleName } from "@/lib/validations/text-rules";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { DataTablePagination } from "@/components/shared/data-table-pagination";
import { PAGE_SIZE_OPTIONS, type PageSizeOption } from "@/lib/pagination-constants";

function validateHolidayInput(
  name: string,
  date: string,
  message: string,
): string | null {
  const result = createHolidaySchema.safeParse({
    name,
    date,
    message: message || undefined,
  });
  if (!result.success) {
    return result.error.issues[0]?.message ?? "Invalid holiday";
  }
  return null;
}

interface HolidayItem {
  id: number;
  name: string;
  date: string;
  message?: string | null;
}

function formatHolidayDate(date: string): string {
  return formatDisplayDate(fromISODateString(date), {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

// ─── Inline edit row ─────────────────────────────────────────────────────────
function EditRow({
  holiday,
  onSave,
  onCancel,
  isSaving,
  existingDates,
}: {
  holiday: HolidayItem;
  onSave: (id: number, name: string, date: string, message: string) => void;
  onCancel: () => void;
  isSaving: boolean;
  existingDates: Map<string, number>;
}) {
  const [editName, setEditName] = useState(holiday.name);
  const [editDate, setEditDate] = useState(holiday.date);
  const [editMessage, setEditMessage] = useState(holiday.message ?? "");

  const handleSave = () => {
    const validationError = validateHolidayInput(editName, editDate, editMessage);
    if (validationError) {
      toast.error(validationError);
      return;
    }
    const existing = existingDates.get(editDate);
    if (existing && existing !== holiday.id) {
      toast.error("A holiday already exists on this date");
      return;
    }
    onSave(holiday.id, editName.trim(), editDate, editMessage.trim());
  };

  return (
    <li className="flex items-start gap-2 py-3 px-3 bg-muted/30 rounded">
      <div className="flex-1 space-y-2">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <Input
            value={editName}
            onChange={(e) => setEditName(sanitizeSimpleName(e.target.value))}
            placeholder="Holiday name"
            className="h-8 text-sm"
          />
          <DatePicker value={editDate} onChange={setEditDate} placeholder="Date" />
        </div>
        <Input
          value={editMessage}
          onChange={(e) => setEditMessage(e.target.value.slice(0, HOLIDAY_MESSAGE_MAX))}
          placeholder="Notification message (optional)"
          className="h-8 text-sm"
          maxLength={HOLIDAY_MESSAGE_MAX}
        />
      </div>
      <Button
        type="button"
        size="icon"
        variant="ghost"
        className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-50"
        onClick={handleSave}
        disabled={isSaving}
        aria-label="Save changes"
      >
        {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
      </Button>
      <Button
        type="button"
        size="icon"
        variant="ghost"
        className="h-8 w-8 text-muted-foreground"
        onClick={onCancel}
        disabled={isSaving}
        aria-label="Cancel edit"
      >
        <X className="h-4 w-4" />
      </Button>
    </li>
  );
}

// ─── Holiday row ──────────────────────────────────────────────────────────────
const HolidayRow = memo(function HolidayRow({
  holiday,
  onEdit,
  onDelete,
  isDeleting,
}: {
  holiday: HolidayItem;
  onEdit: (h: HolidayItem) => void;
  onDelete: (h: HolidayItem) => void;
  isDeleting: boolean;
}) {
  const isPast = holiday.date < getTodayString();

  return (
    <li className="flex items-center justify-between gap-2 py-2.5 px-3">
      <div className="min-w-0">
        <span className={`font-medium text-sm ${isPast ? "text-muted-foreground" : "text-foreground"}`}>
          {holiday.name}
        </span>
        <span className="text-muted-foreground text-xs ml-2">{formatHolidayDate(holiday.date)}</span>
        {holiday.message && (
          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{holiday.message}</p>
        )}
        {isPast && (
          <span className="ml-2 text-[10px] text-muted-foreground/60 italic">(past)</span>
        )}
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-muted-foreground hover:text-primary"
          onClick={() => onEdit(holiday)}
          aria-label={`Edit ${holiday.name}`}
        >
          <Pencil className="h-3.5 w-3.5" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-muted-foreground hover:text-destructive"
          onClick={() => onDelete(holiday)}
          disabled={isDeleting}
          aria-label={`Delete ${holiday.name}`}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </li>
  );
});

// ─── Main card ────────────────────────────────────────────────────────────────
export const ManageHolidaysCard = memo(function ManageHolidaysCard() {
  const currentYear = new Date().getFullYear();
  const [viewYear, setViewYear] = useState(currentYear);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<PageSizeOption>(PAGE_SIZE_OPTIONS[0]);

  const [name, setName] = useState("");
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [message, setMessage] = useState("");

  // Edit state
  const [editingHoliday, setEditingHoliday] = useState<HolidayItem | null>(null);

  // Confirm dialogs
  const [confirmCreate, setConfirmCreate] = useState(false);
  const [pendingCreate, setPendingCreate] = useState<{ name: string; date: string; message: string } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<HolidayItem | null>(null);

  const { data: holidaysList, isLoading } = useHrHolidaysForYear(viewYear);

  const addMutation = useAddHoliday();
  const deleteMutation = useDeleteHoliday();
  const updateMutation = useUpdateHoliday();

  // Build a map of date → holidayId for duplicate detection
  const existingDates = useMemo(() => {
    const map = new Map<string, number>();
    for (const h of holidaysList ?? []) {
      map.set(h.date, h.id);
    }
    return map;
  }, [holidaysList]);

  const handleSubmitCreate = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const validationError = validateHolidayInput(name, date, message);
      if (validationError) {
        toast.error(validationError);
        return;
      }
      // Duplicate date validation
      if (existingDates.has(date)) {
        toast.error(`A holiday already exists on ${date}. Choose a different date.`);
        return;
      }
      setPendingCreate({ name: name.trim(), date, message: message.trim() });
      setConfirmCreate(true);
    },
    [name, date, message, existingDates],
  );

  const handleConfirmCreate = useCallback(() => {
    if (!pendingCreate) return;
    addMutation.mutate(
      {
        name: pendingCreate.name,
        date: pendingCreate.date,
        message: pendingCreate.message || undefined,
      },
      {
        onSuccess: () => {
          toast.success("Holiday added");
          setName("");
          setDate(format(new Date(), "yyyy-MM-dd"));
          setMessage("");
          setConfirmCreate(false);
          setPendingCreate(null);
          // Switch view to the year of the new holiday
          const y = Number(pendingCreate.date.slice(0, 4));
          if (y) setViewYear(y);
        },
        onError: (e) => {
          toast.error(e.message);
          setConfirmCreate(false);
        },
      },
    );
  }, [pendingCreate, addMutation]);

  const handleDeleteRequest = useCallback((h: HolidayItem) => {
    setConfirmDelete(h);
  }, []);

  const handleConfirmDelete = useCallback(() => {
    if (!confirmDelete) return;
    deleteMutation.mutate(
      { holidayId: confirmDelete.id },
      {
        onSuccess: () => {
          toast.success("Holiday deleted");
          setConfirmDelete(null);
        },
        onError: (e) => {
          toast.error(e.message);
          setConfirmDelete(null);
        },
      },
    );
  }, [confirmDelete, deleteMutation]);

  const handleSaveEdit = useCallback(
    (id: number, newName: string, newDate: string, newMessage: string) => {
      updateMutation.mutate(
        { holidayId: id, name: newName, date: newDate, message: newMessage || undefined },
        {
          onSuccess: () => {
            toast.success("Holiday updated");
            setEditingHoliday(null);
            const y = Number(newDate.slice(0, 4));
            if (y) setViewYear(y);
          },
          onError: (e) => toast.error(e.message),
        },
      );
    },
    [updateMutation],
  );

  const sortedHolidays = useMemo(
    () => [...(holidaysList ?? [])].sort((a, b) => a.date.localeCompare(b.date)),
    [holidaysList],
  );

  useEffect(() => {
    setPage(1);
  }, [viewYear]);

  const totalPages = Math.max(1, Math.ceil(sortedHolidays.length / pageSize));
  const safePage = Math.min(page, totalPages);

  const paginatedHolidays = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return sortedHolidays.slice(start, start + pageSize);
  }, [sortedHolidays, safePage, pageSize]);

  const handlePageSizeChange = useCallback((size: number) => {
    setPageSize(size as PageSizeOption);
    setPage(1);
  }, []);

  return (
    <>
      <Card className="overflow-hidden border-border shadow-sm">
        <CardHeader className="pb-3 pt-5">
          <CardTitle className="text-lg font-semibold flex items-center gap-2 text-foreground">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gold/10">
              <PartyPopper className="h-4 w-4 text-gold" />
            </div>
            Company Holidays
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 pb-6">
          {/* ── Add form ── */}
          <form onSubmit={handleSubmitCreate} className="space-y-3 rounded-lg border border-border bg-muted/20 p-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="holiday-name">Name</Label>
                <Input
                  id="holiday-name"
                  placeholder="e.g. Republic Day"
                  value={name}
                  onChange={(e) => setName(sanitizeSimpleName(e.target.value))}
                  className="bg-background"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="holiday-date">Date</Label>
                <DatePicker id="holiday-date" value={date} onChange={setDate} placeholder="Select date" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="holiday-message">Message (optional)</Label>
              <Input
                id="holiday-message"
                placeholder="Optional note for notification"
                value={message}
                onChange={(e) => setMessage(e.target.value.slice(0, HOLIDAY_MESSAGE_MAX))}
                className="bg-background"
                maxLength={HOLIDAY_MESSAGE_MAX}
              />
              <p className="text-[10px] text-muted-foreground text-right tabular-nums">
                {message.length}/{HOLIDAY_MESSAGE_MAX}
              </p>
            </div>
            <Button type="submit" disabled={addMutation.isPending} className="w-full sm:w-auto">
              {addMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Plus className="h-4 w-4 mr-2" />
              )}
              Add Holiday
            </Button>
          </form>

          {/* ── Year navigation ── */}
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-foreground">Holidays for {viewYear}</p>
            <div className="flex items-center gap-1">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => setViewYear((y) => y - 1)}
                aria-label="Previous year"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-xs text-muted-foreground w-10 text-center">{viewYear}</span>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => setViewYear((y) => y + 1)}
                disabled={viewYear >= currentYear + 2}
                aria-label="Next year"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* ── Holiday list ── */}
          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-10 w-full rounded-md" />
              ))}
            </div>
          ) : sortedHolidays.length > 0 ? (
            <div className="rounded-lg border border-border overflow-hidden">
              <ul className="divide-y divide-border">
                {paginatedHolidays.map((h) =>
                  editingHoliday?.id === h.id ? (
                    <EditRow
                      key={h.id}
                      holiday={h}
                      onSave={handleSaveEdit}
                      onCancel={() => setEditingHoliday(null)}
                      isSaving={updateMutation.isPending}
                      existingDates={existingDates}
                    />
                  ) : (
                    <HolidayRow
                      key={h.id}
                      holiday={h}
                      onEdit={setEditingHoliday}
                      onDelete={handleDeleteRequest}
                      isDeleting={deleteMutation.isPending && confirmDelete?.id === h.id}
                    />
                  ),
                )}
              </ul>
              {sortedHolidays.length > 0 ? (
                <div className="border-t border-border px-2 bg-muted/20">
                  <DataTablePagination
                    page={safePage}
                    totalPages={totalPages}
                    total={sortedHolidays.length}
                    limit={pageSize}
                    onPageChange={setPage}
                    onLimitChange={handlePageSizeChange}
                  />
                </div>
              ) : null}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground py-4 text-center rounded-lg border border-dashed border-border">
              No holidays for {viewYear}. Add one above or navigate to another year.
            </p>
          )}

          <p className="text-xs text-muted-foreground">
            Employees see holidays on the calendar. A reminder email is sent one day before each holiday.
          </p>
        </CardContent>
      </Card>

      {/* ── Confirm create dialog ── */}
      <AlertDialog open={confirmCreate} onOpenChange={setConfirmCreate}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Add Holiday</AlertDialogTitle>
            <AlertDialogDescription>
              Add <strong>{pendingCreate?.name}</strong> on{" "}
              <strong>{pendingCreate?.date ? formatHolidayDate(pendingCreate.date) : ""}</strong>?
              {pendingCreate?.message ? (
                <>
                  {" "}
                  Notification note: &ldquo;{pendingCreate.message}&rdquo;.
                </>
              ) : null}{" "}
              Employees will receive a reminder email one day before the holiday.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={addMutation.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmCreate} disabled={addMutation.isPending}>
              {addMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Add Holiday
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Confirm delete dialog ── */}
      <AlertDialog open={!!confirmDelete} onOpenChange={(open) => { if (!open) setConfirmDelete(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Holiday</AlertDialogTitle>
            <AlertDialogDescription>
              Delete <strong>{confirmDelete?.name}</strong> on{" "}
              {confirmDelete?.date ? formatHolidayDate(confirmDelete.date) : ""}? This removes it from
              the company calendar and stops the day-before reminder. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              disabled={deleteMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
});
