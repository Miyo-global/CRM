"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import Link from "next/link";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { LayoutGrid, List, Plus } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { QueryErrorState } from "@/components/ui/query-error-state";
import { ExportButton } from "@/components/ui/export-button";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { EmptyState } from "@/components/ui/empty-state";
import { format } from "date-fns";
import { useDebouncedValue } from "@/hooks/use-debounce";
import {
  useHrEmployees,
  useHrDepartments,
  isPaginatedEmployees,
} from "@/lib/api/hooks/hr";
import { usePaginationParams } from "@/hooks/use-pagination-params";
import { clampPageSize } from "@/lib/pagination-constants";

import {
  type Employee,
  type StatusFilter,
  type RoleFilter,
  type PageSizeOption,
  PAGE_SIZE,
  ROLE_LABELS,
  getDisplayName,
  getInitials,
} from "@/features/hr/employees/hr-types";
import { EmployeesLoadingSkeleton } from "@/features/hr/employees/employees-loading-skeleton";
import { HrEmployeeListToolbar } from "@/features/hr/employees/hr-employee-list-toolbar";
import { HrEmployeePagination, HrEmployeeTable } from "@/features/hr/employees/hr-employee-table";
import { EmployeeDirectoryCard } from "@/features/hr/employees/employee-directory-card";
import { getTodayString, parseCalendarDate } from "@/lib/date-utils";
import { uniqueDepartmentNames } from "@/lib/hr/department-count";

const MIN_SEARCH_LENGTH = 3;
const SEARCH_DEBOUNCE_MS = 400;

