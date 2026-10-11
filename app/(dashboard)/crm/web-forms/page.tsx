"use client";

import { useState, useCallback, useEffect } from "react";
import { Globe, Plus, Copy, Check, Trash2, Pencil, FormInput, BarChart3 } from "lucide-react";
import { toast } from "sonner";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { StatsStrip } from "@/components/shared/stats-strip";
import { StatusPill } from "@/components/ui/status-pill";
import { IconChip } from "@/components/ui/icon-chip";
import { EmptyState } from "@/components/ui/empty-state";
import { QueryErrorState } from "@/components/ui/query-error-state";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyDocumentsIllustration } from "@/components/illustrations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter,
} from "@/components/ui/sheet";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  useWebLeadForms, useCreateWebLeadForm, useUpdateWebLeadForm, useDeleteWebLeadForm,
  type WebLeadForm, type WebLeadFormField,
} from "@/lib/api/hooks/crm";

const FIELD_TYPES = [
  { value: "text", label: "Text" },
  { value: "email", label: "Email" },
  { value: "phone", label: "Phone" },
  { value: "textarea", label: "Textarea" },
  { value: "select", label: "Select" },
] as const;

function toSnakeCase(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}


function EmbedDialog({ form, open, onClose }: { form: WebLeadForm; open: boolean; onClose: () => void }) {
  const [copiedIframe, setCopiedIframe] = useState(false);
  const [copiedJs, setCopiedJs] = useState(false);
  const origin = typeof window !== "undefined" ? window.location.origin : "https://yourapp.com";

  const iframeSnippet = `<iframe src="${origin}/lead-form/${form.publicToken}" width="100%" height="600" frameborder="0"></iframe>`;
  const jsSnippet = `<script src="${origin}/lead-form/${form.publicToken}/embed.js"></script>\n<div id="miyoglobal-form-${form.publicToken}"></div>`;

  const copy = useCallback((text: string, setter: (v: boolean) => void) => {
    navigator.clipboard.writeText(text).then(() => {
      setter(true);
      setTimeout(() => setter(false), 2000);
    });
  }, []);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent size="lg">
        <DialogHeader>
          <DialogTitle>Embed &quot;{form.name}&quot;</DialogTitle>
          <DialogDescription>
            Copy one of the snippets below and paste it into your website. Replace &quot;yourapp.com&quot; with your actual domain.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2 block">iFrame Snippet</Label>
            <div className="relative">
              <pre className="overflow-x-auto whitespace-pre-wrap break-all rounded-md border bg-surface-sunken p-3 pr-12 font-mono text-xs">
                {iframeSnippet}
              </pre>
              <Button
                size="icon-sm"
                variant="ghost"
                className="absolute top-2 right-2"
                aria-label="Copy iFrame snippet"
                onClick={() => copy(iframeSnippet, setCopiedIframe)}
              >
                {copiedIframe ? <Check className="size-4 text-success-strong" /> : <Copy className="size-4" />}
              </Button>
            </div>
          </div>

          <div>
            <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2 block">JavaScript Snippet</Label>
            <div className="relative">
              <pre className="overflow-x-auto whitespace-pre-wrap break-all rounded-md border bg-surface-sunken p-3 pr-12 font-mono text-xs">
                {jsSnippet}
              </pre>
              <Button
                size="icon-sm"
                variant="ghost"
                className="absolute top-2 right-2"
                aria-label="Copy JavaScript snippet"
                onClick={() => copy(jsSnippet, setCopiedJs)}
              >
                {copiedJs ? <Check className="size-4 text-success-strong" /> : <Copy className="size-4" />}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}


interface FormBuilderProps {
  open: boolean;
  onClose: () => void;
  existing?: WebLeadForm | null;
}

