"use client";

import { useState } from "react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { EmptyTargetIllustration } from "@/components/illustrations";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent } from "@/components/ui/card";
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
          <div key={i} className="h-14 rounded-lg bg-muted animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button size="sm" onClick={openCreate} className="gap-2">
          <Plus className="h-4 w-4" />
          Add Field
        </Button>
      </div>

      {fields.length === 0 ? (
        <EmptyState
          illustration={<EmptyTargetIllustration className="h-24 w-24" />}
          title="No custom fields yet"
          description={`Add custom fields to capture additional information on ${entityType}s.`}
          compact
          action={{ label: "Add Field", onClick: openCreate }}
        />
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="divide-y">
              {fields.map((field) => (
                <div
                  key={field.id}
                  className="flex items-center gap-3 px-4 py-3"
                >
                  <GripVertical className="h-4 w-4 text-muted-foreground/40 shrink-0" aria-hidden="true" />

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm">{field.label}</span>
                      <Badge variant="outline" className="text-xs font-mono">
                        {field.name}
                      </Badge>
                      <Badge variant="secondary" className="text-xs">
                        {FIELD_TYPE_LABELS[field.fieldType]}
                      </Badge>
                      {field.isRequired && (
                        <Badge variant="destructive" className="text-xs">
                          Required
                        </Badge>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <Switch
                      checked={field.isActive}
                      onCheckedChange={() => handleToggleActive(field)}
                      aria-label={`Toggle ${field.label} active`}
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => openEdit(field)}
                      aria-label={`Edit ${field.label}`}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          aria-label={`Delete ${field.label}`}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
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
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            onClick={() => handleDelete(field)}
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
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

          <SheetFooter className="flex-row gap-2 border-t pt-4">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => onOpenChange(false)}
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
}


export default function CustomFieldsPage() {
  return (
    <PageWrapper
      title="Custom Fields"
      subtitle="Define custom data fields for leads, deals, and contacts"
    >
      <Tabs defaultValue="lead">
        <TabsList className="mb-6">
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
