"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { QueryErrorState } from "@/components/ui/query-error-state";
import { LEAVE_POLICY, isUnpaidLeaveType } from "@/lib/leave-policy";
import { MONTHLY_FREE_LEAVE_DAYS } from "@/lib/hr/payroll-calculations";
import { PER_DAY_DIVISOR, professionalTaxBandLabel } from "@/lib/payroll/rules";
import { useOrgLeaveTypes, useUpdateLeaveType } from "@/lib/api/hooks/hr/leave-types";
import { getErrorMessage } from "@/lib/get-error-message";

function accrualFor(name: string): string {
  if (name === LEAVE_POLICY.CASUAL.name) return `${LEAVE_POLICY.CASUAL.perMonth} day per month`;
  if (isUnpaidLeaveType(name)) return "On request";
  return "Granted at the start of the year";
}

export default function LeavePoliciesPage() {
  const { data: types, isLoading, isError, error, refetch } = useOrgLeaveTypes();
  const updateType = useUpdateLeaveType();

  // Allowances the user has typed but not saved yet.
  const [draft, setDraft] = useState<Record<number, string>>({});

  useEffect(() => {
    if (types) {
      setDraft(Object.fromEntries(types.map((t) => [t.id, String(t.daysPerYear)])));
    }
  }, [types]);

  const handleSave = useCallback(
    (id: number, carryForward?: boolean) => {
      const raw = draft[id];
      const daysPerYear = raw === undefined ? undefined : Number(raw);
      if (daysPerYear !== undefined && (!Number.isInteger(daysPerYear) || daysPerYear < 0 || daysPerYear > 365)) {
        toast.error("Days per year must be a whole number between 0 and 365.");
        return;
      }
      updateType.mutate(
        { id, daysPerYear, carryForward },
        {
          onSuccess: () => toast.success("Leave policy updated"),
          onError: (e) => toast.error(getErrorMessage(e)),
        },
      );
    },
    [draft, updateType],
  );

  return (
    <DashboardGate allowedRoles={["CEO", "HR"]}>
      <PageWrapper
        title="Leave policy"
        subtitle="Annual allowances apply to balances granted from the next accrual onwards."
      >
        {isLoading ? (
          <Skeleton className="h-64 w-full rounded-lg" />
        ) : isError ? (
          <QueryErrorState title="Couldn't load the leave policy" error={error} onRetry={() => refetch()} />
        ) : (
          <div className="space-y-8">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead className="w-40 text-right">Days per year</TableHead>
                  <TableHead>Accrual</TableHead>
                  <TableHead>Carry forward</TableHead>
                  <TableHead>Paid</TableHead>
                  <TableHead className="text-right">Save</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(types ?? []).map((row) => {
                  const unpaid = isUnpaidLeaveType(row.name);
                  return (
                    <TableRow key={row.id}>
                      <TableCell className="font-medium">{row.name}</TableCell>
                      <TableCell className="text-right">
                        {unpaid ? (
                          <span className="text-muted-foreground">—</span>
                        ) : (
                          <Input
                            type="number"
                            min={0}
                            max={365}
                            step={1}
                            inputMode="numeric"
                            className="ml-auto h-9 w-24 text-right font-mono tabular-nums"
                            value={draft[row.id] ?? ""}
                            onChange={(e) =>
                              setDraft((prev) => ({ ...prev, [row.id]: e.target.value }))
                            }
                            aria-label={`${row.name} days per year`}
                          />
                        )}
                      </TableCell>
                      <TableCell>{accrualFor(row.name)}</TableCell>
                      <TableCell>
                        <Switch
                          checked={!!row.carryForward}
                          onCheckedChange={(checked) => handleSave(row.id, checked)}
                          disabled={unpaid || updateType.isPending}
                          aria-label={`${row.name} carries forward`}
                        />
                      </TableCell>
                      <TableCell>{unpaid ? "Unpaid" : "Paid"}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={unpaid || updateType.isPending || draft[row.id] === String(row.daysPerYear)}
                          onClick={() => handleSave(row.id)}
                        >
                          Save
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>

            <section className="space-y-2">
              <h2 className="text-sm font-semibold text-foreground">Pay rules</h2>
              <p className="text-sm text-muted-foreground">
                Payroll treats the first {MONTHLY_FREE_LEAVE_DAYS} absent working{" "}
                {MONTHLY_FREE_LEAVE_DAYS === 1 ? "day" : "days"} of a month as paid casual
                leave, plus up to {LEAVE_POLICY.CASUAL.carryForwardMonths} unused day carried
                from the month before. Absences beyond that are loss of pay.
              </p>
              <p className="text-sm text-muted-foreground">
                A day of pay is salary ÷ {PER_DAY_DIVISOR} in every month, and professional
                tax follows the statutory bands ({professionalTaxBandLabel(11000)};{" "}
                {professionalTaxBandLabel(25000)}). These two are fixed company and statutory
                rules, so they are not editable here.
              </p>
            </section>
          </div>
        )}
      </PageWrapper>
    </DashboardGate>
  );
}
