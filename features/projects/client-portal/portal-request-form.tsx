"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { usePortalRequest } from "@/lib/api/hooks/projects/portal";
import { getErrorMessage } from "@/lib/get-error-message";

const schema = z.object({
  title: z.string().trim().min(1, "Give the request a title").max(200),
  description: z.string().max(5000).optional(),
});

export function PortalRequestForm({ projectId }: { projectId: number }) {
  const send = usePortalRequest(projectId);
  const form = useForm<z.infer<typeof schema>>({ resolver: zodResolver(schema), defaultValues: { title: "", description: "" } });

  return (
    <Form {...form}>
      <form
        className="space-y-3"
        onSubmit={form.handleSubmit((v) =>
          send.mutate(v, {
            onSuccess: () => {
              toast.success("Sent your request to the team");
              form.reset();
            },
            onError: (e) => form.setError("title", { message: getErrorMessage(e) }),
          }),
        )}
      >
        <FormField control={form.control} name="title" render={({ field }) => (
          <FormItem>
            <FormLabel>Title</FormLabel>
            <FormControl><Input {...field} /></FormControl>
            <FormMessage />
          </FormItem>
        )} />
        <FormField control={form.control} name="description" render={({ field }) => (
          <FormItem>
            <FormLabel>Details</FormLabel>
            <FormControl><Textarea className="min-h-24" {...field} /></FormControl>
          </FormItem>
        )} />
        <Button type="submit" loading={send.isPending}>Send request</Button>
      </form>
    </Form>
  );
}
