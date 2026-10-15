"use client";

import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import { Plus, Webhook, Trash2, Copy, ExternalLink } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { Button, buttonVariants } from "@/components/ui/button";
import { StatusPill } from "@/components/ui/status-pill";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from "@/components/ui/sheet";
import { Checkbox } from "@/components/ui/checkbox";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { staggerContainer, fadeUp } from "@/lib/motion-variants";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { toast } from "sonner";
import { DashboardGate } from "@/components/shared/dashboard-gate";
import { DEFAULT_LOCALE } from "@/lib/constants/locale";

const AVAILABLE_EVENTS = [
  { id: "lead.created", label: "Lead Created" },
  { id: "lead.status_changed", label: "Lead Status Changed" },
  { id: "lead.assigned", label: "Lead Assigned" },
  { id: "lead.converted", label: "Lead Converted" },
  { id: "deal.created", label: "Deal Created" },
  { id: "deal.stage_changed", label: "Deal Stage Changed" },
  { id: "deal.won", label: "Deal Won" },
  { id: "deal.lost", label: "Deal Lost" },
  { id: "resignation.submitted", label: "Resignation Submitted" },
  { id: "resignation.approved", label: "Resignation Approved" },
  { id: "termination.submitted", label: "Termination Submitted" },
  { id: "termination.approved", label: "Termination Approved" },
  { id: "invoice.created", label: "Invoice Created" },
  { id: "invoice.paid", label: "Invoice Paid" },
  { id: "employee.onboarded", label: "Employee Onboarded" },
];

interface WebhookEndpoint {
  id: number;
  orgId: string;
  url: string;
  description: string | null;
  events: string[] | null;
  isActive: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

interface CreateWebhookInput {
  url: string;
  description?: string;
  events: string[];
}

function useWebhooks() {
  return useQuery({
    queryKey: ["webhooks"],
    queryFn: () => apiClient.get<WebhookEndpoint[]>("/webhooks"),
  });
}

function useCreateWebhook() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateWebhookInput) => apiClient.post<WebhookEndpoint>("/webhooks", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["webhooks"] }),
  });
}

function useToggleWebhook() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, isActive }: { id: number; isActive: boolean }) =>
      apiClient.patch(`/webhooks/${id}`, { isActive }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["webhooks"] }),
  });
}

