"use client";

import { useCallback } from "react";
import type { Resignation } from "@/lib/api/hooks/hr";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { format, differenceInDays } from "date-fns";
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

function statusBadge(
  status: string | null
): "default" | "secondary" | "outline" | "destructive" {
  if (!status) return "outline";
  if (status === "SUBMITTED" || status === "PENDING_HR") return "outline";
  if (status === "HR_APPROVED") return "secondary";
  if (status === "CEO_APPROVED" || status === "IN_PROGRESS" || status === "COMPLETED" || status === "APPROVED") return "default";
  if (status === "REJECTED" || status === "WITHDRAWN") return "destructive";
  return "outline";
}

interface ResignationCardProps {
  resignation: Resignation;
  isExpanded: boolean;
  isAdmin: boolean;
  isHR: boolean;
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
  isHR,
  isCEO,
  userId,
  onToggleExpand,
  onHrApprove,
  onHrReject,
  onCeoApprove,
  onCeoReject,
  onWithdraw,
}: ResignationCardProps) {
  const daysLeft =
    r.lastWorkingDate
      ? differenceInDays(new Date(r.lastWorkingDate), new Date())
      : null;
  const isOwnRecord = r.userId === userId;
  const canWithdraw =
    !isAdmin &&
    isOwnRecord &&
    (r.status === "SUBMITTED" || r.status === "PENDING_HR");
  const hrCanAct =
    isHR &&
    (r.status === "SUBMITTED" || r.status === "PENDING_HR");
  const ceoCanAct = isCEO && r.status === "HR_APPROVED";

  const handleToggle = useCallback(() => onToggleExpand(r.id), [r.id, onToggleExpand]);
  const handleWithdraw = useCallback(() => onWithdraw(r.id), [r.id, onWithdraw]);

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-4 flex items-center gap-4">
        <Avatar className="h-9 w-9 shrink-0">
          <AvatarImage src={resolveImageUrl(r.user?.image ?? null)} />
          <AvatarFallback className="text-xs bg-primary/10 text-primary">
            {r.user?.name?.[0] ?? "?"}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold truncate">
              {r.user?.name ?? "Employee"}
            </p>
            <Badge variant={statusBadge(r.status)} className="text-[10px]">
              {r.status}
            </Badge>
            {r.reasonCategory && (
              <Badge variant="outline" className="text-[9px] hidden sm:inline-flex">
                {r.reasonCategory}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-3 text-[10px] text-muted-foreground mt-0.5 flex-wrap">
            {r.user?.designation && <span>{r.user.designation}</span>}
            {r.lastWorkingDate && (
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                LWD: {format(new Date(r.lastWorkingDate), "MMM d, yyyy")}
              </span>
            )}
            {daysLeft !== null && daysLeft > 0 && (
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {daysLeft} days left
              </span>
            )}
            <span>{r.noticePeriodDays}d notice</span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {hrCanAct && (
            <>
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs"
                onClick={() => onHrApprove(r.id)}
              >
                <CheckCircle2 className="h-3 w-3 mr-1" />
                Approve
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs text-destructive hover:text-destructive"
                onClick={() => onHrReject(r.id)}
              >
                <XCircle className="h-3 w-3 mr-1" />
                Reject
              </Button>
            </>
          )}

          {ceoCanAct && (
            <>
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs"
                onClick={() => onCeoApprove(r.id)}
              >
                <CheckCircle2 className="h-3 w-3 mr-1" />
                Approve
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs text-destructive hover:text-destructive"
                onClick={() => onCeoReject(r.id)}
              >
                <XCircle className="h-3 w-3 mr-1" />
                Reject
              </Button>
            </>
          )}

          {canWithdraw && (
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs"
              onClick={handleWithdraw}
            >
              <Undo2 className="h-3 w-3 mr-1" />
              Withdraw
            </Button>
          )}

          <Button
            size="sm"
            variant="ghost"
            className="h-7 w-7 p-0"
            aria-label={isExpanded ? "Collapse progress" : "Expand progress"}
            onClick={handleToggle}
          >
            {isExpanded ? (
              <ChevronUp className="h-3.5 w-3.5" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5" />
            )}
          </Button>
        </div>
      </CardContent>

      {isExpanded && (
        <div className="border-t bg-muted/20">
          <ProgressTimeline id={r.id} />
        </div>
      )}
    </Card>
  );
}
