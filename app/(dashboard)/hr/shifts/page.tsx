"use client";

import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";
import { CalendarClock, Pencil, Plus, Trash2, UserPlus } from "lucide-react";

import { PageWrapper } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { StatusPill } from "@/components/ui/status-pill";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { DatePicker } from "@/components/ui/date-picker";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DashboardGate } from "@/components/shared/dashboard-gate";
import { HrSheet } from "@/features/hr/hr-sheet";
import { BonusEmployeePicker } from "@/features/hr/bonuses/bonus-employee-picker";

import {
  useShifts,
  useCreateShift,
  useUpdateShift,
  useAssignShift,
  useRemoveShiftAssignment,
  useHrEmployees,
  type Shift,
  type ShiftAssignment,
} from "@/lib/api/hooks/hr";
import { getErrorMessage } from "@/lib/get-error-message";
import { getTodayString } from "@/lib/date-utils";
import { createShiftSchema, SHIFT_NAME_MAX } from "@/lib/validations/shifts";
import {
  WEEKDAY_LABELS,
  currentAssignment,
  formatShiftDays,
  formatShiftTime,
  formatShiftWindow,
} from "@/lib/hr/shifts";
import type { Employee } from "@/types/hr";

export default function ShiftsPage() {
  return (
    <DashboardGate allowedRoles={["CEO", "HR", "ADMIN"]}>
      <ShiftsContent />
    </DashboardGate>
  );
}

const DEFAULT_DAYS = [1, 2, 3, 4, 5];

