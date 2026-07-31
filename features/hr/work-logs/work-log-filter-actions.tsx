"use client";

import { useCallback, useMemo, useState } from "react";
import { format } from "date-fns";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle,
  SheetTrigger, SheetFooter, SheetClose,
} from "@/components/ui/sheet";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { fromISODateString } from "@/lib/date-utils";
import { normalizeWorkLogFilters, workLogQuarterRange } from "@/lib/hr/work-log-window";
import { normalizeWorkLogPeopleFilters } from "@/lib/hr/work-log-people-filters";
import { Users, Check, ChevronDown, Filter, CalendarDays, Download } from "lucide-react";

export interface WorkLogFilters {
  year: number;
  quarter: number;
  selectedUserId?: string;
  departmentId?: string;
  month?: number;
  dateFrom?: string;
  dateTo?: string;
  viewAllTeam?: boolean;
}

export interface WorkLogFilterEmployee {
  id: string;
  firstName: string | null;
  lastName: string | null;
  departmentId?: number | null;
  joiningDate?: string | Date | null;
}

export interface WorkLogFilterDepartment {
  id: number;
  name: string;
}

export interface SharedFilterProps {
  filters: WorkLogFilters;
  setFilters: React.Dispatch<React.SetStateAction<WorkLogFilters>>;
  draftFilters: WorkLogFilters;
  setDraftFilters: React.Dispatch<React.SetStateAction<WorkLogFilters>>;
  activeFilterCount: number;
  availableYears: number[];
  currentYear: number;
  currentQuarter: number;
  employees: WorkLogFilterEmployee[] | undefined;
  departments: WorkLogFilterDepartment[] | undefined;
  isAdminOrCeo: boolean;
  userRole?: string | null;
  currentUserId?: string;
  employeeSearchOpen: boolean;
  setEmployeeSearchOpen: React.Dispatch<React.SetStateAction<boolean>>;
  employeeSearch: string;
  setEmployeeSearch: React.Dispatch<React.SetStateAction<string>>;
}

interface WorkLogFilterActionsProps extends SharedFilterProps {
  onExport: () => void;
}

