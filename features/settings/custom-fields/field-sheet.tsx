"use client";

import { useState, useCallback, memo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  useCreateCustomField,
  useUpdateCustomField,
  type CustomFieldDefinition,
  type CreateCustomFieldInput,
} from "@/lib/api/hooks/crm";
import { toast } from "sonner";
import {
  type EntityType,
  type FieldType,
  type FieldFormState,
  FIELD_TYPE_LABELS,
  autoName,
} from "./types";

function PlusIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M5 12h14" />
      <path d="M12 5v14" />
    </svg>
  );
}

function Trash2Icon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M3 6h18" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <line x1="10" y1="11" x2="10" y2="17" />
      <line x1="14" y1="11" x2="14" y2="17" />
    </svg>
  );
}

interface FieldSheetProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  entityType: EntityType;
  editingField: CustomFieldDefinition | null;
  isCreate: boolean;
}

function getInitialForm(field: CustomFieldDefinition | null): FieldFormState {
  if (!field) {
    return {
      label: "",
      name: "",
      fieldType: "text",
      options: [{ value: "", label: "" }],
      isRequired: false,
      sortOrder: 0,
    };
  }
  return {
    label: field.label,
    name: field.name,
    fieldType: field.fieldType,
    options:
      field.options && field.options.length > 0
        ? field.options
        : [{ value: "", label: "" }],
    isRequired: field.isRequired,
    sortOrder: field.sortOrder,
  };
}

export const FieldSheet = memo(function FieldSheet({
  open,
  onOpenChange,
  entityType,
  editingField,
  isCreate,
}: FieldSheetProps) {
  const createField = useCreateCustomField();
  const updateField = useUpdateCustomField();

  const [form, setForm] = useState<FieldFormState>(() =>
    getInitialForm(editingField)
  );

  const handleOpenChange = useCallback(
    (v: boolean) => {
      if (v) setForm(getInitialForm(editingField));
      onOpenChange(v);
    },
    [editingField, onOpenChange]
  );

  const handleLabelChange = useCallback(
    (val: string) => {
      setForm((prev) => ({
        ...prev,
        label: val,
        name: isCreate ? autoName(val) : prev.name,
      }));
    },
    [isCreate]
  );

  const handleNameChange = useCallback((val: string) => {
    setForm((prev) => ({
      ...prev,
      name: val.toLowerCase().replace(/[^a-z0-9_]/g, ""),
    }));
  }, []);

  const handleFieldTypeChange = useCallback((v: string) => {
    setForm((prev) => ({ ...prev, fieldType: v as FieldType }));
  }, []);

  const handleRequiredChange = useCallback((v: boolean | "indeterminate") => {
    setForm((prev) => ({ ...prev, isRequired: v === true }));
  }, []);

  const handleSortOrderChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setForm((prev) => ({
        ...prev,
        sortOrder: parseInt(e.target.value, 10) || 0,
      }));
    },
    []
  );

  const addOption = useCallback(() => {
    setForm((prev) => ({
      ...prev,
      options: [...prev.options, { value: "", label: "" }],
    }));
  }, []);

  const removeOption = useCallback((idx: number) => {
    setForm((prev) => ({
      ...prev,
      options: prev.options.filter((_, i) => i !== idx),
    }));
  }, []);

  const updateOption = useCallback(
    (idx: number, key: "value" | "label", val: string) => {
      setForm((prev) => ({
        ...prev,
        options: prev.options.map((opt, i) =>
          i === idx ? { ...opt, [key]: val } : opt
        ),
      }));
    },
    []
  );

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      if (!form.label.trim()) {
        toast.error("Label is required");
        return;
      }
      if (!form.name.trim()) {
        toast.error("Field name is required");
        return;
      }
      if (!/^[a-z][a-z0-9_]*$/.test(form.name)) {
        toast.error("Name must be snake_case (lowercase letters, digits, underscores)");
        return;
      }

      const options =
        form.fieldType === "select"
          ? form.options.filter((o) => o.value.trim() && o.label.trim())
          : undefined;

      try {
        if (isCreate) {
          const input: CreateCustomFieldInput = {
            entityType,
            name: form.name,
            label: form.label,
            fieldType: form.fieldType,
            options,
            isRequired: form.isRequired,
            sortOrder: form.sortOrder,
          };
          await createField.mutateAsync(input);
          toast.success("Custom field created");
        } else if (editingField) {
          await updateField.mutateAsync({
            id: editingField.id,
            entityType,
            label: form.label,
            options: form.fieldType === "select" ? (options ?? []) : null,
            isRequired: form.isRequired,
            sortOrder: form.sortOrder,
          });
          toast.success("Custom field updated");
        }
        onOpenChange(false);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "An error occurred";
        toast.error(msg);
      }
    },
    [form, isCreate, editingField, entityType, createField, updateField, onOpenChange]
  );

  const handleCancel = useCallback(() => onOpenChange(false), [onOpenChange]);

  const isBusy = createField.isPending || updateField.isPending;

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle>
            {isCreate ? "Add Custom Field" : "Edit Custom Field"}
          </SheetTitle>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="mt-6 space-y-5">
          <div className="space-y-1.5">
            <Label htmlFor="cf-label">
              Label <span className="text-destructive">*</span>
            </Label>
            <Input
              id="cf-label"
              value={form.label}
              onChange={(e) => handleLabelChange(e.target.value)}
              placeholder="e.g. Investor Type"
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="cf-name">
              Field Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="cf-name"
              value={form.name}
              onChange={(e) => isCreate && handleNameChange(e.target.value)}
              placeholder="e.g. investor_type"
              disabled={!isCreate}
              className="font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground">
              Machine name (snake_case). Cannot be changed after creation.
            </p>
          </div>

          {isCreate && (
            <div className="space-y-1.5">
              <Label htmlFor="cf-type">Field Type</Label>
              <Select value={form.fieldType} onValueChange={handleFieldTypeChange}>
                <SelectTrigger id="cf-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.entries(FIELD_TYPE_LABELS) as [FieldType, string][]).map(
                    ([val, label]) => (
                      <SelectItem key={val} value={val}>
                        {label}
                      </SelectItem>
                    )
                  )}
                </SelectContent>
              </Select>
            </div>
          )}

          {form.fieldType === "select" && (
            <DropdownOptions
              options={form.options}
              onAdd={addOption}
              onRemove={removeOption}
              onUpdate={updateOption}
            />
          )}

          <Separator />

          <div className="flex items-center gap-3">
            <Checkbox
              id="cf-required"
              checked={form.isRequired}
              onCheckedChange={handleRequiredChange}
            />
            <Label htmlFor="cf-required" className="cursor-pointer">
              Required field
            </Label>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="cf-sort">Sort Order</Label>
            <Input
              id="cf-sort"
              type="number"
              value={form.sortOrder}
              onChange={handleSortOrderChange}
              min={0}
            />
            <p className="text-xs text-muted-foreground">Lower numbers appear first.</p>
          </div>

          <SheetFooter className="flex-row gap-2 border-t pt-4">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={handleCancel}
            >
              Cancel
            </Button>
            <Button type="submit" className="flex-1" disabled={isBusy}>
              {isBusy ? "Saving…" : isCreate ? "Create Field" : "Save Changes"}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
});


