"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import Link from "next/link";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { ExportButton } from "@/components/ui/export-button";
import { EmptySearchIllustration, EmptyTeamIllustration } from "@/components/illustrations";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { EmptyState } from "@/components/ui/empty-state";
import { toast } from "sonner";
import { format } from "date-fns";
import { useDebouncedValue } from "@/hooks/use-debounce";
import {
  useHrEmployees,
  useHrDepartments,
  useTerminateEmployee,
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
} from "@/features/hr/employees/hr-types";
import { EmployeesLoadingSkeleton } from "@/features/hr/employees/employees-loading-skeleton";
import { HrEmployeeListToolbar } from "@/features/hr/employees/hr-employee-list-toolbar";
import { HrEmployeeTable } from "@/features/hr/employees/hr-employee-table";
import { Card, CardContent } from "@/components/ui/card";
import { ConfirmActionDialog } from "@/features/hr/confirm-action-dialog";

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

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [employeeToDelete, setEmployeeToDelete] = useState<Employee | null>(null);

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

  const { data: employeesResponse, isLoading } = useHrEmployees({
    page,
    limit: pageSize,
    q: effectiveSearchTerm || undefined,
    dept: deptFilter !== "All" ? deptFilter : undefined,
    status: statusFilter !== "Active" ? statusFilter : undefined,
    role: roleFilter !== "All" ? roleFilter : undefined,
  });

  const { data: departmentRows = [] } = useHrDepartments();
  const terminateMutation = useTerminateEmployee();

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
    () => departmentRows.map((d) => d.name).sort(),
    [departmentRows],
  );

  const handleDelete = useCallback(async () => {
    if (!employeeToDelete) return;
    terminateMutation.mutate(employeeToDelete.id, {
      onSuccess: () => {
        toast.success("Employee terminated", {
          action: {
            label: "View terminated",
            onClick: () => router.push("/hr/employees/terminated"),
          },
        });
        setDeleteDialogOpen(false);
        setEmployeeToDelete(null);
      },
      onError: () => toast.error("Failed to terminate employee"),
    });
  }, [employeeToDelete, terminateMutation, router]);

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
        ? format(new Date(e.joiningDate), "yyyy-MM-dd")
        : "",
      status: e.isActive !== false ? "Active" : "Inactive",
    })),
  }], [employees]);

  const handleClearFilters = useCallback(() => {
    setSearchInput("");
    updateParams({ q: null, dept: null, status: null, role: null, page: null });
  }, [updateParams]);

  const handleRequestDelete = useCallback((employee: Employee) => {
    setEmployeeToDelete(employee);
    setDeleteDialogOpen(true);
  }, []);

  if (isLoading) return <EmployeesLoadingSkeleton />;

  const showFrom = totalCount > 0 ? (page - 1) * pageSize + 1 : 0;
  const showTo = Math.min(page * pageSize, totalCount);
  const hasActiveFilters =
    !!effectiveSearchTerm ||
    !!searchInput.trim() ||
    deptFilter !== "All" ||
    statusFilter !== "Active" ||
    roleFilter !== "All";

  return (
    <PageWrapper
      title="Employees"
      subtitle="Employee directory — search, filter, and manage team records"
      badge={String(totalCount)}
      actions={
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href="/hr/employees/terminated">Terminated</Link>
          </Button>
          <ExportButton
            filename={`employees-${new Date().toISOString().slice(0, 10)}.xlsx`}
            sheets={employeeExportSheets}
          />
          <Button size="sm" className="gap-2" asChild>
            <Link href="/hr/onboarding?tab=wizard">
              <Plus className="h-4 w-4" aria-hidden="true" />
              Add Employee
            </Link>
          </Button>
        </div>
      }
    >
      {employees.length > 0 ? (
        <HrEmployeeTable
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
      ) : hasActiveFilters ? (
        <Card className="border-border">
          <CardContent className="p-0">
            <HrEmployeeListToolbar
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
            <EmptyState
              illustration={<EmptySearchIllustration className="mb-3" />}
              title="No results found"
              description="No employees match your current filters. Try adjusting your search."
              className="py-12"
            />
          </CardContent>
        </Card>
      ) : (
        <EmptyState
          illustration={<EmptyTeamIllustration className="mb-3" />}
          title="No employees found"
          description="Get started by adding your first team member."
          action={{ label: "Add Employee", href: "/hr/onboarding?tab=wizard" }}
        />
      )}

      <ConfirmActionDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Terminate Employee"
        description={
          employeeToDelete
            ? `Are you sure you want to terminate ${employeeToDelete.firstName ?? ""} ${employeeToDelete.lastName ?? ""}? This action cannot be undone.`
            : ""
        }
        confirmLabel="Terminate"
        variant="destructive"
        onConfirm={handleDelete}
      />
    </PageWrapper>
  );
}
