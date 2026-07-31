"use client";

import { useState, useCallback, useMemo } from "react";
import {
  Plus,
  Send,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { HrSheet } from "@/features/hr/hr-sheet";
import {
  useEmailCampaigns,
  useCreateEmailCampaign,
  useSendEmailCampaign,
  useCampaignLeads,
  useBulkSendCampaign,
} from "@/lib/api/hooks/crm";
import type { EmailCampaign, CampaignLeadFilters } from "@/lib/api/hooks/crm";
import { getErrorMessage } from "@/lib/get-error-message";
import { toast } from "sonner";
import { EmptyMailIllustration } from "@/components/illustrations";
import { EmptyState } from "@/components/ui/empty-state";

const STATUS_BADGE: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  draft: { label: "Draft", variant: "secondary" },
  scheduled: { label: "Scheduled", variant: "default" },
  sending: { label: "Sending", variant: "default" },
  sent: { label: "Sent", variant: "outline" },
  failed: { label: "Failed", variant: "destructive" },
};

const LEAD_STATUSES = [
  { value: "NEW", label: "New" },
  { value: "CONTACTED", label: "Contacted" },
  { value: "INTERESTED", label: "Interested" },
  { value: "QUALIFIED", label: "Qualified" },
  { value: "CONVERTED", label: "Converted" },
  { value: "LOST", label: "Lost" },
];

const LEAD_SOURCES = [
  { value: "referral", label: "Referral" },
  { value: "campaign", label: "Campaign" },
  { value: "cold_call", label: "Cold Call" },
  { value: "website", label: "Website" },
  { value: "social_media", label: "Social Media" },
  { value: "walk_in", label: "Walk In" },
  { value: "other", label: "Other" },
];


interface BulkSendDialogProps {
  campaign: EmailCampaign | null;
  onClose: () => void;
}