export function WorkLogFilterActions({
  filters,
  setFilters,
  draftFilters,
  setDraftFilters,
  activeFilterCount,
  availableYears,
  currentYear,
  currentQuarter,
  employees,
  departments,
  isAdminOrCeo,
  userRole,
  currentUserId,
  employeeSearchOpen,
  setEmployeeSearchOpen,
  employeeSearch,
  setEmployeeSearch,
  onExport,
}: WorkLogFilterActionsProps) {
  const [sheetEmpOpen, setSheetEmpOpen] = useState(false);
  const [sheetEmpSearch, setSheetEmpSearch] = useState("");

  const handleYearChange = useCallback((v: string) => {
    const y = parseInt(v);
    setFilters((p) => ({ ...p, year: y, month: undefined, dateFrom: undefined, dateTo: undefined }));
    setDraftFilters((p) => ({ ...p, year: y, month: undefined, dateFrom: undefined, dateTo: undefined }));
  }, [setFilters, setDraftFilters]);

  const handleQuarterChange = useCallback((v: string) => {
    const q = parseInt(v);
    setFilters((p) => ({ ...p, quarter: q, month: undefined, dateFrom: undefined, dateTo: undefined }));
    setDraftFilters((p) => ({ ...p, quarter: q, month: undefined, dateFrom: undefined, dateTo: undefined }));
  }, [setFilters, setDraftFilters]);

  const handleSheetOpen = useCallback((open: boolean) => {
    if (open) setDraftFilters({ ...filters });
  }, [filters, setDraftFilters]);

  const handleDraftYearChange = useCallback((v: string) => {
    setDraftFilters((p) => ({
      ...p,
      year: parseInt(v),
      month: undefined,
      dateFrom: undefined,
      dateTo: undefined,
    }));
  }, [setDraftFilters]);

  const handleDraftQuarterChange = useCallback((v: string) => {
    setDraftFilters((p) => ({ ...p, quarter: parseInt(v), month: undefined, dateFrom: undefined, dateTo: undefined }));
  }, [setDraftFilters]);

  const handleDraftMonthChange = useCallback((v: string) => {
    setDraftFilters((p) => ({
      ...p,
      month: v === "all" ? undefined : parseInt(v),
      dateFrom: undefined,
      dateTo: undefined,
    }));
  }, [setDraftFilters]);

  const handleDraftDateFromChange = useCallback((val: string) => {
    setDraftFilters((p) => ({ ...p, dateFrom: val || undefined, month: undefined }));
  }, [setDraftFilters]);

  const handleDraftDateToChange = useCallback((val: string) => {
    setDraftFilters((p) => ({ ...p, dateTo: val || undefined, month: undefined }));
  }, [setDraftFilters]);

  const handleDraftDepartmentChange = useCallback((v: string) => {
    setDraftFilters((p) => {
      const departmentId = v === "all" ? undefined : v;
      const selected = p.selectedUserId
        ? (employees ?? []).find((e) => e.id === p.selectedUserId)
        : undefined;
      const selectedUserId =
        departmentId && selected && selected.departmentId?.toString() !== departmentId
          ? undefined
          : p.selectedUserId;

      return {
        ...p,
        departmentId,
        selectedUserId,
        viewAllTeam: !selectedUserId,
      };
    });
  }, [setDraftFilters, employees]);

  const writesOwnLogsByDefault = userRole === "HR" || userRole === "BRANCH_HR";

  const handleSelectMyLogs = useCallback(() => {
    setDraftFilters((p) => ({
      ...p,
      selectedUserId: writesOwnLogsByDefault && currentUserId ? currentUserId : undefined,
      viewAllTeam: false,
    }));
    setSheetEmpOpen(false);
    setSheetEmpSearch("");
  }, [setDraftFilters, writesOwnLogsByDefault, currentUserId]);

  const handleSelectAllEmployees = useCallback(() => {
    setDraftFilters((p) => ({
      ...p,
      selectedUserId: undefined,
      viewAllTeam: true,
    }));
    setSheetEmpOpen(false);
    setSheetEmpSearch("");
  }, [setDraftFilters]);

  const handleApplyFilters = useCallback(() => {
    setFilters(
      normalizeWorkLogFilters(
        normalizeWorkLogPeopleFilters(draftFilters, employees ?? []),
      ),
    );
  }, [setFilters, draftFilters, employees]);

  const handleResetDraft = useCallback(() => {
    setDraftFilters({ year: currentYear, quarter: currentQuarter, viewAllTeam: false });
  }, [setDraftFilters, currentYear, currentQuarter]);

  const allEmployeesLabel = isAdminOrCeo ? "All Employees" : "My Logs";

  const employeePickerLabel = useCallback(
    (state: WorkLogFilters) => {
      if (state.selectedUserId) {
        const emp =
          (employees ?? []).find((e) => e.id === state.selectedUserId);
        if (!emp) return "Employee";
        const name = `${emp.firstName ?? ""} ${emp.lastName ?? ""}`.trim();
        return state.selectedUserId === currentUserId ? `${name} (Me)` : name;
      }
      if (state.viewAllTeam || userRole === "CEO" || userRole === "ADMIN") {
        return allEmployeesLabel;
      }
      if (currentUserId) {
        const me = (employees ?? []).find((e) => e.id === currentUserId);
        if (me) {
          const name = `${me.firstName ?? ""} ${me.lastName ?? ""}`.trim();
          return `${name} (Me)`;
        }
      }
      return allEmployeesLabel;
    },
    [employees, currentUserId, userRole, allEmployeesLabel],
  );

  const isAllEmployeesActive = useCallback(
    (state: WorkLogFilters) =>
      !state.selectedUserId && (state.viewAllTeam || userRole === "CEO" || userRole === "ADMIN"),
    [userRole],
  );

  const isMyLogsActive = useCallback(
    (state: WorkLogFilters) =>
      writesOwnLogsByDefault &&
      !state.viewAllTeam &&
      (!state.selectedUserId || state.selectedUserId === currentUserId),
    [writesOwnLogsByDefault, currentUserId],
  );

  const filteredEmployees = draftFilters.departmentId
    ? (employees ?? []).filter((e) => e.departmentId?.toString() === draftFilters.departmentId)
    : (employees ?? []);

  const topBarEmployees = filters.departmentId
    ? (employees ?? []).filter((e) => e.departmentId?.toString() === filters.departmentId)
    : (employees ?? []);

  const selectedEmployeeName = employeePickerLabel(draftFilters);

  const monthOptions = (() => {
    const startMonthIdx = (draftFilters.quarter - 1) * 3;
    return [0, 1, 2].map((offset) => {
      const monthIdx = startMonthIdx + offset;
      return {
        idx: monthIdx,
        name: format(new Date(draftFilters.year, monthIdx, 1), "MMMM"),
      };
    });
  })();

  const draftQuarterRange = useMemo(
    () => workLogQuarterRange(draftFilters.year, draftFilters.quarter),
    [draftFilters.year, draftFilters.quarter],
  );

  const draftDateFromBound = draftFilters.dateFrom
    ? fromISODateString(draftFilters.dateFrom)
    : fromISODateString(draftQuarterRange.startDate);
  const draftDateToBound = draftFilters.dateTo
    ? fromISODateString(draftFilters.dateTo)
    : fromISODateString(draftQuarterRange.endDate);

  return (
    <div className="flex flex-wrap gap-2 w-full sm:w-auto">
      <Select value={filters.year.toString()} onValueChange={handleYearChange}>
        <SelectTrigger className="w-[90px] sm:w-[100px] h-9" aria-label="Select year">
          <SelectValue placeholder="Year" />
        </SelectTrigger>
        <SelectContent>
          {availableYears.map((y) => (
            <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={filters.quarter.toString()} onValueChange={handleQuarterChange}>
        <SelectTrigger className="w-[130px] sm:w-[150px] h-9" aria-label="Select quarter">
          <SelectValue placeholder="Quarter" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="1">Q1 (Jan - Mar)</SelectItem>
          <SelectItem value="2">Q2 (Apr - Jun)</SelectItem>
          <SelectItem value="3">Q3 (Jul - Sep)</SelectItem>
          <SelectItem value="4">Q4 (Oct - Dec)</SelectItem>
        </SelectContent>
      </Select>

      {isAdminOrCeo && employees && employees.length > 0 && (
        <Popover open={employeeSearchOpen} onOpenChange={setEmployeeSearchOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={employeeSearchOpen}
              className="h-9 w-[180px] sm:w-[220px] justify-between font-normal"
            >
              <span className="flex items-center gap-1.5 truncate">
                <Users className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                {employeePickerLabel(filters)}
              </span>
              <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[260px] p-0" align="start">
            <Command>
              <CommandInput
                placeholder="Search employee..."
                value={employeeSearch}
                onValueChange={setEmployeeSearch}
              />
              <CommandEmpty>No employee found.</CommandEmpty>
              <CommandGroup className="max-h-60 overflow-y-auto">
                {writesOwnLogsByDefault ? (
                  <CommandItem
                    value="My Logs"
                    onSelect={() => {
                      setFilters((p) => ({
                        ...p,
                        selectedUserId: currentUserId,
                        viewAllTeam: false,
                        departmentId: undefined,
                      }));
                      setDraftFilters((p) => ({
                        ...p,
                        selectedUserId: currentUserId,
                        viewAllTeam: false,
                        departmentId: undefined,
                      }));
                      setEmployeeSearchOpen(false);
                      setEmployeeSearch("");
                    }}
                  >
                    <Check className={cn("mr-2 h-4 w-4", isMyLogsActive(filters) ? "opacity-100" : "opacity-0")} />
                    My Logs
                  </CommandItem>
                ) : null}
                <CommandItem
                  value={allEmployeesLabel}
                  onSelect={() => {
                    setFilters((p) => ({
                      ...p,
                      selectedUserId: undefined,
                      viewAllTeam: true,
                    }));
                    setDraftFilters((p) => ({
                      ...p,
                      selectedUserId: undefined,
                      viewAllTeam: true,
                    }));
                    setEmployeeSearchOpen(false);
                    setEmployeeSearch("");
                  }}
                >
                  <Check className={cn("mr-2 h-4 w-4", isAllEmployeesActive(filters) ? "opacity-100" : "opacity-0")} />
                  {allEmployeesLabel}
                </CommandItem>
                {topBarEmployees.map((emp) => {
                  const isSelf = emp.id === currentUserId;
                  const name = `${emp.firstName ?? ""} ${emp.lastName ?? ""}`.trim();
                  return (
                    <CommandItem
                      key={emp.id}
                      value={isSelf ? `${name} Me` : name}
                      onSelect={() => {
                        setFilters((p) => ({
                          ...p,
                          selectedUserId: emp.id,
                          viewAllTeam: false,
                        }));
                        setDraftFilters((p) => ({
                          ...p,
                          selectedUserId: emp.id,
                          viewAllTeam: false,
                        }));
                        setEmployeeSearchOpen(false);
                        setEmployeeSearch("");
                      }}
                    >
                      <Check className={cn("mr-2 h-4 w-4", filters.selectedUserId === emp.id ? "opacity-100" : "opacity-0")} />
                      {name}{isSelf ? " (Me)" : ""}
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            </Command>
          </PopoverContent>
        </Popover>
      )}

      <Sheet onOpenChange={handleSheetOpen}>
        <SheetTrigger asChild>
          <Button variant="outline" size="sm" className="h-9 gap-1.5 relative">
            <Filter className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Filters</span>
            {activeFilterCount > 0 && (
              <Badge className="absolute -top-1.5 -right-1.5 h-4 w-4 p-0 flex items-center justify-center text-[10px] bg-gold text-white border-0">
                {activeFilterCount}
              </Badge>
            )}
          </Button>
        </SheetTrigger>
        <SheetContent className="w-full sm:max-w-sm overflow-y-auto p-5">
          <SheetHeader className="pb-4">
            <SheetTitle>Advanced Filters</SheetTitle>
            <SheetDescription>Refine your work logs view</SheetDescription>
          </SheetHeader>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Year</Label>
              <Select value={draftFilters.year.toString()} onValueChange={handleDraftYearChange}>
                <SelectTrigger className="w-full"><SelectValue placeholder="Select year" /></SelectTrigger>
                <SelectContent>
                  {availableYears.map((y) => (
                    <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Quarter</Label>
              <Select value={draftFilters.quarter.toString()} onValueChange={handleDraftQuarterChange}>
                <SelectTrigger className="w-full"><SelectValue placeholder="Select quarter" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Q1 (Jan - Mar)</SelectItem>
                  <SelectItem value="2">Q2 (Apr - Jun)</SelectItem>
                  <SelectItem value="3">Q3 (Jul - Sep)</SelectItem>
                  <SelectItem value="4">Q4 (Oct - Dec)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Month</Label>
              <Select
                value={draftFilters.month !== undefined ? draftFilters.month.toString() : "all"}
                onValueChange={handleDraftMonthChange}
              >
                <SelectTrigger className="w-full">
                  <CalendarDays className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
                  <SelectValue placeholder="All months" />
                </SelectTrigger>
                <SelectContent className="max-h-[200px] overflow-y-auto">
                  <SelectItem value="all">All Months</SelectItem>
                  {monthOptions.map((m) => (
                    <SelectItem key={m.idx} value={m.idx.toString()}>{m.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Date Range</Label>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs text-muted-foreground">From</Label>
                  <DatePicker
                    value={draftFilters.dateFrom || ""}
                    onChange={handleDraftDateFromChange}
                    placeholder="From date"
                    fromDate={fromISODateString(draftQuarterRange.startDate)}
                    toDate={draftDateToBound}
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">To</Label>
                  <DatePicker
                    value={draftFilters.dateTo || ""}
                    onChange={handleDraftDateToChange}
                    placeholder="To date"
                    fromDate={draftDateFromBound}
                    toDate={fromISODateString(draftQuarterRange.endDate)}
                  />
                </div>
              </div>
            </div>

            {isAdminOrCeo && departments && departments.length > 0 && (
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">Department</Label>
                <Select value={draftFilters.departmentId || "all"} onValueChange={handleDraftDepartmentChange}>
                  <SelectTrigger className="w-full"><SelectValue placeholder="All departments" /></SelectTrigger>
                  <SelectContent className="max-h-[200px] overflow-y-auto scrollbar-thin">
                    <SelectItem value="all">All Departments</SelectItem>
                    {departments.map((dept) => (
                      <SelectItem key={dept.id} value={dept.id.toString()}>{dept.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {isAdminOrCeo && employees && employees.length > 0 && (
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">Employee</Label>
                <Popover open={sheetEmpOpen} onOpenChange={setSheetEmpOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={sheetEmpOpen}
                      className="w-full justify-between font-normal"
                    >
                      <span className="flex items-center gap-1.5 truncate">
                        <Users className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        {selectedEmployeeName}
                      </span>
                      <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-full p-0" align="start">
                    <Command>
                      <CommandInput
                        placeholder="Search employee..."
                        value={sheetEmpSearch}
                        onValueChange={setSheetEmpSearch}
                      />
                      <CommandEmpty>No employee found.</CommandEmpty>
                      <CommandGroup className="max-h-60 overflow-y-auto">
                        {writesOwnLogsByDefault ? (
                          <CommandItem value="My Logs" onSelect={handleSelectMyLogs}>
                            <Check className={cn("mr-2 h-4 w-4", isMyLogsActive(draftFilters) ? "opacity-100" : "opacity-0")} />
                            My Logs
                          </CommandItem>
                        ) : null}
                        <CommandItem value={allEmployeesLabel} onSelect={handleSelectAllEmployees}>
                          <Check className={cn("mr-2 h-4 w-4", isAllEmployeesActive(draftFilters) ? "opacity-100" : "opacity-0")} />
                          {allEmployeesLabel}
                        </CommandItem>
                        {filteredEmployees.map((emp) => (
                          <EmployeeCommandItem
                            key={emp.id}
                            employee={emp}
                            isSelected={draftFilters.selectedUserId === emp.id}
                            isSelf={emp.id === currentUserId}
                            onSelect={setDraftFilters}
                            onClose={setSheetEmpOpen}
                            onClearSearch={setSheetEmpSearch}
                          />
                        ))}
                      </CommandGroup>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
            )}
          </div>

          <SheetFooter className="flex flex-row gap-2 sm:flex-row pt-4">
            <Button variant="outline" className="flex-1" onClick={handleResetDraft}>
              Reset
            </Button>
            <SheetClose asChild>
              <Button className="flex-1 bg-gold hover:bg-gold/90 text-white" onClick={handleApplyFilters}>
                Apply Filters
              </Button>
            </SheetClose>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {isAdminOrCeo && (
        <Button variant="outline" size="sm" className="h-9 gap-1.5" onClick={onExport}>
          <Download className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Export</span>
        </Button>
      )}
    </div>
  );
}

function EmployeeCommandItem({
  employee,
  isSelected,
  isSelf,
  onSelect,
  onClose,
  onClearSearch,
}: {
  employee: WorkLogFilterEmployee;
  isSelected: boolean;
  isSelf: boolean;
  onSelect: React.Dispatch<React.SetStateAction<WorkLogFilters>>;
  onClose: React.Dispatch<React.SetStateAction<boolean>>;
  onClearSearch: React.Dispatch<React.SetStateAction<string>>;
}) {
  const handleSelect = useCallback(() => {
    onSelect((p) => ({ ...p, selectedUserId: employee.id, viewAllTeam: false }));
    onClose(false);
    onClearSearch("");
  }, [employee.id, onSelect, onClose, onClearSearch]);

  const name = `${employee.firstName ?? ""} ${employee.lastName ?? ""}`.trim();

  return (
    <CommandItem value={isSelf ? `${name} Me` : name} onSelect={handleSelect}>
      <Check className={cn("mr-2 h-4 w-4", isSelected ? "opacity-100" : "opacity-0")} />
      {name}{isSelf ? " (Me)" : ""}
    </CommandItem>
  );
}
