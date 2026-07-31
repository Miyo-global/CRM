"use client";

import { useCallback, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form";
import { FileUpload } from "@/components/storage/file-upload";
import {
  helpdeskTicketSchema,
  type HelpdeskTicketFormValues,
} from "@/lib/validations/common-forms";
import { sanitizeName } from "@/lib/validations/text-rules";
import type { TicketPriority } from "@/types/hr";
import { useSession } from "next-auth/react";
import { isAdminOrOwner } from "@/lib/constants/roles";

const CATEGORY_OPTIONS = [
  "IT Support",
  "HR Query",
  "Facilities",
  "Finance",
  "Access Request",
  "Equipment",
  "Other",
];

const CATEGORY_ROUTING: Record<string, string> = {
  "IT Support": "IT & Operations team",
  "HR Query": "HR team",
  Facilities: "Facilities / Admin team",
  Finance: "Finance team",
  "Access Request": "IT & HR (access provisioning)",
  Equipment: "IT & Facilities team",
  Other: "HR triage queue",
};

const PRIORITY_OPTIONS: { value: TicketPriority; label: string }[] = [
  { value: "LOW", label: "Low" },
  { value: "MEDIUM", label: "Medium" },
  { value: "HIGH", label: "High" },
  { value: "URGENT", label: "Urgent" },
];

interface HelpdeskCreateTicketFormProps {
  onSubmit: (values: HelpdeskTicketFormValues) => void;
  formId?: string;
  onValidityChange?: (valid: boolean) => void;
}

export function HelpdeskCreateTicketForm({
  onSubmit,
  formId = "helpdesk-create-ticket",
  onValidityChange,
}: HelpdeskCreateTicketFormProps) {
  const { data: session } = useSession();
  const isLeadership = isAdminOrOwner(session?.user?.role);

  const form = useForm<HelpdeskTicketFormValues>({
    resolver: zodResolver(helpdeskTicketSchema),
    mode: "onChange",
    defaultValues: {
      title: "",
      description: "",
      category: "",
      priority: "MEDIUM",
      attachmentUrl: "",
    },
  });

  const category = form.watch("category");
  const routingTarget = category ? CATEGORY_ROUTING[category] ?? "HR team" : null;

  useEffect(() => {
    onValidityChange?.(form.formState.isValid);
  }, [form.formState.isValid, onValidityChange]);

  const handleAttachment = useCallback(
    (url: string) => {
      form.setValue("attachmentUrl", url, { shouldValidate: true });
    },
    [form],
  );

  return (
    <Form {...form}>
      <form
        id={formId}
        onSubmit={form.handleSubmit(onSubmit)}
        className="px-4 py-4 space-y-4"
      >
        <p className="text-xs text-muted-foreground rounded-md bg-muted/50 px-3 py-2">
          {isLeadership
            ? "Tickets appear in the HR Helpdesk queue for triage. HR is notified by email; assign an owner from the ticket detail view."
            : "Your ticket is sent to the HR Helpdesk queue. HR and leadership are notified by email for review and assignment."}
          {routingTarget && category && (
            <span className="block mt-1.5 text-foreground/80">
              <strong>{category}</strong> tickets are routed to: {routingTarget}.
            </span>
          )}
        </p>
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Title</FormLabel>
              <FormControl>
                <Input
                  placeholder="Brief description of the issue"
                  maxLength={200}
                  value={field.value}
                  onChange={(e) => field.onChange(sanitizeName(e.target.value))}
                  onBlur={field.onBlur}
                />
              </FormControl>
              <p className="text-[10px] text-muted-foreground">
                Letters, numbers, spaces, and basic punctuation only
              </p>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea placeholder="Provide more details..." rows={4} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="grid grid-cols-2 gap-3">
          <FormField
            control={form.control}
            name="category"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Category <span className="text-destructive">*</span></FormLabel>
                <Select
                  value={field.value || ""}
                  onValueChange={(v) => {
                    field.onChange(v);
                    void form.trigger("category");
                  }}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {CATEGORY_OPTIONS.map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="priority"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Priority</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {PRIORITY_OPTIONS.map((p) => (
                      <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <FormItem>
          <FormLabel>Attachment (optional)</FormLabel>
          <FileUpload
            folder="helpdesk"
            accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
            onUploadComplete={handleAttachment}
          />
          <FormMessage>{form.formState.errors.attachmentUrl?.message}</FormMessage>
        </FormItem>
      </form>
    </Form>
  );
}
