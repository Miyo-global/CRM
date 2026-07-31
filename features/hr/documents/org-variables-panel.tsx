"use client";

import { useState, useCallback } from "react";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Loader2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  useOrgDocumentVariables,
  useCreateOrgDocumentVariable,
  useUpdateOrgDocumentVariable,
  useDeleteOrgDocumentVariable,
  type OrgDocumentVariable,
} from "@/lib/api/hooks/hr/org-document-variables";
import { getErrorMessage } from "@/lib/get-error-message";
import { orgDocumentVariableSchema } from "@/lib/validations/hr-documents";
import { ConfirmActionDialog } from "@/features/hr/confirm-action-dialog";

interface VariableFormState {
  slug: string;
  label: string;
  defaultValue: string;
}

const EMPTY_FORM: VariableFormState = { slug: "", label: "", defaultValue: "" };

export function OrgVariablesPanel({
  onInsertToken,
  onVariableDeleted,
}: {
  onInsertToken?: (slug: string) => void;
  onVariableDeleted?: (slug: string) => void;
}) {
  const { data: variables = [], isLoading } = useOrgDocumentVariables();
  const createMutation = useCreateOrgDocumentVariable();
  const updateMutation = useUpdateOrgDocumentVariable();
  const deleteMutation = useDeleteOrgDocumentVariable();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<OrgDocumentVariable | null>(null);
  const [form, setForm] = useState<VariableFormState>(EMPTY_FORM);
  const [pendingDelete, setPendingDelete] = useState<OrgDocumentVariable | null>(null);

  const openCreate = useCallback(() => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  }, []);

  const openEdit = useCallback((variable: OrgDocumentVariable) => {
    setEditing(variable);
    setForm({
      slug: variable.slug,
      label: variable.label,
      defaultValue: variable.defaultValue,
    });
    setDialogOpen(true);
  }, []);

  const handleSave = useCallback(() => {
    const payload = {
      slug: form.slug.trim(),
      label: form.label.trim(),
      defaultValue: form.defaultValue,
    };
    const parsed = orgDocumentVariableSchema.safeParse(payload);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Invalid variable");
      return;
    }

    if (editing) {
      updateMutation.mutate(
        { id: editing.id, ...parsed.data },
        {
          onSuccess: () => {
            toast.success("Variable updated");
            setDialogOpen(false);
          },
          onError: (e) => toast.error(getErrorMessage(e)),
        },
      );
      return;
    }

    createMutation.mutate(parsed.data, {
      onSuccess: () => {
        toast.success("Variable created");
        setDialogOpen(false);
      },
      onError: (e) => toast.error(getErrorMessage(e)),
    });
  }, [form, editing, createMutation, updateMutation]);

  const handleDelete = useCallback(
    (variable: OrgDocumentVariable) => {
      const { slug } = variable;
      deleteMutation.mutate(variable.id, {
        onSuccess: () => {
          toast.success("Variable removed");
          setPendingDelete(null);
          onVariableDeleted?.(slug);
        },
        onError: (e) => toast.error(getErrorMessage(e)),
      });
    },
    [deleteMutation, onVariableDeleted],
  );

  return (
    <>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Organization variables</CardTitle>
          <CardDescription>
            Saved defaults for tokens like {"{{Support_Email}}"} — used in preview and document rollout.
          </CardDescription>
        </CardHeader>
        <CardContent className="pb-6 space-y-3">
          {isLoading ? (
            <p className="text-xs text-muted-foreground flex items-center gap-2">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Loading variables…
            </p>
          ) : variables.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              Define organization-wide tokens (e.g. Support_Email) used in templates and rollout.
            </p>
          ) : (
            <ul className="space-y-2">
              {variables.map((v) => (
                <li
                  key={v.id}
                  className="flex items-start gap-2 rounded-lg border border-border/60 px-3 py-2 text-xs"
                >
                  <OrgVariablesPanelListItem
                    variable={v}
                    onInsertToken={onInsertToken}
                    onEdit={openEdit}
                    onDelete={setPendingDelete}
                    isDeleting={deleteMutation.isPending}
                  />
                </li>
              ))}
            </ul>
          )}
          <Button type="button" variant="outline" size="sm" className="w-full gap-1.5" onClick={openCreate}>
            <Plus className="h-3.5 w-3.5" />
            Add organization variable
          </Button>
        </CardContent>
      </Card>

      <Sheet open={dialogOpen} onOpenChange={setDialogOpen}>
        <SheetContent className="flex w-full flex-col gap-0 overflow-y-auto sm:max-w-md">
          <SheetHeader>
            <SheetTitle>{editing ? "Edit variable" : "New organization variable"}</SheetTitle>
          </SheetHeader>
          <div className="space-y-3 py-1">
            <div className="space-y-1.5">
              <Label htmlFor="var-slug">Token name</Label>
              <Input
                id="var-slug"
                placeholder="Support_Email"
                value={form.slug}
                disabled={!!editing}
                onChange={(e) => setForm({ ...form, slug: e.target.value })}
                className="font-mono text-sm"
              />
              <p className="text-[10px] text-muted-foreground">
                Letters, numbers, underscores. Used as {"{{Token}}"}.
              </p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="var-label">Label</Label>
              <Input
                id="var-label"
                placeholder="Support email"
                value={form.label}
                onChange={(e) => setForm({ ...form, label: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="var-default">Default value</Label>
              <Input
                id="var-default"
                placeholder="support@company.com"
                value={form.defaultValue}
                onChange={(e) => setForm({ ...form, defaultValue: e.target.value })}
              />
            </div>
          </div>
          <SheetFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSave}
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              {(createMutation.isPending || updateMutation.isPending) && (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              )}
              {editing ? "Save" : "Create"}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <ConfirmActionDialog
        open={!!pendingDelete}
        onOpenChange={(v) => {
          if (!v) setPendingDelete(null);
        }}
        title="Remove variable"
        description={
          pendingDelete
            ? `Remove “${pendingDelete.label}” ({{${pendingDelete.slug}}})? References in open templates will be removed automatically.`
            : ""
        }
        confirmLabel="Remove"
        variant="destructive"
        isPending={deleteMutation.isPending}
        onConfirm={() => {
          if (pendingDelete) handleDelete(pendingDelete);
        }}
      />
    </>
  );
}

function OrgVariablesPanelListItem({
  variable,
  onInsertToken,
  onEdit,
  onDelete,
  isDeleting,
}: {
  variable: OrgDocumentVariable;
  onInsertToken?: (slug: string) => void;
  onEdit: (v: OrgDocumentVariable) => void;
  onDelete: (v: OrgDocumentVariable) => void;
  isDeleting: boolean;
}) {
  return (
    <>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-foreground">{variable.label}</p>
        <button
          type="button"
          className="font-mono text-[10px] text-blue hover:underline"
          onClick={() => onInsertToken?.(variable.slug)}
          title="Insert into editor"
        >
          {`{{${variable.slug}}}`}
        </button>
        {variable.defaultValue ? (
          <p className="text-muted-foreground truncate mt-0.5" title={variable.defaultValue}>
            Default: {variable.defaultValue}
          </p>
        ) : null}
      </div>
      <div className="flex shrink-0 gap-0.5">
        <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => onEdit(variable)}>
          <Pencil className="h-3.5 w-3.5" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-destructive"
          disabled={isDeleting}
          onClick={() => onDelete(variable)}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </>
  );
}
