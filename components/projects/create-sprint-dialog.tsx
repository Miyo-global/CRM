"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Calendar, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { DatePicker } from "@/components/ui/date-picker";
import { useCreateSprint } from "@/lib/api/hooks/projects";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import { addDays, format } from "date-fns";

const createSprintSchema = z.object({
  name: z.string().min(1, "Sprint name is required"),
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().min(1, "End date is required"),
  goal: z.string().optional(),
});

type CreateSprintInput = z.infer<typeof createSprintSchema>;

interface CreateSprintDialogProps {
  projectId: number;
  trigger?: React.ReactNode;
}

export function CreateSprintDialog({ projectId, trigger }: CreateSprintDialogProps) {
  const [open, setOpen] = useState(false);

  const form = useForm<CreateSprintInput>({
    resolver: zodResolver(createSprintSchema),
    defaultValues: {
      name: "",
      startDate: format(new Date(), "yyyy-MM-dd"),
      endDate: format(addDays(new Date(), 14), "yyyy-MM-dd"),
      goal: "",
    },
  });

  const createSprint = useCreateSprint();

  function onSubmit(data: CreateSprintInput) {
    createSprint.mutate(
      {
        projectId,
        name: data.name,
        startDate: data.startDate,
        endDate: data.endDate,
        goal: data.goal || undefined,
      },
      {
        onSuccess: () => {
          toast.success("Sprint created successfully");
          setOpen(false);
          form.reset();
        },
        onError: (error) => {
          toast.error(getErrorMessage(error));
        },
      }
    );
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        {trigger || (
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Create Sprint
          </Button>
        )}
      </SheetTrigger>
      <SheetContent className="sm:max-w-[500px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            Create New Sprint
          </SheetTitle>
        </SheetHeader>
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

            <div className="grid grid-cols-2 gap-4">
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
                      <Target className="h-4 w-4" />
                      Sprint Goal (Optional)
                    </div>
                  </FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="What do you want to achieve in this sprint?"
                      className="resize-none"
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={createSprint.isPending}>
                {createSprint.isPending ? "Creating..." : "Create Sprint"}
              </Button>
            </div>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
