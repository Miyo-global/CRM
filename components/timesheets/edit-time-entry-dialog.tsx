"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
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
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { useUpdateTimeEntry } from "@/lib/api/hooks/projects";

interface EditTimeEntryDialogProps {
  entry: {
    id: number;
    description: string | null;
    hours: string;
    status: string;
  };
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const formSchema = z.object({
  description: z.string().min(1, "Description is required"),
  hours: z.number().min(0, "Hours must be 0 or greater"),
});

export function EditTimeEntryDialog({ entry, open, onOpenChange }: EditTimeEntryDialogProps) {
  const mutation = useUpdateTimeEntry();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      description: entry.description || "",
      hours: parseFloat(entry.hours) || 0,
    },
  });

  useEffect(() => {
    if (open && entry) {
      form.reset({
        description: entry.description || "",
        hours: parseFloat(entry.hours) || 0,
      });
    }
  }, [open, entry, form]);

  function onSubmit(values: z.infer<typeof formSchema>) {
    mutation.mutate(
      {
        entryId: entry.id,
        description: values.description,
        hours: values.hours,
      },
      {
        onSuccess: () => {
          toast.success("Time entry updated successfully");
          onOpenChange(false);
        },
        onError: (err) => {
          toast.error((err as Error).message || "Failed to update time entry");
        },
      }
    );
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent size="sm" className="gap-0 p-0">
        <SheetHeader className="border-b px-6 py-4">
          <SheetTitle>Edit Time Entry</SheetTitle>
          <SheetDescription>
            Update the description or hours for this time entry.
          </SheetDescription>
        </SheetHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex min-h-0 flex-1 flex-col">
            <div className="flex-1 space-y-5 overflow-y-auto px-6 py-5">
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="What did you work on?"
                      className="min-h-24"
                      {...field}
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
                      step="0.25"
                      min="0"
                      placeholder="0"
                      {...field}
                      onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                      value={field.value}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            </div>
            <SheetFooter>
              <Button
                type="button"
                variant="ghost"
                onClick={() => onOpenChange(false)}
                disabled={mutation.isPending}
              >
                Cancel
              </Button>
              <Button type="submit" loading={mutation.isPending}>
                Update
              </Button>
            </SheetFooter>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
