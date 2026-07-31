"use client";

import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import { Plus, Webhook, Trash2, ToggleLeft, ToggleRight, Copy, Eye, EyeOff, ExternalLink } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
      <PageWrapper title="Webhooks" subtitle="Send real-time events to external endpoints">
        <div className="space-y-4">
          {[1, 2].map(i => <Skeleton key={i} className="h-32" />)}
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper
      title="Webhooks"
      subtitle="Send real-time events to external systems when things happen in the CRM"
      actions={
        <Button onClick={() => setSheetOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
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
          webhooks.map((wh) => (
            <motion.div key={wh.id} variants={fadeUp}>
              <Card className="shadow-noir">
                <CardHeader>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`h-2.5 w-2.5 rounded-full shrink-0 ${wh.isActive ? "bg-emerald-500" : "bg-muted-foreground/40"}`} />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <CardTitle className="text-sm truncate">{wh.url}</CardTitle>
                          <button onClick={() => copyUrl(wh.url)} aria-label="Copy URL">
                            <Copy className="h-3 w-3 text-muted-foreground hover:text-foreground transition-colors" />
                          </button>
                        </div>
                        {wh.description && (
                          <p className="text-xs text-muted-foreground mt-0.5">{wh.description}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge variant={wh.isActive ? "default" : "secondary"} className="text-xs">
                        {wh.isActive ? "Active" : "Inactive"}
                      </Badge>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => handleToggle(wh.id, wh.isActive)}
                        aria-label={wh.isActive ? "Disable webhook" : "Enable webhook"}
                      >
                        {wh.isActive
                          ? <ToggleRight className="h-4 w-4 text-emerald-500" />
                          : <ToggleLeft className="h-4 w-4 text-muted-foreground" />}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive hover:text-destructive"
                        onClick={() => setDeleteId(wh.id)}
                        aria-label="Delete webhook"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-1.5">
                    {(wh.events ?? []).length === 0 ? (
                      <span className="text-xs text-muted-foreground">No events selected</span>
                    ) : (
                      (wh.events ?? []).map(ev => (
                        <Badge key={ev} variant="secondary" className="text-[10px]">{ev}</Badge>
                      ))
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-3">
                    Created {new Date(wh.createdAt).toLocaleDateString("en-IN")}
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          ))
        )}
      </motion.div>

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Add Webhook</SheetTitle>
          </SheetHeader>
          <div className="space-y-5 mt-6">
            <div className="space-y-1.5">
              <Label htmlFor="webhook-url">Endpoint URL *</Label>
              <div className="relative">
                <ExternalLink className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
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
              <div className="grid grid-cols-1 gap-2 max-h-[300px] overflow-y-auto pr-1">
                {AVAILABLE_EVENTS.map(ev => (
                  <div key={ev.id} className="flex items-center gap-2">
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
          <SheetFooter className="mt-6">
            <Button variant="outline" className="flex-1" onClick={() => setSheetOpen(false)}>Cancel</Button>
            <Button
              className="flex-1"
              onClick={handleCreate}
              disabled={createWebhook.isPending || !url.trim()}
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
              className="bg-destructive hover:bg-destructive/90"
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
