"use client";

import { useState } from "react";
import { format } from "date-fns";
import { parseCalendarDate } from "@/lib/date-utils";
import { Receipt, Download, Eye, Pencil, Trash2, CheckCircle2, XCircle, MessageSquare, Mail, Copy } from "lucide-react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatusPill } from "@/components/ui/status-pill";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { TableCell, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn, resolveImageUrl } from "@/lib/utils";
import { formatINR } from "@/lib/format-utils";
import { viewFile, downloadFile } from "@/hooks/use-file-url";
import { toast } from "sonner";
import type { ExpenseWithRelations } from "@/server/actions/expense-query";
import type { ExpenseToEdit } from "@/app/(dashboard)/hr/expenses/create-expense-dialog";
import {
  getCategoryConfig,
  ADMIN_CATEGORY_LABELS,
  STATUS_STYLES,
  STATUS_LABELS,
} from "./expense-constants";
import { formatExpenseSubmitterLabel } from "@/lib/validations/expense";
import { canDecideRequest } from "@/lib/auth/separation-of-duties";
import { ConfirmActionDialog } from "@/features/hr/confirm-action-dialog";

function SubmitterContactPopover({
  expense,
  currentUserId,
}: {
  expense: ExpenseWithRelations;
  currentUserId?: string;
}) {
  const email = expense.user?.email?.trim() || "";
  const displayName = formatExpenseSubmitterLabel(
    expense.user,
    currentUserId,
    expense.userId,
  );
  const first = expense.user?.firstName ?? expense.user?.name?.split(" ")[0] ?? "";
  const hasNote = !!expense.description?.trim();
  const hasRejection =
    expense.status === "REJECTED" && !!expense.rejectionReason?.trim();
  if (!email && !hasNote && !hasRejection) return null;

  const idLabel = `#EXP-${parseCalendarDate(expense.expenseDate).getFullYear()}-${String(expense.id).padStart(3, "0")}`;
  const subject = `Re: Expense ${idLabel}`;
  const body = [
    `Hi ${first || displayName},`,
    "",
    `About your expense ${idLabel}:`,
    `- ${expense.merchant || expense.description || "Claim"}`,
    `- Amount: ${formatINR(expense.amount)}`,
    `- Date: ${format(parseCalendarDate(expense.expenseDate), "dd MMM yyyy")}`,
    "",
  ].join("\n");

  const mailHref = email
    ? `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
    : undefined;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-8 gap-1.5 text-xs shrink-0"
          type="button"
          aria-label="View claim note and contact submitter"
        >
          <MessageSquare className="h-3.5 w-3.5" />
          Msg
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 space-y-3 text-left">
        <p className="text-sm font-medium leading-none">Contact submitter</p>
        <p className="text-xs text-muted-foreground break-all">
          {displayName}
          {email ? ` · ${email}` : ""}
        </p>
        {hasNote ? (
          <div>
            <p className="text-2xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
              Claim note
            </p>
            <p className="text-sm whitespace-pre-wrap break-words max-h-32 overflow-y-auto">
              {expense.description}
            </p>
          </div>
        ) : null}
        {hasRejection ? (
          <div>
            <p className="text-2xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
              Rejection reason
            </p>
            <p className="text-sm whitespace-pre-wrap break-words text-destructive max-h-24 overflow-y-auto">
              {expense.rejectionReason}
            </p>
          </div>
        ) : null}
        <div className="flex flex-wrap gap-2 pt-1">
          {mailHref ? (
            <Button size="sm" className="gap-1.5" asChild>
              <a href={mailHref}>
                <Mail className="h-3.5 w-3.5" />
                Email
              </a>
            </Button>
          ) : null}
          {email ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="gap-1.5"
              onClick={() => {
                void navigator.clipboard.writeText(email);
                toast.success("Email copied");
              }}
            >
              <Copy className="h-3.5 w-3.5" />
              Copy
            </Button>
          ) : null}
        </div>
        {!email && (hasNote || hasRejection) ? (
          <p className="text-xs text-muted-foreground">No email on file for this user.</p>
        ) : null}
      </PopoverContent>
    </Popover>
  );
}

interface AdminExpenseItemProps {
  expense: ExpenseWithRelations;
  rejectingId: number | null;
  rejectionReason: string;
  isPending: boolean;
  currentUserId?: string;
  currentUserRole?: string;
  onApprove: (id: number) => void;
  onRejectStart: (id: number) => void;
  onRejectConfirm: (id: number) => void;
  onRejectCancel: () => void;
  onRejectionReasonChange: (reason: string) => void;
  /** Records an approved expense as reimbursed (QA-0044). */
  onMarkPaid: (id: number) => void;
  onEdit: (expense: ExpenseToEdit) => void;
  onWithdraw: (id: number) => void;
}

export function AdminExpenseItem({
  expense,
  rejectingId,
  rejectionReason,
  isPending,
  currentUserId,
  currentUserRole,
  onApprove,
  onRejectStart,
  onRejectConfirm,
  onRejectCancel,
  onRejectionReasonChange,
  onMarkPaid,
  onEdit,
  onWithdraw,
}: AdminExpenseItemProps) {
  const status = expense.status || "PENDING";
  // Your own claim waits for another approver, so you can only edit or
  // withdraw it while it is pending (R2-CRUD-06).
  const ownPending = !!currentUserId && expense.userId === currentUserId && status === "PENDING";
  // Same rule as the API: no deciding your own claim or an HR/Admin colleague's (QA-AUTH-04).
  const canDecide = canDecideRequest(
    { id: currentUserId, role: currentUserRole },
    { id: expense.userId, role: expense.user?.role },
  ).allowed;
  const catConfig = getCategoryConfig(expense.category || "Other");
  const CatIcon = catConfig.icon;
  const isRejecting = rejectingId === expense.id;
  const adminCatLabel = ADMIN_CATEGORY_LABELS[expense.category || ""] || catConfig.label;
  const [confirmingPaid, setConfirmingPaid] = useState(false);

  return (
    <div className="flex flex-col items-start gap-4 px-4 py-4 transition-colors hover:bg-muted/40 sm:flex-row">
      <div className="flex-shrink-0 flex flex-col items-center gap-1.5">
        <div
          className={cn(
            "relative flex h-20 w-25 items-center justify-center overflow-hidden rounded-lg border border-border bg-surface-sunken",
            expense.receiptUrl && "cursor-pointer transition-shadow hover:ring-2 hover:ring-ring"
          )}
          onClick={() => expense.receiptUrl && viewFile(expense.receiptUrl)}
        >
          {expense.receiptUrl ? (
            <Image
              src={resolveImageUrl(expense.receiptUrl) || ""}
              alt="Receipt"
              fill
              unoptimized
              className="object-cover rounded-lg"
            />
          ) : (
            <Receipt className="size-7 text-muted-foreground" aria-hidden="true" />
          )}
        </div>
        {expense.receiptUrl && (
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-foreground"
              onClick={() => viewFile(expense.receiptUrl!)}
              aria-label="View receipt"
            >
              <Eye className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-foreground"
              onClick={() => downloadFile(expense.receiptUrl!, expense.receiptFileName || "receipt")}
              aria-label="Download receipt"
            >
              <Download className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <TooltipProvider delayDuration={150}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge
                  className={`cursor-help text-2xs font-semibold px-2 py-0.5 rounded border ${
                    status === "PENDING"
                      ? "bg-warning-soft text-warning-strong border-warning-strong/25"
                      : status === "APPROVED"
                      ? "bg-success-soft text-success-strong border-success-strong/25"
                      : status === "PAID"
                      ? "bg-muted text-neutral-strong border-border"
                      : "bg-danger-soft text-danger-strong border-danger-strong/25"
                  }`}
                >
                  {status === "PENDING"
                    ? "Pending Review"
                    : status === "APPROVED"
                    ? "Approved"
                    : status === "PAID"
                    ? "Paid"
                    : "Rejected"}
                </Badge>
              </TooltipTrigger>
              <TooltipContent side="top" className="text-xs">
                {status === "PENDING"
                  ? "Waiting for HR/Admin approval."
                  : status === "APPROVED"
                  ? "Expense has been approved."
                  : status === "PAID"
                  ? "Reimbursement has been paid."
                  : expense.rejectionReason?.trim() || "Expense was rejected."}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <span className="text-xs text-muted-foreground">
            #EXP-{parseCalendarDate(expense.expenseDate).getFullYear()}-{expense.id.toString().padStart(3, "0")}
          </span>
        </div>
        <h4 className="font-semibold text-base text-foreground mb-0.5">
          {expense.merchant || expense.description || "Expense Claim"}
        </h4>
        <p className="text-sm text-muted-foreground line-clamp-1 mb-2.5">
          {expense.description || "-"}
        </p>
        <div className="flex items-center gap-2 text-sm flex-wrap">
          <Avatar className="h-6 w-6">
            <AvatarImage src={resolveImageUrl(expense.user?.image)} />
            <AvatarFallback className="text-2xs bg-muted">
              {expense.user?.firstName?.[0]}{expense.user?.lastName?.[0]}
            </AvatarFallback>
          </Avatar>
          <span className="font-medium text-foreground text-sm">
            {formatExpenseSubmitterLabel(expense.user, currentUserId, expense.userId)}
          </span>
          {expense.user?.employeeId && (
            <span className="font-mono text-xs text-muted-foreground">{expense.user.employeeId}</span>
          )}
          {/* Money owed to a leaver settles through Full & Final; flag it. */}
          {expense.user?.isActive === false && <StatusPill tone="danger">Terminated</StatusPill>}
          <span className="text-muted-foreground">•</span>
          <span className="text-muted-foreground text-sm">{expense.category || "General"}</span>
          <span className="text-muted-foreground">•</span>
          <span className="text-muted-foreground text-sm">
            {format(parseCalendarDate(expense.expenseDate), "MMM dd, yyyy")}
          </span>
        </div>
      </div>

      <div className="text-right min-w-[130px] flex-shrink-0 hidden lg:block">
        <p className="text-2xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Category</p>
        <div className="flex items-center gap-1.5 justify-end">
          <CatIcon className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">{adminCatLabel}</span>
        </div>
      </div>

      <div className="text-right min-w-[150px] flex-shrink-0">
        <TooltipProvider delayDuration={150}>
          <Tooltip>
            <TooltipTrigger asChild>
              <p className="text-2xl font-bold text-foreground cursor-help inline-block underline decoration-dotted decoration-muted-foreground/40 underline-offset-4 hover:decoration-foreground transition-colors">
                {formatINR(expense.amount)}
              </p>
            </TooltipTrigger>
            <TooltipContent side="left" className="text-xs">
              <div className="space-y-1">
                <p>
                  <span className="text-muted-foreground">Amount: </span>
                  <span className="font-semibold tabular-nums">{formatINR(expense.amount)}</span>
                </p>
                {expense.paymentMethod && (
                  <p>
                    <span className="text-muted-foreground">Paid via: </span>
                    <span className="font-medium capitalize">{expense.paymentMethod.toLowerCase()}</span>
                  </p>
                )}
                <p>
                  <span className="text-muted-foreground">Date: </span>
                  <span className="font-medium">{format(parseCalendarDate(expense.expenseDate), "dd MMM yyyy")}</span>
                </p>
              </div>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        <p className="text-xs text-muted-foreground mb-2">INR</p>

        {(expense.user?.email?.trim() ||
          expense.description?.trim() ||
          (expense.status === "REJECTED" && expense.rejectionReason?.trim())) && (
          <div className="flex justify-end mb-2">
            <SubmitterContactPopover expense={expense} currentUserId={currentUserId} />
          </div>
        )}

        {ownPending ? (
          <OwnClaimActions expense={expense} onEdit={onEdit} onWithdraw={onWithdraw} />
        ) : !canDecide ? null : isRejecting ? (
          <div className="space-y-2 text-left">
            <Input
              placeholder="Reason for rejection (required)..."
              value={rejectionReason}
              onChange={(e) => onRejectionReasonChange(e.target.value)}
              className="text-sm h-9"
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" className="h-8 text-xs" onClick={onRejectCancel}>
                Cancel
              </Button>
              <Button
                size="sm"
                variant="destructive"
                className="h-8 text-xs"
                disabled={!rejectionReason.trim()}
                onClick={() => onRejectConfirm(expense.id)}
              >
                Confirm Reject
              </Button>
            </div>
          </div>
        ) : status === "PENDING" ? (
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs text-danger-strong border-danger-strong/25 hover:bg-danger-soft"
              onClick={() => onRejectStart(expense.id)}
            >
              Reject
            </Button>
            <Button
              size="sm"
              className="h-8 text-xs"
              onClick={() => onApprove(expense.id)}
              disabled={isPending}
            >
              Approve
            </Button>
          </div>
        ) : status === "APPROVED" ? (
          <div className="flex justify-end">
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs"
              onClick={() => setConfirmingPaid(true)}
              disabled={isPending}
            >
              Mark reimbursed
            </Button>
          </div>
        ) : null}
        <ConfirmActionDialog
          open={confirmingPaid}
          onOpenChange={setConfirmingPaid}
          title="Mark as reimbursed?"
          description={`Record ${formatINR(expense.amount)} as paid to ${formatExpenseSubmitterLabel(expense.user, currentUserId, expense.userId)}. This can't be undone.`}
          confirmLabel="Mark reimbursed"
          isPending={isPending}
          onConfirm={() => {
            setConfirmingPaid(false);
            onMarkPaid(expense.id);
          }}
        />
      </div>
    </div>
  );
}

