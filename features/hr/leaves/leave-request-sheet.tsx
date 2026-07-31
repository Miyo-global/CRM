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
}

export function LeaveRequestSheet({
  open, onOpenChange, leaveTypes, joiningDate, balances = [],
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
          return Number.isFinite(available) ? available : null;
        },
      }),
    [leaveTypes, balances],
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

  const { requestedDays, balancePreview } = useMemo(() => {
    if (!watchedLeaveTypeId || !watchedStartDate || !watchedEndDate) {
      return { requestedDays: 0, balancePreview: null };
    }
    const days = calculateLeaveWorkingDays({
      startDate: watchedStartDate,
      endDate: watchedEndDate,
      isHalfDay: watchedHalfDay,
    });
    const selectedType = leaveTypes.find((t) => t.id.toString() === watchedLeaveTypeId);
    if (!selectedType) return { requestedDays: days, balancePreview: null };

    if (isUnpaidLeaveType(selectedType.name)) {
      return { requestedDays: days, balancePreview: null };
    }

    const matchedBal = balances.find((b) => b.leaveTypeId === selectedType.id);
    if (!matchedBal) return { requestedDays: days, balancePreview: null };

    const available = Number(matchedBal.balance ?? 0);
    return {
      requestedDays: days,
      balancePreview: {
        available,
        after: available - days,
        typeName: selectedType.name,
      },
    };
  }, [watchedLeaveTypeId, watchedStartDate, watchedEndDate, watchedHalfDay, leaveTypes, balances]);

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
      title="Request Leave"
      description="Requests are sent to HR automatically. You will be notified when they are reviewed."
      onSubmit={form.handleSubmit(onSubmit)}
      onCancel={handleCancel}
      submitLabel="Submit Request"
      submitDisabled={!form.formState.isValid || requestLeaveMutation.isPending || !!leaveDayLimitError}
      isPending={requestLeaveMutation.isPending}
    >
      <Form {...form}>
        <div className="space-y-4">
          <FormField
            control={form.control}
            name="leaveTypeId"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs font-medium">Leave Type</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger className="text-sm">
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

          <div className="grid grid-cols-2 gap-3">
            <FormField
              control={form.control}
              name="startDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-medium">From</FormLabel>
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
                  <FormLabel className="text-xs font-medium">To</FormLabel>
                  <FormControl>
                    <DatePicker
                      value={field.value}
                      onChange={field.onChange}
                      fromDate={watchedStartDate ? new Date(watchedStartDate) : (minDate ? new Date(minDate) : undefined)}
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
                  <FormLabel className="text-xs font-medium">Half Day Period</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger className="text-sm">
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
                <FormLabel className="text-xs font-medium">Priority</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger className="text-sm">
                      <SelectValue placeholder="Select priority" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="LOW">
                      <span className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-emerald-500" />Low
                      </span>
                    </SelectItem>
                    <SelectItem value="MEDIUM">
                      <span className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-amber-500" />Medium
                      </span>
                    </SelectItem>
                    <SelectItem value="HIGH">
                      <span className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-red-500" />High
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
                <FormLabel className="text-xs font-medium">Reason</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="E.g. Family function, Doctor appointment..."
                    className="resize-none text-sm"
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
                <FormLabel className="text-xs font-medium">
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
                <p className="text-xs text-muted-foreground">
                  {LEAVE_ATTACHMENT_UPLOAD_FORMAT_HINT}
                </p>
                {attachmentUrl && (
                  <p className="text-xs text-muted-foreground truncate">
                    Uploaded: {attachmentKey ?? attachmentUrl}
                  </p>
                )}
                <FormMessage />
              </FormItem>
            )}
          />

          {balancePreview && requestedDays > 0 && (
            <div className={`flex items-start gap-2 p-3 rounded-lg border text-xs ${
              balancePreview.after < 0
                ? "bg-destructive/10 border-destructive/20 text-destructive"
                : "bg-muted/50 border-border text-foreground"
            }`}>
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>
                This will consume{" "}
                <strong>{requestedDays} day{requestedDays !== 1 ? "s" : ""}</strong>{" "}
                of your{" "}
                <strong>{balancePreview.available} remaining {balancePreview.typeName} days.</strong>
                {balancePreview.after >= 0 ? (
                  <> You will have <strong>{balancePreview.after} day{balancePreview.after !== 1 ? "s" : ""}</strong> left.</>
                ) : (
                  <> This exceeds your balance by <strong>{Math.abs(balancePreview.after)} day{Math.abs(balancePreview.after) !== 1 ? "s" : ""}.</strong></>
                )}
              </span>
            </div>
          )}

          {leaveDayLimitError && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
              <AlertCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
              <p className="text-xs text-destructive">{leaveDayLimitError}</p>
            </div>
          )}
        </div>
      </Form>
    </HrSheet>
  );
}