export default function HRDashboardPage() {
  const { data: session } = useSession();
  const currentUserRole = session?.user?.role;
  const currentUserId = session?.user?.id;

  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const { page, pageSize, setPage, setPageSize, resetPage, updateParams } = usePaginationParams({
    defaultPageSize: PAGE_SIZE,
  });

  const searchFromUrl = searchParams.get("q") || "";
  const deptFilter = searchParams.get("dept") || "All";
  const statusFilter = (searchParams.get("status") as StatusFilter) || "Active";
  const roleFilter = (searchParams.get("role") as RoleFilter) || "All";

  const [searchInput, setSearchInput] = useState(searchFromUrl);
  const debouncedSearchInput = useDebouncedValue(searchInput, SEARCH_DEBOUNCE_MS);

  useEffect(() => {
    setSearchInput(searchFromUrl);
  }, [searchFromUrl]);

  useEffect(() => {
    const trimmed = debouncedSearchInput.trim();
    if (trimmed.length > 0 && trimmed.length < MIN_SEARCH_LENGTH) return;

    const nextQ = trimmed.length >= MIN_SEARCH_LENGTH ? trimmed : "";
    if (nextQ === searchFromUrl) return;

    updateParams({ q: nextQ || null, page: null });
  }, [debouncedSearchInput, searchFromUrl, updateParams]);

  const effectiveSearchTerm = useMemo(() => {
    const trimmed = debouncedSearchInput.trim();
    return trimmed.length >= MIN_SEARCH_LENGTH ? trimmed : "";
  }, [debouncedSearchInput]);

  const [view, setView] = useState<"table" | "grid">("table");

  const { data: employeesResponse, isLoading, isError, error, refetch } = useHrEmployees({
    page,
    limit: pageSize,
    q: effectiveSearchTerm || undefined,
    dept: deptFilter !== "All" ? deptFilter : undefined,
    status: statusFilter !== "Active" ? statusFilter : undefined,
    role: roleFilter !== "All" ? roleFilter : undefined,
  });

  const { data: departmentRows = [] } = useHrDepartments();

  const employees = useMemo(() => {
    if (isPaginatedEmployees(employeesResponse)) {
      return employeesResponse.data as unknown as Employee[];
    }
    return (Array.isArray(employeesResponse) ? employeesResponse : []) as unknown as Employee[];
  }, [employeesResponse]);

  const paginationMeta = isPaginatedEmployees(employeesResponse)
    ? employeesResponse.pagination
    : null;

  const totalCount = paginationMeta?.total ?? employees.length;
  const totalPages = paginationMeta?.totalPages ?? 1;

  const setSearchTerm = useCallback((q: string) => setSearchInput(q), []);
  const setDeptFilter = useCallback(
    (d: string) => updateParams({ dept: d === "All" ? null : d, page: null }),
    [updateParams],
  );
  const setStatusFilter = useCallback(
    (s: StatusFilter) => updateParams({ status: s === "Active" ? null : s, page: null }),
    [updateParams],
  );
  const setRoleFilter = useCallback(
    (r: RoleFilter) => updateParams({ role: r === "All" ? null : r, page: null }),
    [updateParams],
  );

  const handlePageSizeChange = useCallback(
    (size: PageSizeOption) => setPageSize(clampPageSize(size)),
    [setPageSize],
  );

  const departments = useMemo(
    () => uniqueDepartmentNames(departmentRows),
    [departmentRows],
  );

  const employeeExportSheets = useMemo(() => [{
    name: "Employees",
    columns: [
      { header: "Name", key: "name", width: 25 },
      { header: "Employee ID", key: "employeeId", width: 16 },
      { header: "Email", key: "email", width: 30 },
      { header: "Role", key: "role", width: 20 },
      { header: "Department", key: "department", width: 20 },
      { header: "Joining Date", key: "joiningDate", width: 14 },
      { header: "Status", key: "status", width: 12 },
    ],
    rows: employees.map((e) => ({
      name: `${e.firstName ?? ""} ${e.lastName ?? ""}`.trim() || e.email,
      employeeId: e.employeeId ?? "",
      email: e.email,
      role: ROLE_LABELS[e.role] ?? e.role,
      department: e.department?.name ?? "Unassigned",
      joiningDate: e.joiningDate
        ? format(parseCalendarDate(e.joiningDate), "yyyy-MM-dd")
        : "",
      status: e.isActive !== false ? "Active" : "Inactive",
    })),
  }], [employees]);

  const handleClearFilters = useCallback(() => {
    setSearchInput("");
    updateParams({ q: null, dept: null, status: null, role: null, page: null });
  }, [updateParams]);

  // R2-TERM-01: terminating goes through the workflow (reason, last working
  // day, Super Admin approval), not a one-click deactivate the API refuses.
  const handleRequestDelete = useCallback(
    (employee: Employee) =>
      router.push(`/hr/termination?employee=${encodeURIComponent(employee.id)}`),
    [router],
  );

  if (isLoading) return <EmployeesLoadingSkeleton />;

  const showFrom = totalCount > 0 ? (page - 1) * pageSize + 1 : 0;
  const showTo = Math.min(page * pageSize, totalCount);
  const hasActiveFilters =
    !!effectiveSearchTerm ||
    !!searchInput.trim() ||
    deptFilter !== "All" ||
    statusFilter !== "Active" ||
    roleFilter !== "All";

  const paginationProps = {
    page,
    pageSize,
    totalPages,
    totalCount,
    showFrom,
    showTo,
    onPageChange: setPage,
    onPageSizeChange: handlePageSizeChange,
  };

  return (
    <PageWrapper
      title="Employees"
      badge={String(totalCount)}
      stickyHeader
      actions={
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href="/hr/employees/terminated">Terminated</Link>
          </Button>
          <ExportButton
            filename={`employees-${getTodayString()}.xlsx`}
            sheets={employeeExportSheets}
          />
          <Button size="sm" asChild>
            <Link href="/hr/onboarding?tab=wizard">
              <Plus className="size-4" aria-hidden="true" />
              Add employee
            </Link>
          </Button>
        </div>
      }
      filters={
        <div className="flex w-full flex-wrap items-center gap-2">
          <HrEmployeeListToolbar
            className="w-auto flex-1"
            searchTerm={searchInput}
            onSearchChange={setSearchTerm}
            deptFilter={deptFilter}
            onDeptChange={setDeptFilter}
            departments={departments}
            statusFilter={statusFilter}
            onStatusChange={setStatusFilter}
            roleFilter={roleFilter}
            onRoleChange={setRoleFilter}
            onClearFilters={handleClearFilters}
            hasSearchFilter={!!effectiveSearchTerm || !!searchInput.trim()}
          />
          <Tabs value={view} onValueChange={(v) => setView(v as "table" | "grid")} className="ml-auto">
            <TabsList aria-label="View">
              <TabsTrigger value="table" aria-label="Table view">
                <List className="size-4" aria-hidden="true" />
              </TabsTrigger>
              <TabsTrigger value="grid" aria-label="Grid view">
                <LayoutGrid className="size-4" aria-hidden="true" />
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      }
    >
      {isError ? (
        <QueryErrorState title="Couldn't load employees" error={error} onRetry={() => refetch()} />
      ) : employees.length > 0 ? (
        view === "table" ? (
          <HrEmployeeTable
            hideToolbar
            searchTerm={searchInput}
            onSearchChange={setSearchTerm}
            deptFilter={deptFilter}
            onDeptChange={setDeptFilter}
            departments={departments}
            statusFilter={statusFilter}
            onStatusChange={setStatusFilter}
            roleFilter={roleFilter}
            onRoleChange={setRoleFilter}
            onClearFilters={handleClearFilters}
            hasSearchFilter={!!effectiveSearchTerm || !!searchInput.trim()}
            employees={employees}
            totalCount={totalCount}
            page={page}
            pageSize={pageSize}
            totalPages={totalPages}
            showFrom={showFrom}
            showTo={showTo}
            currentUserRole={currentUserRole}
            currentUserId={currentUserId}
            onPageChange={setPage}
            onPageSizeChange={handlePageSizeChange}
            onRequestDelete={handleRequestDelete}
          />
        ) : (
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
              {employees.map((e) => (
                <EmployeeDirectoryCard
                  key={e.id}
                  id={e.id}
                  name={getDisplayName(e)}
                  initials={getInitials(e)}
                  email={e.email}
                  role={e.role}
                  roleLabel={ROLE_LABELS[e.role] ?? e.role}
                  designation={e.designation}
                  department={e.department?.name ?? null}
                  image={e.image}
                  isActive={e.isActive !== false}
                />
              ))}
            </div>
            <HrEmployeePagination {...paginationProps} className="rounded-lg border bg-card" />
          </div>
        )
      ) : hasActiveFilters ? (
        <EmptyState
          title="No results found"
          description="No employees match your current filters. Try adjusting your search."
          action={{ label: "Clear filters", onClick: handleClearFilters }}
        />
      ) : (
        <EmptyState
          title="No employees found"
          description="Get started by adding your first team member."
          action={{ label: "Add employee", href: "/hr/onboarding?tab=wizard" }}
        />
      )}
    </PageWrapper>
  );
}