function toEditPayload(expense: ExpenseWithRelations): ExpenseToEdit {
  return {
    id: expense.id,
    category: expense.category || "",
    amount: expense.amount,
    description: expense.description,
    merchant: expense.merchant,
    paymentMethod: expense.paymentMethod,
    expenseDate: expense.expenseDate,
    receiptUrl: expense.receiptUrl,
    receiptFileName: expense.receiptFileName,
  };
}

/** Edit and withdraw for a pending claim of your own (R2-CRUD-06). */
function OwnClaimActions({
  expense,
  onEdit,
  onWithdraw,
}: {
  expense: ExpenseWithRelations;
  onEdit: (expense: ExpenseToEdit) => void;
  onWithdraw: (id: number) => void;
}) {
  const [confirming, setConfirming] = useState(false);
  return (
    <div className="flex justify-end gap-1">
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 text-brand-text hover:text-brand-text"
        onClick={() => onEdit(toEditPayload(expense))}
        aria-label="Edit claim"
      >
        <Pencil className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 text-danger-strong"
        onClick={() => setConfirming(true)}
        aria-label="Withdraw claim"
      >
        <Trash2 className="h-4 w-4" />
      </Button>
      <ConfirmActionDialog
        open={confirming}
        onOpenChange={setConfirming}
        title="Withdraw claim"
        description="Withdraw this expense claim? It will be removed and not reviewed."
        confirmLabel="Withdraw"
        onConfirm={() => {
          setConfirming(false);
          onWithdraw(expense.id);
        }}
      />
    </div>
  );
}

