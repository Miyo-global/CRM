"use client";

import { useState } from "react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Button, buttonVariants } from "@/components/ui/button";
import { StatusPill } from "@/components/ui/status-pill";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Separator } from "@/components/ui/separator";
import {
  GripVertical,
  Plus,
  Trash2,
  Pencil,
} from "lucide-react";
import {
  useCustomFields,
  useCreateCustomField,
  useUpdateCustomField,
  useDeleteCustomField,
  type CustomFieldDefinition,
  type CreateCustomFieldInput,
} from "@/lib/api/hooks/crm";
import { toast } from "sonner";

type EntityType = "lead" | "deal" | "contact";
type FieldType = "text" | "number" | "date" | "boolean" | "select";

interface SelectOption {
  value: string;
  label: string;
}

interface FieldFormState {
  label: string;
  name: string;
  fieldType: FieldType;
  options: SelectOption[];
  isRequired: boolean;
  sortOrder: number;
}

const FIELD_TYPE_LABELS: Record<FieldType, string> = {
  text: "Text",
  number: "Number",
  date: "Date",
  boolean: "Yes / No",
  select: "Dropdown",
};

function autoName(label: string): string {
  return label
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_]/g, "");
}


function EntityFieldsTab({ entityType }: { entityType: EntityType }) {
  const { data, isLoading } = useCustomFields(entityType);
  const deleteField = useDeleteCustomField();
  const updateField = useUpdateCustomField();
  const [editingField, setEditingField] = useState<CustomFieldDefinition | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [isCreateMode, setIsCreateMode] = useState(false);

  const fields = data?.fields ?? [];

  function openCreate() {
    setEditingField(null);
    setIsCreateMode(true);
    setSheetOpen(true);
  }

  function openEdit(field: CustomFieldDefinition) {
    setEditingField(field);
    setIsCreateMode(false);
    setSheetOpen(true);
  }

  async function handleToggleActive(field: CustomFieldDefinition) {
    try {
      await updateField.mutateAsync({
        id: field.id,
        entityType,
        isActive: !field.isActive,
      });
      toast.success(`Field ${field.isActive ? "deactivated" : "activated"}`);
    } catch {
      toast.error("Failed to update field");
    }
  }

  async function handleDelete(field: CustomFieldDefinition) {
    try {
      await deleteField.mutateAsync({ id: field.id, entityType });
      toast.success("Field deleted");
    } catch {
      toast.error("Failed to delete field");
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-3 py-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-14 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button size="sm" onClick={openCreate}>
          <Plus aria-hidden />
          Add Field
        </Button>
      </div>

      {fields.length === 0 ? (
        <EmptyState
          title="No custom fields yet"
          description={`Add custom fields to capture additional information on ${entityType}s.`}
          compact
          action={{ label: "Add Field", onClick: openCreate }}
        />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-8"><span className="sr-only">Order</span></TableHead>
              <TableHead>Field</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Required</TableHead>
              <TableHead>Active</TableHead>
              <TableHead className="text-right"><span className="sr-only">Actions</span></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {fields.map((field) => (
              <TableRow key={field.id}>
                <TableCell className="pr-0">
                  <GripVertical className="size-4 text-subtle-foreground" aria-hidden="true" />
                </TableCell>
                <TableCell>
                  <p className="text-sm font-medium">{field.label}</p>
                  <p className="font-mono text-xs text-muted-foreground">{field.name}</p>
                </TableCell>
                <TableCell>
                  <StatusPill tone="neutral">{FIELD_TYPE_LABELS[field.fieldType]}</StatusPill>
                </TableCell>
                <TableCell>
                  {field.isRequired ? (
                    <StatusPill tone="danger">Required</StatusPill>
                  ) : (
                    <span className="text-subtle-foreground" aria-hidden>—</span>
                  )}
                </TableCell>
                <TableCell>
                  <Switch
                    checked={field.isActive}
                    onCheckedChange={() => handleToggleActive(field)}
                    aria-label={`Toggle ${field.label} active`}
                  />
                </TableCell>
                <TableCell>
                  <div className="flex items-center justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => openEdit(field)}
                      aria-label={`Edit ${field.label}`}
                    >
                      <Pencil aria-hidden />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          className="text-muted-foreground hover:bg-danger-soft hover:text-destructive"
                          aria-label={`Delete ${field.label}`}
                        >
                          <Trash2 aria-hidden />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Custom Field</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete the field &quot;{field.label}&quot;?
                            This will not remove existing data stored under this field, but the field
                            will no longer appear in forms.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            className={buttonVariants({ variant: "destructive" })}
                            onClick={() => handleDelete(field)}
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <FieldSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        entityType={entityType}
        editingField={editingField}
        isCreate={isCreateMode}
      />
    </div>
  );
}


function FieldSheet({
  open,
  onOpenChange,
  entityType,
  editingField,
  isCreate,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  entityType: EntityType;
  editingField: CustomFieldDefinition | null;
  isCreate: boolean;
}) {
  const createField = useCreateCustomField();
  const updateField = useUpdateCustomField();

  const [form, setForm] = useState<FieldFormState>(() =>
    getInitialForm(editingField)
  );

  function handleOpenChange(v: boolean) {
    if (v) {
      setForm(getInitialForm(editingField));
    }
    onOpenChange(v);
  }

  function syncForm(field: CustomFieldDefinition | null) {
    setForm(getInitialForm(field));
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
      options: field.options && field.options.length > 0
        ? field.options
        : [{ value: "", label: "" }],
      isRequired: field.isRequired,
      sortOrder: field.sortOrder,
    };
  }

  function handleLabelChange(val: string) {
    setForm((prev) => ({
      ...prev,
      label: val,
      name: isCreate ? autoName(val) : prev.name,
    }));
  }

  function addOption() {
    setForm((prev) => ({
      ...prev,
      options: [...prev.options, { value: "", label: "" }],
    }));
  }

  function removeOption(idx: number) {
    setForm((prev) => ({
      ...prev,
      options: prev.options.filter((_, i) => i !== idx),
    }));
  }

  function updateOption(idx: number, key: "value" | "label", val: string) {
    setForm((prev) => ({
      ...prev,
      options: prev.options.map((opt, i) =>
        i === idx ? { ...opt, [key]: val } : opt
      ),
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
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
  }

  const isBusy = createField.isPending || updateField.isPending;

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent size="sm" className="w-full overflow-y-auto">
        <SheetHeader className="border-b border-border">
          <SheetTitle>
            {isCreate ? "Add Custom Field" : "Edit Custom Field"}
          </SheetTitle>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="flex flex-1 flex-col space-y-5 px-4 pt-5">
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
              onChange={(e) =>
                isCreate &&
                setForm((prev) => ({ ...prev, name: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "") }))
              }
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
              <Select
                value={form.fieldType}
                onValueChange={(v) =>
                  setForm((prev) => ({ ...prev, fieldType: v as FieldType }))
                }
              >
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
            <div className="space-y-2">
              <Label>Dropdown Options</Label>
              <div className="space-y-2">
                {form.options.map((opt, idx) => (
                  <div key={idx} className="flex gap-2 items-center">
                    <Input
                      placeholder="Value"
                      value={opt.value}
                      onChange={(e) => updateOption(idx, "value", e.target.value)}
                      className="font-mono text-xs"
                    />
                    <Input
                      placeholder="Label"
                      value={opt.label}
                      onChange={(e) => updateOption(idx, "label", e.target.value)}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 shrink-0 text-destructive"
                      onClick={() => removeOption(idx)}
                      aria-label="Remove option"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addOption}
                className="gap-1"
              >
                <Plus className="h-3.5 w-3.5" />
                Add Option
              </Button>
            </div>
          )}

          <Separator />

          <div className="flex items-center gap-3">
            <Checkbox
              id="cf-required"
              checked={form.isRequired}
              onCheckedChange={(v) =>
                setForm((prev) => ({ ...prev, isRequired: v === true }))
              }
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
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  sortOrder: parseInt(e.target.value, 10) || 0,
                }))
              }
              min={0}
            />
            <p className="text-xs text-muted-foreground">
              Lower numbers appear first.
            </p>
          </div>

          <SheetFooter className="sticky bottom-0 -mx-4 bg-background">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isBusy} loading={isBusy}>
              {isBusy ? "Saving…" : isCreate ? "Create Field" : "Save Changes"}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}


export default function CustomFieldsPage() {
  return (
    <PageWrapper
      title="Custom fields"
    >
      <Tabs defaultValue="lead">
        <TabsList variant="underline" className="mb-6">
          <TabsTrigger value="lead">Leads</TabsTrigger>
          <TabsTrigger value="deal">Deals</TabsTrigger>
          <TabsTrigger value="contact">Contacts</TabsTrigger>
        </TabsList>

        <TabsContent value="lead">
          <EntityFieldsTab entityType="lead" />
        </TabsContent>
        <TabsContent value="deal">
          <EntityFieldsTab entityType="deal" />
        </TabsContent>
        <TabsContent value="contact">
          <EntityFieldsTab entityType="contact" />
        </TabsContent>
      </Tabs>
    </PageWrapper>
  );
}
