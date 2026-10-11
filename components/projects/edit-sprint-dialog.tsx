"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Pencil, Calendar, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { IconChip } from "@/components/ui/icon-chip";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { DatePicker } from "@/components/ui/date-picker";
import { useUpdateSprint } from "@/lib/api/hooks/projects";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import { format } from "date-fns";

const editSprintSchema = z.object({
  name: z.string().min(1, "Sprint name is required"),
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().min(1, "End date is required"),
  goal: z.string().optional(),
});

type EditSprintInput = z.infer<typeof editSprintSchema>;

interface EditSprintDialogProps {
  sprint: {
    id: number;
    name: string;
    startDate: Date | string;
    endDate: Date | string;
    goal?: string | null;
  };
  projectId: number;
  trigger?: React.ReactNode;
}

export function EditSprintDialog({ sprint, projectId, trigger }: EditSprintDialogProps) {
  const [open, setOpen] = useState(false);

  const form = useForm<EditSprintInput>({
    resolver: zodResolver(editSprintSchema),
    defaultValues: {
      name: sprint.name,
      startDate: format(new Date(sprint.startDate), "yyyy-MM-dd"),
      endDate: format(new Date(sprint.endDate), "yyyy-MM-dd"),
      goal: sprint.goal || "",
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        name: sprint.name,
        startDate: format(new Date(sprint.startDate), "yyyy-MM-dd"),
        endDate: format(new Date(sprint.endDate), "yyyy-MM-dd"),
        goal: sprint.goal || "",
      });
    }
  }, [open, sprint, form]);

  const updateSprint = useUpdateSprint(projectId);

  function onSubmit(data: EditSprintInput) {
    updateSprint.mutate(
      {
        sprintId: sprint.id,
        name: data.name,
        startDate: data.startDate,
        endDate: data.endDate,
        goal: data.goal || undefined,
      },
      {
        onSuccess: () => {
          toast.success("Sprint updated");
          setOpen(false);
        },
        onError: (error) => {
          toast.error(getErrorMessage(error));
        },
      }
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="ghost" size="sm">
            <Pencil className="size-4" />
            Edit
          </Button>
        )}
      </DialogTrigger>
      <DialogContent size="md" className="max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2.5 text-lg">
            <IconChip icon={Calendar} tone="brand" size="sm" />
            Edit Sprint
          </DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Sprint Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Sprint 1" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="startDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Start Date</FormLabel>
                    <FormControl>
                      <DatePicker value={field.value} onChange={field.onChange} />
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
                    <FormLabel>End Date</FormLabel>
                    <FormControl>
                      <DatePicker value={field.value} onChange={field.onChange} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="goal"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    <div className="flex items-center gap-2">
                      <Target className="size-4" aria-hidden="true" />
                      Sprint Goal (Optional)
                    </div>
                  </FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="What do you want to achieve?"
                      className="resize-none"
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={updateSprint.isPending} loading={updateSprint.isPending}>
                {updateSprint.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