interface DropdownOptionsProps {
  options: { value: string; label: string }[];
  onAdd: () => void;
  onRemove: (idx: number) => void;
  onUpdate: (idx: number, key: "value" | "label", val: string) => void;
}

const DropdownOptions = memo(function DropdownOptions({
  options,
  onAdd,
  onRemove,
  onUpdate,
}: DropdownOptionsProps) {
  return (
    <div className="space-y-2">
      <Label>Dropdown Options</Label>
      <div className="space-y-2">
        {options.map((opt, idx) => (
          <OptionRow
            key={idx}
            idx={idx}
            opt={opt}
            onRemove={onRemove}
            onUpdate={onUpdate}
          />
        ))}
      </div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={onAdd}
        className="gap-1"
      >
        <PlusIcon className="h-3.5 w-3.5" />
        Add Option
      </Button>
    </div>
  );
});


interface OptionRowProps {
  idx: number;
  opt: { value: string; label: string };
  onRemove: (idx: number) => void;
  onUpdate: (idx: number, key: "value" | "label", val: string) => void;
}

const OptionRow = memo(function OptionRow({
  idx,
  opt,
  onRemove,
  onUpdate,
}: OptionRowProps) {
  const handleValueChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => onUpdate(idx, "value", e.target.value),
    [idx, onUpdate]
  );
  const handleLabelChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => onUpdate(idx, "label", e.target.value),
    [idx, onUpdate]
  );
  const handleRemove = useCallback(() => onRemove(idx), [idx, onRemove]);

  return (
    <div className="flex gap-2 items-center">
      <Input
        placeholder="Value"
        value={opt.value}
        onChange={handleValueChange}
        className="font-mono text-xs"
      />
      <Input
        placeholder="Label"
        value={opt.label}
        onChange={handleLabelChange}
      />
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-8 w-8 shrink-0 text-destructive"
        onClick={handleRemove}
        aria-label="Remove option"
      >
        <Trash2Icon className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
});
