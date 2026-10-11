"use client";

import { useState, useCallback, useMemo } from "react";
import { motion } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Plus, Trash2, Pencil, Mail, Eye, Copy, Variable,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { PageWrapper } from "@/components/ui/page-wrapper";
import {
  Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle, SheetTrigger,
} from "@/components/ui/sheet";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { IconChip } from "@/components/ui/icon-chip";
import { EmptyState } from "@/components/ui/empty-state";
import { QueryErrorState } from "@/components/ui/query-error-state";
import { EmptyMailIllustration } from "@/components/illustrations";
import {
  Form, FormField, FormItem, FormLabel, FormControl, FormMessage,
} from "@/components/ui/form";
import { cn } from "@/lib/utils";
import { staggerContainer, fadeUp } from "@/lib/motion-variants";
import {
  useEmailTemplates, useCreateEmailTemplate, useUpdateEmailTemplate, useDeleteEmailTemplate,
} from "@/lib/api/hooks/crm-settings";
import { toast } from "sonner";

const VARIABLES = [
  "{{lead.name}}",
  "{{lead.email}}",
  "{{lead.phone}}",
  "{{lead.company}}",
  "{{lead.city}}",
  "{{lead.source}}",
  "{{lead.potentialValue}}",
  "{{deal.name}}",
  "{{deal.value}}",
  "{{deal.stage}}",
  "{{user.name}}",
  "{{user.email}}",
];

const SAMPLE_DATA: Record<string, string> = {
  "lead.name": "Rahul Sharma",
  "lead.email": "rahul@example.com",
  "lead.phone": "+919876543210",
  "lead.company": "TechCorp India",
  "lead.city": "Mumbai",
  "lead.source": "referral",
  "lead.potentialValue": "50,00,000",
  "deal.name": "Enterprise License",
  "deal.value": "25,00,000",
  "deal.stage": "Proposal",
  "user.name": "Priya Patel",
  "user.email": "priya@miyoglobal.com",
};

const templateSchema = z.object({
  name: z.string().min(1, "Name required").max(100),
  subject: z.string().min(1, "Subject required"),
  body: z.string().min(1, "Body required"),
});
type TemplateForm = z.infer<typeof templateSchema>;

function interpolate(text: string, data: Record<string, string>) {
  let result = text;
  for (const [key, value] of Object.entries(data)) {
    result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, "g"), value);
  }
  return result;
}

