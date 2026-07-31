"use client";

import { useMemo, useState, useCallback } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { useTerminatedEmployees } from "@/lib/api/hooks/hr";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptySearchIllustration } from "@/components/illustrations";
import { Search, ArrowLeft, Download } from "lucide-react";
import { TerminatedEmployeeTable } from "@/features/hr/employees/terminated-employee-table";
import { ROLE_LABELS } from "@/features/hr/employees/hr-types";
import { toast } from "sonner";

export default function TerminatedEmployeesPage() {
  const { data, isLoading } = useTerminatedEmployees();
  const [search, setSearch] = useState("");

  const employees = useMemo(() => data ?? [], [data]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return employees;

    return employees.filter((employee) => {
      const name = `${employee.firstName ?? ""} ${employee.lastName ?? ""}`.trim().toLowerCase();
      const email = employee.email.toLowerCase();
      const employeeId = employee.employeeId?.toLowerCase() ?? "";
      const department = employee.department?.name?.toLowerCase() ?? "";
      const roleLabel = ROLE_LABELS[employee.role]?.toLowerCase() ?? employee.role.toLowerCase();
      return (
        name.includes(term) ||
        email.includes(term) ||
        employeeId.includes(term) ||
        department.includes(term) ||
        roleLabel.includes(term)
      );
    });
  }, [employees, search]);

  const handleExport = useCallback(async () => {
    const { downloadXlsx } = await import("@/lib/export/xlsx-utils");
    const rows = filtered.map((employee) => ({
      name: `${employee.firstName ?? ""} ${employee.lastName ?? ""}`.trim() || employee.email,
      email: employee.email,
      employeeId: employee.employeeId ?? "",
      department: employee.department?.name ?? "",
      role: employee.designation ?? ROLE_LABELS[employee.role] ?? employee.role,
      terminatedAt: employee.terminatedAt
        ? format(new Date(employee.terminatedAt), "yyyy-MM-dd")
        : "",
    }));
    await downloadXlsx(`terminated-employees-${new Date().toISOString().slice(0, 10)}.xlsx`, [
      {
        name: "Terminated",
        columns: [
          { header: "Name", key: "name", width: 25 },
          { header: "Email", key: "email", width: 30 },
          { header: "Employee ID", key: "employeeId", width: 16 },
          { header: "Department", key: "department", width: 20 },
          { header: "Role", key: "role", width: 20 },
          { header: "Terminated", key: "terminatedAt", width: 14 },
        ],
        rows,
      },
    ]);
    toast.success("Terminated employees exported");
  }, [filtered]);

  if (isLoading) {
    return (
      <PageWrapper title="Terminated Employees" subtitle="Former team members">
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton key={index} className="h-14 w-full" />
          ))}
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper
      title="Terminated Employees"
      subtitle="Track and review employees whose access has been deactivated"
      badge={String(filtered.length)}
      actions={
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-2" asChild>
            <Link href="/hr">
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              Active employees
            </Link>
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={handleExport}
            disabled={filtered.length === 0}
          >
            <Download className="h-4 w-4" aria-hidden="true" />
            Export
          </Button>
        </div>
      }
      filters={
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Search name, email, ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-8 w-[220px] text-sm"
            aria-label="Search terminated employees"
          />
        </div>
      }
    >
      {filtered.length > 0 ? (
        <TerminatedEmployeeTable employees={filtered} />
      ) : employees.length > 0 ? (
        <EmptyState
          illustration={<EmptySearchIllustration className="mb-3" />}
          title="No results found"
          description="No terminated employees match your search."
        />
      ) : (
        <EmptyState
          title="No terminated employees"
          description="Employees you terminate from the active directory will appear here for tracking."
          action={{ label: "View active employees", href: "/hr" }}
        />
      )}
    </PageWrapper>
  );
}