interface MemberExpenseItemProps {
  expense: ExpenseWithRelations;
  onEdit: (expense: ExpenseToEdit) => void;
  onWithdraw: (id: number) => void;
  onResubmit: (expense: ExpenseWithRelations) => void;
}

export function MemberExpenseItem({ expense, onEdit, onWithdraw, onResubmit }: MemberExpenseItemProps) {
  const status = expense.status || "PENDING";
  const catConfig = getCategoryConfig(expense.category || "Other");
  const CatIcon = catConfig.icon;
  const statusStyle = STATUS_STYLES[status] || STATUS_STYLES.PENDING;
  const canEdit = status === "PENDING";
  const canResubmit = status === "REJECTED";

  return (
    <TableRow>
      <TableCell className="px-6 py-4 text-sm font-medium">
        #EXP-{parseCalendarDate(expense.expenseDate).getFullYear()}-{expense.id.toString().padStart(3, "0")}
      </TableCell>
      <TableCell className="px-6 py-4 text-sm text-muted-foreground">
        {format(parseCalendarDate(expense.expenseDate), "MMM dd, yyyy")}
      </TableCell>
      <TableCell className="px-6 py-4">
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium ${catConfig.bg} ${catConfig.text}`}>
          <CatIcon className="h-3.5 w-3.5" />
          {catConfig.label}
        </span>
      </TableCell>
      <TableCell className="px-6 py-4 text-sm max-w-[200px] truncate">
        {expense.description || expense.merchant || "-"}
      </TableCell>
      <TableCell className="px-6 py-4 text-sm font-bold">
        {formatINR(expense.amount)}
      </TableCell>
      <TableCell className="px-6 py-4">
        <TooltipProvider delayDuration={150}>
          <Tooltip>
            <TooltipTrigger asChild>
              <span className={`inline-flex cursor-help items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${statusStyle.bg} ${statusStyle.text} ${statusStyle.border}`}>
                {status === "PAID" ? (
                  <CheckCircle2 className="h-3 w-3" />
                ) : status === "REJECTED" ? (
                  <XCircle className="h-3 w-3" />
                ) : (
                  <span className={`size-1.5 rounded-full ${statusStyle.dot}`} />
                )}
                {STATUS_LABELS[status] || status}
              </span>
            </TooltipTrigger>
            <TooltipContent side="top" className="text-xs">
              {status === "PENDING"
                ? "Submitted and awaiting review."
                : status === "APPROVED"
                ? "Approved and ready for reimbursement."
                : status === "PAID"
                ? "Reimbursement has been paid."
                : expense.rejectionReason?.trim() || "Rejected by approver."}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </TableCell>
      <TableCell className="px-6 py-4 text-right">
        {canResubmit ? (
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs text-brand-text border-primary/40 hover:bg-brand-soft"
            onClick={() => onResubmit(expense)}
          >
            Resubmit
          </Button>
        ) : canEdit ? (
          <OwnClaimActions expense={expense} onEdit={onEdit} onWithdraw={onWithdraw} />
        ) : (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
            onClick={() => {
              if (expense.receiptUrl) {
                viewFile(expense.receiptUrl);
              } else {
                onEdit(toEditPayload(expense));
              }
            }}
            aria-label="View"
          >
            <Eye className="h-4 w-4" />
          </Button>
        )}
      </TableCell>
    </TableRow>
  );
}
