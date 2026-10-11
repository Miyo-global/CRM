"use client";

import { useCallback } from "react";
import { type UseFormReturn } from "react-hook-form";
import {
  Mail,
  Phone,
  MessageSquare,
  Building2,
  Target,
  User,
  Copy,
  CheckCheck,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { PhoneInput } from "@/components/ui/phone-input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import { cn } from "@/lib/utils";
import { type EditForm } from "./lead-types";
import { useState } from "react";
import { toast } from "sonner";
import { DEFAULT_LOCALE } from "@/lib/constants/locale";

interface LeadInfoCardProps {
  lead: {
    name: string;
    email?: string | null;
    phone?: string | null;
    whatsappNumber?: string | null;
    company?: string | null;
    source?: string | null;
    city?: string | null;
    potentialValue?: string | null;
    investmentInterest?: string | null;
    notes?: string | null;
    tags?: unknown;
    [key: string]: unknown;
  };
  isEditing: boolean;
  editForm: UseFormReturn<EditForm>;
  isUpdatePending: boolean;
  onEditSubmit: (data: EditForm) => void;
  onCancelEdit: () => void;
}

function CopyChip({
  icon: Icon,
  label,
  value,
  href,
}: {
  icon: React.ElementType;
  label: string;
  value: string | null | undefined;
  href?: string;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(
    async (e: React.MouseEvent) => {
      e.preventDefault();
      if (!value) return;
      try {
        await navigator.clipboard.writeText(value);
        setCopied(true);
        toast.success(`${label} copied`);
        setTimeout(() => setCopied(false), 2000);
      } catch {
        toast.error("Failed to copy");
      }
    },
    [value, label]
  );

  if (!value) {
    return (
      <div className="flex select-none items-center gap-2 rounded-md border border-dashed border-border px-3 py-2 text-subtle-foreground">
        <Icon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        <div className="min-w-0">
          <p className="text-2xs text-muted-foreground leading-none mb-0.5">
            {label}
          </p>
        </div>
      </div>
    );
  }

  const content = (
    <>
      <Icon className="h-3.5 w-3.5 text-brand-text shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="text-2xs text-muted-foreground leading-none mb-0.5">
          {label}
        </p>
        <p className="text-xs font-medium truncate">{value}</p>
      </div>
      <button
        onClick={handleCopy}
        className="shrink-0 rounded-sm p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:focus-ring"
        title={`Copy ${label}`}
      >
        {copied ? (
          <CheckCheck className="h-3 w-3 text-success-strong" />
        ) : (
          <Copy className="h-3 w-3" />
        )}
      </button>
    </>
  );

  return href ? (
    <a
      href={href}
      className="group flex items-center gap-2 rounded-md border border-border bg-card px-3 py-2 transition-colors hover:border-border-strong hover:bg-accent"
    >
      {content}
    </a>
  ) : (
    <div className="flex items-center gap-2 rounded-md border border-border bg-card px-3 py-2 transition-colors hover:border-border-strong">
      {content}
    </div>
  );
}

export function LeadInfoCard({
  lead,
  isEditing,
  editForm,
  isUpdatePending,
  onEditSubmit,
  onCancelEdit,
}: LeadInfoCardProps) {
  if (isEditing) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="font-sans text-base font-semibold">Edit Lead</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...editForm}>
            <form
              onSubmit={editForm.handleSubmit(onEditSubmit)}
              className="space-y-4"
            >
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <FormField
                  control={editForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone</FormLabel>
                      <FormControl>
                        <PhoneInput
                          defaultCountry="IN"
                          placeholder="Enter phone number"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
                  name="company"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Company</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
                  name="city"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>City</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
                  name="priority"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Priority</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="HOT">Hot</SelectItem>
                          <SelectItem value="WARM">Warm</SelectItem>
                          <SelectItem value="COLD">Cold</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
                  name="potentialValue"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Potential Value</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
                  name="investmentInterest"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Investment Interest</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="sm:col-span-2">
                  <FormField
                    control={editForm.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Notes</FormLabel>
                        <FormControl>
                          <Textarea {...field} rows={3} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 border-t border-border pt-4">
                <Button type="button" variant="ghost" onClick={onCancelEdit}>
                  Cancel
                </Button>
                <Button type="submit" loading={isUpdatePending}>
                  {isUpdatePending ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    );
  }

  const contactChips = [
    {
      icon: Mail,
      label: "Email",
      value: lead.email,
      href: lead.email ? `mailto:${lead.email}` : undefined,
    },
    {
      icon: Phone,
      label: "Phone",
      value: lead.phone,
      href: lead.phone ? `tel:${lead.phone}` : undefined,
    },
    {
      icon: MessageSquare,
      label: "WhatsApp",
      value: lead.whatsappNumber,
      href: lead.whatsappNumber
        ? `https://wa.me/${lead.whatsappNumber.replace(/\D/g, "")}`
        : undefined,
    },
    { icon: Building2, label: "Company", value: lead.company },
    {
      icon: Target,
      label: "Source",
      value: lead.source?.replace(/_/g, " "),
    },
    { icon: User, label: "City", value: lead.city },
  ];

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="font-sans text-base font-semibold">Lead Information</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {contactChips.map((chip) => (
            <CopyChip
              key={chip.label}
              icon={chip.icon}
              label={chip.label}
              value={chip.value as string | null | undefined}
              href={chip.href}
            />
          ))}
        </div>

        {(lead.potentialValue || lead.investmentInterest) && (
          <div
            className={cn(
              "grid gap-4 rounded-lg border border-border bg-surface-sunken p-4",
              lead.potentialValue && lead.investmentInterest
                ? "grid-cols-2"
                : "grid-cols-1"
            )}
          >
            {lead.potentialValue && (
              <div className="space-y-0.5">
                <p className="text-2xs uppercase tracking-wide text-muted-foreground font-medium">
                  Potential Value
                </p>
                <p className="font-display text-2xl font-bold tabular-nums text-success-strong">
                  ₹
                  {Number.isFinite(Number(lead.potentialValue))
                    ? Number(lead.potentialValue).toLocaleString(DEFAULT_LOCALE)
                    : "0"}
                </p>
              </div>
            )}
            {lead.investmentInterest && (
              <div className="space-y-0.5">
                <p className="text-2xs uppercase tracking-wide text-muted-foreground font-medium">
                  Investment Interest
                </p>
                <p className="font-display text-2xl font-bold tabular-nums text-foreground">
                  ₹
                  {Number.isFinite(Number(lead.investmentInterest))
                    ? Number(lead.investmentInterest).toLocaleString(DEFAULT_LOCALE)
                    : "0"}
                </p>
              </div>
            )}
          </div>
        )}

        {lead.notes && (
          <div className="overflow-hidden rounded-lg border border-border">
            <div className="border-b border-border bg-surface-sunken px-3 py-1.5">
              <p className="text-2xs uppercase tracking-wide text-muted-foreground font-semibold">
                Notes
              </p>
            </div>
            <p className="whitespace-pre-wrap px-3 py-2.5 text-sm leading-relaxed text-foreground">
              {lead.notes}
            </p>
          </div>
        )}

        {Array.isArray(lead.tags) && (lead.tags as string[]).length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {(lead.tags as string[]).map((tag) => (
              <Badge key={tag} variant="secondary" className="text-xs">
                {tag}
              </Badge>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
