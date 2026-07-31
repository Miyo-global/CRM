"use client";

import React, { useCallback, useMemo, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format, addDays } from "date-fns";
import { toast } from "sonner";
import { useCreateWfhRequest, useHrWfhRequests } from "@/lib/api/hooks/hr";

import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { DatePicker } from "@/components/ui/date-picker";
import { HrSheet } from "@/features/hr/hr-sheet";
import { getErrorMessage } from "@/lib/get-error-message";
import { createWfhRequestSchema, parseLocalDate, resolveWfhMinStartDate, WFH_OTHER_REASON } from "@/lib/validations/leave-request";
import { formatDateOnly, getTodayString } from "@/lib/date-utils";

const WFH_REASONS = [
  "Personal commitment",
  "Health / Medical",
  "Home maintenance",
  "Childcare",
  "Weather conditions",
  "Internet / Utility work",
  "Other",
] as const;

interface WfhRequestSheetProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  joiningDate?: string | null;
}

function wfhDateKey(date: string | Date): string {
  return typeof date === "string" ? date.slice(0, 10) : formatDateOnly(date);
}

export function WfhRequestSheet({ open, onOpenChange, joiningDate = null }: WfhRequestSheetProps) {
  const createWfhRequest = useCreateWfhRequest();
  const { data: myWfhRequests = [] } = useHrWfhRequests();

  const todayStr = getTodayString();

  const hasWfhToday = useMemo(
    () =>
      myWfhRequests.some((r) => {
        const status = r.status ?? "PENDING";
        return (
          wfhDateKey(r.date) === todayStr &&
          (status === "PENDING" || status === "APPROVED")
        );
      }),
    [myWfhRequests, todayStr],
  );

  const minStartStr = useMemo(() => {
    if (hasWfhToday) {
      return format(addDays(parseLocalDate(todayStr), 1), "yyyy-MM-dd");
    }
    return todayStr;
  }, [hasWfhToday, todayStr]);

  const { minStartDate: effectiveMinStr } = useMemo(
    () => resolveWfhMinStartDate({ minStartDate: minStartStr, joiningDate }),
    [minStartStr, joiningDate],
  );

  const wfhFormSchema = useMemo(
    () => createWfhRequestSchema({ minStartDate: minStartStr, joiningDate }),
    [minStartStr, joiningDate],
  );

  type WfhFormValues = z.infer<typeof wfhFormSchema>;

  const minSelectableDate = useMemo(() => parseLocalDate(effectiveMinStr), [effectiveMinStr]);

  const defaultStart = useMemo(() => {
    if (effectiveMinStr > todayStr) return effectiveMinStr;
    return format(addDays(parseLocalDate(todayStr), 1), "yyyy-MM-dd");
  }, [effectiveMinStr, todayStr]);

  const form = useForm<WfhFormValues>({
    resolver: zodResolver(wfhFormSchema),
    mode: "onTouched",
    reValidateMode: "onChange",
    defaultValues: {
      startDate: defaultStart,
      endDate: defaultStart,
      reason: "",
      notes: "",
    },
  });

  const watchedStartDate = form.watch("startDate");
  const watchedReason = form.watch("reason");
  const notesRequired = watchedReason === WFH_OTHER_REASON;

  const endDateMin = useMemo(() => {
    const start = watchedStartDate ? parseLocalDate(watchedStartDate) : minSelectableDate;
    return start > minSelectableDate ? start : minSelectableDate;
  }, [watchedStartDate, minSelectableDate]);

  const resetFormState = useCallback(() => {
    form.reset(
      {
        startDate: defaultStart,
        endDate: defaultStart,
        reason: "",
        notes: "",
      },
      { keepErrors: false },
    );
  }, [form, defaultStart]);

  useEffect(() => {
    if (!open) return;
    resetFormState();
  }, [open, effectiveMinStr, resetFormState]);

  const handleCancel = useCallback(() => {
    resetFormState();
    onOpenChange(false);
  }, [onOpenChange, resetFormState]);

  const onSubmit = useCallback((data: WfhFormValues) => {
    const parsed = createWfhRequestSchema({ minStartDate: minStartStr, joiningDate }).safeParse(data);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Invalid WFH dates");
      return;
    }

    createWfhRequest.mutate(
      {
        date: data.startDate,
        endDate: data.endDate !== data.startDate ? data.endDate : undefined,
        reason: `${data.reason}${data.notes ? ` — ${data.notes}` : ""}`,
      },
      {
        onSuccess: () => {
          toast.success("WFH request submitted successfully");
          resetFormState();
          onOpenChange(false);
        },
        onError: (error) => {
          toast.error(getErrorMessage(error));
        },
      },
    );
  }, [createWfhRequest, minStartStr, joiningDate, onOpenChange, resetFormState]);

  return (
    <HrSheet
      open={open}
      onOpenChange={onOpenChange}
      title="Request Work From Home"
      description={
        hasWfhToday
          ? "You already have WFH for today. Select future dates only."
          : "Your request will be reviewed by HR or leadership."
      }
      onSubmit={form.handleSubmit(onSubmit)}
      onCancel={handleCancel}
      submitLabel="Submit Request"
      submitDisabled={!form.formState.isValid || createWfhRequest.isPending}
      isPending={createWfhRequest.isPending}
    >
      <Form {...form}>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <FormField
              control={form.control}
              name="startDate"
              render={({ field, fieldState }) => (
                <FormItem>
                  <FormLabel className="text-xs font-medium">Start Date</FormLabel>
                  <FormControl>
                    <DatePicker
                      value={field.value}
                      onChange={(val) => {
                        field.onChange(val);
                        const currentEnd = form.getValues("endDate");
                        if (!currentEnd || currentEnd < val) {
                          form.setValue("endDate", val, { shouldValidate: true });
                        }
                        void form.trigger(["startDate", "endDate"]);
                      }}
                      fromDate={minSelectableDate}
                      invalid={!!fieldState.error}
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
              render={({ field, fieldState }) => (
                <FormItem>
                  <FormLabel className="text-xs font-medium">End Date</FormLabel>
                  <FormControl>
                    <DatePicker
                      value={field.value}
                      onChange={(val) => {
                        field.onChange(val);
                        void form.trigger(["startDate", "endDate"]);
                      }}
                      fromDate={endDateMin}
                      invalid={!!fieldState.error}
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
            name="reason"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs font-medium">Reason</FormLabel>
                <Select
                  onValueChange={(val) => {
                    field.onChange(val);
                    void form.trigger("notes");
                  }}
                  value={field.value || undefined}
                  onOpenChange={(isOpen) => {
                    if (!isOpen) field.onBlur();
                  }}
                >
                  <FormControl>
                    <SelectTrigger className="text-sm">
                      <SelectValue placeholder="Select reason" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {WFH_REASONS.map((reason) => (
                      <SelectItem key={reason} value={reason}>{reason}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="notes"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs font-medium">
                  {notesRequired ? (
                    <>
                      Details <span className="text-destructive">*</span>
                    </>
                  ) : (
                    <>
                      Notes <span className="text-muted-foreground">(optional)</span>
                    </>
                  )}
                </FormLabel>
                <FormControl>
                  <Textarea
                    placeholder={
                      notesRequired
                        ? "Describe your reason (required, at least 10 characters)"
                        : "Any additional details..."
                    }
                    className="resize-none text-sm"
                    rows={3}
                    {...field}
                    onChange={(e) => {
                      field.onChange(e);
                      if (notesRequired) void form.trigger("notes");
                    }}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </Form>
    </HrSheet>
  );
}
