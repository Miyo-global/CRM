"use client";

import { memo, useCallback } from "react";
import { format } from "date-fns";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { DatePicker } from "@/components/ui/date-picker";
import type { UseFormReturn } from "react-hook-form";
import type { z } from "zod";
import type { addTimeEntryInputSchema } from "@/lib/validations/project";
import type { ProjectListItem, Ticket } from "@/types/projects";
import { ProjectTicketSelects } from "./project-ticket-selects";
import { AttachmentUploader } from "./attachment-uploader";

type FormValues = z.infer<typeof addTimeEntryInputSchema>;

function LinkIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </svg>
  );
}

interface LogTimeFormProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  form: UseFormReturn<FormValues, any, any>;
  projects: ProjectListItem[];
  tickets: Ticket[];
  selectedProjectId: number | null;
  isLoadingTickets: boolean;
  attachmentFiles: File[];
  attachmentPreviews: (string | null)[];
  uploading: boolean;
  onProjectChange: (projectId: number) => void;
  onAttachmentsChange: (
    files: File[],
    previews: (string | null)[],
  ) => void;
  onRemoveAttachment: (index: number) => void;
}

export const LogTimeForm = memo(function LogTimeForm({
  form,
  projects,
  tickets,
  selectedProjectId,
  isLoadingTickets,
  attachmentFiles,
  attachmentPreviews,
  uploading,
  onProjectChange,
  onAttachmentsChange,
  onRemoveAttachment,
}: LogTimeFormProps) {
  const handleHoursChange = useCallback(
    (onChange: (value: number) => void) =>
      (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        const parsed = parseFloat(value);
        onChange(value === "" || Number.isNaN(parsed) ? 0 : parsed);
      },
    [],
  );

  const handleDateChange = useCallback(
    (onChange: (value: Date) => void) => (v: string) => {
      onChange(v ? new Date(v) : new Date());
    },
    [],
  );

  return (
    <div className="px-4 py-4 space-y-6">
      <ProjectTicketSelects
        form={form}
        projects={projects}
        tickets={tickets}
        selectedProjectId={selectedProjectId}
        isLoadingTickets={isLoadingTickets}
        onProjectChange={onProjectChange}
      />

      <div className="grid grid-cols-2 gap-4">
        <FormField
          control={form.control}
          name="date"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Date</FormLabel>
              <FormControl>
                <DatePicker
                  value={field.value ? format(field.value, "yyyy-MM-dd") : ""}
                  onChange={handleDateChange(field.onChange)}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="hours"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Hours</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  step="0.5"
                  placeholder="8"
                  value={field.value || ""}
                  onChange={handleHoursChange(field.onChange)}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <FormField
        control={form.control}
        name="description"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Description</FormLabel>
            <FormControl>
              <Textarea
                placeholder="What did you work on?"
                className="min-h-[100px]"
                {...field}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="workLink"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Work Link</FormLabel>
            <FormControl>
              <div className="relative">
                <LinkIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="url"
                  placeholder="https://example.com/work-done"
                  className="pl-9"
                  {...field}
                />
              </div>
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <AttachmentUploader
        form={form}
        fieldName="imageUrl"
        files={attachmentFiles}
        previews={attachmentPreviews}
        uploading={uploading}
        onFilesChange={onAttachmentsChange}
        onRemove={onRemoveAttachment}
      />
    </div>
  );
});