export default function EmailTemplatesPage() {
  const { data: templates, isLoading, isError, error, refetch } = useEmailTemplates({ limit: 50, offset: 0 });
  const [createOpen, setCreateOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [previewId, setPreviewId] = useState<number | null>(null);

  const createTemplate = useCreateEmailTemplate();
  const updateTemplate = useUpdateEmailTemplate();
  const deleteTemplate = useDeleteEmailTemplate();

  const createForm = useForm<TemplateForm>({
    resolver: zodResolver(templateSchema),
    defaultValues: { name: "", subject: "", body: "" },
  });

  const editForm = useForm<TemplateForm>({
    resolver: zodResolver(templateSchema),
  });

  const onCreateSubmit = useCallback((data: TemplateForm) => {
    createTemplate.mutate(
      data,
      {
        onSuccess: () => { toast.success("Template created"); setCreateOpen(false); createForm.reset(); },
        onError: (err) => toast.error(err.message),
      }
    );
  }, [createTemplate, createForm]);

  const onEditSubmit = useCallback((data: TemplateForm) => {
    if (editingId === null) return;
    updateTemplate.mutate(
      { id: editingId, ...data },
      {
        onSuccess: () => { toast.success("Template updated"); setEditingId(null); },
        onError: (err) => toast.error(err.message),
      }
    );
  }, [editingId, updateTemplate]);

  const startEdit = useCallback((template: { id: number; name: string; subject: string; body: string }) => {
    setEditingId(template.id);
    editForm.reset({ name: template.name, subject: template.subject, body: template.body });
  }, [editForm]);

  const insertVariable = useCallback((variable: string, formType: "create" | "edit") => {
    const f = formType === "create" ? createForm : editForm;
    const current = f.getValues("body");
    f.setValue("body", current + variable);
  }, [createForm, editForm]);

  const handleDeleteTemplate = useCallback((id: number) => {
    deleteTemplate.mutate(id, {
      onSuccess: () => toast.success("Template deleted"),
      onError: (err) => toast.error(err.message),
    });
  }, [deleteTemplate]);

  const handlePreviewToggle = useCallback((id: number) => {
    setPreviewId((prev) => (prev === id ? null : id));
  }, []);

  const handleCloseEdit = useCallback(() => setEditingId(null), []);
  const handleClosePreview = useCallback(() => setPreviewId(null), []);

  const previewTemplate = useMemo(() => {
    if (previewId === null || !templates) return null;
    return templates.find(t => t.id === previewId) ?? null;
  }, [previewId, templates]);

  if (isLoading) {
    return (
      <PageWrapper title="Email Templates" subtitle="Manage reusable email templates with dynamic variables" contentClassName="max-w-5xl">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-40 rounded-lg" />)}
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper
      title="Email Templates"
      subtitle="Manage reusable email templates with dynamic variables"
      actions={
        <Sheet open={createOpen} onOpenChange={setCreateOpen}>
          <SheetTrigger asChild>
            <Button>
              <Plus className="size-4" />
              New Template
            </Button>
          </SheetTrigger>
          <SheetContent size="lg" className="gap-0 p-0">
            <SheetHeader className="border-b px-6">
              <SheetTitle>Create Email Template</SheetTitle>
            </SheetHeader>
            <Form {...createForm}>
              <form onSubmit={createForm.handleSubmit(onCreateSubmit)} className="flex min-h-0 flex-1 flex-col">
                <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-5">
                <FormField control={createForm.control} name="name" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Template Name</FormLabel>
                    <FormControl><Input {...field} placeholder="e.g. Welcome Email" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={createForm.control} name="subject" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Subject</FormLabel>
                    <FormControl><Input {...field} placeholder="e.g. Welcome to Miyo Global, {{lead.name}}" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={createForm.control} name="body" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Body</FormLabel>
                    <FormControl><Textarea {...field} rows={8} placeholder="Write your email body..." /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <div>
                  <p className="text-xs text-muted-foreground mb-2">Insert variable:</p>
                  <div className="flex flex-wrap gap-1.5">
                    {VARIABLES.map(v => (
                      <VariableButton key={v} variable={v} formType="create" onInsert={insertVariable} />
                    ))}
                  </div>
                </div>
                </div>
                <SheetFooter>
                  <Button type="button" variant="ghost" onClick={() => setCreateOpen(false)}>Cancel</Button>
                  <Button type="submit" loading={createTemplate.isPending} disabled={createTemplate.isPending}>
                    {createTemplate.isPending ? "Creating..." : "Create Template"}
                  </Button>
                </SheetFooter>
              </form>
            </Form>
          </SheetContent>
        </Sheet>
      }
      contentClassName="max-w-5xl"
    >
      {isError ? (
        <QueryErrorState title="Couldn't load email templates" error={error} onRetry={() => refetch()} />
      ) : (
      <motion.div
        className="space-y-6"
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
      >
        <motion.div variants={fadeUp} className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {templates && templates.length > 0 ? (
            templates.map(template => (
              <TemplateCard
                key={template.id}
                template={template}
                isPreviewActive={previewId === template.id}
                onPreviewToggle={handlePreviewToggle}
                onEdit={startEdit}
                onDelete={handleDeleteTemplate}
              />
            ))
          ) : (
            <EmptyState
              className="col-span-full"
              illustration={<EmptyMailIllustration className="size-32" />}
              title="No email templates"
              description="Create your first template"
              action={{ label: "New Template", onClick: () => setCreateOpen(true) }}
            />
          )}
        </motion.div>

        <Sheet open={editingId !== null} onOpenChange={(open) => { if (!open) handleCloseEdit(); }}>
          <SheetContent size="lg" className="gap-0 p-0">
            <SheetHeader className="border-b px-6">
              <SheetTitle>Edit Template</SheetTitle>
            </SheetHeader>
                <Form {...editForm}>
                  <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="flex min-h-0 flex-1 flex-col">
                    <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-5">
                    <FormField control={editForm.control} name="name" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Template Name</FormLabel>
                        <FormControl><Input {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={editForm.control} name="subject" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Subject</FormLabel>
                        <FormControl><Input {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={editForm.control} name="body" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Body</FormLabel>
                        <FormControl><Textarea {...field} rows={8} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <div>
                      <p className="text-xs text-muted-foreground mb-2">Insert variable:</p>
                      <div className="flex flex-wrap gap-1.5">
                        {VARIABLES.map(v => (
                          <VariableButton key={v} variable={v} formType="edit" onInsert={insertVariable} />
                        ))}
                      </div>
                    </div>
                    </div>
                    <SheetFooter>
                      <Button type="button" variant="ghost" onClick={handleCloseEdit}>Cancel</Button>
                      <Button type="submit" loading={updateTemplate.isPending} disabled={updateTemplate.isPending}>
                        {updateTemplate.isPending ? "Saving..." : "Save Changes"}
                      </Button>
                    </SheetFooter>
                  </form>
                </Form>
          </SheetContent>
        </Sheet>

        <Sheet open={previewTemplate !== null} onOpenChange={(open) => { if (!open) handleClosePreview(); }}>
          <SheetContent size="md" className="gap-0 p-0">
            <SheetHeader className="border-b px-6">
              <SheetTitle className="flex items-center gap-2">
                <IconChip icon={Eye} tone="success" size="sm" />
                Preview: {previewTemplate?.name}
              </SheetTitle>
            </SheetHeader>
            {previewTemplate && (
              <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
                <div className="space-y-3 rounded-lg border bg-surface-sunken/40 p-4">
                  <div>
                    <p className="text-xs text-muted-foreground">Subject</p>
                    <p className="text-sm font-medium">{interpolate(previewTemplate.subject, SAMPLE_DATA)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Body</p>
                    <p className="whitespace-pre-wrap text-sm">{interpolate(previewTemplate.body, SAMPLE_DATA)}</p>
                  </div>
                </div>
                <p className="mt-2 text-2xs text-muted-foreground">Preview uses sample data for variable interpolation</p>
              </div>
            )}
            <SheetFooter>
              <Button variant="ghost" onClick={handleClosePreview}>Close</Button>
            </SheetFooter>
          </SheetContent>
        </Sheet>
      </motion.div>
      )}
    </PageWrapper>
  );
}

interface TemplateData {
  id: number;
  name: string;
  subject: string;
  body: string;
}

interface TemplateCardProps {
  template: TemplateData;
  isPreviewActive: boolean;
  onPreviewToggle: (id: number) => void;
  onEdit: (template: TemplateData) => void;
  onDelete: (id: number) => void;
}

function TemplateCard({ template, onPreviewToggle, onEdit, onDelete }: TemplateCardProps) {
  const handlePreviewToggle = useCallback(() => onPreviewToggle(template.id), [template.id, onPreviewToggle]);
  const handleEdit = useCallback(() => onEdit(template), [template, onEdit]);
  const handleDelete = useCallback(() => onDelete(template.id), [template.id, onDelete]);

  return (
    <Card className="transition-[border-color,box-shadow] hover:border-border-strong hover:shadow-md">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <IconChip icon={Mail} size="sm" />
            <CardTitle className="truncate text-sm" title={template.name}>{template.name}</CardTitle>
          </div>
          <div className="flex shrink-0 items-center gap-0.5">
            <Button variant="ghost" size="icon-sm" onClick={handlePreviewToggle} aria-label="View">
              <Eye className="size-3.5" />
            </Button>
            <Button variant="ghost" size="icon-sm" onClick={handleEdit} aria-label="Edit">
              <Pencil className="size-3.5" />
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="icon-sm" className="text-destructive hover:bg-danger-soft hover:text-destructive" aria-label="Delete">
                  <Trash2 className="size-3.5" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete template?</AlertDialogTitle>
                  <AlertDialogDescription>
                    &quot;{template.name}&quot; will be permanently deleted. This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={handleDelete}>
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div>
            <p className="text-xs text-muted-foreground">Subject</p>
            <p className="text-xs truncate">{template.subject}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Body</p>
            <p className="text-xs line-clamp-3 whitespace-pre-wrap">{template.body}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface VariableButtonProps {
  variable: string;
  formType: "create" | "edit";
  onInsert: (variable: string, formType: "create" | "edit") => void;
}

function VariableButton({ variable, formType, onInsert }: VariableButtonProps) {
  const handleClick = useCallback(() => onInsert(variable, formType), [variable, formType, onInsert]);
  return (
    <Button type="button" variant="outline" size="xs" className="font-mono" onClick={handleClick}>
      {variable}
    </Button>
  );
}
