"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Pencil, Zap } from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useUpdateTicket } from "@/lib/api/hooks/projects";
import { queryKeys } from "@/lib/query-keys";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import { useQueryClient } from "@tanstack/react-query";

const editEpicSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]),
  status: z.enum(["TODO", "IN_PROGRESS", "IN_REVIEW", "DONE"]),
});

type EditEpicInput = z.infer<typeof editEpicSchema>;

interface EditEpicDialogProps {
  epic: {
    id: number;
    title: string;
    description?: string | null;
    priority?: string | null;
    status: string | null;
  };
  projectId: number;
  trigger?: React.ReactNode;
}

export function EditEpicDialog({ epic, projectId, trigger }: EditEpicDialogProps) {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();

  const form = useForm<EditEpicInput>({
    resolver: zodResolver(editEpicSchema),
    defaultValues: {
      title: epic.title,
      description: epic.description || "",
      priority: (epic.priority as EditEpicInput["priority"]) || "MEDIUM",
      status: (epic.status as EditEpicInput["status"]) || "TODO",
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        title: epic.title,
        description: epic.description || "",
        priority: (epic.priority as EditEpicInput["priority"]) || "MEDIUM",
        status: (epic.status as EditEpicInput["status"]) || "TODO",
      });
    }
  }, [open, epic, form]);

  const updateTicket = useUpdateTicket(projectId, {
    onSuccess: () => {
      toast.success("Epic updated");
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.detail(projectId) });
      setOpen(false);
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });

  function onSubmit(data: EditEpicInput) {
    updateTicket.mutate({
      ticketId: epic.id,
      title: data.title,
      description: data.description,
      priority: data.priority,
      status: data.status,
    });
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        {trigger || (
          <Button variant="ghost" size="sm">
            <Pencil className="h-4 w-4 mr-2" />
            Edit
          </Button>
        )}
      </SheetTrigger>
      <SheetContent className="sm:max-w-[500px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-purple-500" />
            Edit Epic
          </SheetTitle>
        </SheetHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl><Input {...field} /></FormControl>
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
                    <Textarea className="resize-none" rows={3} placeholder="Epic description..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="priority"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Priority</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="LOW">Low</SelectItem>
                        <SelectItem value="MEDIUM">Medium</SelectItem>
                        <SelectItem value="HIGH">High</SelectItem>
                        <SelectItem value="URGENT">Urgent</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="TODO">To Do</SelectItem>
                        <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                        <SelectItem value="DONE">Done</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={updateTicket.isPending}>
                {updateTicket.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
