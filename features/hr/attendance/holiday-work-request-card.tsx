"use client";

import { useState } from "react";
import { format, parseISO, startOfDay } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { DatePicker } from "@/components/ui/date-picker";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { HrSheet } from "@/features/hr/hr-sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
  useHolidayWorkRequests,
  useSubmitHolidayWorkRequest,
  useApproveHolidayWorkRequest,
  useRejectHolidayWorkRequest,
} from "@/lib/api/hooks/hr/payroll-extended";
import { getErrorMessage } from "@/lib/get-error-message";
import type { HolidayWorkRequest } from "@/lib/api/hooks/hr/payroll-extended";

const statusBadge = (status: string) => {
  if (status === "APPROVED") return <Badge className="bg-green-100 text-green-800 border-green-200">Approved</Badge>;
  if (status === "REJECTED") return <Badge className="bg-red-100 text-red-800 border-red-200">Rejected</Badge>;
  return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">Pending</Badge>;
};

function isLateSubmission(r: { createdAt?: string | Date | null; requestDate: string }): boolean {
  if (!r.createdAt) return false;
  const created = new Date(r.createdAt);
  const dayEnd = parseISO(r.requestDate + "T12:00:00");
  dayEnd.setHours(23, 59, 59, 999);
  return created.getTime() > dayEnd.getTime();
}

interface HolidayWorkRequestCardProps {
  isAdmin: boolean;
}

