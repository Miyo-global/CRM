"use client";

import { useMemo, useState } from "react";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CalendarHeart } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import {
  useHolidayWorkRequests,
  useSubmitHolidayWorkRequest,
} from "@/lib/api/hooks/hr/payroll-extended";
import { useHrHolidaysForYear } from "@/lib/api/hooks/hr/leaves-expenses";
import { getErrorMessage } from "@/lib/get-error-message";

export function InformHrTodayWidget() {
  const today = useMemo(() => new Date(), []);
  const todayKey = format(today, "yyyy-MM-dd");
  const dayOfWeek = today.getDay();
  const isSunday = dayOfWeek === 0;
  const isSaturday = dayOfWeek === 6;
  const isWeekend = isSunday || isSaturday;

  const { data: holidays } = useHrHolidaysForYear(today.getFullYear());
  const todayHoliday = holidays?.find((h) => h.date === todayKey) ?? null;
  const isHoliday = todayHoliday != null;

  const { data: myRequests } = useHolidayWorkRequests({});
  const existingForToday = myRequests?.find((r) => r.requestDate === todayKey) ?? null;

  const [reason, setReason] = useState("");
  const [compensation, setCompensation] = useState<"COMP_OFF" | "EXTRA_PAY">("COMP_OFF");
  const submit = useSubmitHolidayWorkRequest();

  if (!isWeekend && !isHoliday) return null;

  const dayLabel = isHoliday
    ? `holiday — ${todayHoliday.name}`
    : isSunday
      ? "Sunday"
      : "Saturday";

  if (existingForToday) {
    const statusLabel =
      existingForToday.status === "APPROVED"
        ? "HR approved"
        : existingForToday.status === "REJECTED"
          ? "HR rejected"
          : "Awaiting HR approval";
    return (
      <Card className="border-blue-200 bg-blue-50/50 dark:bg-blue-950/20">
        <CardHeader className="pb-2 flex flex-row items-start justify-between gap-3 space-y-0">
          <div className="flex items-center gap-2">
            <CalendarHeart className="h-4 w-4 text-blue-700 dark:text-blue-300" aria-hidden />
            <CardTitle className="text-sm font-semibold">
              Today is a {dayLabel}
            </CardTitle>
          </div>
          <Badge variant="outline">{statusLabel}</Badge>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>
            You&apos;ve already informed HR about working today. Compensation preference:{" "}
            <span className="font-medium text-foreground">
              {existingForToday.compensationPreference === "COMP_OFF" ? "Comp off" : "Extra pay"}
            </span>
            .
          </p>
          <Link
            href="/hr/attendance#holiday-work"
            className="text-xs text-primary underline-offset-2 hover:underline"
          >
            View request details
          </Link>
        </CardContent>
      </Card>
    );
  }

  const onSubmit = () => {
    const trimmed = reason.trim();
    if (trimmed.length < 5) {
      toast.error("Please add a brief reason (at least 5 characters).");
      return;
    }
    submit.mutate(
      { requestDate: todayKey, reason: trimmed, compensationPreference: compensation },
      {
        onSuccess: () => {
          toast.success("HR has been notified.");
          setReason("");
        },
        onError: (e) => toast.error(getErrorMessage(e)),
      }
    );
  };

  return (
    <Card className="border-amber-200 bg-amber-50/40 dark:bg-amber-950/20">
      <CardHeader className="pb-2 flex flex-row items-center gap-2 space-y-0">
        <CalendarHeart className="h-4 w-4 text-amber-700 dark:text-amber-300" aria-hidden />
        <CardTitle className="text-sm font-semibold">
          Working today? It&apos;s a {dayLabel}.
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-xs text-muted-foreground">
          Let HR know so it&apos;s logged. Pick comp off or extra pay.
        </p>
        <div className="space-y-1.5">
          <Label htmlFor="inform-hr-reason" className="text-xs">
            Reason
          </Label>
          <Textarea
            id="inform-hr-reason"
            placeholder="e.g. Closing month-end deliverables"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={2}
            className="text-sm"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="inform-hr-comp" className="text-xs">
            Compensation
          </Label>
          <Select
            value={compensation}
            onValueChange={(v) => setCompensation(v as typeof compensation)}
          >
            <SelectTrigger id="inform-hr-comp" className="h-9 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="COMP_OFF">Compensatory off</SelectItem>
              <SelectItem value="EXTRA_PAY">Extra pay</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button onClick={onSubmit} disabled={submit.isPending} size="sm">
          {submit.isPending ? "Submitting…" : "Inform HR"}
        </Button>
      </CardContent>
    </Card>
  );
}
