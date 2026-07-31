"use client";

import { memo, useCallback } from "react";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { UseFormReturn } from "react-hook-form";
import type { ProjectListItem, Ticket } from "@/types/projects";
import type { z } from "zod";
import type { addTimeEntryInputSchema } from "@/lib/validations/project";

type FormValues = z.infer<typeof addTimeEntryInputSchema>;

interface ProjectSelectItemProps {
  project: ProjectListItem;
}

const ProjectSelectItem = memo(function ProjectSelectItem({
  project,
}: ProjectSelectItemProps) {
  return (
    <SelectItem
      key={project.id}
      value={project.id.toString()}
      className="truncate capitalize"
    >
      {project.name} ({project.key})
    </SelectItem>
  );
});

interface TicketSelectItemProps {
  ticket: Ticket;
}

const TicketSelectItem = memo(function TicketSelectItem({
  ticket,
}: TicketSelectItemProps) {
  return (
    <SelectItem
      key={ticket.id}
      value={ticket.id.toString()}
      className="truncate capitalize"
    >
      {`Ticket #${ticket.id}`}: {ticket.title || "Untitled"}
    </SelectItem>
  );
});

interface ProjectTicketSelectsProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  form: UseFormReturn<FormValues, any, any>;
  projects: ProjectListItem[];
  tickets: Ticket[];
  selectedProjectId: number | null;
  isLoadingTickets: boolean;
  onProjectChange: (projectId: number) => void;
}

export const ProjectTicketSelects = memo(function ProjectTicketSelects({
  form,
  projects,
  tickets,
  selectedProjectId,
  isLoadingTickets,
  onProjectChange,
}: ProjectTicketSelectsProps) {
  const handleProjectChange = useCallback(
    (val: string) => {
      onProjectChange(parseInt(val));
      form.setValue("ticketId", undefined as unknown as number);
    },
    [onProjectChange, form],
  );

  const handleTicketChange = useCallback(
    (onChange: (value: number) => void) => (val: string) => {
      onChange(parseInt(val));
    },
    [],
  );

  return (
    <>
      <FormItem>
        <FormLabel>Project</FormLabel>
        <Select
          onValueChange={handleProjectChange}
          value={selectedProjectId ? selectedProjectId.toString() : undefined}
        >
          <SelectTrigger className="w-full capitalize">
            <SelectValue placeholder="Select Project" />
          </SelectTrigger>
          <SelectContent>
            {projects.map((p) => (
              <ProjectSelectItem key={p.id} project={p} />
            ))}
          </SelectContent>
        </Select>
      </FormItem>

      <FormField
        control={form.control}
        name="ticketId"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Ticket</FormLabel>
            <Select
              disabled={!selectedProjectId || isLoadingTickets}
              onValueChange={handleTicketChange(field.onChange)}
              value={field.value?.toString()}
            >
              <FormControl>
                <SelectTrigger className="w-full">
                  <SelectValue
                    placeholder={
                      isLoadingTickets ? "Loading tickets..." : "Select Ticket"
                    }
                    className="truncate"
                  />
                </SelectTrigger>
              </FormControl>
              <SelectContent className="max-w-[500px] w-(--radix-select-trigger-width)">
                {tickets.length > 0 ? (
                  tickets.map((t) => <TicketSelectItem key={t.id} ticket={t} />)
                ) : (
                  <div className="p-2 text-sm text-muted-foreground">
                    {isLoadingTickets ? "Loading..." : "No tickets found"}
                  </div>
                )}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />
    </>
  );
});
