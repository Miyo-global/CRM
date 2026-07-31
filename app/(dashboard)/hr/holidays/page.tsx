"use client";

import { useState, useCallback, useMemo, memo } from "react";
import { useSession } from "next-auth/react";
import { format } from "date-fns";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { HrSheet } from "@/features/hr/hr-sheet";
import { ConfirmActionDialog } from "@/features/hr/confirm-action-dialog";
import { DatePicker } from "@/components/ui/date-picker";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  useHrHolidaysForYear,
  useAddHoliday,
  useUpdateHoliday,
  useDeleteHoliday,
} from "@/lib/api/hooks/hr";
import { toast } from "sonner";
import { getTodayString, formatDisplayDate, fromISODateString } from "@/lib/date-utils";
import { createHolidaySchema, HOLIDAY_MESSAGE_MAX } from "@/lib/validations/holidays";
import { sanitizeSimpleName } from "@/lib/validations/text-rules";
import { cn } from "@/lib/utils";
import {
  Plus, ChevronLeft, ChevronRight, Pencil, Trash2,
  CalendarDays, Sun, Star, Clock,
} from "lucide-react";
import { ExportButton } from "@/components/ui/export-button";
import type { Holiday } from "@/types/hr";

type HolidayType = "NATIONAL" | "PUBLIC" | "OPTIONAL";

interface FullHoliday extends Holiday {
  type?: HolidayType;
  isHalfDay?: boolean;
  isPublic?: boolean;
}

const TYPE_CONFIG: Record<HolidayType, { label: string; className: string; icon: React.ElementType }> = {
  NATIONAL: { label: "National",  className: "bg-red-50 text-red-700 border-red-200",    icon: Star },
  PUBLIC:   { label: "Public",    className: "bg-blue-50 text-blue-700 border-blue-200",  icon: Sun },
  OPTIONAL: { label: "Optional",  className: "bg-amber-50 text-amber-700 border-amber-200", icon: Clock },
};

const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

function formatHolidayDate(date: string): string {
  return formatDisplayDate(fromISODateString(date), {
    day: "numeric", month: "long",
  });
}

function getDayOfWeek(date: string): string {
  return formatDisplayDate(fromISODateString(date), { weekday: "long" });
}