export function HolidayWorkRequestCard({ isAdmin }: HolidayWorkRequestCardProps) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [requestDate, setRequestDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [reason, setReason] = useState("");
  const [compensation, setCompensation] = useState<"COMP_OFF" | "EXTRA_PAY">("COMP_OFF");
  const [rejectTarget, setRejectTarget] = useState<HolidayWorkRequest | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const { data: requests, isLoading } = useHolidayWorkRequests(isAdmin ? {} : undefined);
  const submit = useSubmitHolidayWorkRequest();
  const approve = useApproveHolidayWorkRequest();
  const reject = useRejectHolidayWorkRequest();

  const handleSubmit = () => {
    if (!reason.trim() || reason.trim().length < 5) {
      toast.error("Please enter a reason (at least 5 characters).");
      return;
    }
    submit.mutate(
      { requestDate, reason: reason.trim(), compensationPreference: compensation },
      {
        onSuccess: () => {
          toast.success("Request submitted");
          setSheetOpen(false);
          setReason("");
          setRequestDate(format(new Date(), "yyyy-MM-dd"));
          setCompensation("COMP_OFF");
        },
        onError: (e) => toast.error(getErrorMessage(e)),
      }
    );
  };

  const pending = requests?.filter((r) => r.status === "PENDING") ?? [];
  const recent = requests?.filter((r) => r.status !== "PENDING").slice(0, 5) ?? [];

  return (
    <>
      <Sheet
        open={rejectTarget !== null}
        onOpenChange={(open) => {
          if (!open) {
            setRejectTarget(null);
            setRejectReason("");
          }
        }}
      >
        <SheetContent side="right" className="w-full sm:max-w-md flex flex-col">
          <SheetHeader>
            <SheetTitle>Reject request</SheetTitle>
            <p className="text-sm text-muted-foreground">
              {rejectTarget ? `Date: ${rejectTarget.requestDate}` : ""}
            </p>
          </SheetHeader>
          <div className="space-y-2 py-4 flex-1">
            <Label>Reason</Label>
            <Textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Provide a reason…"
              rows={4}
            />
          </div>
          <SheetFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setRejectTarget(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={!rejectReason.trim() || reject.isPending || !rejectTarget}
              onClick={() => {
                if (!rejectTarget) return;
                reject.mutate(
                  { id: rejectTarget.id, rejectionReason: rejectReason.trim() },
                  {
                    onSuccess: () => {
                      toast.success("Request rejected");
                      setRejectTarget(null);
                      setRejectReason("");
                    },
                    onError: (e) => toast.error(getErrorMessage(e)),
                  }
                );
              }}
            >
              Reject
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <HrSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        title="Request Holiday Work Compensation"
        description="Submit a request for working on a holiday or Sunday."
        onSubmit={handleSubmit}
        submitLabel="Submit Request"
        isPending={submit.isPending}
      >
        <div className="space-y-1.5">
          <Label>Date Worked</Label>
          <DatePicker
            value={requestDate}
            onChange={setRequestDate}
            fromDate={startOfDay(new Date())}
            placeholder="Select date"
          />
        </div>
        <div className="space-y-1.5">
          <Label>Compensation Preference</Label>
          <Select value={compensation} onValueChange={(v) => setCompensation(v as "COMP_OFF" | "EXTRA_PAY")}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="COMP_OFF">Compensatory Off (leave day)</SelectItem>
              <SelectItem value="EXTRA_PAY">Extra Pay (added to salary)</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Reason (required)</Label>
          <Textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Briefly describe the work done (min. 5 characters)…"
            rows={3}
            minLength={5}
          />
        </div>
      </HrSheet>

      <Card id="holiday-work" className="overflow-hidden border-border shadow-sm scroll-mt-24">
        <CardHeader className="pb-3 pt-5">
          <CardTitle className="text-base font-semibold flex items-center justify-between">
            <span>Holiday / Sunday Work</span>
            {!isAdmin && (
              <Button size="sm" variant="outline" onClick={() => setSheetOpen(true)}>
                + Request
              </Button>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 pb-5">
          {isLoading ? (
            <div className="space-y-2">
              {[1, 2].map((i) => (
                <Skeleton key={i} className="h-10 w-full rounded-md" />
              ))}
            </div>
          ) : (
            <>
              {isAdmin && pending.length > 0 && (
                <div className="space-y-2">
                  <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                    Pending Approval
                  </p>
                  {pending.map((r) => (
                    <div
                      key={r.id}
                      className="flex items-center justify-between gap-2 rounded-lg border border-border px-3 py-2.5 text-sm"
                    >
                      <div>
                        <span className="font-medium">{r.user?.name ?? r.userId}</span>
                        <span className="text-muted-foreground ml-2 text-xs">{r.requestDate}</span>
                        <span className="text-muted-foreground ml-2 text-xs">
                          · {r.compensationPreference === "COMP_OFF" ? "Comp-off" : "Extra pay"}
                        </span>
                        {isLateSubmission(r) && (
                          <Badge variant="outline" className="ml-2 text-[10px] border-amber-300 text-amber-800">
                            Late submission
                          </Badge>
                        )}
                      </div>
                      <div className="flex gap-1.5 shrink-0">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 px-2 text-xs text-green-700 border-green-200 hover:bg-green-50"
                          disabled={approve.isPending}
                          onClick={() =>
                            approve.mutate(r.id, {
                              onSuccess: () => toast.success("Approved"),
                              onError: (e) => toast.error(getErrorMessage(e)),
                            })
                          }
                        >
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 px-2 text-xs text-red-700 border-red-200 hover:bg-red-50"
                          onClick={() => setRejectTarget(r)}
                        >
                          Reject
                        </Button>
                      </div>
                    </div>
                  ))}
                  {recent.length > 0 && <Separator />}
                </div>
              )}

              {!isAdmin && (
                <div className="space-y-2">
                  {(requests ?? []).length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4 rounded-lg border border-dashed border-border">
                      No requests yet. Click &quot;+ Request&quot; to submit one.
                    </p>
                  ) : (
                    (requests ?? []).slice(0, 6).map((r) => (
                      <div
                        key={r.id}
                        className="flex items-center justify-between gap-2 rounded-lg border border-border px-3 py-2.5 text-sm"
                      >
                        <div>
                          <span className="font-medium">{r.requestDate}</span>
                          <span className="text-muted-foreground ml-2 text-xs">
                            · {r.compensationPreference === "COMP_OFF" ? "Comp-off" : "Extra pay"}
                          </span>
                          {isLateSubmission(r) && (
                            <Badge variant="outline" className="ml-2 text-[10px] border-amber-300 text-amber-800">
                              Late submission
                            </Badge>
                          )}
                        </div>
                        {statusBadge(r.status)}
                      </div>
                    ))
                  )}
                </div>
              )}

              {isAdmin && recent.length > 0 && (
                <div className="space-y-2">
                  <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                    Recent
                  </p>
                  {recent.map((r) => (
                    <div
                      key={r.id}
                      className="flex items-center justify-between gap-2 rounded-lg border border-border px-3 py-2.5 text-sm"
                    >
                      <div>
                        <span className="font-medium">{r.user?.name ?? r.userId}</span>
                        <span className="text-muted-foreground ml-2 text-xs">{r.requestDate}</span>
                        {isLateSubmission(r) && (
                          <Badge variant="outline" className="ml-2 text-[10px] border-amber-300 text-amber-800">
                            Late submission
                          </Badge>
                        )}
                      </div>
                      {statusBadge(r.status)}
                    </div>
                  ))}
                </div>
              )}

              {isAdmin && pending.length === 0 && recent.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4 rounded-lg border border-dashed border-border">
                  No holiday work requests.
                </p>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </>
  );
}
