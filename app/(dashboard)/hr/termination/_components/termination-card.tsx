"use client";

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
  Paperclip,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";

import type { Termination } from "@/lib/api/hooks/hr";
import { statusVariant, statusLabel, getInitials } from "../_lib/utils";
import { DEFAULT_LOCALE } from "@/lib/constants/locale";

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
  const { employee, status, reasons, effectiveDate, severanceAmount, noticePeriodWaived, emailStatus } =
    record;

  const evidenceCount = record.evidenceUrls?.length ?? 0;
  const reasonsList = reasons ?? [];
  const visibleReasons = reasonsList.slice(0, 2);
  const extraCount = reasonsList.length - 2;

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
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-sm font-semibold truncate">{employee?.name ?? "Employee"}</p>
              <Badge variant={statusVariant(status)} className="text-[10px] shrink-0">
                {statusLabel(status)}
              </Badge>
              {emailStatus === "failed" && (
                <Badge variant="destructive" className="text-[10px] shrink-0">
                  Email Failed
                </Badge>
              )}
            </div>

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
                  ₹{Number(severanceAmount).toLocaleString(DEFAULT_LOCALE)}
                </span>
              )}
              {noticePeriodWaived && (
                <span className="text-amber-600 dark:text-amber-400">Notice waived</span>
              )}
              {evidenceCount > 0 && (
                <span className="flex items-center gap-1">
                  <Paperclip className="h-3 w-3" />
                  {evidenceCount} evidence
                </span>
              )}
            </div>

            {status === "REJECTED" && record.ceoRemarks && (
              <p className="text-[11px] text-destructive mt-1 line-clamp-2">
                CEO: {record.ceoRemarks}
              </p>
            )}

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

          <div className="flex items-center gap-1.5 shrink-0 flex-wrap justify-end">
            {isHR && status === "DRAFT" && (
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs"
                onClick={() => onSubmit(record.id)}
                disabled={isSubmitting}
                aria-label={`Submit termination for ${employee?.name ?? "employee"} for CEO approval`}
              >
                <AlertTriangle className="h-3 w-3 mr-1" />
                Submit for Approval
              </Button>
            )}

            {isHR && status === "REJECTED" && (
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs"
                onClick={() => onSubmit(record.id)}
                disabled={isSubmitting}
                aria-label={`Resubmit termination for ${employee?.name ?? "employee"} for CEO approval`}
              >
                <AlertTriangle className="h-3 w-3 mr-1" />
                Resubmit
              </Button>
            )}

            {isCEO && status === "PENDING_CEO" && (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs"
                  onClick={() => onApprove(record.id)}
                  aria-label={`Approve termination for ${employee?.name ?? "employee"}`}
                >
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  Approve
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs text-destructive hover:text-destructive"
                  onClick={() => onReject(record.id)}
                  aria-label={`Reject termination for ${employee?.name ?? "employee"}`}
                >
                  <XCircle className="h-3 w-3 mr-1" />
                  Reject
                </Button>
              </>
            )}

            {isHR && status === "APPROVED" && (
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs"
                onClick={() => onSendEmail(record)}
                aria-label={`Send termination email to ${employee?.name ?? "employee"}`}
              >
                <Mail className="h-3 w-3 mr-1" />
                Send Email
              </Button>
            )}

            {isHR && status === "SENT" && (
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs"
                onClick={() => onComplete(record.id)}
                disabled={isCompleting}
                aria-label={`Complete termination for ${employee?.name ?? "employee"}`}
              >
                <Check className="h-3 w-3 mr-1" />
                Complete
              </Button>
            )}

            {status === "COMPLETED" && (
              <span className="text-[11px] text-muted-foreground italic">Completed</span>
            )}
          </div>
        </div>

        <Separator className="my-3" />

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px] text-muted-foreground">
          {record.initiator?.name && record.createdAt && (
            <span className="flex items-center gap-1">
              <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
              Initiated by <span className="font-medium text-foreground">{record.initiator.name}</span> on {format(new Date(record.createdAt), "d MMM yyyy")}
            </span>
          )}
          {record.ceoReviewer?.name && record.ceoReviewedAt && (
            <span className="flex items-center gap-1">
              <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>
              {status === "REJECTED" ? "Rejected" : "Reviewed"} by <span className="font-medium text-foreground">{record.ceoReviewer.name}</span> on {format(new Date(record.ceoReviewedAt), "d MMM yyyy")}
            </span>
          )}
          {record.emailSentAt && (
            <span className="flex items-center gap-1">
              <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
              Email sent {format(new Date(record.emailSentAt), "d MMM yyyy")}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
