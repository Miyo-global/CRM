"use client";

import { useCallback } from "react";
import type { Resignation } from "@/lib/api/hooks/hr";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { format, differenceInCalendarDays, parseISO } from "date-fns";
import { resolveImageUrl } from "@/lib/utils";
import {
  CheckCircle2,
  Clock,
  Calendar,
  ChevronDown,
  ChevronUp,
  XCircle,
  Undo2,
} from "lucide-react";
import { ProgressTimeline } from "./progress-timeline";
import { StatusPill } from "@/components/ui/status-pill";
import type { Tone } from "@/lib/design/tones";

function statusTone(status: string | null): Tone {
  if (!status) return "neutral";
  if (status === "SUBMITTED" || status === "PENDING_HR") return "warning";
  if (status === "HR_APPROVED") return "info";
  if (status === "CEO_APPROVED" || status === "IN_PROGRESS" || status === "APPROVED") return "brand";
  if (status === "COMPLETED") return "success";
  if (status === "REJECTED" || status === "WITHDRAWN") return "danger";
  return "neutral";
}

interface ResignationCardProps {
  resignation: Resignation;
  isExpanded: boolean;
  isAdmin: boolean;
  isCEO: boolean;
  userId: string | undefined;
  onToggleExpand: (id: number) => void;
  onHrApprove: (id: number) => void;
  onHrReject: (id: number) => void;
  onCeoApprove: (id: number) => void;
  onCeoReject: (id: number) => void;
  onWithdraw: (id: number) => void;
}

export function ResignationCard({
  resignation: r,
  isExpanded,
  isAdmin,
  isCEO,
  userId,
  onToggleExpand,
  onHrApprove,
  onHrReject,
  onCeoApprove,
  onCeoReject,
  onWithdraw,
}: ResignationCardProps) {
  // parseISO keeps a "YYYY-MM-DD" LWD on its own day; new Date() read it as
  // UTC and showed the day before west of UTC (R2-EMP-04).
  const daysLeft =
    r.lastWorkingDate
      ? differenceInCalendarDays(parseISO(r.lastWorkingDate), new Date())
      : null;
  const isOwnRecord = r.userId === userId;
  const canWithdraw =
    !isAdmin &&
    isOwnRecord &&
    (r.status === "SUBMITTED" || r.status === "PENDING_HR");
  // R2-TERM-05: any admin role (HR, Admin, Super Admin) does HR review; the
  // Super Admin or an Admin signs off. Nobody acts on their own resignation.
  const hrCanAct =
    isAdmin &&
    !isOwnRecord &&
    (r.status === "SUBMITTED" || r.status === "PENDING_HR");
  const ceoCanAct = isCEO && !isOwnRecord && r.status === "HR_APPROVED";

  const handleToggle = useCallback(() => onToggleExpand(r.id), [r.id, onToggleExpand]);
  const handleWithdraw = useCallback(() => onWithdraw(r.id), [r.id, onWithdraw]);

  return (
    <Card className="overflow-hidden">
      <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:gap-4">
        <div className="flex min-w-0 flex-1 items-center gap-3">
        <Avatar className="size-9 shrink-0">
          <AvatarImage src={resolveImageUrl(r.user?.image ?? null)} />
          <AvatarFallback className="bg-brand-soft text-xs text-brand-soft-foreground">
            {r.user?.name?.[0] ?? "?"}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate text-sm font-semibold">
              {r.user?.name ?? "Employee"}
            </p>
            <StatusPill tone={statusTone(r.status)} dot>
              {r.status}
            </StatusPill>
            {r.reasonCategory && (
              <Badge variant="outline" className="hidden sm:inline-flex">
                {r.reasonCategory}
              </Badge>
            )}
          </div>
          <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs tabular-nums text-muted-foreground">
            {r.user?.designation && <span>{r.user.designation}</span>}
            {r.lastWorkingDate && (
              <span className="flex items-center gap-1">
                <Calendar className="size-3.5" aria-hidden="true" />
                LWD: {format(parseISO(r.lastWorkingDate), "MMM d, yyyy")}
              </span>
            )}
            {daysLeft !== null && daysLeft > 0 && (
              <span className="flex items-center gap-1">
                <Clock className="size-3.5" aria-hidden="true" />
                {daysLeft} days left
              </span>
            )}
            <span>{r.noticePeriodDays}d notice</span>
          </div>
        </div>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-1.5">
          {hrCanAct && (
            <>
              <Button
                size="xs"
                variant="outline"
                onClick={() => onHrApprove(r.id)}
              >
                <CheckCircle2 aria-hidden="true" />
                Approve
              </Button>
              <Button
                size="xs"
                variant="outline"
                className="text-destructive hover:text-destructive"
                onClick={() => onHrReject(r.id)}
              >
                <XCircle aria-hidden="true" />
                Reject
              </Button>
            </>
          )}

          {ceoCanAct && (
            <>
              <Button
                size="xs"
                variant="outline"
                onClick={() => onCeoApprove(r.id)}
              >
                <CheckCircle2 aria-hidden="true" />
                Approve
              </Button>
              <Button
                size="xs"
                variant="outline"
                className="text-destructive hover:text-destructive"
                onClick={() => onCeoReject(r.id)}
              >
                <XCircle aria-hidden="true" />
                Reject
              </Button>
            </>
          )}

          {canWithdraw && (
            <Button
              size="xs"
              variant="outline"
              onClick={handleWithdraw}
            >
              <Undo2 aria-hidden="true" />
              Withdraw
            </Button>
          )}

          <Button
            size="icon-sm"
            variant="ghost"
            className="ml-auto sm:ml-0"
            aria-label={isExpanded ? "Collapse progress" : "Expand progress"}
            onClick={handleToggle}
          >
            {isExpanded ? (
              <ChevronUp className="size-4" aria-hidden="true" />
            ) : (
              <ChevronDown className="size-4" aria-hidden="true" />
            )}
          </Button>
        </div>
      </CardContent>

      {isExpanded && (
        <div className="border-t border-border bg-surface-sunken">
          <ProgressTimeline id={r.id} />
        </div>
      )}
    </Card>
  );
}
