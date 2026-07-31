"use client";

import { useState, useMemo } from "react";
import { useHrEmployees, useHrDepartments } from "@/lib/api/hooks/hr";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Input } from "@/components/ui/input";
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
import { Card, CardContent } from "@/components/ui/card";
import { resolveImageUrl } from "@/lib/utils";
import Link from "next/link";
import type { Employee } from "@/types/hr";

interface Department {
  id: number;
  name: string;
}

function EmployeeCard({ emp, dept }: { emp: Employee; dept: string | null }) {
  return (
    <Link href={`/hr/employees/${emp.id}`}>
      <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
        <CardContent className="p-4 flex flex-col items-center text-center gap-2">
          <Avatar className="h-16 w-16 mt-1">
            <AvatarImage src={resolveImageUrl(emp.image)} />
            <AvatarFallback className="bg-primary/10 text-primary text-lg">
              {(emp.firstName?.[0] ?? emp.name?.[0] ?? "?").toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="w-full">
            <p className="font-semibold text-sm leading-tight truncate">
              {emp.firstName && emp.lastName
                ? `${emp.firstName} ${emp.lastName}`
                : emp.name ?? ""}
            </p>
            {emp.designation && (
              <p className="text-xs text-muted-foreground truncate mt-0.5">{emp.designation}</p>
            )}
          </div>
          {dept && (
            <Badge variant="secondary" className="text-[10px] h-5 px-2 truncate max-w-full">
              <svg className="h-3 w-3 mr-1 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z" />
                <path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2" />
                <path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2" />
                <path d="M10 6h4" />
                <path d="M10 10h4" />
                <path d="M10 14h4" />
                <path d="M10 18h4" />
              </svg>
              {dept}
            </Badge>
          )}
          <div className="w-full space-y-1 text-[11px] text-muted-foreground">
            {emp.email && (
              <div className="flex items-center gap-1.5 truncate">
                <svg className="h-3 w-3 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect width="20" height="16" x="2" y="4" rx="2" />
                  <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                </svg>
                <span className="truncate">{emp.email}</span>
              </div>
            )}
          </div>
          <Badge
            variant={emp.isActive ? "default" : "secondary"}
            className={`text-[9px] h-4 px-1.5 ${emp.isActive ? "bg-emerald-500/15 text-emerald-700 border-emerald-500/30 hover:bg-emerald-500/15" : ""}`}
          >
            {emp.isActive ? "Active" : "Inactive"}
          </Badge>
        </CardContent>
      </Card>
    </Link>
  );
}

function EmployeeRow({ emp, dept }: { emp: Employee; dept: string | null }) {
  const displayName = emp.firstName && emp.lastName
    ? `${emp.firstName} ${emp.lastName}`
    : emp.name ?? "";

  return (
    <TableRow className="hover:bg-muted/50 cursor-pointer">
      <TableCell>
        <Link href={`/hr/employees/${emp.id}`} className="flex items-center gap-3">
          <Avatar className="h-8 w-8">
            <AvatarImage src={resolveImageUrl(emp.image)} />
            <AvatarFallback className="bg-primary/10 text-primary text-xs">
              {displayName[0]?.toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="text-sm font-medium truncate">{displayName}</p>
          </div>
        </Link>
      </TableCell>
      <TableCell className="text-sm font-mono text-muted-foreground">
        {emp.employeeId ?? ""}
      </TableCell>
      <TableCell className="text-sm text-muted-foreground">{emp.designation ?? ""}</TableCell>
      <TableCell>
        {dept ? (
          <Badge variant="secondary" className="text-[10px] h-5 px-2">{dept}</Badge>
        ) : (
          null
        )}
      </TableCell>
      <TableCell className="text-sm text-muted-foreground truncate max-w-[180px]">
        {emp.email}
      </TableCell>
      <TableCell>
        <Badge
          variant={emp.isActive ? "default" : "secondary"}
          className={`text-[9px] h-4 px-1.5 ${emp.isActive ? "bg-emerald-500/15 text-emerald-700 border-emerald-500/30 hover:bg-emerald-500/15" : ""}`}
        >
          {emp.isActive ? "Active" : "Inactive"}
        </Badge>
      </TableCell>
    </TableRow>
  );
}

export default function EmployeesPage() {
  const { data: rawEmployees, isLoading } = useHrEmployees();
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
        <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 p-4">
          {Array.from({ length: 15 }).map((_, i) => (
            <Skeleton key={i} className="h-48 rounded-xl" />
          ))}
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper
      title="Employee Directory"
      subtitle={`${filtered.length} of ${employees.length} employee${employees.length !== 1 ? "s" : ""}`}
      actions={
        <div className="flex items-center border border-border rounded-md">
          <Button
            variant={view === "grid" ? "default" : "ghost"}
            size="sm"
            className={`rounded-r-none ${view === "grid" ? "bg-gold hover:bg-gold/90 text-white" : ""}`}
            onClick={() => setView("grid")}
            aria-label="Grid view"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect width="7" height="7" x="3" y="3" rx="1" />
              <rect width="7" height="7" x="14" y="3" rx="1" />
              <rect width="7" height="7" x="14" y="14" rx="1" />
              <rect width="7" height="7" x="3" y="14" rx="1" />
            </svg>
          </Button>
          <Button
            variant={view === "list" ? "default" : "ghost"}
            size="sm"
            className={`rounded-l-none ${view === "list" ? "bg-gold hover:bg-gold/90 text-white" : ""}`}
            onClick={() => setView("list")}
            aria-label="List view"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="8" x2="21" y1="6" y2="6" />
              <line x1="8" x2="21" y1="12" y2="12" />
              <line x1="8" x2="21" y1="18" y2="18" />
              <line x1="3" x2="3.01" y1="6" y2="6" />
              <line x1="3" x2="3.01" y1="12" y2="12" />
              <line x1="3" x2="3.01" y1="18" y2="18" />
            </svg>
          </Button>
        </div>
      }
      filters={
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.3-4.3" />
            </svg>
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name, email, ID..."
              className="pl-8 h-8 w-60 text-xs"
            />
          </div>
          <Select value={filterDept} onValueChange={setFilterDept}>
            <SelectTrigger className="h-8 w-44 text-xs">
              <SelectValue placeholder="Department" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs">All Departments</SelectItem>
              {(departments as Department[] | undefined)?.map((d) => (
                <SelectItem key={d.id} value={String(d.id)} className="text-xs">{d.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="h-8 w-32 text-xs">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs">All Status</SelectItem>
              <SelectItem value="active" className="text-xs">Active</SelectItem>
              <SelectItem value="inactive" className="text-xs">Inactive</SelectItem>
            </SelectContent>
          </Select>
          {hasFilters && (
            <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={clearFilters}>
              <svg className="h-3.5 w-3.5 mr-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 6 6 18" />
                <path d="m6 6 12 12" />
              </svg>
              Clear
            </Button>
          )}
        </div>
      }
    >
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center px-4">
          <svg className="h-12 w-12 text-muted-foreground/40 mb-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z" />
            <path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2" />
            <path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2" />
            <path d="M10 6h4" />
            <path d="M10 10h4" />
            <path d="M10 14h4" />
            <path d="M10 18h4" />
          </svg>
          <p className="text-muted-foreground text-sm">No employees found matching your filters.</p>
          {hasFilters && (
            <Button variant="link" size="sm" className="mt-2" onClick={clearFilters}>Clear filters</Button>
          )}
        </div>
      ) : view === "grid" ? (
        <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 p-4">
          {filtered.map((emp) => (
            <EmployeeCard
              key={emp.id}
              emp={emp}
              dept={emp.departmentId ? (deptMap.get(emp.departmentId) ?? null) : null}
            />
          ))}
        </div>
      ) : (
        <div className="px-4 pb-4">
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <caption className="sr-only">Employee directory</caption>
              <TableHeader>
                <TableRow className="text-xs">
                  <TableHead scope="col">Employee</TableHead>
                  <TableHead scope="col" className="w-[120px]">Employee ID</TableHead>
                  <TableHead scope="col" className="w-[160px]">Designation</TableHead>
                  <TableHead scope="col" className="w-[140px]">Department</TableHead>
                  <TableHead scope="col" className="w-[200px]">Email</TableHead>
                  <TableHead scope="col" className="w-[90px]">Status</TableHead>
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
        </div>
      )}
    </PageWrapper>
  );
}
