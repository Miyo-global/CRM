"use client";

import { useEffect, useRef } from "react";
import type { UseFormReturn } from "react-hook-form";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import { FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PROJECT_PRIORITY_OPTIONS } from "@/features/projects/project-list/project-options";
import type { ProjectCreateValues } from "./project-create-schema";
import { suggestKey, useKeyAvailability } from "./use-key-availability";

function KeyStatus({ keyValue }: { keyValue: string }) {
  const check = useKeyAvailability(keyValue);
  if (!keyValue) return null;
  if (check.isFetching) {
    return (
      <span className="flex items-center gap-1 text-xs text-muted-foreground" role="status">
        <Loader2 className="size-3 animate-spin" aria-hidden="true" /> Checking
      </span>
    );
  }
  if (!check.data) return null;
  return check.data.available ? (
    <span className="flex items-center gap-1 text-xs text-success-strong" role="status">
      <CheckCircle2 className="size-3" aria-hidden="true" /> Available
    </span>
  ) : (
    <span className="flex items-center gap-1 text-xs text-danger-strong" role="status">
      <XCircle className="size-3" aria-hidden="true" /> {check.data.valid ? "Already in use" : check.data.message}
    </span>
  );
}

export function BasicsStep({ form }: { form: UseFormReturn<ProjectCreateValues> }) {
  const keyTouched = useRef(false);
  const name = form.watch("name");
  const keyValue = form.watch("key");

  useEffect(() => {
    if (keyTouched.current || name.trim().length < 2) return;
    const timer = setTimeout(async () => {
      const suggestion = await suggestKey(name.trim()).catch(() => null);
      if (suggestion && !keyTouched.current) form.setValue("key", suggestion, { shouldValidate: true });
    }, 400);
    return () => clearTimeout(timer);
  }, [name, form]);

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <FormField
        control={form.control}
        name="name"
        render={({ field }) => (
          <FormItem className="sm:col-span-2">
            <FormLabel>Project name</FormLabel>
            <FormControl>
              <Input placeholder="Website redesign" autoFocus {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="key"
        render={({ field }) => (
          <FormItem>
            <div className="flex items-center justify-between gap-2">
              <FormLabel>Key</FormLabel>
              <KeyStatus keyValue={keyValue} />
            </div>
            <FormControl>
              <Input
                {...field}
                className="font-mono uppercase"
                maxLength={10}
                onChange={(e) => {
                  keyTouched.current = true;
                  field.onChange(e.target.value.toUpperCase());
                }}
              />
            </FormControl>
            <FormDescription>Ticket ids start with this, like {keyValue || "WEB"}-12.</FormDescription>
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
                <SelectItem value="NONE">No priority</SelectItem>
                {PROJECT_PRIORITY_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="startDate"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Start date</FormLabel>
            <FormControl>
              <Input type="date" {...field} value={field.value ?? ""} />
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
            <FormLabel>Due date</FormLabel>
            <FormControl>
              <Input type="date" {...field} value={field.value ?? ""} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="description"
        render={({ field }) => (
          <FormItem className="sm:col-span-2">
            <FormLabel>Description</FormLabel>
            <FormControl>
              <Textarea placeholder="What is this project for?" className="min-h-24 resize-none" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
}
