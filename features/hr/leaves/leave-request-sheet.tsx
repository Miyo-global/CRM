"use client";

import React, { useState, useMemo, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format, startOfDay } from "date-fns";
import { toast } from "sonner";

import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { DatePicker } from "@/components/ui/date-picker";
import { Checkbox } from "@/components/ui/checkbox";
import { FileUpload } from "@/components/storage/file-upload";
import { HrSheet } from "@/features/hr/hr-sheet";
import { AlertCircle } from "lucide-react";
import { useRequestLeave } from "@/lib/api/hooks/hr";
import { LEAVE_MAX_DAYS, isUnpaidLeaveType } from "@/lib/leave-policy";
import type { LeaveType, LeaveBalance } from "@/app/(dashboard)/hr/leaves/leaves-shared";
import {
  calculateLeaveWorkingDays,
  createLeaveRequestSchema,
} from "@/lib/validations/leave-request";
import { useHolidayDates } from "@/lib/api/hooks/hr/holiday-dates";
import { useLeavePreview } from "@/lib/api/hooks/hr/leave-preview";
import {
  LEAVE_ATTACHMENT_ACCEPT,
  LEAVE_ATTACHMENT_ALLOWED_EXTENSIONS,
  LEAVE_ATTACHMENT_ALLOWED_MIME_TYPES,
  LEAVE_ATTACHMENT_UPLOAD_FORMAT_HINT,
} from "@/lib/validations/files";

type LeaveFormValues = z.infer<ReturnType<typeof createLeaveRequestSchema>>;

interface LeaveRequestSheetProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  leaveTypes: LeaveType[];
  joiningDate: string | null;
  balances?: LeaveBalance[];
  /** Days already requested and awaiting approval, by leave type name (A29). */
  pendingDaysByType?: Record<string, number>;
}

