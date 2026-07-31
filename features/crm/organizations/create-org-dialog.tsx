"use client";

import { useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Form, FormField, FormItem, FormLabel, FormControl, FormMessage,
} from "@/components/ui/form";
import { useCreateCrmOrganization } from "@/lib/api/hooks/crm";
import { toast } from "sonner";

const createOrgSchema = z.object({
  name: z.string().min(1, "Name is required").max(200),
  domain: z.string().regex(/^([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}$/, "Enter a valid domain").optional().or(z.literal("")),
  industry: z.string().optional(),
  size: z.enum(["1-10", "11-50", "51-200", "201-1000", "1000+"]).optional(),
  website: z.string().url("Enter a valid URL").optional().or(z.literal("")),
  linkedinUrl: z.string().url("Enter a valid URL").optional().or(z.literal("")),
  description: z.string().optional(),
});
type CreateOrgForm = z.infer<typeof createOrgSchema>;

interface CreateOrgDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateOrgDialog({ open, onOpenChange }: CreateOrgDialogProps) {
  const createOrgMutation = useCreateCrmOrganization();

  const form = useForm<CreateOrgForm>({
    resolver: zodResolver(createOrgSchema),
    defaultValues: { name: "", domain: "", industry: "", size: undefined, website: "", linkedinUrl: "", description: "" },
  });

  const onSubmit = useCallback((formData: CreateOrgForm) => {
    createOrgMutation.mutate(
      {
        name: formData.name,
        domain: formData.domain || undefined,
        industry: formData.industry || undefined,
        size: formData.size || undefined,
        website: formData.website || undefined,
        linkedinUrl: formData.linkedinUrl || undefined,
        description: formData.description || undefined,
      },
      {
        onSuccess: () => { toast.success("Organization created"); onOpenChange(false); form.reset(); },
        onError: (err) => toast.error(err.message),
      },
    );
  }, [createOrgMutation, form, onOpenChange]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex flex-col p-0 gap-0 w-full sm:max-w-lg">
        <SheetHeader className="shrink-0 px-4 pt-4 pb-3 border-b">
          <SheetTitle className="text-base">Create Organization</SheetTitle>
        </SheetHeader>

        <ScrollArea className="flex-1 min-h-0">
          <Form {...form}>
            <form id="create-org-form" onSubmit={form.handleSubmit(onSubmit)} className="px-4 py-4 space-y-4">
              <FormField control={form.control} name="name" render={({ field }) => (
                <FormItem>
                  <FormLabel>Name *</FormLabel>
                  <FormControl><Input {...field} placeholder="Organization name" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="domain" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Domain</FormLabel>
                    <FormControl><Input {...field} placeholder="example.com" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="industry" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Industry</FormLabel>
                    <FormControl><Input {...field} placeholder="e.g. Real Estate" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="size" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Company Size</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="w-full h-9"><SelectValue placeholder="Select size" /></SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="1-10">1-10</SelectItem>
                        <SelectItem value="11-50">11-50</SelectItem>
                        <SelectItem value="51-200">51-200</SelectItem>
                        <SelectItem value="201-1000">201-1000</SelectItem>
                        <SelectItem value="1000+">1000+</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="website" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Website</FormLabel>
                    <FormControl><Input {...field} placeholder="https://..." /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="linkedinUrl" render={({ field }) => (
                  <FormItem>
                    <FormLabel>LinkedIn URL</FormLabel>
                    <FormControl><Input {...field} placeholder="https://linkedin.com/company/..." /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
              <FormField control={form.control} name="description" render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl><Textarea {...field} rows={3} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </form>
          </Form>
        </ScrollArea>

        <SheetFooter className="shrink-0 px-4 py-3 border-t flex-row gap-2">
          <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)} disabled={createOrgMutation.isPending}>
            Cancel
          </Button>
          <Button type="submit" form="create-org-form" className="flex-1 bg-gold hover:bg-gold/90 text-white" disabled={createOrgMutation.isPending}>
            {createOrgMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Create Organization
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
