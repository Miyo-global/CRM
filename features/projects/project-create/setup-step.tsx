"use client";

import type { UseFormReturn } from "react-hook-form";
import { FormControl, FormDescription, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useProjectTemplates } from "@/lib/api/hooks/projects";
import type { ProjectCreateValues } from "./project-create-schema";

const MODULES = [
  { name: "modules.sprints", label: "Sprints", hint: "Plan work in time boxes" },
  { name: "modules.epics", label: "Epics", hint: "Group large pieces of work" },
  { name: "modules.timeTracking", label: "Time tracking", hint: "Log hours on tickets" },
  { name: "modules.wiki", label: "Wiki", hint: "Write project pages" },
] as const;

export function SetupStep({ form }: { form: UseFormReturn<ProjectCreateValues> }) {
  const { data: templates = [] } = useProjectTemplates();

  return (
    <div className="space-y-5">
      <FormField
        control={form.control}
        name="templateId"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Start from a template</FormLabel>
            <Select value={field.value} onValueChange={field.onChange}>
              <FormControl>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                <SelectItem value="none">Blank project</SelectItem>
                {templates.map((t) => (
                  <SelectItem key={t.id} value={String(t.id)}>{t.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormDescription>A template adds its tickets to the new project.</FormDescription>
          </FormItem>
        )}
      />
      <fieldset className="space-y-3">
        <legend className="mb-3 text-sm font-medium text-foreground">Features</legend>
        <div className="grid gap-3 sm:grid-cols-2">
          {MODULES.map((m) => (
            <FormField
              key={m.name}
              control={form.control}
              name={m.name}
              render={({ field }) => (
                <FormItem className="flex min-h-14 flex-row items-center justify-between rounded-md border border-border bg-card p-3">
                  <div className="space-y-0.5">
                    <FormLabel className="cursor-pointer">{m.label}</FormLabel>
                    <p className="text-2xs text-muted-foreground">{m.hint}</p>
                  </div>
                  <FormControl>
                    <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />
          ))}
        </div>
      </fieldset>
    </div>
  );
}