export function LeaveRequestSheet({
  open, onOpenChange, leaveTypes, joiningDate, balances = [], pendingDaysByType = {},
}: LeaveRequestSheetProps) {
  const requestLeaveMutation = useRequestLeave();
  const [attachmentUrl, setAttachmentUrl] = useState<string | null>(null);
  const [attachmentKey, setAttachmentKey] = useState<string | null>(null);
  const leaveFormSchema = useMemo(
    () =>
      createLeaveRequestSchema({
        getAvailableBalance: (leaveTypeId) => {
          const selectedType = leaveTypes.find((t) => t.id.toString() === leaveTypeId);
          if (!selectedType) return null;
          if (isUnpaidLeaveType(selectedType.name)) return null;
          const matchedBal = balances.find((b) => b.leaveTypeId === selectedType.id);
          if (!matchedBal) return null;
          const available = Number(matchedBal.balance ?? 0);
          if (!Number.isFinite(available)) return null;
          // Pending requests already claim part of the balance (A29).
          const pending = pendingDaysByType[selectedType.name] ?? 0;
          return Math.max(0, available - pending);
        },
      }),
    [leaveTypes, balances, pendingDaysByType],
  );

  const minDate = (() => {
    const oneYearAgo = startOfDay(new Date());
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    if (!joiningDate) return format(oneYearAgo, "yyyy-MM-dd");
    const joining = new Date(joiningDate);
    return format(joining > oneYearAgo ? joining : oneYearAgo, "yyyy-MM-dd");
  })();

  const form = useForm<LeaveFormValues>({
    resolver: zodResolver(leaveFormSchema),
    mode: "onChange",
    defaultValues: {
      leaveTypeId: "",
      startDate: "",
      endDate: "",
      halfDay: false,
      halfDayPeriod: undefined,
      priority: "MEDIUM",
      reason: "",
      attachments: [],
    },
  });

  const watchedLeaveTypeId = form.watch("leaveTypeId");
  const watchedStartDate = form.watch("startDate");
  const watchedEndDate = form.watch("endDate");
  const watchedHalfDay = form.watch("halfDay");

  const holidayDates = useHolidayDates();
  // The server's verdict for this draft, so the preview cannot promise what
  // the apply route refuses (QA-0050).
  const { data: serverPreview, isFetching: previewLoading } = useLeavePreview({
    leaveTypeId: watchedLeaveTypeId,
    startDate: watchedStartDate,
    endDate: watchedEndDate,
    isHalfDay: watchedHalfDay,
  });
  const { requestedDays, balancePreview } = useMemo(() => {
    if (!watchedLeaveTypeId || !watchedStartDate || !watchedEndDate) {
      return { requestedDays: 0, balancePreview: null };
    }
    const days = calculateLeaveWorkingDays({
      startDate: watchedStartDate,
      endDate: watchedEndDate,
      isHalfDay: watchedHalfDay,
      holidays: holidayDates,
    });
    const selectedType = leaveTypes.find((t) => t.id.toString() === watchedLeaveTypeId);
    if (!selectedType) return { requestedDays: days, balancePreview: null };

    if (isUnpaidLeaveType(selectedType.name)) {
      return { requestedDays: days, balancePreview: null };
    }

    const matchedBal = balances.find((b) => b.leaveTypeId === selectedType.id);
    if (!matchedBal) return { requestedDays: days, balancePreview: null };

    const available = Number(matchedBal.balance ?? 0);
    const pending = pendingDaysByType[selectedType.name] ?? 0;
    const usable = Math.max(0, available - pending);
    return {
      requestedDays: days,
      balancePreview: {
        available: usable,
        pending,
        after: usable - days,
        typeName: selectedType.name,
      },
    };
  }, [watchedLeaveTypeId, watchedStartDate, watchedEndDate, watchedHalfDay, leaveTypes, balances, holidayDates, pendingDaysByType]);

  const leaveDayLimitError = useMemo(() => {
    if (!watchedLeaveTypeId || !watchedStartDate || !watchedEndDate) return null;
    const selectedType = leaveTypes.find((t) => t.id.toString() === watchedLeaveTypeId);
    if (!selectedType) return null;
    const maxDays = LEAVE_MAX_DAYS[selectedType.name];
    if (maxDays === undefined) return null;
    if (requestedDays > maxDays) {
      return `${selectedType.name} cannot exceed ${maxDays} days. You selected ${requestedDays} day${requestedDays !== 1 ? "s" : ""}.`;
    }
    return null;
  }, [watchedLeaveTypeId, watchedStartDate, watchedEndDate, requestedDays, leaveTypes]);

  const resetFormState = useCallback(() => {
    form.reset();
    setAttachmentUrl(null);
    setAttachmentKey(null);
  }, [form]);

  const handleAttachmentUpload = useCallback((url: string, key: string) => {
    setAttachmentUrl(url);
    setAttachmentKey(key);
    form.setValue("attachments", [url], { shouldValidate: true });
  }, [form]);

  const handleCancel = useCallback(() => {
    resetFormState();
    onOpenChange(false);
  }, [onOpenChange, resetFormState]);

  const onSubmit = useCallback((data: LeaveFormValues) => {
    if (leaveDayLimitError) { toast.error(leaveDayLimitError); return; }

    requestLeaveMutation.mutate(
      {
        leaveTypeId: parseInt(data.leaveTypeId),
        startDate: data.startDate,
        endDate: data.endDate,
        reason: data.reason,
        priority: data.priority,
        attachmentUrl: attachmentUrl || undefined,
        isHalfDay: data.halfDay,
        halfDayPeriod: data.halfDay ? data.halfDayPeriod : undefined,
      },
      {
        onSuccess: () => {
          toast.success("Leave requested successfully!");
          resetFormState();
          onOpenChange(false);
        },
        onError: (err) => toast.error(err.message || "Failed to submit request"),
      },
    );
  }, [leaveDayLimitError, attachmentUrl, onOpenChange, requestLeaveMutation, resetFormState]);

  return (
    <HrSheet
      open={open}
      onOpenChange={onOpenChange}
      title="Request leave"
      description="Requests are sent to HR automatically. You will be notified when they are reviewed."
      onSubmit={form.handleSubmit(onSubmit)}
      onCancel={handleCancel}
      submitLabel="Submit Request"
      submitDisabled={
        !form.formState.isValid ||
        requestLeaveMutation.isPending ||
        !!leaveDayLimitError ||
        previewLoading ||
        !!serverPreview?.error
      }
      isPending={requestLeaveMutation.isPending}
    >
      <Form {...form}>
        <div className="space-y-4">
          <FormField
            control={form.control}
            name="leaveTypeId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Leave Type</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select leave type" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {leaveTypes.map((t) => (
                      <SelectItem key={t.id} value={t.id.toString()}>{t.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid gap-3 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="startDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>From</FormLabel>
                  <FormControl>
                    <DatePicker
                      value={field.value}
                      onChange={(val) => {
                        field.onChange(val);
                        const currentEnd = form.getValues("endDate");
                        if (!currentEnd || currentEnd < val) {
                          form.setValue("endDate", val, { shouldValidate: true });
                        }
                      }}
                      fromDate={minDate ? new Date(minDate) : undefined}
                      placeholder="Start date"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="endDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>To</FormLabel>
                  <FormControl>
                    <DatePicker
                      value={field.value}
                      onChange={field.onChange}
                      fromDate={watchedStartDate ? new Date(watchedStartDate) : (minDate ? new Date(minDate) : undefined)}
                      defaultMonth={watchedStartDate ? new Date(watchedStartDate) : undefined}
                      placeholder="End date"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="halfDay"
            render={({ field }) => (
              <FormItem className="flex items-center gap-2">
                <FormControl>
                  <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                </FormControl>
                <FormLabel className="text-xs font-normal text-muted-foreground !mt-0">
                  Half Day Request
                </FormLabel>
              </FormItem>
            )}
          />

          {watchedHalfDay && (
            <FormField
              control={form.control}
              name="halfDayPeriod"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Half Day Period</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="AM">AM (Morning — first half)</SelectItem>
                      <SelectItem value="PM">PM (Afternoon — second half)</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          <FormField
            control={form.control}
            name="priority"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Priority</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select priority" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="LOW">
                      <span className="flex items-center gap-2">
                        <span className="size-2 rounded-full bg-success-500" aria-hidden="true" />Low
                      </span>
                    </SelectItem>
                    <SelectItem value="MEDIUM">
                      <span className="flex items-center gap-2">
                        <span className="size-2 rounded-full bg-warning-500" aria-hidden="true" />Medium
                      </span>
                    </SelectItem>
                    <SelectItem value="HIGH">
                      <span className="flex items-center gap-2">
                        <span className="size-2 rounded-full bg-danger-500" aria-hidden="true" />High
                      </span>
                    </SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="reason"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Reason</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="E.g. Family function, Doctor appointment..."
                    className="resize-none"
                    rows={3}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="attachments"
            render={() => (
              <FormItem>
                <FormLabel>
                  Attach Document <span className="text-muted-foreground">(Optional)</span>
                </FormLabel>
                <FormControl>
                  <FileUpload
                    folder="leave-attachments"
                    accept={LEAVE_ATTACHMENT_ACCEPT}
                    allowedMimeTypes={LEAVE_ATTACHMENT_ALLOWED_MIME_TYPES}
                    allowedExtensions={LEAVE_ATTACHMENT_ALLOWED_EXTENSIONS}
                    formatHint={LEAVE_ATTACHMENT_UPLOAD_FORMAT_HINT}
                    multiple={false}
                    onUploadComplete={handleAttachmentUpload}
                  />
                </FormControl>
                {attachmentUrl && (
                  <p className="text-xs text-muted-foreground truncate">
                    Uploaded: {attachmentKey ?? attachmentUrl}
                  </p>
                )}
                <FormMessage />
              </FormItem>
            )}
          />

          {serverPreview?.error && (
            <div role="alert" className="flex items-start gap-2 rounded-lg bg-danger-soft p-3">
              <AlertCircle className="mt-0.5 size-4 shrink-0 text-danger-strong" aria-hidden="true" />
              <p className="text-xs text-danger-strong">{serverPreview.error}</p>
            </div>
          )}

          {!serverPreview?.error && balancePreview && requestedDays > 0 && (
            <div className={`flex items-start gap-2 text-xs ${
              balancePreview.after < 0
                ? "rounded-md bg-danger-soft p-3 text-danger-strong"
                : "text-muted-foreground"
            }`}>
              {balancePreview.after < 0 && (
                <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              )}
              <span>
                This will consume{" "}
                <strong>{requestedDays} day{requestedDays !== 1 ? "s" : ""}</strong>{" "}
                of your{" "}
                <strong>
                  {balancePreview.available} available {balancePreview.typeName} days
                  {balancePreview.pending > 0 ? ` (${balancePreview.pending} pending)` : ""}.
                </strong>
                {serverPreview && serverPreview.balanceAfter !== null ? (
                  <> You will have <strong>{serverPreview.balanceAfter} day{serverPreview.balanceAfter !== 1 ? "s" : ""}</strong> left.</>
                ) : balancePreview.after >= 0 ? (
                  <> You will have <strong>{balancePreview.after} day{balancePreview.after !== 1 ? "s" : ""}</strong> left.</>
                ) : (
                  <> This exceeds your balance by <strong>{Math.abs(balancePreview.after)} day{Math.abs(balancePreview.after) !== 1 ? "s" : ""}.</strong></>
                )}
              </span>
            </div>
          )}

          {leaveDayLimitError && (
            <div role="alert" className="flex items-start gap-2 rounded-lg bg-danger-soft p-3">
              <AlertCircle className="mt-0.5 size-4 shrink-0 text-danger-strong" aria-hidden="true" />
              <p className="text-xs text-danger-strong">{leaveDayLimitError}</p>
            </div>
          )}
        </div>
      </Form>
    </HrSheet>
  );
}
