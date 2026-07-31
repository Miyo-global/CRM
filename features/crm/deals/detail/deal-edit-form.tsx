"use client";

import { useCallback } from "react";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PhoneInput } from "@/components/ui/phone-input";
import { optionalPhoneSchema } from "@/lib/phone";
import { DatePicker } from "@/components/ui/date-picker";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Form, FormField, FormItem, FormLabel, FormControl, FormMessage,
} from "@/components/ui/form";

const EDIT_STAGES = [
  { key: "LEAD" as const, label: "Lead" },
  { key: "CONTACTED" as const, label: "Contacted" },
  { key: "PROPOSAL" as const, label: "Proposal" },
  { key: "NEGOTIATION" as const, label: "Negotiation" },
  { key: "WON" as const, label: "Won" },
  { key: "LOST" as const, label: "Lost" },
];

const editSchema = z.object({
  name: z.string().min(1, "Name is required"),
  value: z.string().optional(),
  stage: z.enum(["LEAD", "CONTACTED", "PROPOSAL", "NEGOTIATION", "WON", "LOST"]),
  probability: z.coerce.number().min(0).max(100),
  contactPerson: z.string().optional(),
  contactEmail: z.string().email().optional().or(z.literal("")),
  contactPhone: optionalPhoneSchema,
  expectedCloseDate: z.string().optional(),
  notes: z.string().optional(),
  lostReason: z.string().optional(),
});

export type EditFormValues = z.infer<typeof editSchema>;

export interface DealForEditForm {
  name: string;
  value?: string | null;
  stage: string;
  probability?: number | null;
  contactPerson?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  expectedCloseDate?: string | null;
  notes?: string | null;
  lostReason?: string | null;
}

interface DealEditFormProps {
  deal: DealForEditForm;
  isPending: boolean;
  onSubmit: (data: EditFormValues) => void;
  onCancel: () => void;
}

export function DealEditForm({ deal, isPending, onSubmit, onCancel }: DealEditFormProps) {
  const form = useForm<EditFormValues>({
    resolver: zodResolver(editSchema) as unknown as Resolver<EditFormValues>,
    values: {
      name: deal.name,
      value: deal.value ?? "0",
      stage: deal.stage as EditFormValues["stage"],
      probability: deal.probability ?? 0,
      contactPerson: deal.contactPerson ?? "",
      contactEmail: deal.contactEmail ?? "",
      contactPhone: deal.contactPhone ?? "",
      expectedCloseDate: deal.expectedCloseDate ?? "",
      notes: deal.notes ?? "",
      lostReason: deal.lostReason ?? "",
    },
  });

  const handleSubmit = useCallback(
    (data: EditFormValues) => onSubmit(data),
    [onSubmit],
  );

  return (
    <Card className="shadow-noir">
      <CardHeader>
        <CardTitle className="text-base">Edit Deal</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <FormField control={form.control} name="name" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Deal Name</FormLabel>
                    <FormControl><Input {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
              <FormField control={form.control} name="value" render={({ field }) => (
                <FormItem>
                  <FormLabel>Value (INR)</FormLabel>
                  <FormControl><Input type="number" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="stage" render={({ field }) => (
                <FormItem>
                  <FormLabel>Stage</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {EDIT_STAGES.map(s => (
                        <SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="probability" render={({ field }) => (
                <FormItem>
                  <FormLabel>Probability (%)</FormLabel>
                  <FormControl><Input type="number" min={0} max={100} {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="expectedCloseDate" render={({ field }) => (
                <FormItem>
                  <FormLabel>Expected Close</FormLabel>
                  <FormControl>
                    <DatePicker value={field.value ?? ""} onChange={field.onChange} placeholder="Expected close date" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="contactPerson" render={({ field }) => (
                <FormItem>
                  <FormLabel>Contact Person</FormLabel>
                  <FormControl><Input {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="contactEmail" render={({ field }) => (
                <FormItem>
                  <FormLabel>Contact Email</FormLabel>
                  <FormControl><Input {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="contactPhone" render={({ field }) => (
                <FormItem>
                  <FormLabel>Contact Phone</FormLabel>
                  <FormControl>
                    <PhoneInput
                      value={field.value}
                      onChange={(v) => field.onChange(v ?? "")}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              {deal.stage === "LOST" && (
                <FormField control={form.control} name="lostReason" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Lost Reason</FormLabel>
                    <FormControl><Input {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              )}
              <div className="col-span-2">
                <FormField control={form.control} name="notes" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes</FormLabel>
                    <FormControl><Textarea {...field} rows={3} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
              <Button type="submit" className="bg-gold hover:bg-gold/90 text-white" disabled={isPending}>
                {isPending ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