function ShiftsContent() {
  const { data, isLoading } = useShifts();
  const createShift = useCreateShift();
  const updateShift = useUpdateShift();
  const assignShift = useAssignShift();
  const removeAssignment = useRemoveShiftAssignment();
  const { data: employeesRaw } = useHrEmployees();
  const employees = useMemo(
    () => (Array.isArray(employeesRaw) ? employeesRaw : (employeesRaw as { data?: Employee[] })?.data ?? []) as Employee[],
    [employeesRaw],
  );

  const shifts = useMemo(() => data?.shifts ?? [], [data]);
  const assignments = useMemo(() => data?.assignments ?? [], [data]);
  const today = getTodayString();
  const shiftById = useMemo(() => new Map(shifts.map((s) => [s.id, s])), [shifts]);

  // Headcount per shift today: each employee's assignment in force.
  const headcount = useMemo(() => {
    const byUser = new Map<string, ShiftAssignment[]>();
    for (const a of assignments) byUser.set(a.userId, [...(byUser.get(a.userId) ?? []), a]);
    const counts = new Map<number, number>();
    for (const rows of byUser.values()) {
      const cur = currentAssignment(rows, today);
      if (cur) counts.set(cur.shiftId, (counts.get(cur.shiftId) ?? 0) + 1);
    }
    return counts;
  }, [assignments, today]);

  // Shift sheet
  const [shiftSheetOpen, setShiftSheetOpen] = useState(false);
  const [editing, setEditing] = useState<Shift | null>(null);
  const [name, setName] = useState("");
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("18:00");
  const [days, setDays] = useState<number[]>(DEFAULT_DAYS);

  const openCreate = useCallback(() => {
    setEditing(null);
    setName("");
    setStartTime("09:00");
    setEndTime("18:00");
    setDays(DEFAULT_DAYS);
    setShiftSheetOpen(true);
  }, []);

  const openEdit = useCallback((shift: Shift) => {
    setEditing(shift);
    setName(shift.name);
    setStartTime(formatShiftTime(shift.startTime));
    setEndTime(formatShiftTime(shift.endTime));
    setDays(shift.daysOfWeek);
    setShiftSheetOpen(true);
  }, []);

  const handleShiftSubmit = useCallback(() => {
    const parsed = createShiftSchema.safeParse({ name, startTime, endTime, daysOfWeek: days });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Invalid shift");
      return;
    }
    const opts = {
      onSuccess: () => {
        toast.success(editing ? "Shift updated" : "Shift added");
        setShiftSheetOpen(false);
      },
      onError: (e: unknown) => toast.error(getErrorMessage(e)),
    };
    if (editing) updateShift.mutate({ id: editing.id, ...parsed.data }, opts);
    else createShift.mutate(parsed.data, opts);
  }, [name, startTime, endTime, days, editing, createShift, updateShift]);

  const toggleArchive = useCallback(
    (shift: Shift, active: boolean) => {
      updateShift.mutate(
        { id: shift.id, isActive: active },
        {
          onSuccess: () => toast.success(active ? "Shift restored" : "Shift archived"),
          onError: (e) => toast.error(getErrorMessage(e)),
        },
      );
    },
    [updateShift],
  );

  // Assignment sheet
  const [assignOpen, setAssignOpen] = useState(false);
  const [assignUserId, setAssignUserId] = useState("");
  const [assignShiftId, setAssignShiftId] = useState("");
  const [assignFrom, setAssignFrom] = useState(today);
  const [assignTo, setAssignTo] = useState("");
  const [removing, setRemoving] = useState<ShiftAssignment | null>(null);
  const activeShifts = useMemo(() => shifts.filter((s) => s.isActive), [shifts]);

  const openAssign = useCallback(
    (shiftId?: number) => {
      setAssignUserId("");
      setAssignShiftId(shiftId ? String(shiftId) : "");
      setAssignFrom(today);
      setAssignTo("");
      setAssignOpen(true);
    },
    [today],
  );

  const handleAssignSubmit = useCallback(() => {
    if (!assignUserId) return toast.error("Pick an employee");
    if (!assignShiftId) return toast.error("Pick a shift");
    if (!assignFrom) return toast.error("Pick a start date");
    if (assignTo && assignTo < assignFrom) return toast.error("End date must be on or after the start date");
    assignShift.mutate(
      { userId: assignUserId, shiftId: Number(assignShiftId), effectiveFrom: assignFrom, effectiveTo: assignTo || null },
      {
        onSuccess: () => {
          toast.success("Shift assigned");
          setAssignOpen(false);
        },
        onError: (e) => toast.error(getErrorMessage(e)),
      },
    );
  }, [assignUserId, assignShiftId, assignFrom, assignTo, assignShift]);

  const handleRemove = useCallback(() => {
    if (!removing) return;
    removeAssignment.mutate(removing.id, {
      onSuccess: () => toast.success("Assignment removed"),
      onError: (e) => toast.error(getErrorMessage(e)),
    });
    setRemoving(null);
  }, [removing, removeAssignment]);

  return (
    <PageWrapper
      title="Shifts"
      actions={
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={() => openAssign()} disabled={activeShifts.length === 0}>
            <UserPlus aria-hidden />
            Assign employee
          </Button>
          <Button size="sm" onClick={openCreate}>
            <Plus aria-hidden />
            Add shift
          </Button>
        </div>
      }
    >
      <div className="space-y-5">
        <Card className="overflow-hidden">
          <div className="border-b border-border px-5 py-4">
            <h2 className="text-sm font-semibold">Shifts</h2>
            <p className="mt-0.5 max-w-2xl text-xs text-muted-foreground">
              Working windows employees are rostered on. Employees see their current shift on their Attendance page.
              Archived shifts keep their history but take no new assignments. Attendance calculations are unchanged.
            </p>
          </div>
          {isLoading ? (
            <div className="p-5">
              <Skeleton className="h-40 w-full" />
            </div>
          ) : shifts.length === 0 ? (
            <div className="p-5">
              <EmptyState
                compact
                icon={CalendarClock}
                title="No shifts yet. Add one to start rostering employees."
                action={{ label: "Add shift", onClick: openCreate }}
              />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Shift</TableHead>
                  <TableHead>Hours</TableHead>
                  <TableHead>Days</TableHead>
                  <TableHead className="text-right">Employees today</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right"><span className="sr-only">Actions</span></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {shifts.map((shift) => (
                  <TableRow key={shift.id}>
                    <TableCell className="font-medium">{shift.name}</TableCell>
                    <TableCell className="tabular-nums">{formatShiftWindow(shift.startTime, shift.endTime)}</TableCell>
                    <TableCell>{formatShiftDays(shift.daysOfWeek)}</TableCell>
                    <TableCell className="text-right tabular-nums">{headcount.get(shift.id) ?? 0}</TableCell>
                    <TableCell>
                      <StatusPill tone={shift.isActive ? "success" : "neutral"} dot>
                        {shift.isActive ? "Active" : "Archived"}
                      </StatusPill>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-2">
                        {shift.isActive && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            className="text-muted-foreground hover:text-foreground"
                            onClick={() => openAssign(shift.id)}
                            aria-label={`Assign employee to ${shift.name}`}
                          >
                            <UserPlus aria-hidden />
                          </Button>
                        )}
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          className="text-muted-foreground hover:text-foreground"
                          onClick={() => openEdit(shift)}
                          aria-label={`Edit ${shift.name}`}
                        >
                          <Pencil aria-hidden />
                        </Button>
                        <Switch
                          checked={shift.isActive}
                          onCheckedChange={(next) => toggleArchive(shift, next)}
                          disabled={updateShift.isPending}
                          aria-label={`${shift.isActive ? "Archive" : "Restore"} ${shift.name}`}
                        />
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Card>

        <Card className="overflow-hidden">
          <div className="border-b border-border px-5 py-4">
            <h2 className="text-sm font-semibold">Roster</h2>
            <p className="mt-0.5 max-w-2xl text-xs text-muted-foreground">
              Assigning a new shift closes the employee&apos;s open-ended assignment the day before.
            </p>
          </div>
          {isLoading ? (
            <div className="p-5">
              <Skeleton className="h-32 w-full" />
            </div>
          ) : assignments.length === 0 ? (
            <p className="p-5 text-sm text-muted-foreground">No employees assigned yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Emp ID</TableHead>
                  <TableHead>Shift</TableHead>
                  <TableHead>From</TableHead>
                  <TableHead>To</TableHead>
                  <TableHead className="text-right"><span className="sr-only">Actions</span></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {assignments.map((a) => {
                  const shift = shiftById.get(a.shiftId);
                  const ended = a.effectiveTo !== null && a.effectiveTo < today;
                  return (
                    <TableRow key={a.id} className={ended ? "text-muted-foreground" : undefined}>
                      <TableCell className="font-medium">{a.employeeName ?? a.employeeEmail}</TableCell>
                      <TableCell>{a.employeeCode ?? "—"}</TableCell>
                      <TableCell>{shift?.name ?? "—"}</TableCell>
                      <TableCell className="tabular-nums">{a.effectiveFrom}</TableCell>
                      <TableCell className="tabular-nums">{a.effectiveTo ?? "Ongoing"}</TableCell>
                      <TableCell>
                        <div className="flex justify-end">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            className="text-muted-foreground hover:text-destructive"
                            onClick={() => setRemoving(a)}
                            disabled={removeAssignment.isPending}
                            aria-label={`Remove ${a.employeeName ?? a.employeeEmail} from ${shift?.name ?? "shift"}`}
                          >
                            <Trash2 aria-hidden />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </Card>
      </div>

      <ConfirmDialog
        open={!!removing}
        onOpenChange={(open) => !open && setRemoving(null)}
        title="Remove assignment?"
        description={`${removing?.employeeName ?? removing?.employeeEmail ?? ""} will be taken off this shift for ${removing?.effectiveFrom ?? ""} – ${removing?.effectiveTo ?? "ongoing"}.`}
        confirmLabel="Remove"
        destructive
        onConfirm={handleRemove}
      />

      <HrSheet
        open={shiftSheetOpen}
        onOpenChange={setShiftSheetOpen}
        title={editing ? "Edit shift" : "Add shift"}
        description="A shift ending before it starts runs overnight."
        onSubmit={handleShiftSubmit}
        submitLabel={editing ? "Save changes" : "Add shift"}
        isPending={createShift.isPending || updateShift.isPending}
      >
        <div className="space-y-1.5">
          <Label htmlFor="shift-name">
            Name <span className="text-destructive">*</span>
          </Label>
          <Input
            id="shift-name"
            value={name}
            maxLength={SHIFT_NAME_MAX}
            placeholder="e.g. General, Night"
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="shift-start">Start <span className="text-destructive">*</span></Label>
            <Input id="shift-start" type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="shift-end">End <span className="text-destructive">*</span></Label>
            <Input id="shift-end" type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
          </div>
        </div>
        <fieldset className="space-y-1.5">
          <legend className="text-sm font-medium">Days <span className="text-destructive">*</span></legend>
          <div className="flex flex-wrap gap-3">
            {WEEKDAY_LABELS.map((label, day) => (
              <label key={label} className="flex items-center gap-1.5 text-sm">
                <Checkbox
                  checked={days.includes(day)}
                  onCheckedChange={(checked) =>
                    setDays((prev) => (checked ? [...prev, day] : prev.filter((d) => d !== day)))
                  }
                />
                {label}
              </label>
            ))}
          </div>
        </fieldset>
      </HrSheet>

      <HrSheet
        open={assignOpen}
        onOpenChange={setAssignOpen}
        title="Assign employee"
        description="Put an employee on a shift from a date. Leave the end date empty for an ongoing assignment."
        onSubmit={handleAssignSubmit}
        submitLabel="Assign"
        isPending={assignShift.isPending}
      >
        <div className="space-y-1.5">
          <label className="text-sm font-medium" htmlFor="bonus-employee">
            Employee <span className="text-destructive">*</span>
          </label>
          <BonusEmployeePicker employees={employees} value={assignUserId} onValueChange={setAssignUserId} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="assign-shift">Shift <span className="text-destructive">*</span></Label>
          <Select value={assignShiftId} onValueChange={setAssignShiftId}>
            <SelectTrigger id="assign-shift" className="w-full">
              <SelectValue placeholder="Select shift…" />
            </SelectTrigger>
            <SelectContent>
              {activeShifts.map((s) => (
                <SelectItem key={s.id} value={String(s.id)}>
                  {s.name} · {formatShiftWindow(s.startTime, s.endTime)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="assign-from">From <span className="text-destructive">*</span></Label>
            <DatePicker id="assign-from" value={assignFrom} onChange={setAssignFrom} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="assign-to">To <span className="text-muted-foreground font-normal">(optional)</span></Label>
            <DatePicker id="assign-to" value={assignTo} onChange={setAssignTo} placeholder="Ongoing" />
          </div>
        </div>
      </HrSheet>
    </PageWrapper>
  );
}
