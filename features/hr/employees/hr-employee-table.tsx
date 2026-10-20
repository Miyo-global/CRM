"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Eye, Pencil, UserX, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import { HrEmployeeListToolbar } from "./hr-employee-list-toolbar";
import { EmployeeDirectoryCard } from "./employee-directory-card";
import type { StatusFilter, RoleFilter } from "./hr-types";
import { cn, resolveImageUrl } from "@/lib/utils";
import { StatusPill } from "@/components/ui/status-pill";
import {
  canDeleteEmployee,
  getDisplayName,
  getInitials,
  PAGE_SIZE_OPTIONS,
  ROLE_LABELS,
  type PageSizeOption,
  type Employee,
} from "./hr-types";

function formatJoiningDate(value: string | null | undefined): string {
  if (!value) return "—";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "—";
  return format(parsed, "MMM d, yyyy");
}

function DepartmentCell({ department }: { department: Employee["department"] }) {
  if (department?.name) {
    return (
      <Badge variant="secondary" className="whitespace-nowrap">
        {department.name}
      </Badge>
    );
  }

  return <StatusPill tone="warning" className="whitespace-nowrap">Unassigned</StatusPill>;
}

interface HrEmployeeTableProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  deptFilter: string;
  onDeptChange: (value: string) => void;
  departments: string[];
  statusFilter: StatusFilter;
  onStatusChange: (value: StatusFilter) => void;
  roleFilter: RoleFilter;
  onRoleChange: (value: RoleFilter) => void;
  onClearFilters: () => void;
  hasSearchFilter?: boolean;
  employees: Employee[];
  totalCount: number;
  page: number;
  pageSize: PageSizeOption;
  totalPages: number;
  showFrom: number;
  showTo: number;
  currentUserRole: string | undefined;
  currentUserId: string | undefined;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: PageSizeOption) => void;
  onRequestDelete: (employee: Employee) => void;
  /** Render the toolbar elsewhere (e.g. the page `filters` slot). */
  hideToolbar?: boolean;
}

export function HrEmployeeTable({
  searchTerm,
  onSearchChange,
  deptFilter,
  onDeptChange,
  departments,
  statusFilter,
  onStatusChange,
  roleFilter,
  onRoleChange,
  onClearFilters,
  hasSearchFilter,
  employees,
  totalCount,
  page,
  pageSize,
  totalPages,
  showFrom,
  showTo,
  currentUserRole,
  currentUserId,
  onPageChange,
  onPageSizeChange,
  onRequestDelete,
  hideToolbar = false,
}: HrEmployeeTableProps) {
  return (
    <Card className="flex min-h-0 flex-1 flex-col gap-0 overflow-hidden py-0">
      <CardContent className="flex min-h-0 flex-1 flex-col p-0">
        {!hideToolbar && (
          <HrEmployeeListToolbar
            searchTerm={searchTerm}
            onSearchChange={onSearchChange}
            deptFilter={deptFilter}
            onDeptChange={onDeptChange}
            departments={departments}
            statusFilter={statusFilter}
            onStatusChange={onStatusChange}
            roleFilter={roleFilter}
            onRoleChange={onRoleChange}
            onClearFilters={onClearFilters}
            hasSearchFilter={hasSearchFilter}
            totalCount={totalCount}
            className="border-b px-4 py-3"
          />
        )}
        <EmployeeTableBody
          employees={employees}
          currentUserRole={currentUserRole}
          currentUserId={currentUserId}
          onRequestDelete={onRequestDelete}
        />
        <HrEmployeePagination
          page={page}
          pageSize={pageSize}
          totalPages={totalPages}
          totalCount={totalCount}
          showFrom={showFrom}
          showTo={showTo}
          onPageChange={onPageChange}
          onPageSizeChange={onPageSizeChange}
        />
      </CardContent>
    </Card>
  );
}

