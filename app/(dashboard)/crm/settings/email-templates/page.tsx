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
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
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
  const { data: templates, isLoading } = useEmailTemplates({ limit: 50, offset: 0 });
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
      <div className="space-y-6 p-6">
        <Skeleton className="h-10 w-48" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-40" />)}
        </div>
      </div>
    );
  }

  return (
    <PageWrapper
      title="Email Templates"
      subtitle="Manage reusable email templates with dynamic variables"
      actions={
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button className="bg-gold hover:bg-gold/90 text-white">
              <Plus className="h-4 w-4 mr-2" />
              New Template
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create Email Template</DialogTitle>
            </DialogHeader>
            <Form {...createForm}>
              <form onSubmit={createForm.handleSubmit(onCreateSubmit)} className="space-y-4">
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
                <Button type="submit" className="w-full bg-gold hover:bg-gold/90 text-white" disabled={createTemplate.isPending}>
                  {createTemplate.isPending ? "Creating..." : "Create Template"}
                </Button>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      }
    >
      <motion.div
        className="space-y-6"
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
      >
        <motion.div variants={fadeUp} className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
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
            <Card className="col-span-full shadow-sm">
              <CardContent className="py-12 text-center text-muted-foreground">
                <Mail className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No email templates</p>
                <p className="text-xs mt-1">Create your first template</p>
              </CardContent>
            </Card>
          )}
        </motion.div>

        {editingId !== null && (
          <motion.div variants={fadeUp}>
            <Card className="shadow-sm border-gold/30">
              <CardHeader>
                <CardTitle className="text-base">Edit Template</CardTitle>
              </CardHeader>
              <CardContent>
                <Form {...editForm}>
                  <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4">
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
                    <div className="flex justify-end gap-3">
                      <Button type="button" variant="outline" onClick={handleCloseEdit}>Cancel</Button>
                      <Button type="submit" className="bg-gold hover:bg-gold/90 text-white" disabled={updateTemplate.isPending}>
                        {updateTemplate.isPending ? "Saving..." : "Save Changes"}
                      </Button>
                    </div>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {previewTemplate && (
          <motion.div variants={fadeUp}>
            <Card className="shadow-sm border-emerald-500/30">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Eye className="h-4 w-4 text-emerald-400" />
                    Preview: {previewTemplate.name}
                  </CardTitle>
                  <Button variant="ghost" size="sm" onClick={handleClosePreview}>Close</Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="p-4 rounded-lg bg-muted/20 border border-border/30 space-y-3">
                  <div>
                    <p className="text-xs text-muted-foreground">Subject</p>
                    <p className="text-sm font-medium">{interpolate(previewTemplate.subject, SAMPLE_DATA)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Body</p>
                    <p className="text-sm whitespace-pre-wrap">{interpolate(previewTemplate.body, SAMPLE_DATA)}</p>
                  </div>
                </div>
                <p className="text-[10px] text-muted-foreground mt-2">Preview uses sample data for variable interpolation</p>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </motion.div>
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
    <Card className="shadow-sm hover:shadow-md transition-all">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <CardTitle className="text-sm truncate">{template.name}</CardTitle>
          <div className="flex items-center gap-1 shrink-0">
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handlePreviewToggle} aria-label="View">
              <Eye className="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleEdit} aria-label="Edit">
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={handleDelete} aria-label="Delete">
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
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
    <Button type="button" variant="outline" size="sm" className="text-[10px] h-6 px-2" onClick={handleClick}>
      {variable}
    </Button>
  );
}
