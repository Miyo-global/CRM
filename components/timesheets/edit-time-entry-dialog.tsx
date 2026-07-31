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
import { Loader2 } from "lucide-react";

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
      <SheetContent className="overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Edit Time Entry</SheetTitle>
          <SheetDescription>
            Update the description or hours for this time entry.
          </SheetDescription>
        </SheetHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
            <SheetFooter>
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => onOpenChange(false)}
                disabled={mutation.isPending}
              >
                Cancel
              </Button>
              <Button type="submit" className="flex-1" disabled={mutation.isPending}>
                {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Update
              </Button>
            </SheetFooter>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
