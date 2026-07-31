"use client";

import { useState, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useCreateWfhRequest } from "@/lib/api/hooks/hr";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { DatePicker } from "@/components/ui/date-picker";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import { Home, Loader2 } from "lucide-react";
import { format, addDays } from "date-fns";
import { getTodayString } from "@/lib/date-utils";
import { createWfhRequestSchema, parseLocalDate } from "@/lib/validations/leave-request";

const wfhFormSchema = createWfhRequestSchema();
type WfhFormValues = z.infer<typeof wfhFormSchema>;

export function RequestWfhDialog({ trigger }: { trigger?: React.ReactNode } = {}) {
  const [open, setOpen] = useState(false);
  const todayStr = getTodayString();
  const minDate = parseLocalDate(todayStr);
  const defaultDate = format(addDays(minDate, 1), "yyyy-MM-dd");

  const form = useForm<WfhFormValues>({
    resolver: zodResolver(wfhFormSchema),
    defaultValues: {
      startDate: defaultDate,
      endDate: defaultDate,
      reason: "Other",
      notes: "",
    },
  });

  const createWfhRequest = useCreateWfhRequest();

  const handleClose = useCallback(() => {
    setOpen(false);
    form.reset();
  }, [form]);

  const onSubmit = useCallback((data: WfhFormValues) => {
    createWfhRequest.mutate(
      {
        date: data.startDate,
        reason: data.notes?.trim()
          ? `${data.reason} — ${data.notes.trim()}`
          : data.reason,
      },
      {
        onSuccess: () => {
          toast.success("Work from home request submitted");
          handleClose();
        },
        onError: (error) => {
          toast.error(getErrorMessage(error));
        },
      }
    );
  }, [createWfhRequest, handleClose]);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        {trigger ?? (
          <Button variant="outline">
            <Home className="mr-2 h-4 w-4" />
            Request WFH
          </Button>
        )}
      </SheetTrigger>
      <SheetContent className="flex flex-col p-0 sm:max-w-md">
        <SheetHeader className="px-4 pt-4 pb-3 border-b shrink-0">
          <SheetTitle className="flex items-center gap-2 text-sm">
            <Home className="h-4 w-4 text-primary" />
            Work From Home Request
          </SheetTitle>
          <SheetDescription className="text-xs">
            Your request will be reviewed by HR or leadership.
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="flex-1 min-h-0">
          <Form {...form}>
            <form
              id="wfh-form"
              onSubmit={form.handleSubmit(onSubmit)}
              className="px-4 py-3 space-y-3"
            >
              <FormField
                control={form.control}
                name="startDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date</FormLabel>
                    <FormControl>
                      <DatePicker
                        value={field.value}
                        onChange={(val) => {
                          field.onChange(val);
                          form.setValue("endDate", val, { shouldValidate: true });
                        }}
                        className="w-full"
                        fromDate={minDate}
                      />
                    </FormControl>
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
                        placeholder="e.g., Internet maintenance at home..."
                        className="resize-none w-full"
                        rows={3}
                        value={field.value === "Other" ? "" : field.value}
                        onChange={(e) => field.onChange(e.target.value.trim() || "Other")}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </form>
          </Form>
        </ScrollArea>

        <SheetFooter className="px-4 pb-4 pt-3 gap-2 shrink-0 border-t flex-row">
          <Button type="button" variant="outline" className="flex-1" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            type="submit"
            form="wfh-form"
            className="flex-1"
            disabled={createWfhRequest.isPending}
          >
            {createWfhRequest.isPending && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            Submit Request
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
