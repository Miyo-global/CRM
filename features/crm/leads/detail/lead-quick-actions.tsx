"use client";

import { useCallback, useState } from "react";
import { type UseFormReturn } from "react-hook-form";
import { Phone, Mail, StickyNote, ListTodo, Wand2, Loader2, FileText } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DatePicker } from "@/components/ui/date-picker";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useGenerateEmail } from "@/lib/api/hooks/ai";
import { useEmailTemplates } from "@/lib/api/hooks/crm-settings";
import {
  type QuickAction,
  type NoteForm,
  type TaskForm,
  type EmailForm,
  type CallForm,
} from "./lead-types";

interface LeadQuickActionsProps {
  activeAction: QuickAction;
  onSetActiveAction: (action: QuickAction) => void;

  noteForm: UseFormReturn<NoteForm>;
  taskForm: UseFormReturn<TaskForm>;
  emailForm: UseFormReturn<EmailForm>;
  callForm: UseFormReturn<CallForm>;

  onNoteSubmit: (data: NoteForm) => void;
  onTaskSubmit: (data: TaskForm) => void;
  onEmailSubmit: (data: EmailForm) => void;
  onCallSubmit: (data: CallForm) => void;

  isNotePending: boolean;
  isTaskPending: boolean;
  isEmailPending: boolean;
  isCallPending: boolean;

  leadName?: string;
  leadEmail?: string;
  leadContext?: string;
  onDraftEmail?: (subject: string, body: string) => void;
}

const ACTION_BUTTONS = [
  {
    key: "call" as const,
    label: "Log Call",
    icon: Phone,
    color: "text-info-strong",
  },
  {
    key: "email" as const,
    label: "Send Email",
    icon: Mail,
    color: "text-plum-strong",
  },
  {
    key: "note" as const,
    label: "Add Note",
    icon: StickyNote,
    color: "text-warning-strong",
  },
  {
    key: "task" as const,
    label: "New Task",
    icon: ListTodo,
    color: "text-success-strong",
  },
  {
    key: "draft" as const,
    label: "Draft Email",
    icon: Wand2,
    color: "text-plum-strong",
  },
] as const;

type ActionButtonData = (typeof ACTION_BUTTONS)[number];

interface ActionToggleButtonProps {
  action: ActionButtonData;
  isActive: boolean;
  onSetActiveAction: (action: QuickAction) => void;
}

function ActionToggleButton({ action, isActive, onSetActiveAction }: ActionToggleButtonProps) {
  const handleClick = useCallback(() => onSetActiveAction(isActive ? null : action.key), [isActive, action.key, onSetActiveAction]);
  return (
    <Button
      variant={isActive ? "soft" : "outline"}
      size="sm"
      aria-pressed={isActive}
      onClick={handleClick}
    >
      <action.icon className={cn(!isActive && action.color)} />
      {action.label}
    </Button>
  );
}

