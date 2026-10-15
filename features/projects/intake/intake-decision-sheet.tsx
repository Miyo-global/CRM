"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useUpdateIntakeRequest } from "@/lib/api/hooks/projects";
import { getErrorMessage } from "@/lib/get-error-message";
import type { IntakeRequest, ProjectWithDetails } from "@/types/projects";
import {
  acceptSchema,
  declineSchema,
  duplicateSchema,
  type AcceptValues,
  type DeclineValues,
  type DuplicateValues,
} from "./intake-decision-schemas";

export type Decision = "accept" | "decline" | "duplicate";
const UNASSIGNED = "none";

type Props = {
  decision: Decision | null;
  item: IntakeRequest | null;
  project: ProjectWithDetails;
  onDone: () => void;
  onCancel: () => void;
};

function personName(u: { name: string | null; firstName: string | null; lastName: string | null; email: string | null }) {
  return u.name || [u.firstName, u.lastName].filter(Boolean).join(" ") || u.email || "Unnamed";
}

export function IntakeDecisionSheet({ decision, item, project, onDone, onCancel }: Props) {
  const update = useUpdateIntakeRequest();
  const statuses = [...(project.statuses ?? [])].sort((a, b) => a.order - b.order);
  const accept = useForm<AcceptValues>({
    resolver: zodResolver(acceptSchema),
    defaultValues: { ticketStatus: statuses[0]?.name ?? "TODO", priority: "MEDIUM", assigneeId: UNASSIGNED },
  });
  const decline = useForm<DeclineValues>({ resolver: zodResolver(declineSchema), defaultValues: { reason: "" } });
  const duplicate = useForm<DuplicateValues>({ resolver: zodResolver(duplicateSchema), defaultValues: { ticketId: "" } });

  if (!item || !decision) return null;

  const send = (payload: Record<string, unknown>, success: string, setError: (message: string) => void) =>
    update.mutate(
      { id: item.id, projectId: project.id, ...payload },
      {
        onSuccess: () => {
          toast.success(success);
          accept.reset();
          decline.reset();
          duplicate.reset();
          onDone();
        },
        onError: (error) => setError(getErrorMessage(error)),
      },
    );

  const title = { accept: "Accept request", decline: "Decline request", duplicate: "Mark as duplicate" }[decision];
  const footer = (label: string) => (
    <SheetFooter className="mt-6">
      <Button type="button" variant="outline" onClick={onCancel} disabled={update.isPending}>Cancel</Button>
      <Button type="submit" loading={update.isPending} disabled={update.isPending}>{label}</Button>
    </SheetFooter>
  );

  return (
    <Sheet open onOpenChange={(open) => !open && onCancel()}>
      <SheetContent side="right" size="sm" className="overflow-y-auto max-sm:w-full max-sm:max-w-full">
        <SheetHeader>
          <SheetTitle>{title}</SheetTitle>
          <SheetDescription className="line-clamp-2">{item.title}</SheetDescription>
        </SheetHeader>
        <div className="p-4">
          {decision === "accept" && (
            <Form {...accept}>
              <form
                className="space-y-4"
                onSubmit={accept.handleSubmit((v) =>
                  send(
                    { status: "accepted", ticketStatus: v.ticketStatus, priority: v.priority, assigneeId: v.assigneeId === UNASSIGNED ? undefined : v.assigneeId },
                    "Accepted the request and created a ticket",
                    (m) => accept.setError("ticketStatus", { message: m }),
                  ),
                )}
              >
                <FormField control={accept.control} name="ticketStatus" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Board column</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>
                        {statuses.map((s) => <SelectItem key={s.id} value={s.name}>{s.name.replace(/_/g, " ")}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={accept.control} name="priority" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Priority</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>
                        {(["URGENT", "HIGH", "MEDIUM", "LOW"] as const).map((p) => <SelectItem key={p} value={p}>{p.charAt(0) + p.slice(1).toLowerCase()}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </FormItem>
                )} />
                <FormField control={accept.control} name="assigneeId" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Assignee</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value={UNASSIGNED}>Unassigned</SelectItem>
                        {(project.members ?? []).filter((m) => m.user).map((m) => (
                          <SelectItem key={m.userId} value={m.userId}>{personName(m.user!)}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormItem>
                )} />
                {footer("Accept and create ticket")}
              </form>
            </Form>
          )}
          {decision === "decline" && (
            <Form {...decline}>
              <form
                className="space-y-4"
                onSubmit={decline.handleSubmit((v) =>
                  send({ status: "declined", declineReason: v.reason }, "Declined the request", (m) => decline.setError("reason", { message: m })),
                )}
              >
                <FormField control={decline.control} name="reason" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Reason</FormLabel>
                    <FormControl><Textarea {...field} className="min-h-28" autoFocus /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                {footer("Decline")}
              </form>
            </Form>
          )}
          {decision === "duplicate" && (
            <Form {...duplicate}>
              <form
                className="space-y-4"
                onSubmit={duplicate.handleSubmit((v) =>
                  send({ status: "duplicate", linkedWorkItemId: Number(v.ticketId) }, "Marked the request as a duplicate", (m) => duplicate.setError("ticketId", { message: m })),
                )}
              >
                <FormField control={duplicate.control} name="ticketId" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Existing ticket</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Choose a ticket" /></SelectTrigger></FormControl>
                      <SelectContent>
                        {(project.tickets ?? []).slice(0, 200).map((t) => (
                          <SelectItem key={t.id} value={String(t.id)}>{project.key}-{t.ticketNumber} {t.title}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
                {footer("Mark as duplicate")}
              </form>
            </Form>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