function BulkSendDialog({ campaign, onClose }: BulkSendDialogProps) {
  const [filters, setFilters] = useState<CampaignLeadFilters>({});
  const [search, setSearch] = useState("");

  const debouncedFilters = useMemo<CampaignLeadFilters>(
    () => ({ ...filters, q: search || undefined }),
    [filters, search],
  );

  const { data, isLoading } = useCampaignLeads(debouncedFilters);
  const bulkSend = useBulkSendCampaign();

  const leads = data?.leads ?? [];
  const total = data?.total ?? 0;

  const handleSend = useCallback(() => {
    if (!campaign || leads.length === 0) return;
    const leadIds = leads.map((l) => l.id);
    bulkSend.mutate(
      { campaignId: campaign.id, leadIds },
      {
        onSuccess: (result) => {
          toast.success(`Campaign sent to ${result?.sent ?? 0} leads`);
          onClose();
        },
        onError: (e) => toast.error(getErrorMessage(e)),
      },
    );
  }, [campaign, leads, bulkSend, onClose]);

  return (
    <Dialog open={campaign !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Send Campaign: {campaign?.name}</DialogTitle>
          <DialogDescription>
            Filter leads with an email address and send this campaign to them.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Select
            value={filters.status ?? ""}
            onValueChange={(v) =>
              setFilters((prev) => ({ ...prev, status: v === "all" ? undefined : v }))
            }
          >
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {LEAD_STATUSES.map((s) => (
                <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={filters.source ?? ""}
            onValueChange={(v) =>
              setFilters((prev) => ({ ...prev, source: v === "all" ? undefined : v }))
            }
          >
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder="All sources" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All sources</SelectItem>
              {LEAD_SOURCES.map((s) => (
                <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Input
            placeholder="Search name, email, company…"
            className="h-8 text-xs"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <p className="text-sm text-muted-foreground">
          {isLoading
            ? "Counting leads…"
            : `Found ${total} lead${total === 1 ? "" : "s"} with email addresses`}
        </p>

        <ScrollArea className="h-64 w-full rounded-md border">
          {isLoading ? (
            <div className="p-3 space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-8 w-full" />
              ))}
            </div>
          ) : leads.length === 0 ? (
            <div className="flex items-center justify-center h-full text-sm text-muted-foreground py-8">
              No leads match your filters.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Name</TableHead>
                  <TableHead className="text-xs">Email</TableHead>
                  <TableHead className="text-xs">Company</TableHead>
                  <TableHead className="text-xs">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {leads.map((lead) => {
                  const badge = STATUS_BADGE[lead.status.toLowerCase()] ?? { label: lead.status, variant: "secondary" as const };
                  return (
                    <TableRow key={lead.id}>
                      <TableCell className="text-xs py-2 font-medium">{lead.name}</TableCell>
                      <TableCell className="text-xs py-2 text-muted-foreground">{lead.email}</TableCell>
                      <TableCell className="text-xs py-2 text-muted-foreground">{lead.company ?? ""}</TableCell>
                      <TableCell className="py-2">
                        <Badge variant={badge.variant} className="text-[10px]">{badge.label}</Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </ScrollArea>

        <DialogFooter className="flex-row gap-2 border-t pt-4">
          <Button variant="outline" className="flex-1" onClick={onClose} disabled={bulkSend.isPending}>
            Cancel
          </Button>
          <Button
            className="flex-1"
            disabled={total === 0 || bulkSend.isPending}
            onClick={handleSend}
          >
            <Send className="h-3.5 w-3.5 mr-1.5" />
            {bulkSend.isPending ? "Sending…" : `Send to ${total} Lead${total === 1 ? "" : "s"}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}


export default function EmailCampaignsPage() {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sendId, setSendId] = useState<number | null>(null);
  const [bulkSendCampaign, setBulkSendCampaign] = useState<EmailCampaign | null>(null);
  const [name, setName] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");

  const { data, isLoading } = useEmailCampaigns();
  const createCampaign = useCreateEmailCampaign();
  const sendCampaign = useSendEmailCampaign();

  const items: EmailCampaign[] = Array.isArray(data) ? data : [];

  const resetForm = useCallback(() => { setName(""); setSubject(""); setBody(""); }, []);

  const handleCreate = useCallback(() => {
    if (!name.trim() || !subject.trim() || !body.trim()) {
      toast.error("Name, subject, and body are required");
      return;
    }
    createCampaign.mutate(
      { name: name.trim(), subject: subject.trim(), body: body.trim() },
      {
        onSuccess: () => { toast.success("Email campaign created"); setSheetOpen(false); resetForm(); },
        onError: (e) => toast.error(getErrorMessage(e)),
      },
    );
  }, [name, subject, body, createCampaign, resetForm]);

  const handleSend = useCallback(() => {
    if (!sendId) return;
    sendCampaign.mutate(sendId, {
      onSuccess: (result) => { toast.success(`Campaign sent to ${result?.sent ?? 0} recipients`); setSendId(null); },
      onError: (e) => toast.error(getErrorMessage(e)),
    });
  }, [sendId, sendCampaign]);

  return (
    <PageWrapper
      title="Email Campaigns"
      subtitle="Compose and send bulk emails"
      actions={
        <Button size="sm" onClick={() => setSheetOpen(true)}>
          <Plus className="h-3.5 w-3.5 mr-1.5" />
          New Campaign
        </Button>
      }
    >
      <div className="rounded-lg border border-border bg-card overflow-hidden">
        <ScrollArea className="w-full" type="auto">
          <div className="min-w-[900px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Recipients</TableHead>
                  <TableHead className="text-right">Sent</TableHead>
                  <TableHead className="text-right">Opens</TableHead>
                  <TableHead className="text-right">Clicks</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
                ) : items.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8}>
                      <EmptyState
                        compact
                        illustration={<EmptyMailIllustration className="h-32 w-32 opacity-95" />}
                        title="No email campaigns yet"
                        description="Create your first campaign to send bulk emails."
                        action={{ label: "New Campaign", onClick: () => setSheetOpen(true) }}
                        className="border-0 bg-transparent"
                      />
                    </TableCell>
                  </TableRow>
                ) : items.map((c) => {
                  const badge = STATUS_BADGE[c.status] ?? { label: c.status, variant: "secondary" as const };
                  return (
                    <TableRow key={c.id}>
                      <TableCell className="font-medium text-sm">{c.name}</TableCell>
                      <TableCell className="text-sm max-w-[200px] truncate">{c.subject}</TableCell>
                      <TableCell><Badge variant={badge.variant} className="text-[11px]">{badge.label}</Badge></TableCell>
                      <TableCell className="text-right tabular-nums text-sm">{c.recipientCount}</TableCell>
                      <TableCell className="text-right tabular-nums text-sm">{c.sentCount}</TableCell>
                      <TableCell className="text-right tabular-nums text-sm">{c.openCount}</TableCell>
                      <TableCell className="text-right tabular-nums text-sm">{c.clickCount}</TableCell>
                      <TableCell className="text-right">
                        {c.status === "draft" && (
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 text-xs"
                              onClick={() => setBulkSendCampaign(c)}
                              aria-label={`Bulk send campaign ${c.name}`}
                            >
                              <Users className="h-3.5 w-3.5 mr-1" />Bulk Send
                            </Button>
                            <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setSendId(c.id)} aria-label={`Send campaign ${c.name}`}>
                              <Send className="h-3.5 w-3.5 mr-1" />Send
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </ScrollArea>
      </div>

      <HrSheet open={sheetOpen} onOpenChange={setSheetOpen} title="Create Email Campaign" description="Compose a new bulk email campaign." onSubmit={handleCreate} submitLabel="Create Draft" isPending={createCampaign.isPending}>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Campaign Name</label>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. April Newsletter" />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Email Subject</label>
          <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Subject line..." />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Email Body</label>
          <Textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="Write your email content..." rows={8} />
        </div>
      </HrSheet>

      <BulkSendDialog
        campaign={bulkSendCampaign}
        onClose={() => setBulkSendCampaign(null)}
      />

      <AlertDialog open={sendId !== null} onOpenChange={(open) => !open && setSendId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Send Email Campaign?</AlertDialogTitle>
            <AlertDialogDescription>This will send the campaign to all matching recipients. This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleSend} disabled={sendCampaign.isPending}>{sendCampaign.isPending ? "Sending..." : "Send Now"}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageWrapper>
  );
}
