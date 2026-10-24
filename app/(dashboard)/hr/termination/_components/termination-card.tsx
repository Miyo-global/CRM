"use client";

import { format } from "date-fns";
import {
  CheckCircle2,
  XCircle,
  Mail,
  AlertTriangle,
  Calendar,
  User,
  BadgeIndianRupee,
  Check,
  Paperclip,
  Clock,
  Pencil,
  Trash2,
  Ban,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";

import type { Termination } from "@/lib/api/hooks/hr";
import { statusTone, statusLabel, getInitials } from "../_lib/utils";
import { StatusPill } from "@/components/ui/status-pill";
import { DEFAULT_LOCALE } from "@/lib/constants/locale";
import { formatIST, parseCalendarDate } from "@/lib/date-utils";

interface TerminationCardProps {
  record: Termination;
  isHR: boolean;
  isCEO: boolean;
  onSubmit: (id: number) => void;
  onApprove: (id: number) => void;
  onReject: (id: number) => void;
  onSendEmail: (record: Termination) => void;
  onComplete: (id: number) => void;
  onEdit: (record: Termination) => void;
  onDelete: (record: Termination) => void;
  onCancel: (record: Termination) => void;
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
  onEdit,
  onDelete,
  onCancel,
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
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
          <div className="flex min-w-0 flex-1 items-start gap-3">
          <Avatar className="mt-0.5 size-9 shrink-0">
            <AvatarFallback className="bg-brand-soft text-xs text-brand-soft-foreground">
              {getInitials(employee?.name ?? null)}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-sm font-semibold truncate">{employee?.name ?? "Employee"}</p>
              <StatusPill tone={statusTone(status)} dot className="shrink-0">
                {statusLabel(status)}
              </StatusPill>
              {emailStatus === "failed" && (
                <StatusPill tone="danger" className="shrink-0">
                  Email Failed
                </StatusPill>
              )}
            </div>

            <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs tabular-nums text-muted-foreground">
              {employee?.designation && (
                <span className="flex items-center gap-1">
                  <User className="size-3.5" aria-hidden="true" />
                  {employee.designation}
                </span>
              )}
              {employee?.employeeId && <span>ID: {employee.employeeId}</span>}
              {effectiveDate && (
                <span className="flex items-center gap-1">
                  <Calendar className="size-3.5" aria-hidden="true" />
                  Effective: {format(parseCalendarDate(effectiveDate), "MMM d, yyyy")}
                </span>
              )}
              {severanceAmount && Number(severanceAmount) > 0 && (
                <span className="flex items-center gap-1">
                  <BadgeIndianRupee className="size-3.5" aria-hidden="true" />
                  ₹{Number(severanceAmount).toLocaleString(DEFAULT_LOCALE)}
                </span>
              )}
              {noticePeriodWaived && (
                <span className="text-warning-strong">Notice waived</span>
              )}
              {evidenceCount > 0 && (
                <span className="flex items-center gap-1">
                  <Paperclip className="size-3.5" aria-hidden="true" />
                  {evidenceCount} evidence
                </span>
              )}
            </div>

            {status === "REJECTED" && record.ceoRemarks && (
              <p className="mt-1 line-clamp-2 text-xs text-danger-strong">
                Super Admin: {record.ceoRemarks}
              </p>
            )}

            {reasonsList.length > 0 && (
              <div className="flex items-center gap-1 mt-1.5 flex-wrap">
                {visibleReasons.map((r) => (
                  <Badge key={r} variant="outline">
                    {r}
                  </Badge>
                ))}
                {extraCount > 0 && (
                  <Badge variant="outline">
                    +{extraCount} more
                  </Badge>
                )}
              </div>
            )}
          </div>
          </div>

          <div className="flex shrink-0 flex-wrap items-center gap-1.5 sm:justify-end">
            {isHR && status === "DRAFT" && (
              <>
                <Button
                  size="xs"
                  variant="ghost"
                  onClick={() => onEdit(record)}
                  aria-label={`Edit draft termination for ${employee?.name ?? "employee"}`}
                >
                  <Pencil aria-hidden="true" />
                  Edit
                </Button>
                <Button
                  size="xs"
                  variant="ghost"
                  className="text-destructive hover:text-destructive"
                  onClick={() => onDelete(record)}
                  aria-label={`Delete draft termination for ${employee?.name ?? "employee"}`}
                >
                  <Trash2 aria-hidden="true" />
                  Delete
                </Button>
              </>
            )}

            {isHR && (status === "PENDING_CEO" || status === "APPROVED") && (
              <Button
                size="xs"
                variant="ghost"
                className="text-destructive hover:text-destructive"
                onClick={() => onCancel(record)}
                aria-label={`Cancel termination for ${employee?.name ?? "employee"}`}
              >
                <Ban aria-hidden="true" />
                Cancel
              </Button>
            )}

            {isHR && status === "DRAFT" && (
              <Button
                size="xs"
                variant="outline"
                onClick={() => onSubmit(record.id)}
                disabled={isSubmitting}
                aria-label={`Submit termination for ${employee?.name ?? "employee"} for Super Admin approval`}
              >
                <AlertTriangle aria-hidden="true" />
                Submit for Approval
              </Button>
            )}

            {isHR && status === "REJECTED" && (
              <Button
                size="xs"
                variant="outline"
                onClick={() => onSubmit(record.id)}
                disabled={isSubmitting}
                aria-label={`Resubmit termination for ${employee?.name ?? "employee"} for Super Admin approval`}
              >
                <AlertTriangle aria-hidden="true" />
                Resubmit
              </Button>
            )}

            {isCEO && status === "PENDING_CEO" && (
              <>
                <Button
                  size="xs"
                  variant="outline"
                  onClick={() => onApprove(record.id)}
                  aria-label={`Approve termination for ${employee?.name ?? "employee"}`}
                >
                  <CheckCircle2 aria-hidden="true" />
                  Approve
                </Button>
                <Button
                  size="xs"
                  variant="outline"
                  className="text-destructive hover:text-destructive"
                  onClick={() => onReject(record.id)}
                  aria-label={`Reject termination for ${employee?.name ?? "employee"}`}
                >
                  <XCircle aria-hidden="true" />
                  Reject
                </Button>
              </>
            )}

            {isHR && status === "APPROVED" && (
              <Button
                size="xs"
                variant="outline"
                onClick={() => onSendEmail(record)}
                aria-label={`Send termination email to ${employee?.name ?? "employee"}`}
              >
                <Mail aria-hidden="true" />
                Send Email
              </Button>
            )}

            {isHR && status === "SENT" && (
              <Button
                size="xs"
                variant="outline"
                onClick={() => onComplete(record.id)}
                disabled={isCompleting}
                aria-label={`Complete termination for ${employee?.name ?? "employee"}`}
              >
                <Check aria-hidden="true" />
                Complete
              </Button>
            )}

            {status === "COMPLETED" && (
              <StatusPill tone="success">Completed</StatusPill>
            )}
          </div>
        </div>

        <Separator className="my-3" />

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs tabular-nums text-muted-foreground">
          {record.initiator?.name && record.createdAt && (
            <span className="flex items-center gap-1">
              <Clock className="size-3" aria-hidden="true" />
              Initiated by <span className="font-medium text-foreground">{record.initiator.name}</span> on {formatIST(record.createdAt, { hour: undefined, minute: undefined })}
            </span>
          )}
          {record.ceoReviewer?.name && record.ceoReviewedAt && (
            <span className="flex items-center gap-1">
              <Check className="size-3" aria-hidden="true" />
              {status === "REJECTED" ? "Rejected" : "Reviewed"} by <span className="font-medium text-foreground">{record.ceoReviewer.name}</span> on {formatIST(record.ceoReviewedAt, { hour: undefined, minute: undefined })}
            </span>
          )}
          {record.emailSentAt && (
            <span className="flex items-center gap-1">
              <Mail className="size-3" aria-hidden="true" />
              Email sent {formatIST(record.emailSentAt, { hour: undefined, minute: undefined })}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
