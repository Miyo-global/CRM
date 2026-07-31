"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Layers } from "lucide-react";
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
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCreateTicket } from "@/lib/api/hooks/projects";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";

const createEpicSchema = z.object({
  title: z.string().min(1, "Epic title is required"),
  description: z.string().optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]),
});

type CreateEpicInput = z.infer<typeof createEpicSchema>;

interface CreateEpicDialogProps {
  projectId: number;
  trigger?: React.ReactNode;
}

export function CreateEpicDialog({ projectId, trigger }: CreateEpicDialogProps) {
  const [open, setOpen] = useState(false);

  const form = useForm<CreateEpicInput>({
    resolver: zodResolver(createEpicSchema),
    defaultValues: {
      title: "",
      description: "",
      priority: "MEDIUM",
    },
  });

  const createTicket = useCreateTicket();

  function onSubmit(data: CreateEpicInput) {
    createTicket.mutate(
      {
        projectId,
        title: data.title,
        description: data.description || undefined,
        type: "EPIC",
        priority: data.priority,
      },
      {
        onSuccess: () => {
          toast.success("Epic created successfully");
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
            Create Epic
          </Button>
        )}
      </SheetTrigger>
      <SheetContent className="sm:max-w-[500px] overflow-y-auto p-6">
        <SheetHeader className="mb-6">
          <SheetTitle className="flex items-center gap-2 text-lg">
            <Layers className="h-5 w-5 text-purple-500" />
            Create New Epic
          </SheetTitle>
        </SheetHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Epic Title</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., User Authentication System" {...field} />
                  </FormControl>
                  <FormDescription>
                    A high-level feature or initiative that contains multiple stories
                  </FormDescription>
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
                    <Textarea
                      placeholder="Describe the epic goals and scope..."
                      className="resize-none min-h-[120px]"
                      rows={4}
                      {...field}
                    />
                  </FormControl>
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
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select priority" />
                      </SelectTrigger>
                    </FormControl>
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

            <div className="flex justify-end gap-3 pt-6 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={createTicket.isPending}>
                {createTicket.isPending ? "Creating..." : "Create Epic"}
              </Button>
            </div>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
