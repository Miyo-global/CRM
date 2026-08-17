"use client";

import { useState, useTransition, useCallback } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { PhoneInput } from "@/components/ui/phone-input";
import type { PhoneValue } from "@/lib/phone";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { HrSheet } from "@/features/hr/hr-sheet";
import {
  Plus, Search, Send, CheckCircle2, Loader2,
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useQueryClient } from "@tanstack/react-query";
import { useDmLeads, useCreateDmLead, useVerifyDmLead, useBulkSendDmLeadsToHr, useImportDmLeadToPipeline } from "@/lib/api/hooks/dm";
import { queryKeys } from "@/lib/query-keys";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useDebouncedValue } from "@/hooks/use-debounce";
import { DEFAULT_LOCALE } from "@/lib/constants/locale";

const PLATFORMS = [
  "linkedin", "instagram", "facebook", "google_ads", "seo", "website", "whatsapp", "email_campaign",
];

const STATUS_COLORS: Record<string, string> = {
  pending_review: "bg-amber-500/10 text-amber-400",
  verified: "bg-blue-500/10 text-blue-400",
  sent_to_hr: "bg-purple-500/10 text-purple-400",
  imported_to_pipeline: "bg-emerald-500/10 text-emerald-400",
};

export default function DmLeadsPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [, startTransition] = useTransition();

  const search = searchParams.get("q") || "";
  const debouncedSearch = useDebouncedValue(search, 300);
  const apiSearch = debouncedSearch.length >= 3 || debouncedSearch.length === 0 ? debouncedSearch : "";
  const statusFilter = searchParams.get("status") || "all";
  const platformFilter = searchParams.get("platform") || "all";
  const page = Number(searchParams.get("page")) || 1;

  const updateParams = useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(updates)) {
        if (value === null || value === "") params.delete(key);
        else params.set(key, value);
      }
      startTransition(() => {
        router.replace(`${pathname}?${params.toString()}`, { scroll: false });
      });
    },
    [searchParams, router, pathname],
  );

  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  const [formData, setFormData] = useState<{
    name: string;
    phone: PhoneValue;
    email: string;
    whatsappNumber: PhoneValue;
    sourcePlatform: string;
    leadQuality: string;
    notes: string;
  }>({
    name: "", phone: "", email: "", whatsappNumber: "",
    sourcePlatform: "linkedin", leadQuality: "warm", notes: "",
  });

  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: queryKeys.dmLeads.all });

  const { data, isLoading } = useDmLeads({
    status: statusFilter !== "all" ? statusFilter as "pending_review" | "verified" | "sent_to_hr" | "imported_to_pipeline" : undefined,
    platform: platformFilter !== "all" ? platformFilter : undefined,
    search: apiSearch || undefined,
    page,
    limit: 25,
  });

  const createMutation = useCreateDmLead();
  const verifyMutation = useVerifyDmLead();
  const bulkSendMutation = useBulkSendDmLeadsToHr();
  const importMutation = useImportDmLeadToPipeline();

  const handleCreateLead = useCallback(() => {
    createMutation.mutate(
      {
        ...formData,
        phone: formData.phone?.toString() || undefined,
        whatsappNumber: formData.whatsappNumber?.toString() || undefined,
      },
      {
        onSuccess: () => {
          toast.success("Lead captured");
          setShowCreateDialog(false);
          setFormData({
            name: "",
            phone: "",
            email: "",
            whatsappNumber: "",
            sourcePlatform: "linkedin",
            leadQuality: "warm",
            notes: "",
          });
        },
        onError: (err) => toast.error(err.message),
      },
    );
  }, [createMutation, formData]);

  const leads = data?.leads ?? [];
  const allSelected = leads.length > 0 && leads.every((l: { id: number }) => selectedIds.has(l.id));

  return (
    <PageWrapper
      title="DM Lead Capture"
      subtitle="Capture and manage leads from digital marketing campaigns"
      actions={
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="h-4 w-4 mr-1" /> Capture Lead
        </Button>
      }
      filters={
        <>
          <div className="relative flex-1 max-w-sm min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search… (min 3 chars)" value={search} onChange={(e) => updateParams({ q: e.target.value || null, page: null })} className="pl-9" />
          </div>
          <Select value={statusFilter} onValueChange={(v) => updateParams({ status: v === "all" ? null : v, page: null })}>
            <SelectTrigger className="w-[150px] h-9 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs">All Status</SelectItem>
              <SelectItem value="pending_review" className="text-xs">Pending Review</SelectItem>
              <SelectItem value="verified" className="text-xs">Verified</SelectItem>
              <SelectItem value="sent_to_hr" className="text-xs">Sent to HR</SelectItem>
              <SelectItem value="imported_to_pipeline" className="text-xs">Imported</SelectItem>
            </SelectContent>
          </Select>
          <Select value={platformFilter} onValueChange={(v) => updateParams({ platform: v === "all" ? null : v, page: null })}>
            <SelectTrigger className="w-[140px] h-9 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs">All Platforms</SelectItem>
              {PLATFORMS.map(p => <SelectItem key={p} value={p} className="text-xs capitalize">{p.replace("_", " ")}</SelectItem>)}
            </SelectContent>
          </Select>
          {selectedIds.size > 0 && (
            <Button size="sm" variant="outline" onClick={() => bulkSendMutation.mutate(
              { ids: [...selectedIds] },
              { onSuccess: (res) => { toast.success(`${res.count} leads sent to HR`); setSelectedIds(new Set()); }, onError: (err) => toast.error(err.message) }
            )}>
              <Send className="h-3.5 w-3.5 mr-1" /> Send to HR ({selectedIds.size})
            </Button>
          )}
        </>
      }
    >
      <div className="space-y-6">

        <Card>
          <ScrollArea className="w-full max-h-[60vh]" type="auto">
          <div className="min-w-[700px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10 px-3">
                    <Checkbox checked={allSelected} onCheckedChange={() => {
                      if (allSelected) setSelectedIds(new Set());
                      else setSelectedIds(new Set(leads.map((l: { id: number }) => l.id)));
                    }} />
                  </TableHead>
                  <TableHead className="text-xs">Name</TableHead>
                  <TableHead className="text-xs">Contact</TableHead>
                  <TableHead className="text-xs">Platform</TableHead>
                  <TableHead className="text-xs">Quality</TableHead>
                  <TableHead className="text-xs">Status</TableHead>
                  <TableHead className="text-xs">Captured</TableHead>
                  <TableHead className="text-xs">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}><TableCell colSpan={8} className="h-12"><Skeleton className="h-4 w-full" /></TableCell></TableRow>
                  ))
                ) : leads.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8}>
                      <EmptyState
                        compact
                        title="No leads found"
                        description="Capture your first lead to start building your pipeline."
                        action={{ label: "Capture Lead", onClick: () => setShowCreateDialog(true) }}
                        className="border-0 bg-transparent"
                      />
                    </TableCell>
                  </TableRow>
                ) : (
                  leads.map((lead) => (
                    <TableRow key={lead.id} className={selectedIds.has(lead.id) ? "bg-gold/5" : ""}>
                      <TableCell className="px-3">
                        <Checkbox checked={selectedIds.has(lead.id)} onCheckedChange={() => {
                          setSelectedIds(prev => {
                            const next = new Set(prev);
                            next.has(lead.id) ? next.delete(lead.id) : next.add(lead.id);
                            return next;
                          });
                        }} />
                      </TableCell>
                      <TableCell className="text-sm font-medium">{lead.name}</TableCell>
                      <TableCell>
                        <div className="text-xs text-muted-foreground">
                          {lead.email && <p>{lead.email}</p>}
                          {lead.phone && <p className="font-mono">{lead.phone}</p>}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[10px] capitalize">{lead.sourcePlatform?.replace("_", " ")}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={cn("text-[10px]",
                          lead.leadQuality === "hot" && "text-red-400 bg-red-500/10",
                          lead.leadQuality === "warm" && "text-amber-400 bg-amber-500/10",
                          lead.leadQuality === "cold" && "text-blue-400 bg-blue-500/10",
                        )}>
                          {lead.leadQuality}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={cn("text-[10px] border-0", STATUS_COLORS[lead.status])}>
                          {lead.status.replace("_", " ")}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {lead.dateCaptured ? new Date(lead.dateCaptured).toLocaleDateString(DEFAULT_LOCALE, { day: "numeric", month: "short" }) : ""}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {lead.status === "pending_review" && (
                            <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => verifyMutation.mutate(
                              { id: lead.id },
                              { onSuccess: () => { invalidate(); toast.success("Lead verified"); }, onError: (err) => toast.error(err.message) }
                            )}>
                              <CheckCircle2 className="h-3 w-3 mr-1" /> Verify
                            </Button>
                          )}
                          {lead.status === "sent_to_hr" && (
                            <Button size="sm" variant="ghost" className="h-7 text-xs text-emerald-400" onClick={() => importMutation.mutate(
                              { id: lead.id },
                              { onSuccess: () => { invalidate(); toast.success("Lead imported to pipeline"); }, onError: (err) => toast.error(err.message) }
                            )}>
                              Import
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          </ScrollArea>
          {(data?.totalPages ?? 0) > 1 && (
            <div className="flex items-center justify-between p-4 border-t">
              <span className="text-xs text-muted-foreground">Page {data?.page} of {data?.totalPages}</span>
              <div className="flex gap-1">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => updateParams({ page: page <= 2 ? null : String(page - 1) })}>Prev</Button>
                <Button variant="outline" size="sm" disabled={page >= (data?.totalPages ?? 1)} onClick={() => updateParams({ page: String(page + 1) })}>Next</Button>
              </div>
            </div>
          )}
        </Card>
      </div>

      <HrSheet
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        title="Capture New Lead"
        onSubmit={handleCreateLead}
        submitLabel={
          <>
            {createMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Capture Lead
          </>
        }
        isPending={createMutation.isPending}
      >
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Name *</Label>
            <Input value={formData.name} onChange={(e) => setFormData(f => ({ ...f, name: e.target.value }))} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Phone</Label>
            <PhoneInput
              value={formData.phone}
              onChange={(v) => setFormData((f) => ({ ...f, phone: v ?? "" }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Email</Label>
            <Input value={formData.email} onChange={(e) => setFormData(f => ({ ...f, email: e.target.value }))} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">WhatsApp</Label>
            <PhoneInput
              value={formData.whatsappNumber}
              onChange={(v) => setFormData((f) => ({ ...f, whatsappNumber: v ?? "" }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Platform *</Label>
            <Select value={formData.sourcePlatform} onValueChange={(v) => setFormData(f => ({ ...f, sourcePlatform: v }))}>
              <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
              <SelectContent>
                {PLATFORMS.map(p => <SelectItem key={p} value={p} className="capitalize">{p.replace("_", " ")}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Quality</Label>
            <Select value={formData.leadQuality} onValueChange={(v) => setFormData(f => ({ ...f, leadQuality: v }))}>
              <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="hot">Hot</SelectItem>
                <SelectItem value="warm">Warm</SelectItem>
                <SelectItem value="cold">Cold</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Notes</Label>
          <Textarea value={formData.notes} onChange={(e) => setFormData(f => ({ ...f, notes: e.target.value }))} rows={2} />
        </div>
      </HrSheet>
    </PageWrapper>
  );
}
