"use client";

import Link from "next/link";
import { format } from "date-fns";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Eye } from "lucide-react";
import { resolveImageUrl } from "@/lib/utils";
import { StatusPill } from "@/components/ui/status-pill";
import { getDisplayName, getInitials, ROLE_LABELS } from "./hr-types";
import type { TerminatedEmployee } from "@/types/hr/employees";

interface TerminatedEmployeeTableProps {
  employees: TerminatedEmployee[];
}

export function TerminatedEmployeeTable({ employees }: TerminatedEmployeeTableProps) {
  return (
    <Card className="gap-0 overflow-hidden py-0">
      <CardContent className="overflow-x-auto p-0">
        <Table className="min-w-[760px]">
          <caption className="sr-only">Terminated employees</caption>
          <TableHeader>
            <TableRow>
              <TableHead scope="col">Employee</TableHead>
              <TableHead scope="col" className="w-36">Employee ID</TableHead>
              <TableHead scope="col" className="w-40">Department</TableHead>
              <TableHead scope="col" className="w-36">Role</TableHead>
              <TableHead scope="col" className="w-40">Terminated</TableHead>
              <TableHead scope="col" className="w-20 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {employees.map((employee) => {
              const displayName = getDisplayName(employee);
              return (
                <TableRow key={employee.id} className="group">
                  <TableCell>
                    <EmployeeIdentityCell employee={employee} displayName={displayName} />
                  </TableCell>
                  <TableCell className="font-mono text-sm text-muted-foreground">
                    {employee.employeeId ?? ""}
                  </TableCell>
                  <TableCell className="text-sm">
                    {employee.department?.name ? (
                      <Badge variant="secondary">
                        {employee.department.name}
                      </Badge>
                    ) : (
                      <StatusPill tone="warning">Unassigned</StatusPill>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {employee.designation ?? ROLE_LABELS[employee.role] ?? employee.role}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-sm tabular-nums text-muted-foreground">
                    {employee.terminatedAt
                      ? format(new Date(employee.terminatedAt), "MMM d, yyyy")
                      : ""}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" asChild>
                      <Link href={`/hr/employees/${employee.id}`}>
                        <Eye className="size-4" aria-hidden="true" />
                        View
                      </Link>
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function EmployeeIdentityCell({
  employee,
  displayName,
}: {
  employee: TerminatedEmployee;
  displayName: string;
}) {
  return (
    <div className="flex items-center gap-3 min-w-0">
      <Avatar className="h-9 w-9 shrink-0">
        <AvatarImage src={resolveImageUrl(employee.image)} alt="" />
        <AvatarFallback className="bg-muted text-muted-foreground text-xs">
          {getInitials(employee)}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0">
        <p className="text-sm font-medium truncate">{displayName}</p>
        <p className="text-xs text-muted-foreground truncate">{employee.email}</p>
      </div>
    </div>
  );
}