function useDeleteWebhook() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => apiClient.delete(`/webhooks/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["webhooks"] }),
  });
}

export default function WebhooksPage() {
  return (
    <DashboardGate allowedRoles={["CEO", "HR"]}>
      <WebhooksContent />
    </DashboardGate>
  );
}

function WebhooksContent() {
  const { data: webhooks, isLoading } = useWebhooks();
  const createWebhook = useCreateWebhook();
  const toggleWebhook = useToggleWebhook();
  const deleteWebhook = useDeleteWebhook();

  const [sheetOpen, setSheetOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [showSecrets, setShowSecrets] = useState<Record<number, boolean>>({});
  const [url, setUrl] = useState("");
  const [description, setDescription] = useState("");
  const [selectedEvents, setSelectedEvents] = useState<string[]>([]);

  const handleCreate = useCallback(async () => {
    if (!url.trim()) { toast.error("URL is required"); return; }
    createWebhook.mutate(
      { url: url.trim(), description: description.trim() || undefined, events: selectedEvents },
      {
        onSuccess: () => {
          toast.success("Webhook created");
          setSheetOpen(false);
          setUrl(""); setDescription(""); setSelectedEvents([]);
        },
        onError: () => toast.error("Failed to create webhook"),
      }
    );
  }, [url, description, selectedEvents, createWebhook]);

  const handleToggle = useCallback((id: number, isActive: boolean) => {
    toggleWebhook.mutate({ id, isActive: !isActive }, {
      onSuccess: () => toast.success(isActive ? "Webhook disabled" : "Webhook enabled"),
      onError: () => toast.error("Failed to update webhook"),
    });
  }, [toggleWebhook]);

  const handleDelete = useCallback(() => {
    if (!deleteId) return;
    deleteWebhook.mutate(deleteId, {
      onSuccess: () => { toast.success("Webhook deleted"); setDeleteId(null); },
      onError: () => toast.error("Failed to delete webhook"),
    });
  }, [deleteId, deleteWebhook]);

  const toggleEvent = useCallback((eventId: string) => {
    setSelectedEvents(prev =>
      prev.includes(eventId) ? prev.filter(e => e !== eventId) : [...prev, eventId]
    );
  }, []);

  const copyUrl = useCallback((url: string) => {
    navigator.clipboard.writeText(url);
    toast.success("URL copied");
  }, []);

  if (isLoading) {
    return (
      <PageWrapper title="Webhooks">
        <div className="space-y-4">
          {[1, 2].map(i => <Skeleton key={i} className="h-32" />)}
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper
      title="Webhooks"
      actions={
        <Button onClick={() => setSheetOpen(true)}>
          <Plus aria-hidden />
          Add Webhook
        </Button>
      }
    >
      <motion.div className="space-y-4" variants={staggerContainer} initial="hidden" animate="visible">
        {(!webhooks || webhooks.length === 0) ? (
          <motion.div variants={fadeUp}>
            <EmptyState
              compact
              icon={Webhook}
              title="No webhooks configured"
              description="Webhooks let external services receive notifications when events happen in your CRM."
              action={{ label: "Add your first webhook", onClick: () => setSheetOpen(true) }}
            />
          </motion.div>
        ) : (
          <motion.div variants={fadeUp}>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Endpoint</TableHead>
                  <TableHead>Events</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right"><span className="sr-only">Actions</span></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {webhooks.map((wh) => (
                  <TableRow key={wh.id}>
                    <TableCell className="max-w-72">
                      <div className="flex items-center gap-1.5">
                        <span className="truncate font-mono text-xs font-medium" title={wh.url}>{wh.url}</span>
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          className="shrink-0 text-muted-foreground"
                          onClick={() => copyUrl(wh.url)}
                          aria-label="Copy URL"
                        >
                          <Copy aria-hidden />
                        </Button>
                      </div>
                      {wh.description && (
                        <p className="truncate text-xs text-muted-foreground" title={wh.description}>{wh.description}</p>
                      )}
                    </TableCell>
                    <TableCell className="max-w-80 whitespace-normal">
                      <div className="flex flex-wrap gap-1">
                        {(wh.events ?? []).length === 0 ? (
                          <span className="text-xs text-muted-foreground">No events selected</span>
                        ) : (
                          (wh.events ?? []).map(ev => (
                            <Badge key={ev} variant="secondary" className="font-mono text-2xs">{ev}</Badge>
                          ))
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <StatusPill tone={wh.isActive ? "success" : "neutral"} dot>
                        {wh.isActive ? "Active" : "Inactive"}
                      </StatusPill>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground tabular-nums">
                      Created {new Date(wh.createdAt).toLocaleDateString(DEFAULT_LOCALE)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-2">
                        <Switch
                          checked={wh.isActive}
                          onCheckedChange={() => handleToggle(wh.id, wh.isActive)}
                          disabled={toggleWebhook.isPending}
                          aria-label={wh.isActive ? "Disable webhook" : "Enable webhook"}
                        />
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          className="text-muted-foreground hover:bg-danger-soft hover:text-destructive"
                          onClick={() => setDeleteId(wh.id)}
                          aria-label="Delete webhook"
                        >
                          <Trash2 aria-hidden />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </motion.div>
        )}
      </motion.div>

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent size="md" className="w-full">
          <SheetHeader className="border-b border-border">
            <SheetTitle>Add Webhook</SheetTitle>
          </SheetHeader>
          <div className="flex-1 space-y-5 overflow-y-auto px-4 py-5">
            <div className="space-y-1.5">
              <Label htmlFor="webhook-url">Endpoint URL *</Label>
              <div className="relative">
                <ExternalLink className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" aria-hidden />
                <Input
                  id="webhook-url"
                  className="pl-9"
                  placeholder="https://your-server.com/webhook"
                  value={url}
                  onChange={e => setUrl(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="webhook-desc">Description (optional)</Label>
              <Input
                id="webhook-desc"
                placeholder="e.g. Notify Slack on deal won"
                value={description}
                onChange={e => setDescription(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Events to send</Label>
              <div className="grid grid-cols-1 gap-1 rounded-md border border-border p-1">
                {AVAILABLE_EVENTS.map(ev => (
                  <div key={ev.id} className="flex items-center gap-2 rounded-sm px-2 py-1.5 hover:bg-accent">
                    <Checkbox
                      id={`ev-${ev.id}`}
                      checked={selectedEvents.includes(ev.id)}
                      onCheckedChange={() => toggleEvent(ev.id)}
                    />
                    <label htmlFor={`ev-${ev.id}`} className="text-sm cursor-pointer">
                      <span className="font-mono text-xs text-muted-foreground mr-2">{ev.id}</span>
                      {ev.label}
                    </label>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <SheetFooter>
            <Button variant="ghost" onClick={() => setSheetOpen(false)}>Cancel</Button>
            <Button
              onClick={handleCreate}
              disabled={createWebhook.isPending || !url.trim()}
              loading={createWebhook.isPending}
            >
              {createWebhook.isPending ? "Creating..." : "Create Webhook"}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <AlertDialog open={deleteId !== null} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Webhook?</AlertDialogTitle>
            <AlertDialogDescription>
              This webhook will stop receiving events immediately. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className={buttonVariants({ variant: "destructive" })}
              onClick={handleDelete}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageWrapper>
  );
}
