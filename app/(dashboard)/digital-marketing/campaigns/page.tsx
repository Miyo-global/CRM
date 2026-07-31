"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter,
} from "@/components/ui/sheet";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Plus, Megaphone, IndianRupee, TrendingUp, Target,
  Pencil, Trash2, Eye, Users,
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useDmCampaigns, useDmCampaignStats, useCreateDmCampaign, useUpdateDmCampaign, useDeleteDmCampaign } from "@/lib/api/hooks/dm";
import type { DmCampaign } from "@/types/dm";
import { queryKeys } from "@/lib/query-keys";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { EmptyActivityIllustration } from "@/components/illustrations";
import { EmptyState } from "@/components/ui/empty-state";
import { format } from "date-fns";
import { formatINRWhole as formatINR } from "@/lib/format-utils";

function fmtDate(d: string | null | undefined) {
  if (!d) return "";
  try { return format(new Date(d), "dd MMM yyyy"); } catch { return d; }
}

const STATUS_COLORS: Record<string, string> = {
  active: "bg-green-500/15 text-green-700 dark:text-green-400",
  paused: "bg-yellow-500/15 text-yellow-700 dark:text-yellow-400",
  completed: "bg-blue-500/15 text-blue-700 dark:text-blue-400",
};

export default function CampaignsPage() {
  const [showCreate, setShowCreate] = useState(false);
  const [formData, setFormData] = useState({ name: "", budgetAllocated: "", status: "active" as "active" | "paused" | "completed" });
  const [editingCampaign, setEditingCampaign] = useState<DmCampaign | null>(null);
  const [editForm, setEditForm] = useState({ name: "", budgetAllocated: "", status: "active" as "active" | "paused" | "completed" });
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [previewCampaign, setPreviewCampaign] = useState<DmCampaign | null>(null);

  const qc = useQueryClient();
  const { data: stats } = useDmCampaignStats();
  const { data, isLoading } = useDmCampaigns();
  const createMutation = useCreateDmCampaign();
  const updateMutation = useUpdateDmCampaign();
  const deleteMutation = useDeleteDmCampaign();

  const campaigns = data?.campaigns ?? [];

  useEffect(() => {
    if (editingCampaign) {
      setEditForm({
        name: editingCampaign.name,
        budgetAllocated: editingCampaign.budgetAllocated ?? "",
        status: editingCampaign.status ?? "active",
      });
    }
  }, [editingCampaign]);

  const handleCreate = () => {
    if (!formData.name.trim()) return;
    if (formData.budgetAllocated !== "" && (!Number.isFinite(Number(formData.budgetAllocated)) || Number(formData.budgetAllocated) < 0)) {
      toast.error("Budget must be a non-negative number");
      return;
    }
    createMutation.mutate(
      formData,
      {
        onSuccess: () => { qc.invalidateQueries({ queryKey: queryKeys.dmCampaigns.all }); toast.success("Campaign created"); setShowCreate(false); setFormData({ name: "", budgetAllocated: "", status: "active" }); },
        onError: (err) => toast.error(err.message),
      }
    );
  };

  const handleEdit = () => {
    if (!editingCampaign || !editForm.name.trim()) return;
    if (editForm.budgetAllocated !== "" && (!Number.isFinite(Number(editForm.budgetAllocated)) || Number(editForm.budgetAllocated) < 0)) {
      toast.error("Budget must be a non-negative number");
      return;
    }
    updateMutation.mutate(
      { id: editingCampaign.id, name: editForm.name, budgetAllocated: editForm.budgetAllocated || undefined, status: editForm.status },
      {
        onSuccess: () => {
          toast.success("Campaign updated");
          setEditingCampaign(null);
        },
        onError: (err) => toast.error(err.message),
      },
    );
  };

  const handleDelete = () => {
    if (!deleteId) return;
    deleteMutation.mutate(deleteId, {
      onSuccess: () => {
        toast.success("Campaign deleted");
        setDeleteId(null);
      },
      onError: (err) => toast.error(err.message),
    });
  };

  return (
    <PageWrapper
      title="Campaign Management"
      subtitle="Manage marketing campaigns and track ROI"
      actions={
        <Button onClick={() => setShowCreate(true)}><Plus className="h-4 w-4 mr-1" /> New Campaign</Button>
      }
    >
      <div className="space-y-6">
        <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
          {[
            { label: "Active Campaigns", value: stats?.active ?? 0, icon: Megaphone, color: "text-emerald-400" },
            { label: "Total Budget", value: formatINR(stats?.totalBudget), icon: IndianRupee, color: "text-blue-400" },
            { label: "Total Spent", value: formatINR(stats?.totalSpent), icon: TrendingUp, color: "text-amber-400" },
            { label: "Avg CPL", value: formatINR(stats?.avgCpl), icon: Target, color: "text-purple-400" },
          ].map(s => (
            <Card key={s.label}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <s.icon className={cn("h-5 w-5", s.color)} />
                  <span className={cn("text-xl font-bold tabular-nums", s.color)}>{s.value}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <ScrollArea className="w-full max-h-[60vh]" type="auto">
            <div className="min-w-[760px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Campaign</TableHead>
                    <TableHead className="text-xs">Status</TableHead>
                    <TableHead className="text-xs">Budget</TableHead>
                    <TableHead className="text-xs">Spent</TableHead>
                    <TableHead className="text-xs">Leads</TableHead>
                    <TableHead className="text-xs">CPL</TableHead>
                    <TableHead className="text-xs">ROI</TableHead>
                    <TableHead className="text-xs w-[90px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    Array.from({ length: 4 }).map((_, i) => (
                      <TableRow key={i}><TableCell colSpan={8} className="h-12"><Skeleton className="h-4 w-full" /></TableCell></TableRow>
                    ))
                  ) : campaigns.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8}>
                        <EmptyState
                          compact
                          illustration={<EmptyActivityIllustration className="h-32 w-32 opacity-95" />}
                          title="No campaigns yet"
                          description="Create your first campaign to start tracking marketing ROI."
                          action={{ label: "New Campaign", onClick: () => setShowCreate(true) }}
                          className="border-0 bg-transparent"
                        />
                      </TableCell>
                    </TableRow>
                  ) : (
                    campaigns.map((c) => (
                      <TableRow key={c.id}>
                        <TableCell className="text-sm font-medium">{c.name}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={cn("text-[10px]",
                            c.status === "active" && "text-emerald-400 bg-emerald-500/10",
                            c.status === "paused" && "text-amber-400 bg-amber-500/10",
                            c.status === "completed" && "text-muted-foreground",
                          )}>{c.status}</Badge>
                        </TableCell>
                        <TableCell className="text-xs font-mono">{formatINR(c.budgetAllocated)}</TableCell>
                        <TableCell className="text-xs font-mono">{formatINR(c.budgetSpent)}</TableCell>
                        <TableCell className="text-xs font-mono">{c.leadsGenerated ?? 0}</TableCell>
                        <TableCell className="text-xs font-mono">{formatINR(c.costPerLead)}</TableCell>
                        <TableCell className="text-xs font-mono">{c.roi ? `${c.roi}%` : ""}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-0.5">
                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground" onClick={() => setPreviewCampaign(c)} aria-label="Preview">
                              <Eye className="h-3.5 w-3.5" />
                            </Button>
                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground" onClick={() => setEditingCampaign(c)} aria-label="Edit">
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive" onClick={() => setDeleteId(c.id)} aria-label="Delete">
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </ScrollArea>
        </Card>
      </div>

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Create Campaign</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5"><Label>Name *</Label><Input value={formData.name} onChange={(e) => setFormData(f => ({ ...f, name: e.target.value }))} /></div>
            <div className="space-y-1.5"><Label>Budget Allocated</Label><Input type="number" value={formData.budgetAllocated} onChange={(e) => setFormData(f => ({ ...f, budgetAllocated: e.target.value }))} /></div>
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={formData.status} onValueChange={(v) => setFormData(f => ({ ...f, status: v as "active" | "paused" | "completed" }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="paused">Paused</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button disabled={!formData.name} onClick={handleCreate}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editingCampaign} onOpenChange={(open) => { if (!open) setEditingCampaign(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Edit Campaign</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5"><Label>Name *</Label><Input value={editForm.name} onChange={(e) => setEditForm(f => ({ ...f, name: e.target.value }))} /></div>
            <div className="space-y-1.5"><Label>Budget Allocated</Label><Input type="number" value={editForm.budgetAllocated} onChange={(e) => setEditForm(f => ({ ...f, budgetAllocated: e.target.value }))} /></div>
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={editForm.status} onValueChange={(v) => setEditForm(f => ({ ...f, status: v as "active" | "paused" | "completed" }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="paused">Paused</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingCampaign(null)}>Cancel</Button>
            <Button disabled={!editForm.name || updateMutation.isPending} onClick={handleEdit}>
              {updateMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Sheet open={!!previewCampaign} onOpenChange={(open) => { if (!open) setPreviewCampaign(null); }}>
        <SheetContent className="flex flex-col p-0 gap-0 sm:max-w-md">
          <SheetHeader className="shrink-0 px-5 pt-5 pb-4 border-b">
            <SheetTitle className="text-base">{previewCampaign?.name}</SheetTitle>
            <SheetDescription className="text-xs">Campaign details</SheetDescription>
          </SheetHeader>
          <ScrollArea className="flex-1 min-h-0">
            {previewCampaign && (
              <div className="px-5 py-4 space-y-5">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium ${STATUS_COLORS[previewCampaign.status] ?? "bg-muted text-muted-foreground"}`}>
                    {previewCampaign.status}
                  </span>
                </div>
                <Separator />
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-0.5">
                    <p className="text-xs text-muted-foreground">Budget Allocated</p>
                    <p className="text-sm font-semibold">{formatINR(previewCampaign.budgetAllocated)}</p>
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-xs text-muted-foreground">Budget Spent</p>
                    <p className="text-sm font-semibold">{formatINR(previewCampaign.budgetSpent)}</p>
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-xs text-muted-foreground flex items-center gap-1"><Users className="h-3 w-3" /> Leads</p>
                    <p className="text-sm font-semibold">{previewCampaign.leadsGenerated ?? 0}</p>
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-xs text-muted-foreground flex items-center gap-1"><TrendingUp className="h-3 w-3" /> ROI</p>
                    <p className="text-sm font-semibold">{previewCampaign.roi ? `${previewCampaign.roi}%` : ""}</p>
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-xs text-muted-foreground">Cost Per Lead</p>
                    <p className="text-sm font-semibold">{formatINR(previewCampaign.costPerLead)}</p>
                  </div>
                </div>
                <Separator />
                <div className="space-y-3">
                  <div className="space-y-0.5">
                    <p className="text-xs text-muted-foreground">Created</p>
                    <p className="text-sm">{fmtDate(String(previewCampaign.createdAt))}</p>
                  </div>
                </div>
              </div>
            )}
          </ScrollArea>
          <SheetFooter className="shrink-0 px-5 py-4 border-t">
            <Button
              className="w-full"
              onClick={() => { setPreviewCampaign(null); setEditingCampaign(previewCampaign); }}
            >
              <Pencil className="h-3.5 w-3.5 mr-1.5" />
              Edit Campaign
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <ConfirmDialog
        open={deleteId !== null}
        onOpenChange={(open) => { if (!open) setDeleteId(null); }}
        title="Delete Campaign?"
        description="This action cannot be undone."
        confirmLabel="Delete"
        destructive
        onConfirm={handleDelete}
      />
    </PageWrapper>
  );
}
