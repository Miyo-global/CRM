"use client";

import { useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { isValidPhoneNumber } from "react-phone-number-input";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PhoneInput } from "@/components/ui/phone-input";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger,
} from "@/components/ui/sheet";
import {
  Form, FormField, FormItem, FormLabel, FormControl, FormMessage,
} from "@/components/ui/form";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useCreateContact } from "@/lib/api/hooks/crm";
import { toast } from "sonner";

const createContactSchema = z.object({
  name: z.string().min(1, "Name is required").max(200),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  phone: z.string().optional().or(z.literal("")).refine((val) => !val || isValidPhoneNumber(val), { message: "Invalid phone number" }),
  title: z.string().optional(),
  department: z.string().optional(),
  company: z.string().optional(),
  linkedinUrl: z.string().url("Invalid URL").optional().or(z.literal("")),
  twitterUrl: z.string().url("Invalid URL").optional().or(z.literal("")),
  leadId: z.string().optional(),
  dealId: z.string().optional(),
});
type CreateContactForm = z.infer<typeof createContactSchema>;

function capitalize(s: string) {
  return s.replace(/\b\w/g, (c) => c.toUpperCase());
}

interface CreateContactDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateContactDialog({ open, onOpenChange }: CreateContactDialogProps) {
  const createContactMutation = useCreateContact();

  const form = useForm<CreateContactForm>({
    resolver: zodResolver(createContactSchema),
    defaultValues: { name: "", email: "", phone: "", title: "", department: "", company: "", linkedinUrl: "", twitterUrl: "", leadId: undefined, dealId: undefined },
  });

  const onSubmit = useCallback((data: CreateContactForm) => {
    createContactMutation.mutate(
      {
        name: capitalize(data.name.trim()),
        email: data.email || undefined,
        phone: data.phone || undefined,
        title: data.title || undefined,
        department: data.department || undefined,
        company: data.company || undefined,
        linkedinUrl: data.linkedinUrl || undefined,
        twitterUrl: data.twitterUrl || undefined,
        leadId: data.leadId ? Number(data.leadId) : undefined,
        dealId: data.dealId ? Number(data.dealId) : undefined,
      },
      {
        onSuccess: () => { toast.success("Contact created"); onOpenChange(false); form.reset(); },
        onError: (err) => toast.error(err.message),
      },
    );
  }, [createContactMutation, form, onOpenChange]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetTrigger asChild>
        <Button className="bg-gold hover:bg-gold/90 text-white">
          <Plus className="h-4 w-4 mr-2" />New Contact
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="sm:max-w-md flex flex-col p-0 gap-0">
        <SheetHeader className="shrink-0 px-4 pt-4 pb-3 border-b">
          <SheetTitle className="text-base">Create Contact</SheetTitle>
        </SheetHeader>
        <ScrollArea className="flex-1 min-h-0">
          <div className="px-4 py-4">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <FormField control={form.control} name="name" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Name *</FormLabel>
                        <FormControl><Input {...field} placeholder="Full name" className="capitalize" /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>
                  <FormField control={form.control} name="email" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl><Input {...field} type="email" placeholder="email@example.com" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="phone" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone</FormLabel>
                      <FormControl>
                        <PhoneInput defaultCountry="IN" placeholder="Enter phone number" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="company" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Company</FormLabel>
                      <FormControl><Input {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="title" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Title</FormLabel>
                      <FormControl><Input {...field} placeholder="e.g. VP of Sales" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="department" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Department</FormLabel>
                      <FormControl><Input {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="linkedinUrl" render={({ field }) => (
                    <FormItem>
                      <FormLabel>LinkedIn</FormLabel>
                      <FormControl><Input {...field} placeholder="https://linkedin.com/in/..." /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="twitterUrl" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Twitter</FormLabel>
                      <FormControl><Input {...field} placeholder="https://twitter.com/..." /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="leadId" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Linked Lead ID (optional)</FormLabel>
                      <FormControl><Input {...field} type="number" min={1} placeholder="e.g. 42" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="dealId" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Linked Deal ID (optional)</FormLabel>
                      <FormControl><Input {...field} type="number" min={1} placeholder="e.g. 7" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
                <Button type="submit" className="w-full bg-gold hover:bg-gold/90 text-white" disabled={createContactMutation.isPending}>
                  {createContactMutation.isPending ? "Creating..." : "Create Contact"}
                </Button>
              </form>
            </Form>
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
