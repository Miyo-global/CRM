"use client";

import { PageWrapper } from "@/components/ui/page-wrapper";
import { DashboardGate } from "@/components/shared/dashboard-gate";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { LEAVE_POLICY } from "@/lib/leave-policy";
import { MONTHLY_FREE_LEAVE_DAYS } from "@/lib/hr/payroll-calculations";

interface PolicyRow {
  name: string;
  daysPerYear: number;
  accrual: string;
  carryForward: string;
  paid: boolean;
}

/** Seeded from the policy constants the app runs on (A32). */
const POLICY_ROWS: PolicyRow[] = [
  {
    name: LEAVE_POLICY.CASUAL.name,
    daysPerYear: LEAVE_POLICY.CASUAL.daysPerYear,
    accrual: `${LEAVE_POLICY.CASUAL.perMonth} day per month`,
    carryForward: `Carries forward ${LEAVE_POLICY.CASUAL.carryForwardMonths} month`,
    paid: true,
  },
  {
    name: LEAVE_POLICY.SICK.name,
    daysPerYear: LEAVE_POLICY.SICK.daysPerYear,
    accrual: "Granted at the start of the year",
    carryForward: "None",
    paid: true,
  },
  {
    name: LEAVE_POLICY.UNPAID.name,
    daysPerYear: LEAVE_POLICY.UNPAID.daysPerYear,
    accrual: "On request",
    carryForward: "None",
    paid: false,
  },
];

export default function LeavePoliciesPage() {
  return (
    <DashboardGate allowedRoles={["CEO", "HR"]}>
      <PageWrapper title="Leave policy">
        <div className="space-y-8">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">Days per year</TableHead>
                <TableHead>Accrual</TableHead>
                <TableHead>Carry forward</TableHead>
                <TableHead>Paid</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {POLICY_ROWS.map((row) => (
                <TableRow key={row.name}>
                  <TableCell className="font-medium">{row.name}</TableCell>
                  <TableCell className="text-right font-mono tabular-nums">
                    {row.daysPerYear}
                  </TableCell>
                  <TableCell>{row.accrual}</TableCell>
                  <TableCell>{row.carryForward}</TableCell>
                  <TableCell>{row.paid ? "Paid" : "Unpaid"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <section className="space-y-2">
            <h2 className="text-sm font-semibold text-foreground">Payroll allowance</h2>
            <p className="text-sm text-muted-foreground">
              Payroll treats the first {MONTHLY_FREE_LEAVE_DAYS} absent working{" "}
              {MONTHLY_FREE_LEAVE_DAYS === 1 ? "day" : "days"} of a month as paid casual
              leave, plus up to {LEAVE_POLICY.CASUAL.carryForwardMonths} unused day carried
              from the month before. Absences beyond that are loss of pay.
            </p>
            <p className="text-sm text-muted-foreground">
              These values come from the deployment configuration. Change them with the
              leave-policy environment variables, not per employee.
            </p>
          </section>
        </div>
      </PageWrapper>
    </DashboardGate>
  );
}