const HolidayRow = memo(function HolidayRow({
  holiday,
  isAdmin,
  isDeleting,
  onEdit,
  onDelete,
}: {
  holiday: FullHoliday;
  isAdmin: boolean;
  isDeleting: boolean;
  onEdit: (h: FullHoliday) => void;
  onDelete: (h: FullHoliday) => void;
}) {
  const today = getTodayString();
  const isPast = holiday.date < today;
  const isToday = holiday.date === today;
  const typeCfg = TYPE_CONFIG[(holiday.type as HolidayType) ?? "PUBLIC"];
  const TypeIcon = typeCfg.icon;

  return (
    <div
      className={cn(
        "flex items-center justify-between gap-3 px-4 py-3 transition-colors",
        isPast && !isToday && "opacity-50",
        isToday && "bg-primary/5",
      )}
    >
      <div className="flex items-center gap-3 min-w-0">
        <div className={cn(
          "flex items-center justify-center h-9 w-9 rounded-lg shrink-0 border",
          typeCfg.className,
        )}>
          <TypeIcon className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={cn(
              "text-sm font-medium",
              isPast && !isToday ? "text-muted-foreground" : "text-foreground",
            )}>
              {holiday.name}
            </span>
            {isToday && (
              <Badge className="text-[10px] py-0 px-1.5 bg-primary text-primary-foreground">Today</Badge>
            )}
            {holiday.isHalfDay && (
              <Badge variant="outline" className="text-[10px] py-0 px-1.5">Half Day</Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            {formatHolidayDate(holiday.date)} &middot; {getDayOfWeek(holiday.date)}
          </p>
          {holiday.message && (
            <p className="text-xs text-muted-foreground/70 mt-0.5 line-clamp-1 italic">
              {holiday.message}
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <span className={cn(
          "hidden sm:inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium",
          typeCfg.className,
        )}>
          {typeCfg.label}
        </span>
        {isAdmin && (
          <div className="flex items-center gap-1">
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="h-7 w-7"
              onClick={() => onEdit(holiday)}
              aria-label={`Edit ${holiday.name}`}
            >
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="h-7 w-7 text-destructive hover:text-destructive"
              onClick={() => onDelete(holiday)}
              disabled={isDeleting}
              aria-label={`Delete ${holiday.name}`}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
});

export default function HolidaysPage() {
  const { data: session } = useSession();
  const role = session?.user?.role ?? "";
  const isAdmin = role === "CEO" || role === "HR" || role === "ADMIN";

  const currentYear = new Date().getFullYear();
  const [viewYear, setViewYear] = useState(currentYear);

  const { data: rawHolidays, isLoading } = useHrHolidaysForYear(viewYear);
  const holidays = (rawHolidays ?? []) as FullHoliday[];

  const addMutation    = useAddHoliday();
  const updateMutation = useUpdateHoliday();
  const deleteMutation = useDeleteHoliday();

  const [sheetMode, setSheetMode]     = useState<"add" | "edit" | null>(null);
  const [editTarget, setEditTarget]   = useState<FullHoliday | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<FullHoliday | null>(null);
  const [createConfirmOpen, setCreateConfirmOpen] = useState(false);

  const [name, setName]           = useState("");
  const [date, setDate]           = useState(format(new Date(), "yyyy-MM-dd"));
  const [type, setType]           = useState<HolidayType>("PUBLIC");
  const [message, setMessage]     = useState("");
  const [isHalfDay, setIsHalfDay] = useState(false);

  const resetForm = useCallback(() => {
    setName(""); setDate(format(new Date(), "yyyy-MM-dd"));
    setType("PUBLIC"); setMessage(""); setIsHalfDay(false);
  }, []);

  const openAdd = useCallback(() => {
    resetForm();
    setSheetMode("add");
  }, [resetForm]);

  const openEdit = useCallback((h: FullHoliday) => {
    setEditTarget(h);
    setName(h.name);
    setDate(h.date);
    setType((h.type as HolidayType) ?? "PUBLIC");
    setMessage(h.message ?? "");
    setIsHalfDay(h.isHalfDay ?? false);
    setSheetMode("edit");
  }, []);

  const validate = useCallback((): boolean => {
    const result = createHolidaySchema.safeParse({ name, date, type, message: message || undefined, isHalfDay });
    if (!result.success) {
      toast.error(result.error.issues[0]?.message ?? "Invalid input");
      return false;
    }
    return true;
  }, [name, date, type, message, isHalfDay]);

  const executeCreate = useCallback(() => {
    addMutation.mutate(
      { name: name.trim(), date, message: message.trim() || undefined, type, isHalfDay } as Parameters<typeof addMutation.mutate>[0],
      {
        onSuccess: () => {
          toast.success("Holiday added");
          setCreateConfirmOpen(false);
          setSheetMode(null);
          resetForm();
          const y = Number(date.slice(0, 4));
          if (y) setViewYear(y);
        },
        onError: (e) => {
          toast.error(e.message);
          setCreateConfirmOpen(false);
        },
      },
    );
  }, [name, date, type, message, isHalfDay, addMutation, resetForm]);

  const handleSubmit = useCallback(() => {
    if (!validate()) return;

    if (sheetMode === "add") {
      setCreateConfirmOpen(true);
    } else if (sheetMode === "edit" && editTarget) {
      updateMutation.mutate(
        { holidayId: editTarget.id, name: name.trim(), date, message: message.trim() || undefined, type, isHalfDay },
        {
          onSuccess: () => {
            toast.success("Holiday updated");
            setSheetMode(null);
            setEditTarget(null);
            const y = Number(date.slice(0, 4));
            if (y) setViewYear(y);
          },
          onError: (e) => toast.error(e.message),
        },
      );
    }
  }, [sheetMode, validate, date, type, editTarget, updateMutation, resetForm]);

  const handleDelete = useCallback(() => {
    if (!deleteTarget) return;
    deleteMutation.mutate(
      { holidayId: deleteTarget.id },
      {
        onSuccess: () => { toast.success("Holiday deleted"); setDeleteTarget(null); },
        onError: (e) => { toast.error(e.message); setDeleteTarget(null); },
      },
    );
  }, [deleteTarget, deleteMutation]);

  const sortedHolidays = useMemo(
    () => [...holidays].sort((a, b) => a.date.localeCompare(b.date)),
    [holidays],
  );

  const byMonth = useMemo(() => {
    const map = new Map<number, FullHoliday[]>();
    for (const h of sortedHolidays) {
      const m = parseInt(h.date.slice(5, 7), 10) - 1;
      if (!map.has(m)) map.set(m, []);
      map.get(m)!.push(h);
    }
    return map;
  }, [sortedHolidays]);

  const upcomingCount = useMemo(
    () => sortedHolidays.filter((h) => h.date >= getTodayString()).length,
    [sortedHolidays],
  );

  const holidayExportSheets = useMemo(() => [{
    name: `Holidays ${viewYear}`,
    columns: [
      { header: "Name", key: "name", width: 30 },
      { header: "Date", key: "date", width: 14 },
      { header: "Type", key: "type", width: 12 },
      { header: "Duration", key: "duration", width: 12 },
      { header: "Message", key: "message", width: 40 },
    ],
    rows: sortedHolidays.map((h) => ({
      name: h.name,
      date: h.date,
      type: (h as FullHoliday).type ?? "PUBLIC",
      duration: (h as FullHoliday).isHalfDay ? "Half Day" : "Full Day",
      message: h.message ?? "",
    })),
  }], [sortedHolidays, viewYear]);

  if (isLoading) {
    return (
      <PageWrapper title="Holidays" subtitle="Company holiday calendar">
        <div className="space-y-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-5 w-24" />
              <div className="rounded-lg border border-border divide-y divide-border overflow-hidden">
                {Array.from({ length: 3 }).map((__, j) => <Skeleton key={j} className="h-16" />)}
              </div>
            </div>
          ))}
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper
      title="Holidays"
      subtitle="Your company's official holiday calendar"
      badge={upcomingCount > 0 ? `${upcomingCount} upcoming` : `${sortedHolidays.length} total`}
      actions={
        <div className="flex items-center gap-2">
          <ExportButton
            filename={`holidays-${viewYear}.xlsx`}
            sheets={holidayExportSheets}
          />
          {isAdmin && (
            <Button size="sm" onClick={openAdd}>
              <Plus className="h-3.5 w-3.5 mr-1" />
              Add Holiday
            </Button>
          )}
        </div>
      }
    >
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <Button type="button" variant="outline" size="icon" className="h-8 w-8" onClick={() => setViewYear((y) => y - 1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm font-semibold w-12 text-center">{viewYear}</span>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => setViewYear((y) => y + 1)}
            disabled={viewYear >= currentYear + 2}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          {viewYear !== currentYear && (
            <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => setViewYear(currentYear)}>
              Back to {currentYear}
            </Button>
          )}

          <div className="ml-auto flex items-center gap-3 text-xs text-muted-foreground">
            {Object.entries(TYPE_CONFIG).map(([t, cfg]) => {
              const Icon = cfg.icon;
              return (
                <span key={t} className={cn("hidden sm:inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium", cfg.className)}>
                  <Icon className="h-2.5 w-2.5" />
                  {cfg.label}
                </span>
              );
            })}
          </div>
        </div>

        {sortedHolidays.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border py-14 text-center">
            <CalendarDays className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm font-medium text-foreground mb-1">No holidays for {viewYear}</p>
            <p className="text-xs text-muted-foreground">
              {isAdmin ? "Add holidays using the button above." : "Your HR team hasn't added any holidays for this year yet."}
            </p>
          </div>
        ) : (
          <div className="space-y-5">
            {Array.from(byMonth.entries()).map(([monthIdx, monthHolidays]) => (
              <div key={monthIdx}>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 px-1">
                  {MONTHS[monthIdx]}
                </h3>
                <div className="rounded-lg border border-border overflow-hidden divide-y divide-border">
                  {monthHolidays.map((h) => (
                    <HolidayRow
                      key={h.id}
                      holiday={h}
                      isAdmin={isAdmin}
                      isDeleting={deleteMutation.isPending && deleteTarget?.id === h.id}
                      onEdit={openEdit}
                      onDelete={setDeleteTarget}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {!isAdmin && sortedHolidays.length > 0 && (
          <p className="text-xs text-muted-foreground text-center">
            You will receive a reminder email one day before each upcoming holiday.
          </p>
        )}
      </div>

      {isAdmin && (
        <HrSheet
          open={sheetMode !== null}
          onOpenChange={(o) => { if (!o) { setSheetMode(null); setEditTarget(null); resetForm(); } }}
          title={sheetMode === "add" ? "Add Holiday" : "Edit Holiday"}
          description={sheetMode === "add" ? "Add a new holiday to the company calendar." : "Update this holiday's details."}
          onSubmit={handleSubmit}
          submitLabel={sheetMode === "add" ? "Add Holiday" : "Save Changes"}
          isPending={addMutation.isPending || updateMutation.isPending}
        >
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">
                Holiday Name <span className="text-destructive">*</span>
              </label>
              <Input
                placeholder="e.g. Republic Day"
                value={name}
                onChange={(e) => setName(sanitizeSimpleName(e.target.value))}
                maxLength={100}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium">
                Date <span className="text-destructive">*</span>
              </label>
              <DatePicker value={date} onChange={setDate} placeholder="Select date" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Type</label>
                <Select value={type} onValueChange={(v) => setType(v as HolidayType)}>
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NATIONAL">National</SelectItem>
                    <SelectItem value="PUBLIC">Public</SelectItem>
                    <SelectItem value="OPTIONAL">Optional</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Duration</label>
                <Select
                  value={isHalfDay ? "half" : "full"}
                  onValueChange={(v) => setIsHalfDay(v === "half")}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="full">Full Day</SelectItem>
                    <SelectItem value="half">Half Day</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium">Notification Message</label>
              <Input
                placeholder="Optional note sent in the reminder email"
                value={message}
                onChange={(e) => setMessage(e.target.value.slice(0, HOLIDAY_MESSAGE_MAX))}
                maxLength={HOLIDAY_MESSAGE_MAX}
              />
              <div className="flex items-center justify-between gap-2">
                <p className="text-[10px] text-muted-foreground">
                  Employees receive a reminder email one day before. This message is included.
                </p>
                <p
                  className={cn(
                    "text-[10px] tabular-nums shrink-0",
                    message.length >= HOLIDAY_MESSAGE_MAX
                      ? "text-destructive"
                      : "text-muted-foreground",
                  )}
                >
                  {message.length}/{HOLIDAY_MESSAGE_MAX}
                </p>
              </div>
            </div>
          </div>
        </HrSheet>
      )}

      <ConfirmActionDialog
        open={createConfirmOpen}
        onOpenChange={(o) => { if (!o) setCreateConfirmOpen(false); }}
        title="Add Holiday"
        description={`Add "${name.trim()}" on ${formatHolidayDate(date)} (${TYPE_CONFIG[type].label}${isHalfDay ? ", Half Day" : ""})? Employees will see it on the calendar and receive a reminder the day before.`}
        confirmLabel="Add Holiday"
        variant="default"
        onConfirm={executeCreate}
        isPending={addMutation.isPending}
      />

      <ConfirmActionDialog
        open={!!deleteTarget}
        onOpenChange={(o) => { if (!o) setDeleteTarget(null); }}
        title="Delete Holiday"
        description={`Delete "${deleteTarget?.name}" on ${deleteTarget?.date ? formatHolidayDate(deleteTarget.date) : ""}? This removes it from the calendar and stops the day-before reminder.`}
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={handleDelete}
        isPending={deleteMutation.isPending}
      />
    </PageWrapper>
  );
}