function FormBuilderSheet({ open, onClose, existing }: FormBuilderProps) {
  const [name, setName] = useState(existing?.name ?? "");
  const [description, setDescription] = useState(existing?.description ?? "");
  const [submitMessage, setSubmitMessage] = useState(
    existing?.submitMessage ?? "Thank you! We'll be in touch soon."
  );
  const [isActive, setIsActive] = useState(existing?.isActive ?? true);
  const [fields, setFields] = useState<WebLeadFormField[]>(existing?.fields ?? []);

  useEffect(() => {
    if (!open) return;
    setName(existing?.name ?? "");
    setDescription(existing?.description ?? "");
    setSubmitMessage(existing?.submitMessage ?? "Thank you! We'll be in touch soon.");
    setIsActive(existing?.isActive ?? true);
    setFields(existing?.fields ?? []);
  }, [open, existing]);

  const create = useCreateWebLeadForm();
  const update = useUpdateWebLeadForm();
  const isPending = create.isPending || update.isPending;

  const addField = () => {
    setFields((prev) => [
      ...prev,
      { name: `field_${prev.length + 1}`, label: "", type: "text", required: false },
    ]);
  };

  const updateField = (index: number, patch: Partial<WebLeadFormField>) => {
    setFields((prev) =>
      prev.map((f, i) => {
        if (i !== index) return f;
        const updated = { ...f, ...patch };
        if (patch.label !== undefined) updated.name = toSnakeCase(patch.label) || `field_${i}`;
        return updated;
      })
    );
  };

  const removeField = (index: number) => {
    setFields((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      toast.error("Form name is required");
      return;
    }

    if (fields.length < 1) {
      toast.error("Add at least one field");
      return;
    }

    if (fields.some((f) => !f.label.trim())) {
      toast.error("Every field must have a label");
      return;
    }

    const payload = { name: name.trim(), description: description || undefined, fields, submitMessage, isActive };
    try {
      if (existing) {
        await update.mutateAsync({ id: existing.id, ...payload });
        toast.success("Form updated");
      } else {
        await create.mutateAsync(payload);
        toast.success("Form created");
      }
      onClose();
    } catch {
      toast.error("Failed to save form");
    }
  };

  const handleOpenChange = (o: boolean) => {
    if (!o) onClose();
  };

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent size="md" className="gap-0 p-0">
        <SheetHeader className="border-b px-6">
          <SheetTitle>{existing ? "Edit Form" : "Create Web Form"}</SheetTitle>
        </SheetHeader>

        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-6 py-5">
          <div className="space-y-1">
            <Label htmlFor="form-name">Form Name <span className="text-destructive">*</span></Label>
            <Input id="form-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Contact Us" />
          </div>

          <div className="space-y-1">
            <Label htmlFor="form-desc">Description</Label>
            <Textarea id="form-desc" value={description} onChange={(e) => setDescription(e.target.value)} rows={2} placeholder="Optional description..." />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-semibold">Form Fields</Label>
              <Button size="sm" variant="outline" onClick={addField}>
                <Plus className="size-3.5" /> Add Field
              </Button>
            </div>

            {fields.length === 0 && (
              <p className="rounded-md border border-dashed border-border-strong bg-surface-sunken/40 py-4 text-center text-sm text-muted-foreground">
                No fields yet. Click &quot;Add Field&quot; to start.
              </p>
            )}

            <div className="space-y-3">
              {fields.map((field, i) => (
                <div key={i} className="space-y-2 rounded-md border bg-surface-sunken/40 p-3">
                  <div className="flex flex-wrap items-center gap-2 sm:flex-nowrap">
                    <Input
                      placeholder="Field label"
                      value={field.label}
                      onChange={(e) => updateField(i, { label: e.target.value })}
                      className="min-w-40 flex-1"
                    />
                    <Select
                      value={field.type}
                      onValueChange={(v) => updateField(i, { type: v as WebLeadFormField["type"] })}
                    >
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {FIELD_TYPES.map((t) => (
                          <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button size="icon" variant="ghost" onClick={() => removeField(i)} aria-label="Remove field">
                      <Trash2 className="size-4 text-destructive" />
                    </Button>
                  </div>

                  <div className="flex items-center gap-2">
                    <Switch
                      id={`req-${i}`}
                      checked={field.required}
                      onCheckedChange={(v) => updateField(i, { required: v })}
                    />
                    <Label htmlFor={`req-${i}`} className="text-xs">Required</Label>
                    <span className="ml-auto truncate font-mono text-xs text-muted-foreground">key: {field.name || ""}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="submit-msg">Submit Message</Label>
            <Textarea
              id="submit-msg"
              value={submitMessage}
              onChange={(e) => setSubmitMessage(e.target.value)}
              rows={2}
            />
          </div>

          <div className="flex items-center gap-2">
            <Switch id="is-active" checked={isActive} onCheckedChange={setIsActive} />
            <Label htmlFor="is-active">Active (accepts submissions)</Label>
          </div>
        </div>

        <SheetFooter>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} loading={isPending} disabled={isPending}>
            {isPending ? "Saving..." : existing ? "Save Changes" : "Create Form"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}


function WebFormCard({ form }: { form: WebLeadForm }) {
  const [embedOpen, setEmbedOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const deleteForm = useDeleteWebLeadForm();

  const handleDelete = () => {
    deleteForm.mutate(form.id, {
      onSuccess: () => toast.success("Form deleted"),
      onError: () => toast.error("Failed to delete form"),
    });
  };

  return (
    <>
      <Card className="flex flex-col transition-[border-color,box-shadow] hover:border-border-strong hover:shadow-md">
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-2">
            <div className="flex min-w-0 items-center gap-2.5">
              <IconChip icon={FormInput} size="sm" tone={form.isActive ? "brand" : "neutral"} />
              <CardTitle className="truncate text-base leading-snug" title={form.name}>{form.name}</CardTitle>
            </div>
            <StatusPill tone={form.isActive ? "success" : "neutral"} dot>
              {form.isActive ? "Active" : "Inactive"}
            </StatusPill>
          </div>
          {form.description && (
            <CardDescription className="line-clamp-2">{form.description}</CardDescription>
          )}
        </CardHeader>

        <CardContent className="flex-1 space-y-3">
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span><span className="font-medium tabular-nums text-foreground">{form.fields?.length ?? 0}</span> fields</span>
            <span><span className="font-medium tabular-nums text-foreground">{form.totalSubmissions ?? 0}</span> submissions</span>
          </div>

          <div className="flex flex-wrap gap-2 pt-1">
            <Button size="sm" variant="outline" onClick={() => setEmbedOpen(true)}>
              <Globe className="size-3.5" /> Get Embed Code
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setEditOpen(true)}>
              <Pencil className="size-3.5" /> Edit
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button size="sm" variant="ghost" className="text-destructive hover:bg-danger-soft hover:text-destructive" loading={deleteForm.isPending}>
                  <Trash2 className="size-3.5" /> Delete
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Form</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to delete &quot;{form.name}&quot;? This cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </CardContent>
      </Card>

      <EmbedDialog form={form} open={embedOpen} onClose={() => setEmbedOpen(false)} />
      <FormBuilderSheet open={editOpen} onClose={() => setEditOpen(false)} existing={form} />
    </>
  );
}


export default function WebFormsPage() {
  const [createOpen, setCreateOpen] = useState(false);
  const { data: forms = [], isLoading, isError, error, refetch } = useWebLeadForms();

  const totalSubmissions = forms.reduce((sum, f) => sum + (f.totalSubmissions ?? 0), 0);

  return (
    <PageWrapper
      title="Web-to-Lead Forms"
      subtitle="Create embeddable forms to capture leads from your website"
      actions={
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="size-4" /> New Form
        </Button>
      }
    >
      <StatsStrip
        className="mb-6"
        items={[
          { label: "Total Forms", value: forms.length, icon: FormInput, tone: "info" },
          { label: "Total Submissions", value: totalSubmissions, icon: BarChart3, tone: "brand" },
        ]}
      />

      {isError ? (
        <QueryErrorState title="Couldn't load web forms" error={error} onRetry={() => refetch()} />
      ) : isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-48 rounded-lg" />
          ))}
        </div>
      ) : forms.length === 0 ? (
        <EmptyState
          illustration={<EmptyDocumentsIllustration className="size-32" />}
          title="No forms yet"
          description="Create your first web form to start capturing leads."
          action={{ label: "Create Form", onClick: () => setCreateOpen(true) }}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {forms.map((form) => (
            <WebFormCard key={form.id} form={form} />
          ))}
        </div>
      )}

      <FormBuilderSheet open={createOpen} onClose={() => setCreateOpen(false)} />
    </PageWrapper>
  );
}