function EmployeeTableBody({
  employees,
  currentUserRole,
  currentUserId,
  onRequestDelete,
}: Pick<HrEmployeeTableProps, "employees" | "currentUserRole" | "currentUserId" | "onRequestDelete">) {
  return (
      <>
        {/* Under 768px the eight columns cannot fit; show cards (QA-RESP-01). */}
        <ul className="grid gap-3 p-3 md:hidden" aria-label="Employee directory">
          {employees.map((user) => (
            <li key={user.id}>
              <EmployeeDirectoryCard
                id={user.id}
                name={getDisplayName(user)}
                initials={getInitials(user)}
                email={user.email}
                role={user.role}
                roleLabel={ROLE_LABELS[user.role] ?? user.role}
                designation={user.designation}
                department={user.department?.name ?? null}
                image={user.image}
                isActive={user.isActive !== false}
              />
            </li>
          ))}
        </ul>
        <div className="hidden min-h-0 flex-1 overflow-y-auto md:block" role="region" aria-label="Employee directory table">
            <Table>
              <TableHeader className="sticky top-0 z-sticky bg-card">
                <TableRow className="hover:bg-transparent">
                  <TableHead>Name</TableHead>
                  <TableHead>Employee ID</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Joining Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead pinned="right" className="bg-card text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {employees.map((user) => {
                  const displayName = getDisplayName(user);
                  const initials = getInitials(user);
                  const isActive = user.isActive !== false;
                  const canTerminate = canDeleteEmployee(
                    user.role,
                    user.id,
                    currentUserRole,
                    currentUserId,
                  );
                  const roleLabel = ROLE_LABELS[user.role] ?? user.role;

                  return (
                    <TableRow key={user.id} className="group">
                      <TableCell>
                        <Link
                          href={`/hr/employees/${user.id}`}
                          className="flex items-center gap-3 rounded-md outline-none focus-visible:focus-ring"
                        >
                          <Avatar className="size-8 shrink-0 border border-border">
                            <AvatarImage src={resolveImageUrl(user.image)} alt="" />
                            <AvatarFallback className="bg-brand-soft text-xs font-medium text-brand-soft-foreground">
                              {initials}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <span className="block whitespace-nowrap text-sm font-medium text-foreground transition-colors group-hover:text-brand-text">
                              {displayName}
                            </span>
                            {user.designation ? (
                              <span className="block max-w-44 truncate text-2xs text-muted-foreground" title={user.designation}>
                                {user.designation}
                              </span>
                            ) : null}
                          </div>
                        </Link>
                      </TableCell>

                      <TableCell className="whitespace-nowrap font-mono text-sm text-muted-foreground">
                        {user.employeeId?.trim() ? (
                          user.employeeId
                        ) : (
                          <span className="font-sans text-warning-strong">Pending</span>
                        )}
                      </TableCell>

                      <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                        {user.email}
                      </TableCell>

                      <TableCell>
                        <Badge variant="outline" className="whitespace-nowrap">
                          {roleLabel}
                        </Badge>
                      </TableCell>

                      <TableCell>
                        <DepartmentCell department={user.department} />
                      </TableCell>

                      <TableCell className="whitespace-nowrap text-sm tabular-nums text-muted-foreground">
                        {formatJoiningDate(user.joiningDate)}
                      </TableCell>

                      <TableCell>
                        <StatusPill tone={isActive ? "success" : "neutral"} dot>
                          {isActive ? "Active" : "Inactive"}
                        </StatusPill>
                      </TableCell>

                      <TableCell pinned="right" className="text-right">
                        {/* Always visible: hover-only icons read as an empty Actions column (A43). */}
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            aria-label={`View ${displayName}`}
                            title="View details"
                            asChild
                          >
                            <Link href={`/hr/employees/${user.id}`}>
                              <Eye className="size-4" aria-hidden="true" />
                            </Link>
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            aria-label={`Edit ${displayName}`}
                            title="Edit profile"
                            asChild
                          >
                            <Link href={`/hr/employees/${user.id}?tab=profile`}>
                              <Pencil className="size-4" aria-hidden="true" />
                            </Link>
                          </Button>
                          {canTerminate && isActive && (
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              className="text-destructive hover:bg-danger-soft hover:text-destructive"
                              aria-label={`Terminate ${displayName}`}
                              title="Terminate"
                              onClick={() => onRequestDelete(user)}
                            >
                              <UserX className="size-4" aria-hidden="true" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
        </div>
      </>
  );
}

interface HrEmployeePaginationProps {
  page: number;
  pageSize: PageSizeOption;
  totalPages: number;
  totalCount: number;
  showFrom: number;
  showTo: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: PageSizeOption) => void;
  className?: string;
}

export function HrEmployeePagination({
  page,
  pageSize,
  totalPages,
  totalCount,
  showFrom,
  showTo,
  onPageChange,
  onPageSizeChange,
  className,
}: HrEmployeePaginationProps) {
  const [goToPage, setGoToPage] = useState("");

  const handleGoToPageChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setGoToPage(e.target.value);
  }, []);

  const handleGoToPageKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        const num = parseInt(goToPage);
        if (!isNaN(num) && num >= 1 && num <= totalPages) {
          onPageChange(num);
          setGoToPage("");
        }
      }
    },
    [goToPage, totalPages, onPageChange],
  );

  const handlePageSizeChange = useCallback(
    (v: string) => {
      onPageSizeChange(Number(v) as PageSizeOption);
    },
    [onPageSizeChange],
  );

  return (
        <div className={cn("flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-2", className)}>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Rows per page</span>
            <Select value={String(pageSize)} onValueChange={handlePageSizeChange}>
              <SelectTrigger className="h-7 w-16 text-xs" aria-label="Rows per page">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PAGE_SIZE_OPTIONS.map((s) => (
                  <SelectItem key={s} value={String(s)} className="text-xs">{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span className="text-xs text-muted-foreground tabular-nums">
              {showFrom}–{showTo} of {totalCount}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <Button
              variant="outline"
              size="icon"
              className="h-7 w-7"
              disabled={page <= 1}
              onClick={() => onPageChange(1)}
              aria-label="First page"
            >
              <ChevronsLeft className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-7 w-7"
              disabled={page <= 1}
              onClick={() => onPageChange(page - 1)}
              aria-label="Previous page"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </Button>
            <span className="text-xs text-muted-foreground tabular-nums px-1">
              {page} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="icon"
              className="h-7 w-7"
              disabled={page >= totalPages}
              onClick={() => onPageChange(page + 1)}
              aria-label="Next page"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-7 w-7"
              disabled={page >= totalPages}
              onClick={() => onPageChange(totalPages)}
              aria-label="Last page"
            >
              <ChevronsRight className="h-3.5 w-3.5" />
            </Button>
            <div className="flex items-center gap-1.5 ml-1">
              <span className="text-xs text-muted-foreground">Go to</span>
              <Input
                type="number"
                min={1}
                max={totalPages}
                value={goToPage}
                onChange={handleGoToPageChange}
                onKeyDown={handleGoToPageKeyDown}
                placeholder=""
                className="h-7 w-14 text-xs text-center"
                aria-label="Go to page"
              />
            </div>
          </div>
        </div>
  );
}
