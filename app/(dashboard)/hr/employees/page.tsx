"use client";

import { useState, useMemo } from "react";
import { useHrEmployees, useHrDepartments } from "@/lib/api/hooks/hr";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmptyState } from "@/components/ui/empty-state";
import { QueryErrorState } from "@/components/ui/query-error-state";
import { StatusPill } from "@/components/ui/status-pill";
import { EmptySearchIllustration, EmptyTeamIllustration } from "@/components/illustrations";
import { ListToolbar } from "@/components/shared/list-toolbar";
import { EmployeeDirectoryCard } from "@/features/hr/employees/employee-directory-card";
import { LayoutGrid, List, X } from "lucide-react";
import { resolveImageUrl } from "@/lib/utils";
import Link from "next/link";
import type { Employee } from "@/types/hr";

interface Department {
  id: number;
  name: string;
}

function displayNameOf(emp: Employee) {
  return emp.firstName && emp.lastName
    ? `${emp.firstName} ${emp.lastName}`
    : emp.name ?? "";
}

function EmployeeRow({ emp, dept }: { emp: Employee; dept: string | null }) {
  const displayName = displayNameOf(emp);

  return (
    <TableRow className="cursor-pointer">
      <TableCell>
        <Link href={`/hr/employees/${emp.id}`} className="flex items-center gap-3 rounded-md outline-none focus-visible:focus-ring">
          <Avatar className="size-8">
            <AvatarImage src={resolveImageUrl(emp.image)} alt="" />
            <AvatarFallback className="bg-brand-soft text-xs text-brand-soft-foreground">
              {displayName[0]?.toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium" title={displayName}>{displayName}</p>
          </div>
        </Link>
      </TableCell>
      <TableCell className="font-mono text-sm text-muted-foreground">
        {emp.employeeId ?? ""}
      </TableCell>
      <TableCell className="text-sm text-muted-foreground">{emp.designation ?? ""}</TableCell>
      <TableCell>
        {dept ? <Badge variant="secondary">{dept}</Badge> : null}
      </TableCell>
      <TableCell className="max-w-48 truncate text-sm text-muted-foreground" title={emp.email}>
        {emp.email}
      </TableCell>
      <TableCell>
        <StatusPill tone={emp.isActive ? "success" : "neutral"} dot>
          {emp.isActive ? "Active" : "Inactive"}
        </StatusPill>
      </TableCell>
    </TableRow>
  );
}

export default function EmployeesPage() {
  const { data: rawEmployees, isLoading, isError, error, refetch } = useHrEmployees();
  const { data: departments } = useHrDepartments();

  const [search, setSearch] = useState("");
  const [filterDept, setFilterDept] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [view, setView] = useState<"grid" | "list">("grid");

  const employees = useMemo(
    () => (Array.isArray(rawEmployees) ? rawEmployees : (rawEmployees as { data?: Employee[] })?.data ?? []) as Employee[],
    [rawEmployees]
  );

  const deptMap = useMemo(() => {
    const map = new Map<number, string>();
    (departments as Department[] | undefined)?.forEach((d) => map.set(d.id, d.name));
    return map;
  }, [departments]);

  const filtered = useMemo(() => {
    let result = employees;
    if (search) {
      const lower = search.toLowerCase();
      result = result.filter(
        (e) =>
          e.name?.toLowerCase().includes(lower) ||
          e.firstName?.toLowerCase().includes(lower) ||
          e.lastName?.toLowerCase().includes(lower) ||
          e.email.toLowerCase().includes(lower) ||
          e.designation?.toLowerCase().includes(lower) ||
          e.employeeId?.toLowerCase().includes(lower)
      );
    }
    if (filterDept !== "all") {
      result = result.filter((e) => e.departmentId === Number(filterDept));
    }
    if (filterStatus !== "all") {
      result = result.filter((e) =>
        filterStatus === "active" ? e.isActive : !e.isActive
      );
    }
    return result;
  }, [employees, search, filterDept, filterStatus]);

  const hasFilters = search !== "" || filterDept !== "all" || filterStatus !== "all";

  const clearFilters = () => {
    setSearch("");
    setFilterDept("all");
    setFilterStatus("all");
  };

  if (isLoading) {
    return (
      <PageWrapper title="Employee Directory" subtitle="All team members">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {Array.from({ length: 12 }).map((_, i) => (
            <Skeleton key={i} className="h-36 rounded-lg" />
          ))}
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper
      title="Employee Directory"
      subtitle={`${filtered.length} of ${employees.length} employee${employees.length !== 1 ? "s" : ""}`}
      badge={String(employees.length)}
      stickyHeader
      filters={
        <ListToolbar
          className="w-full"
          search={{ value: search, onChange: setSearch, placeholder: "Search name, email, ID..." }}
          filters={
            <>
              <Select value={filterDept} onValueChange={setFilterDept}>
                <SelectTrigger className="h-9 w-44" aria-label="Department">
                  <SelectValue placeholder="Department" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Departments</SelectItem>
                  {(departments as Department[] | undefined)?.map((d) => (
                    <SelectItem key={d.id} value={String(d.id)}>{d.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="h-9 w-32" aria-label="Status">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
              {hasFilters && (
                <Button variant="ghost" size="sm" onClick={clearFilters}>
                  <X className="size-4" aria-hidden="true" />
                  Clear
                </Button>
              )}
            </>
          }
          view={
            <Tabs value={view} onValueChange={(v) => setView(v as "grid" | "list")}>
              <TabsList aria-label="View">
                <TabsTrigger value="grid" aria-label="Grid view">
                  <LayoutGrid className="size-4" aria-hidden="true" />
                </TabsTrigger>
                <TabsTrigger value="list" aria-label="List view">
                  <List className="size-4" aria-hidden="true" />
                </TabsTrigger>
              </TabsList>
            </Tabs>
          }
        />
      }
    >
      {isError ? (
        <QueryErrorState title="Couldn't load employees" error={error} onRetry={() => refetch()} />
      ) : filtered.length === 0 ? (
        hasFilters ? (
          <EmptyState
            illustration={<EmptySearchIllustration />}
            title="No results for these filters"
            description="No employees found matching your filters."
            action={{ label: "Clear filters", onClick: clearFilters }}
          />
        ) : (
          <EmptyState
            illustration={<EmptyTeamIllustration />}
            title="No employees yet"
            description="Team members will appear here once they are added."
          />
        )
      ) : view === "grid" ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {filtered.map((emp) => (
            <EmployeeDirectoryCard
              key={emp.id}
              id={emp.id}
              name={displayNameOf(emp)}
              initials={(emp.firstName?.[0] ?? emp.name?.[0] ?? "?").toUpperCase()}
              email={emp.email}
              role={emp.role}
              designation={emp.designation}
              department={emp.departmentId ? (deptMap.get(emp.departmentId) ?? null) : null}
              image={emp.image}
              isActive={emp.isActive}
            />
          ))}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border bg-card">
          <Table className="min-w-[760px]">
            <caption className="sr-only">Employee directory</caption>
            <TableHeader className="sticky top-0 z-sticky bg-card">
              <TableRow>
                <TableHead scope="col">Employee</TableHead>
                <TableHead scope="col" className="w-32">Employee ID</TableHead>
                <TableHead scope="col" className="w-40">Designation</TableHead>
                <TableHead scope="col" className="w-36">Department</TableHead>
                <TableHead scope="col" className="w-52">Email</TableHead>
                <TableHead scope="col" className="w-28">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((emp) => (
                <EmployeeRow
                  key={emp.id}
                  emp={emp}
                  dept={emp.departmentId ? (deptMap.get(emp.departmentId) ?? null) : null}
                />
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </PageWrapper>
  );
}
