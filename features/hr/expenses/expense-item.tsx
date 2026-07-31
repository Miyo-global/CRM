"use client";

import { format } from "date-fns";
import {
  Receipt,
  Download,
  Eye,
  Pencil,
  CheckCircle2,
  XCircle,
  RotateCcw,
  MessageSquare,
  Mail,
  Copy,
} from "lucide-react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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

  const idLabel = `#EXP-${new Date(expense.expenseDate).getFullYear()}-${String(expense.id).padStart(3, "0")}`;
  const subject = `Re: Expense ${idLabel}`;
  const body = [
    `Hi ${first || displayName},`,
    "",
    `About your expense ${idLabel}:`,
    `- ${expense.merchant || expense.description || "Claim"}`,
    `- Amount: ${formatINR(expense.amount)}`,
    `- Date: ${format(new Date(expense.expenseDate), "dd MMM yyyy")}`,
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
            <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide mb-1">
              Claim note
            </p>
            <p className="text-sm whitespace-pre-wrap break-words max-h-32 overflow-y-auto">
              {expense.description}
            </p>
          </div>
        ) : null}
        {hasRejection ? (
          <div>
            <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide mb-1">
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
  onApprove: (id: number) => void;
  onRejectStart: (id: number) => void;
  onRejectConfirm: (id: number) => void;
  onRejectCancel: () => void;
  onRejectionReasonChange: (reason: string) => void;
}

export function AdminExpenseItem({
  expense,
  rejectingId,
  rejectionReason,
  isPending,
  currentUserId,
  onApprove,
  onRejectStart,
  onRejectConfirm,
  onRejectCancel,
  onRejectionReasonChange,
}: AdminExpenseItemProps) {
  const status = expense.status || "PENDING";
  const catConfig = getCategoryConfig(expense.category || "Other");
  const CatIcon = catConfig.icon;
  const isRejecting = rejectingId === expense.id;
  const adminCatLabel = ADMIN_CATEGORY_LABELS[expense.category || ""] || catConfig.label;

  return (
    <div className="flex items-start gap-4 px-4 py-4 hover:bg-muted/20 transition-colors">
      <div className="flex-shrink-0 flex flex-col items-center gap-1.5">
        <div
          className={cn(
            "relative w-[100px] h-[80px] rounded-lg bg-gradient-to-br from-rose-100 to-rose-200 dark:from-rose-900/20 dark:to-rose-800/20 flex items-center justify-center overflow-hidden border border-rose-200/50 dark:border-rose-800/30",
            expense.receiptUrl && "cursor-pointer hover:ring-2 hover:ring-gold/40 transition-all"
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
            <Receipt className="h-7 w-7 text-rose-400" />
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
                  className={`cursor-help text-[11px] font-semibold px-2 py-0.5 rounded border ${
                    status === "PENDING"
                      ? "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800"
                      : status === "APPROVED"
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800"
                      : status === "PAID"
                      ? "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800/30 dark:text-slate-300 dark:border-slate-600"
                      : "bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800"
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
            #EXP-{new Date(expense.expenseDate).getFullYear()}-{expense.id.toString().padStart(3, "0")}
          </span>
        </div>
        <h4 className="font-semibold text-[15px] text-foreground mb-0.5">
          {expense.merchant || expense.description || "Expense Claim"}
        </h4>
        <p className="text-sm text-muted-foreground line-clamp-1 mb-2.5">
          {expense.description || "-"}
        </p>
        <div className="flex items-center gap-2 text-sm flex-wrap">
          <Avatar className="h-6 w-6">
            <AvatarImage src={resolveImageUrl(expense.user?.image)} />
            <AvatarFallback className="text-[10px] bg-muted">
              {expense.user?.firstName?.[0]}{expense.user?.lastName?.[0]}
            </AvatarFallback>
          </Avatar>
          <span className="font-medium text-foreground text-sm">
            {formatExpenseSubmitterLabel(expense.user, currentUserId, expense.userId)}
          </span>
          <span className="text-muted-foreground">•</span>
          <span className="text-muted-foreground text-sm">{expense.category || "General"}</span>
          <span className="text-muted-foreground">•</span>
          <span className="text-muted-foreground text-sm">
            {format(new Date(expense.expenseDate), "MMM dd, yyyy")}
          </span>
        </div>
      </div>

      <div className="text-right min-w-[130px] flex-shrink-0 hidden lg:block">
        <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Category</p>
        <div className="flex items-center gap-1.5 justify-end">
          <CatIcon className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">{adminCatLabel}</span>
        </div>
        {expense.description && (
          <p className="text-xs text-muted-foreground mt-0.5 truncate max-w-[130px]">{expense.description}</p>
        )}
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
                  <span className="font-medium">{format(new Date(expense.expenseDate), "dd MMM yyyy")}</span>
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

        {isRejecting ? (
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
              className="h-8 text-xs text-red-600 border-red-200 hover:bg-red-50 dark:border-red-800 dark:hover:bg-red-900/20"
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
        ) : null}
      </div>
    </div>
  );
}

interface MemberExpenseItemProps {
  expense: ExpenseWithRelations;
  onEdit: (expense: ExpenseToEdit) => void;
  onResubmit: (expense: ExpenseWithRelations) => void;
}

export function MemberExpenseItem({ expense, onEdit, onResubmit }: MemberExpenseItemProps) {
  const status = expense.status || "PENDING";
  const catConfig = getCategoryConfig(expense.category || "Other");
  const CatIcon = catConfig.icon;
  const statusStyle = STATUS_STYLES[status] || STATUS_STYLES.PENDING;
  const canEdit = status === "PENDING";
  const canResubmit = status === "REJECTED";

  const toEditPayload = (): ExpenseToEdit => ({
    id: expense.id,
    category: expense.category || "",
    amount: expense.amount,
    description: expense.description,
    merchant: expense.merchant,
    paymentMethod: expense.paymentMethod,
    expenseDate: expense.expenseDate,
    receiptUrl: expense.receiptUrl,
    receiptFileName: expense.receiptFileName,
  });

  return (
    <TableRow className="hover:bg-muted/30 transition-colors">
      <TableCell className="px-6 py-4 text-sm font-medium">
        #EXP-{new Date(expense.expenseDate).getFullYear()}-{expense.id.toString().padStart(3, "0")}
      </TableCell>
      <TableCell className="px-6 py-4 text-sm text-muted-foreground">
        {format(new Date(expense.expenseDate), "MMM dd, yyyy")}
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
            className="h-7 text-xs text-gold border-gold/20 hover:bg-gold/5"
            onClick={() => onResubmit(expense)}
          >
            Resubmit
          </Button>
        ) : canEdit ? (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-gold hover:text-gold/80"
            onClick={() => onEdit(toEditPayload())}
            aria-label="Edit"
          >
            <Pencil className="h-4 w-4" />
          </Button>
        ) : (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
            onClick={() => {
              if (expense.receiptUrl) {
                viewFile(expense.receiptUrl);
              } else {
                onEdit(toEditPayload());
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
