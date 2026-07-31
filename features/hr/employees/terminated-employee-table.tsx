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
import { getDisplayName, getInitials, ROLE_LABELS } from "./hr-types";
import type { TerminatedEmployee } from "@/types/hr/employees";

interface TerminatedEmployeeTableProps {
  employees: TerminatedEmployee[];
}

export function TerminatedEmployeeTable({ employees }: TerminatedEmployeeTableProps) {
  return (
    <Card>
      <CardContent className="p-0">
        <Table>
          <caption className="sr-only">Terminated employees</caption>
          <TableHeader>
            <TableRow className="text-xs">
              <TableHead scope="col">Employee</TableHead>
              <TableHead scope="col" className="w-[140px]">Employee ID</TableHead>
              <TableHead scope="col" className="w-[160px]">Department</TableHead>
              <TableHead scope="col" className="w-[140px]">Role</TableHead>
              <TableHead scope="col" className="w-[160px]">Terminated</TableHead>
              <TableHead scope="col" className="w-[80px] text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {employees.map((employee) => {
              const displayName = getDisplayName(employee);
              return (
                <TableRow key={employee.id} className="hover:bg-muted/50">
                  <TableCell>
                    <EmployeeIdentityCell employee={employee} displayName={displayName} />
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {employee.employeeId ?? ""}
                  </TableCell>
                  <TableCell className="text-sm">
                    {employee.department?.name ? (
                      <Badge variant="secondary" className="text-[10px] h-5 px-2">
                        {employee.department.name}
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-[10px] h-5 px-2 border-amber-300/60 bg-amber-500/10 text-amber-800 dark:text-amber-300">
                        Unassigned
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {employee.designation ?? ROLE_LABELS[employee.role] ?? employee.role}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {employee.terminatedAt
                      ? format(new Date(employee.terminatedAt), "MMM d, yyyy")
                      : ""}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" className="h-8 px-2" asChild>
                      <Link href={`/hr/employees/${employee.id}`}>
                        <Eye className="h-4 w-4 mr-1" aria-hidden="true" />
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
