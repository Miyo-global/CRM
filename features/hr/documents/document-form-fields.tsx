"use client";

import { useFormContext } from "react-hook-form";
import * as z from "zod";
import {
  DOCUMENT_DESCRIPTION_MAX,
  documentNameSchema,
} from "@/lib/validations/hr-documents";
import { SearchableCombobox } from "@/components/ui/searchable-combobox";
import { format } from "date-fns";
import { CalendarIcon, X, Tags, Shield, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export const formSchema = z.object({
  name: documentNameSchema,
  description: z
    .string()
    .max(DOCUMENT_DESCRIPTION_MAX, `Description must be at most ${DOCUMENT_DESCRIPTION_MAX} characters`)
    .optional(),
  type: z.enum(["CONTRACT", "CERTIFICATE", "ID_PROOF", "PAYSLIP", "POLICY", "OFFER_LETTER", "RESUME", "OTHER"]).or(z.literal("")).refine((v) => v !== "", { message: "Document type is required" }),
  category: z.string().trim().min(1, "Folder is required — choose where this document is stored"),
  userId: z.string().optional(),
  isPublic: z.boolean(),
  expiryDate: z.date().optional(),
  tags: z.array(z.string()),
});

export type DocumentFormData = z.infer<typeof formSchema>;

interface DocumentFormFieldsProps {
  filteredDocumentTypes: { value: string; label: string }[];
  filteredCategories: string[];
  filteredEmployees: { id: string; firstName: string | null; lastName: string | null }[];
  isAdmin: boolean;
  filesCount: number;
  tags: string[];
  tagInput: string;
  onTagInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onAddTag: () => void;
  onRemoveTag: (e: React.MouseEvent<HTMLButtonElement>) => void;
  onTagKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  onTitleManualEdit?: () => void;
}

export function DocumentFormFields({
  filteredDocumentTypes,
  filteredCategories,
  filteredEmployees,
  isAdmin,
  filesCount,
  tags,
  tagInput,
  onTagInputChange,
  onAddTag,
  onRemoveTag,
  onTagKeyDown,
  onTitleManualEdit,
}: DocumentFormFieldsProps) {
  const form = useFormContext<DocumentFormData>();

  return (
    <div className="grid grid-cols-2 gap-5">
      {filesCount <= 1 && (
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem className="col-span-2">
              <FormLabel>Document Name *</FormLabel>
              <FormControl>
                <Input
                  placeholder="e.g., Employment Contract 2024"
                  {...field}
                  onChange={(e) => {
                    onTitleManualEdit?.();
                    field.onChange(e);
                  }}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      )}

      <FormField
        control={form.control}
        name="type"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Document Type *</FormLabel>
            <SearchableCombobox
              options={filteredDocumentTypes.map((t) => t.label)}
              value={
                field.value
                  ? filteredDocumentTypes.find((t) => t.value === field.value)?.label ?? ""
                  : ""
              }
              onValueChange={(label) => {
                const match = filteredDocumentTypes.find((t) => t.label === label);
                field.onChange(match?.value ?? "");
              }}
              placeholder="Select Document Type"
              searchPlaceholder="Search document types…"
              emptyMessage="No document types found."
              aria-label="Document type"
              aria-invalid={!!form.formState.errors.type}
            />
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="category"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Folder / category *</FormLabel>
            <SearchableCombobox
              options={filteredCategories}
              value={field.value ?? ""}
              onValueChange={field.onChange}
              placeholder="Select folder"
              searchPlaceholder="Search folders…"
              emptyMessage="No folders found."
              aria-label="Folder or category"
              aria-invalid={!!form.formState.errors.category}
            />
            <FormDescription>Choose the folder where this document will be stored.</FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />

      {isAdmin && filteredEmployees.length > 0 && (
        <FormField
          control={form.control}
          name="userId"
          render={({ field }) => (
            <FormItem className="col-span-2">
              <FormLabel>Associate with Employee</FormLabel>
              <SearchableCombobox
                options={["No specific employee", ...filteredEmployees.map((e) => `${e.firstName ?? ""} ${e.lastName ?? ""}`.trim())]}
                value={
                  field.value
                    ? filteredEmployees.find((e) => e.id === field.value)
                      ? `${filteredEmployees.find((e) => e.id === field.value)!.firstName ?? ""} ${filteredEmployees.find((e) => e.id === field.value)!.lastName ?? ""}`.trim()
                      : ""
                    : "No specific employee"
                }
                onValueChange={(label) => {
                  if (label === "No specific employee") {
                    field.onChange("");
                    return;
                  }
                  const match = filteredEmployees.find(
                    (e) => `${e.firstName ?? ""} ${e.lastName ?? ""}`.trim() === label,
                  );
                  field.onChange(match?.id ?? "");
                }}
                placeholder="Select employee (optional)"
                searchPlaceholder="Search employees…"
                emptyMessage="No employees found."
                aria-label="Associate with employee"
              />
              <FormDescription>
                Optional at upload — you can assign or share with employees later from the document menu.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
      )}

      <FormField
        control={form.control}
        name="description"
        render={({ field }) => (
          <FormItem className="col-span-2">
            <FormLabel>Description</FormLabel>
            <FormControl>
              <Textarea
                placeholder="Brief description of the document..."
                rows={3}
                maxLength={DOCUMENT_DESCRIPTION_MAX}
                {...field}
              />
            </FormControl>
            <p className="text-[10px] text-muted-foreground text-right">
              {(field.value?.length ?? 0)}/{DOCUMENT_DESCRIPTION_MAX}
            </p>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="expiryDate"
        render={({ field }) => (
          <FormItem className="flex flex-col col-span-2">
            <FormLabel>Expiry Date</FormLabel>
            <Popover>
              <PopoverTrigger asChild>
                <FormControl>
                  <Button
                    variant="outline"
                    className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")}
                  >
                    {field.value ? format(field.value, "PPP") : <span>No expiry date</span>}
                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                  </Button>
                </FormControl>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={field.value}
                  onSelect={field.onChange}
                  disabled={(date) => date < new Date()}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
            <FormDescription>Set an expiry date for documents like contracts or certificates</FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />

      <div className="col-span-2 space-y-2">
        <label className="text-sm font-medium">Tags</label>
        <div className="flex gap-3">
          <Input
            placeholder="Add tag..."
            value={tagInput}
            onChange={onTagInputChange}
            onKeyDown={onTagKeyDown}
            className="flex-1"
          />
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={onAddTag}
            disabled={!tagInput.trim()}
            aria-label="Add tag"
          >
            <Tags className="h-4 w-4" />
          </Button>
        </div>
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {tags.map((tag) => (
              <Badge key={tag} variant="secondary" className="pl-2.5 pr-1.5 py-1 flex items-center gap-1">
                {tag}
                <button
                  type="button"
                  data-tag={tag}
                  onClick={onRemoveTag}
                  aria-label={`Remove tag ${tag}`}
                  className="hover:text-foreground"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
        )}
      </div>

      <FormField
        control={form.control}
        name="isPublic"
        render={({ field }) => (
          <FormItem className="col-span-2 flex items-center justify-between rounded-lg border p-4 bg-muted/30">
            <div className="space-y-0.5">
              <FormLabel className="flex items-center gap-2 text-sm font-medium">
                {field.value ? (
                  <Globe className="h-4 w-4 text-emerald-600" />
                ) : (
                  <Shield className="h-4 w-4 text-amber-600" />
                )}
                {field.value ? "Public Document" : "Private Document"}
              </FormLabel>
              <FormDescription className="text-xs">
                {field.value
                  ? "All employees can view this document"
                  : "Only admins and the owner can view this"}
              </FormDescription>
            </div>
            <FormControl>
              <Switch checked={field.value} onCheckedChange={field.onChange} />
            </FormControl>
          </FormItem>
        )}
      />
    </div>
  );
}