export function LeadQuickActions({
  activeAction,
  onSetActiveAction,
  noteForm,
  taskForm,
  emailForm,
  callForm,
  onNoteSubmit,
  onTaskSubmit,
  onEmailSubmit,
  onCallSubmit,
  isNotePending,
  isTaskPending,
  isEmailPending,
  isCallPending,
  leadName,
  leadEmail: _leadEmail,
  leadContext,
  onDraftEmail,
}: LeadQuickActionsProps) {
  const handleCancelAction = useCallback(() => onSetActiveAction(null), [onSetActiveAction]);
  const generateEmailMutation = useGenerateEmail();
  const { data: emailTemplates } = useEmailTemplates({ limit: 50 });

  const handleApplyTemplate = useCallback((templateId: string) => {
    const template = emailTemplates?.find((t) => String(t.id) === templateId);
    if (!template) return;
    const applyTokens = (text: string) =>
      text
        .replace(/\{\{lead_name\}\}/gi, leadName ?? "")
        .replace(/\{\{lead_email\}\}/gi, _leadEmail ?? "")
        .replace(/\{\{[^}]*\}\}/g, "");
    const subject = applyTokens(template.subject);
    const body = applyTokens(template.body);
    emailForm.setValue("subject", subject);
    emailForm.setValue("body", body);
  }, [emailTemplates, leadName, _leadEmail, emailForm]);

  const handleGenerateDraft = useCallback(() => {
    if (!leadName) return;
    generateEmailMutation.mutate(
      {
        leadName,
        context: leadContext,
        tone: "formal",
      },
      {
        onSuccess: (result) => {
          if (onDraftEmail) {
            onDraftEmail(result.subject, result.body);
          }
        },
      },
    );
  }, [leadName, leadContext, onDraftEmail, generateEmailMutation]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-sans text-base font-semibold">Quick Actions</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">

        <div className="flex flex-wrap gap-2">
          {ACTION_BUTTONS.map((action) => (
            <ActionToggleButton
              key={action.key}
              action={action}
              isActive={activeAction === action.key}
              onSetActiveAction={onSetActiveAction}
            />
          ))}
        </div>

        {activeAction === "draft" && (
          <div className="space-y-3 rounded-lg border border-border bg-surface-sunken p-4">
            <div className="flex items-start gap-3">
              <div className="flex-1">
                <p className="text-sm font-medium mb-1">AI Email Draft</p>
                <p className="text-xs text-muted-foreground">
                  Generate a professional email for{" "}
                  <span className="font-medium text-foreground">{leadName ?? "this lead"}</span>{" "}
                  using AI. The draft will pre-fill the email form for your review.
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleCancelAction}
              >
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={handleGenerateDraft}
                disabled={generateEmailMutation.isPending || !leadName}
              >
                {generateEmailMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Wand2 className="h-4 w-4 mr-1.5" />
                    Generate
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

        {activeAction === "note" && (
          <Form {...noteForm}>
            <form
              onSubmit={noteForm.handleSubmit(onNoteSubmit)}
              className="space-y-3 rounded-lg border border-border bg-surface-sunken p-4"
            >
              <FormField
                control={noteForm.control}
                name="body"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Note</FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        placeholder="Write a note..."
                        rows={3}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleCancelAction}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  loading={isNotePending}
                >
                  {isNotePending ? "Saving..." : "Save Note"}
                </Button>
              </div>
            </form>
          </Form>
        )}

        {activeAction === "task" && (
          <Form {...taskForm}>
            <form
              onSubmit={taskForm.handleSubmit(onTaskSubmit)}
              className="space-y-3 rounded-lg border border-border bg-surface-sunken p-4"
            >
              <FormField
                control={taskForm.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Task Title</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Follow up with..." />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={taskForm.control}
                name="dueDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Due Date</FormLabel>
                    <FormControl>
                      <DatePicker value={field.value || ""} onChange={field.onChange} placeholder="Select due date" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleCancelAction}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  loading={isTaskPending}
                >
                  {isTaskPending ? "Creating..." : "Create Task"}
                </Button>
              </div>
            </form>
          </Form>
        )}

        {activeAction === "email" && (
          <Form {...emailForm}>
            <form
              onSubmit={emailForm.handleSubmit(onEmailSubmit)}
              className="space-y-3 rounded-lg border border-border bg-surface-sunken p-4"
            >
              {emailTemplates && emailTemplates.length > 0 && (
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                  <Select onValueChange={handleApplyTemplate}>
                    <SelectTrigger className="h-8 text-xs flex-1">
                      <SelectValue placeholder="Use a template…" />
                    </SelectTrigger>
                    <SelectContent>
                      {emailTemplates.map((t) => (
                        <SelectItem key={t.id} value={String(t.id)}>
                          {t.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <FormField
                control={emailForm.control}
                name="to"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>To</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="email@example.com" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={emailForm.control}
                name="subject"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Subject</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Subject" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={emailForm.control}
                name="body"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Body</FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        placeholder="Email body..."
                        rows={4}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleCancelAction}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  loading={isEmailPending}
                >
                  {isEmailPending ? "Sending..." : "Send Email"}
                </Button>
              </div>
            </form>
          </Form>
        )}

        {activeAction === "call" && (
          <Form {...callForm}>
            <form
              onSubmit={callForm.handleSubmit(onCallSubmit)}
              className="space-y-3 rounded-lg border border-border bg-surface-sunken p-4"
            >
              <FormField
                control={callForm.control}
                name="subject"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Subject</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Brief description" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-3">
                <FormField
                  control={callForm.control}
                  name="duration"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Duration (min)</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} placeholder="30" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={callForm.control}
                  name="outcome"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Outcome</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Positive / Follow up" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={callForm.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes</FormLabel>
                    <FormControl>
                      <Textarea {...field} rows={2} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleCancelAction}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  loading={isCallPending}
                >
                  {isCallPending ? "Logging..." : "Log Call"}
                </Button>
              </div>
            </form>
          </Form>
        )}
      </CardContent>
    </Card>
  );
}
