"use client";

import { format, parseISO } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useHrDocuments, useHrLeaveApprovals } from "@/lib/api/hooks/hr";
import { useHrEmployeePayslips } from "@/lib/api/hooks/hr";
import { DEFAULT_LOCALE } from "@/lib/constants/locale";
import { parseCalendarDate } from "@/lib/date-utils";
import { payrollStatusLabel } from "@/lib/labels";

/**
 * The Documents, Leave and Payslips tabs on an employee profile (B7). Each one
 * is a plain table with a one-line empty state; nothing here edits.
 */

function TabShell({
  isLoading,
  isEmpty,
  emptyText,
  children,
}: {
  isLoading: boolean;
  isEmpty: boolean;
  emptyText: string;
  children: React.ReactNode;
}) {
  if (isLoading) return <Skeleton className="h-40 rounded-lg" />;
  if (isEmpty) return <p className="py-6 text-sm text-muted-foreground">{emptyText}</p>;
  return <div className="overflow-x-auto rounded-lg border border-border bg-card">{children}</div>;
}

function dateText(value: string | Date | null | undefined): string {
  if (!value) return "—";
  // A "YYYY-MM-DD" leave date stays on its day west of UTC (R3-HR-07).
  const date = parseCalendarDate(value);
  return Number.isNaN(date.getTime()) ? "—" : format(date, "d MMM yyyy");
}

export function EmployeeDocumentsTab({ userId }: { userId: string }) {
  const { data, isLoading } = useHrDocuments(userId);
  const documents = data ?? [];

  return (
    <TabShell
      isLoading={isLoading}
      isEmpty={documents.length === 0}
      emptyText="No documents."
    >
      <Table>
        <caption className="sr-only">Employee documents</caption>
        <TableHeader>
          <TableRow>
            <TableHead>Document</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Uploaded</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {documents.map((doc) => (
            <TableRow key={doc.id}>
              <TableCell className="font-medium">{doc.name ?? "—"}</TableCell>
              <TableCell className="text-sm text-muted-foreground">{doc.type ?? "—"}</TableCell>
              <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                {dateText(doc.createdAt)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TabShell>
  );
}

interface ProfileLeaveRow {
  id: number;
  userId: string;
  startDate: string;
  endDate: string;
  status: string | null;
  leaveType?: { name: string | null } | null;
}

export function EmployeeLeaveTab({ userId }: { userId: string }) {
  // /hr/leaves/team already scopes rows to what the viewer may see, so this
  // only has to narrow them to one employee.
  const { data, isLoading } = useHrLeaveApprovals();
  const rows = ((data?.all ?? []) as ProfileLeaveRow[]).filter((row) => row.userId === userId);

  return (
    <TabShell isLoading={isLoading} isEmpty={rows.length === 0} emptyText="No leave requests.">
      <Table>
        <caption className="sr-only">Leave requests</caption>
        <TableHeader>
          <TableRow>
            <TableHead>Type</TableHead>
            <TableHead>From</TableHead>
            <TableHead>To</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.id}>
              <TableCell className="font-medium">{row.leaveType?.name ?? "Leave"}</TableCell>
              <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                {dateText(row.startDate)}
              </TableCell>
              <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                {dateText(row.endDate)}
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">{row.status ?? "PENDING"}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TabShell>
  );
}

export function EmployeePayslipsTab({ userId }: { userId: string }) {
  const { data, isLoading } = useHrEmployeePayslips({ userId });
  const payslips = data ?? [];

  return (
    <TabShell isLoading={isLoading} isEmpty={payslips.length === 0} emptyText="No payslips.">
      <Table className="tabular-nums">
        <caption className="sr-only">Payslips</caption>
        <TableHeader>
          <TableRow>
            <TableHead>Month</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Net</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {payslips.map((payslip) => (
            <TableRow key={payslip.id}>
              <TableCell className="whitespace-nowrap font-medium">
                {format(parseISO(`${payslip.month}-01`), "MMMM yyyy")}
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">{payrollStatusLabel(payslip.status)}</TableCell>
              <TableCell className="text-right font-mono">
                ₹{parseFloat(payslip.netSalary || "0").toLocaleString(DEFAULT_LOCALE)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TabShell>
  );
}
