"use client";

import { useCallback } from "react";
import { format } from "date-fns";
import {
  CheckCircle2,
  XCircle,
  Mail,
  AlertTriangle,
  Calendar,
  User,
  BadgeDollarSign,
  Check,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

import { type Termination } from "@/lib/api/hooks/hr";
import { statusVariant, statusLabel, getInitials } from "./termination-utils";

interface TerminationCardProps {
  record: Termination;
  isHR: boolean;
  isCEO: boolean;
  onSubmit: (id: number) => void;
  onApprove: (id: number) => void;
  onReject: (id: number) => void;
  onSendEmail: (record: Termination) => void;
  onComplete: (id: number) => void;
  isSubmitting: boolean;
  isCompleting: boolean;
}

export function TerminationCard({
  record,
  isHR,
  isCEO,
  onSubmit,
  onApprove,
  onReject,
  onSendEmail,
  onComplete,
  isSubmitting,
  isCompleting,
}: TerminationCardProps) {
  const {
    employee,
    status,
    reasons,
    effectiveDate,
    severanceAmount,
    noticePeriodWaived,
    emailStatus,
  } = record;

  const reasonsList = reasons ?? [];
  const visibleReasons = reasonsList.slice(0, 2);
  const extraCount = reasonsList.length - 2;

  const handleSubmit = useCallback(() => onSubmit(record.id), [onSubmit, record.id]);
  const handleApprove = useCallback(() => onApprove(record.id), [onApprove, record.id]);
  const handleReject = useCallback(() => onReject(record.id), [onReject, record.id]);
  const handleSendEmail = useCallback(() => onSendEmail(record), [onSendEmail, record]);
  const handleComplete = useCallback(() => onComplete(record.id), [onComplete, record.id]);

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <Avatar className="h-9 w-9 shrink-0 mt-0.5">
            <AvatarFallback className="text-xs bg-primary/10 text-primary">
              {getInitials(employee?.name ?? null)}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 min-w-0">
            {/* Top row: name + status */}
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-sm font-semibold truncate">
                {employee?.name ?? "Employee"}
              </p>
              <Badge
                variant={statusVariant(status)}
                className="text-[10px] shrink-0"
              >
                {statusLabel(status)}
              </Badge>
              {emailStatus === "failed" && (
                <Badge variant="destructive" className="text-[10px] shrink-0">
                  Email Failed
                </Badge>
              )}
            </div>

            {/* Second row: designation + employeeId */}
            <div className="flex items-center gap-3 text-[11px] text-muted-foreground mt-0.5 flex-wrap">
              {employee?.designation && (
                <span className="flex items-center gap-1">
                  <User className="h-3 w-3" />
                  {employee.designation}
                </span>
              )}
              {employee?.employeeId && <span>ID: {employee.employeeId}</span>}
              {effectiveDate && (
                <span className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  Effective: {format(new Date(effectiveDate), "MMM d, yyyy")}
                </span>
              )}
              {severanceAmount && Number(severanceAmount) > 0 && (
                <span className="flex items-center gap-1">
                  <BadgeDollarSign className="h-3 w-3" />
                  ₹{Number(severanceAmount).toLocaleString("en-IN")}
                </span>
              )}
              {noticePeriodWaived && (
                <span className="text-amber-600 dark:text-amber-400">
                  Notice waived
                </span>
              )}
            </div>

            {/* CEO remarks for rejected */}
            {status === "REJECTED" && record.ceoRemarks && (
              <p className="text-[11px] text-destructive mt-1 line-clamp-2">
                CEO: {record.ceoRemarks}
              </p>
            )}

            {/* Reasons row */}
            {reasonsList.length > 0 && (
              <div className="flex items-center gap-1 mt-1.5 flex-wrap">
                {visibleReasons.map((r) => (
                  <Badge key={r} variant="outline" className="text-[9px] py-0 h-4">
                    {r}
                  </Badge>
                ))}
                {extraCount > 0 && (
                  <Badge variant="outline" className="text-[9px] py-0 h-4">
                    +{extraCount} more
                  </Badge>
                )}
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-1.5 shrink-0 flex-wrap justify-end">
            {/* HR: submit DRAFT for CEO approval */}
            {isHR && status === "DRAFT" && (
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs"
                onClick={handleSubmit}
                disabled={isSubmitting}
                aria-label={`Submit termination for ${employee?.name ?? "employee"} for CEO approval`}
              >
                <AlertTriangle className="h-3 w-3 mr-1" />
                Submit for Approval
              </Button>
            )}

            {/* HR: resubmit REJECTED for CEO approval */}
            {isHR && status === "REJECTED" && (
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs"
                onClick={handleSubmit}
                disabled={isSubmitting}
                aria-label={`Resubmit termination for ${employee?.name ?? "employee"} for CEO approval`}
              >
                <AlertTriangle className="h-3 w-3 mr-1" />
                Resubmit
              </Button>
            )}

            {/* CEO: approve or reject PENDING_CEO */}
            {isCEO && status === "PENDING_CEO" && (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs"
                  onClick={handleApprove}
                  aria-label={`Approve termination for ${employee?.name ?? "employee"}`}
                >
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  Approve
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs text-destructive hover:text-destructive"
                  onClick={handleReject}
                  aria-label={`Reject termination for ${employee?.name ?? "employee"}`}
                >
                  <XCircle className="h-3 w-3 mr-1" />
                  Reject
                </Button>
              </>
            )}

            {/* HR: send email after APPROVED */}
            {isHR && status === "APPROVED" && (
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs"
                onClick={handleSendEmail}
                aria-label={`Send termination email to ${employee?.name ?? "employee"}`}
              >
                <Mail className="h-3 w-3 mr-1" />
                Send Email
              </Button>
            )}

            {/* HR: complete after SENT */}
            {isHR && status === "SENT" && (
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs"
                onClick={handleComplete}
                disabled={isCompleting}
                aria-label={`Complete termination for ${employee?.name ?? "employee"}`}
              >
                <Check className="h-3 w-3 mr-1" />
                Complete
              </Button>
            )}

            {/* Completed label */}
            {status === "COMPLETED" && (
              <span className="text-[11px] text-muted-foreground italic">
                Completed
              </span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
