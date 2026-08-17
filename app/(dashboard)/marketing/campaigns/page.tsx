"use client";

import { useState, useCallback, useEffect } from "react";
import { EmptyActivityIllustration } from "@/components/illustrations";
import {
  Plus,
  Trash2,
  Pencil,
  Eye,
  CalendarDays,
  TrendingUp,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
} from "@/components/ui/alert-dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { DatePicker } from "@/components/ui/date-picker";
import { HrSheet } from "@/features/hr/hr-sheet";
import {
  useMarketingCampaigns,
  useCreateMarketingCampaign,
  useUpdateMarketingCampaign,
  useDeleteMarketingCampaign,
} from "@/lib/api/hooks/crm";
import type { MarketingCampaign } from "@/lib/api/hooks/crm";
import { getErrorMessage } from "@/lib/get-error-message";
import { toast } from "sonner";
import { format } from "date-fns";
import { CURRENCY_SYMBOL, DEFAULT_LOCALE } from "@/lib/constants/locale";

function fmt(amount: string | number | null | undefined) {
  if (!amount) return "";
  return `${CURRENCY_SYMBOL}${Number(amount).toLocaleString(DEFAULT_LOCALE, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

const STATUS_COLORS: Record<string, string> = {
  active: "bg-green-500/15 text-green-700 dark:text-green-400",
  paused: "bg-yellow-500/15 text-yellow-700 dark:text-yellow-400",
  completed: "bg-blue-500/15 text-blue-700 dark:text-blue-400",
};

function fmtDate(d: string | null | undefined) {
  if (!d) return "";
  try { return format(new Date(d), "dd MMM yyyy"); } catch { return d; }
}

interface FormState {
  name: string;
  channel: string;
  status: string;
  description: string;
  budget: string;
  targetAudience: string;
  startDate: string;
  endDate: string;
}

const EMPTY_FORM: FormState = {
  name: "", channel: "", status: "active", description: "",
  budget: "", targetAudience: "", startDate: "", endDate: "",
};

export default function CampaignsPage() {
  const [createOpen, setCreateOpen] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<MarketingCampaign | null>(null);
  const [previewCampaign, setPreviewCampaign] = useState<MarketingCampaign | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);

  const { data, isLoading } = useMarketingCampaigns();
  const createCampaign = useCreateMarketingCampaign();
  const updateCampaign = useUpdateMarketingCampaign();
  const deleteCampaign = useDeleteMarketingCampaign();

  const items: MarketingCampaign[] = Array.isArray(data) ? data : [];

  useEffect(() => {
    if (editingCampaign) {
      setForm({
        name: editingCampaign.name,
        channel: editingCampaign.channel ?? "",
        status: editingCampaign.status ?? "active",
        description: editingCampaign.description ?? "",
        budget: editingCampaign.budgetAllocated ?? "",
        targetAudience: editingCampaign.targetAudience ?? "",
        startDate: editingCampaign.startDate ?? "",
        endDate: editingCampaign.endDate ?? "",
      });
    }
  }, [editingCampaign]);

  const resetForm = useCallback(() => setForm(EMPTY_FORM), []);

  const handleCreate = useCallback(() => {
    if (!form.name.trim()) { toast.error("Campaign name is required"); return; }
    createCampaign.mutate(
      {
        name: form.name.trim(),
        channel: form.channel || undefined,
        description: form.description || undefined,
        budgetAllocated: form.budget || undefined,
        targetAudience: form.targetAudience || undefined,
        startDate: form.startDate || undefined,
        endDate: form.endDate || undefined,
      },
      {
        onSuccess: () => { toast.success("Campaign created"); setCreateOpen(false); resetForm(); },
        onError: (e) => toast.error(getErrorMessage(e)),
      },
    );
  }, [form, createCampaign, resetForm]);

  const handleUpdate = useCallback(() => {
    if (!editingCampaign) return;
    if (!form.name.trim()) { toast.error("Campaign name is required"); return; }
    updateCampaign.mutate(
      {
        id: editingCampaign.id,
        name: form.name.trim(),
        status: form.status || undefined,
        channel: form.channel || undefined,
        description: form.description || undefined,
        budgetAllocated: form.budget || undefined,
        targetAudience: form.targetAudience || undefined,
        startDate: form.startDate || undefined,
        endDate: form.endDate || undefined,
      },
      {
        onSuccess: () => { toast.success("Campaign updated"); setEditingCampaign(null); resetForm(); },
        onError: (e) => toast.error(getErrorMessage(e)),
      },
    );
  }, [editingCampaign, form, updateCampaign, resetForm]);

  const handleDelete = useCallback(() => {
    if (!deleteId) return;
    deleteCampaign.mutate(deleteId, {
      onSuccess: () => { toast.success("Campaign deleted"); setDeleteId(null); },
      onError: (e) => toast.error(getErrorMessage(e)),
    });
  }, [deleteId, deleteCampaign]);

  const formFields = (
    <>
      <div className="space-y-1.5">
        <label className="text-sm font-medium">Campaign Name</label>
        <Input value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Q2 LinkedIn Ads" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Channel</label>
          <Select value={form.channel} onValueChange={(v) => setForm(f => ({ ...f, channel: v }))}>
            <SelectTrigger><SelectValue placeholder="Select channel" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="Organic Search">Organic Search</SelectItem>
              <SelectItem value="Paid Ads">Paid Ads</SelectItem>
              <SelectItem value="Social Media">Social Media</SelectItem>
              <SelectItem value="Email">Email</SelectItem>
              <SelectItem value="Referral">Referral</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Status</label>
          <Select value={form.status} onValueChange={(v) => setForm(f => ({ ...f, status: v }))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="paused">Paused</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="space-y-1.5">
        <label className="text-sm font-medium">Description</label>
        <Textarea value={form.description} onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Campaign details..." rows={3} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Budget (₹)</label>
          <Input value={form.budget} onChange={(e) => setForm(f => ({ ...f, budget: e.target.value }))} type="text" placeholder="e.g. 100000" />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Target Audience</label>
          <Input value={form.targetAudience} onChange={(e) => setForm(f => ({ ...f, targetAudience: e.target.value }))} placeholder="e.g. HNIs in Mumbai" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Start Date</label>
          <DatePicker value={form.startDate} onChange={(v) => setForm(f => ({ ...f, startDate: v }))} placeholder="Start date" />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">End Date</label>
          <DatePicker value={form.endDate} onChange={(v) => setForm(f => ({ ...f, endDate: v }))} placeholder="End date" />
        </div>
      </div>
    </>
  );

  return (
    <PageWrapper
      title="Campaigns"
      subtitle="Manage marketing campaigns"
      actions={
        <Button size="sm" onClick={() => { resetForm(); setCreateOpen(true); }}>
          <Plus className="h-3.5 w-3.5 mr-1.5" />
          New Campaign
        </Button>
      }
    >
      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">
          <EmptyActivityIllustration className="mx-auto mb-4 h-40 w-40 opacity-90 animate-pulse" />
          Loading campaigns...
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <EmptyActivityIllustration className="mx-auto mb-4 h-40 w-40 opacity-95" />
          No campaigns yet. Create your first campaign.
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((c) => (
            <div key={c.id} className="rounded-lg border border-border bg-card p-4 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-semibold truncate">{c.name}</h3>
                  {c.description && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{c.description}</p>}
                </div>
                <div className="flex items-center gap-0.5 shrink-0">
                  <Button
                    size="sm" variant="ghost"
                    className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                    onClick={() => setPreviewCampaign(c)}
                    aria-label="Preview campaign"
                  >
                    <Eye className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    size="sm" variant="ghost"
                    className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                    onClick={() => setEditingCampaign(c)}
                    aria-label="Edit campaign"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    size="sm" variant="ghost"
                    className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                    onClick={() => setDeleteId(c.id)}
                    aria-label="Delete campaign"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium ${STATUS_COLORS[c.status] ?? "bg-muted text-muted-foreground"}`}>{c.status}</span>
                {c.channel && <Badge variant="outline" className="text-[11px]">{c.channel}</Badge>}
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div><p className="text-muted-foreground">Budget</p><p className="font-medium">{fmt(c.budgetAllocated)}</p></div>
                <div><p className="text-muted-foreground">Leads</p><p className="font-medium">{c.leads ?? 0}</p></div>
              </div>
            </div>
          ))}
        </div>
      )}

      <HrSheet
        open={createOpen}
        onOpenChange={setCreateOpen}
        title="Create Campaign"
        description="Launch a new marketing campaign."
        onSubmit={handleCreate}
        submitLabel="Create"
        isPending={createCampaign.isPending}
      >
        {formFields}
      </HrSheet>

      <HrSheet
        open={!!editingCampaign}
        onOpenChange={(open) => { if (!open) { setEditingCampaign(null); resetForm(); } }}
        title="Edit Campaign"
        description="Update campaign details."
        onSubmit={handleUpdate}
        submitLabel="Save Changes"
        isPending={updateCampaign.isPending}
      >
        {formFields}
      </HrSheet>

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
                  {previewCampaign.channel && (
                    <Badge variant="outline" className="text-xs">{previewCampaign.channel}</Badge>
                  )}
                </div>

                {previewCampaign.description && (
                  <p className="text-sm text-muted-foreground">{previewCampaign.description}</p>
                )}

                <Separator />

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-0.5">
                    <p className="text-xs text-muted-foreground">Budget Allocated</p>
                    <p className="text-sm font-semibold">{fmt(previewCampaign.budgetAllocated)}</p>
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-xs text-muted-foreground">Budget Spent</p>
                    <p className="text-sm font-semibold">{fmt(previewCampaign.budgetSpent ?? previewCampaign.spend)}</p>
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-xs text-muted-foreground flex items-center gap-1"><Users className="h-3 w-3" /> Leads</p>
                    <p className="text-sm font-semibold">{previewCampaign.leads ?? 0}</p>
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-xs text-muted-foreground flex items-center gap-1"><TrendingUp className="h-3 w-3" /> ROI</p>
                    <p className="text-sm font-semibold">{previewCampaign.roi ? `${previewCampaign.roi}%` : ""}</p>
                  </div>
                </div>

                <Separator />

                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm">
                    <CalendarDays className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="text-muted-foreground">Duration:</span>
                    <span className="font-medium">{fmtDate(previewCampaign.startDate)} – {fmtDate(previewCampaign.endDate)}</span>
                  </div>
                  {previewCampaign.targetAudience && (
                    <div className="space-y-0.5">
                      <p className="text-xs text-muted-foreground">Target Audience</p>
                      <p className="text-sm">{previewCampaign.targetAudience}</p>
                    </div>
                  )}
                  <div className="space-y-0.5">
                    <p className="text-xs text-muted-foreground">Created</p>
                    <p className="text-sm">{fmtDate(previewCampaign.createdAt)}</p>
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

      <AlertDialog open={deleteId !== null} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Campaign?</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deleteCampaign.isPending}>
              {deleteCampaign.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageWrapper>
  );
}
