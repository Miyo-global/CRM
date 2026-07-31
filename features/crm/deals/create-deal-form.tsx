"use client";

import { useState, useCallback } from "react";
import type { Value as PhoneValue } from "react-phone-number-input";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DatePicker } from "@/components/ui/date-picker";
import { Textarea } from "@/components/ui/textarea";
import { PhoneInput } from "@/components/ui/phone-input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useCreateDeal } from "@/lib/api/hooks/crm";
import { DEAL_STAGES } from "@/features/crm/shared/constants";
import type { DealStage } from "@/features/crm/shared/constants";
import { toast } from "sonner";
import {
  createDealFormSchema,
  type CreateDealFormValues,
} from "@/lib/validations/common-forms";

interface CreateDealFormProps {
  employees: Array<{ id: string; name: string | null }>;
  onSuccess: () => void;
}

export function CreateDealForm({ employees, onSuccess }: CreateDealFormProps) {
  const createMutation = useCreateDeal();
  const [expectedCloseDate, setExpectedCloseDate] = useState("");
  const [contactPhone, setContactPhone] = useState<PhoneValue | undefined>();
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof CreateDealFormValues, string>>>({});

  const handleSubmit = useCallback(
    (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      const fd = new FormData(e.currentTarget);
      const parsed = createDealFormSchema.safeParse({
        name: fd.get("name"),
        value: Number(fd.get("value") || 0),
        stage: fd.get("stage") || "LEAD",
        probability: Number(fd.get("probability") || 0),
        contactPerson: fd.get("contactPerson") || "",
        contactEmail: fd.get("contactEmail") || "",
        contactPhone: contactPhone || (fd.get("contactPhone") as string) || "",
        assignedToId: fd.get("assignedToId") || "",
        expectedCloseDate: expectedCloseDate || "",
        notes: fd.get("notes") || "",
      });

      if (!parsed.success) {
        const next: Partial<Record<keyof CreateDealFormValues, string>> = {};
        for (const issue of parsed.error.issues) {
          const key = issue.path[0] as keyof CreateDealFormValues;
          if (key && !next[key]) next[key] = issue.message;
        }
        setFieldErrors(next);
        toast.error(parsed.error.issues[0]?.message ?? "Please fix form errors");
        return;
      }

      setFieldErrors({});
      const data = parsed.data;

      createMutation.mutate(
        {
          name: data.name,
          value: String(data.value),
          stage: data.stage as DealStage,
          probability: data.probability,
          contactPerson: data.contactPerson || undefined,
          contactEmail: data.contactEmail || undefined,
          contactPhone: data.contactPhone || undefined,
          assignedToId: data.assignedToId || undefined,
          expectedCloseDate: data.expectedCloseDate || undefined,
          notes: data.notes || undefined,
        },
        {
          onSuccess: () => {
            toast.success("Deal created");
            onSuccess();
          },
          onError: (err) => toast.error(err.message),
        },
      );
    },
    [createMutation, expectedCloseDate, contactPhone, onSuccess],
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2 space-y-1.5">
          <Label htmlFor="name">Deal Name *</Label>
          <Input id="name" name="name" required placeholder="e.g. Enterprise License" className="capitalize" />
          {fieldErrors.name ? <p className="text-xs text-destructive">{fieldErrors.name}</p> : null}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="value">Value (INR)</Label>
          <Input id="value" name="value" type="number" min="0" placeholder="0" />
          {fieldErrors.value ? <p className="text-xs text-destructive">{fieldErrors.value}</p> : null}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="stage">Stage</Label>
          <Select name="stage" defaultValue="LEAD">
            <SelectTrigger className="w-full h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DEAL_STAGES.map((s) => (
                <SelectItem key={s.key} value={s.key}>
                  <div className="flex items-center gap-2">
                    <div className={cn("w-2 h-2 rounded-full", s.dot)} />
                    {s.label}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="probability">Probability (%)</Label>
          <Input id="probability" name="probability" type="number" min="0" max="100" defaultValue="0" />
          {fieldErrors.probability ? (
            <p className="text-xs text-destructive">{fieldErrors.probability}</p>
          ) : null}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="expectedCloseDate">Expected Close</Label>
          <DatePicker
            id="expectedCloseDate"
            value={expectedCloseDate}
            onChange={setExpectedCloseDate}
            placeholder="Select date"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="contactPerson">Contact Person</Label>
          <Input id="contactPerson" name="contactPerson" placeholder="Name" className="capitalize" />
          {fieldErrors.contactPerson ? (
            <p className="text-xs text-destructive">{fieldErrors.contactPerson}</p>
          ) : null}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="contactEmail">Contact Email</Label>
          <Input id="contactEmail" name="contactEmail" type="email" placeholder="email@example.com" />
          {fieldErrors.contactEmail ? (
            <p className="text-xs text-destructive">{fieldErrors.contactEmail}</p>
          ) : null}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="contactPhone">Contact Phone</Label>
          <PhoneInput value={contactPhone} onChange={setContactPhone} defaultCountry="IN" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="assignedToId">Assigned To</Label>
          <Select name="assignedToId">
            <SelectTrigger className="w-full h-9">
              <SelectValue placeholder="Select assignee" />
            </SelectTrigger>
            <SelectContent>
              {employees.map((e) => (
                <SelectItem key={e.id} value={e.id}>
                  {e.name ?? e.id}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="col-span-2 space-y-1.5">
          <Label htmlFor="notes">Notes</Label>
          <Textarea id="notes" name="notes" placeholder="Additional details..." rows={3} />
        </div>
      </div>
      <Button type="submit" className="w-full" disabled={createMutation.isPending}>
        {createMutation.isPending ? "Creating..." : "Create Deal"}
      </Button>
    </form>
  );
}
