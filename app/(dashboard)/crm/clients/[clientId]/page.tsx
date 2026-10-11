"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { PageWrapper } from "@/components/ui/page-wrapper";
import {
  Phone, Mail, MessageSquare, IndianRupee, CalendarDays,
  Check, Plus, User, FileText, StickyNote,
} from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusPill } from "@/components/ui/status-pill";
import { IconChip, type IconChipProps } from "@/components/ui/icon-chip";
import { DetailLayout } from "@/components/shared/detail-header";
import { PropertyList } from "@/components/shared/property-list";
import { Timeline } from "@/components/shared/timeline";
import type { Tone } from "@/lib/design/tones";
import { useClientAccount, useUpdateClientAccount, useLogClientActivity } from "@/lib/api/hooks/crm";
import { AIChurnRiskButton } from "@/features/crm/clients/ai-churn-risk-button";
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { EmptyPersonIllustration } from "@/components/illustrations";
import { formatINRWhole as formatINR } from "@/lib/format-utils";
import { DEFAULT_LOCALE } from "@/lib/constants/locale";

const STATUSES = ["ACCOUNT_OPENING", "QUERIES", "PLAN_SELECTED", "INVESTED"] as const;

const STATUS_CONFIG: Record<string, { label: string; tone: Tone; step: number }> = {
  ACCOUNT_OPENING: { label: "Account Opening", tone: "info", step: 0 },
  QUERIES: { label: "Queries", tone: "warning", step: 1 },
  PLAN_SELECTED: { label: "Plan Selected", tone: "plum", step: 2 },
  INVESTED: { label: "Invested", tone: "success", step: 3 },
};

const ACTIVITY_ICONS: Record<string, { icon: IconChipProps["icon"]; tone: Tone }> = {
  call: { icon: Phone, tone: "info" },
  query: { icon: MessageSquare, tone: "warning" },
  document: { icon: FileText, tone: "plum" },
  meeting: { icon: CalendarDays, tone: "teal" },
  note: { icon: StickyNote, tone: "neutral" },
};

function PersonRow({ person }: { person: { name: string | null; email?: string | null; image: string | null } }) {
  return (
    <div className="flex min-w-0 items-center gap-2">
      <Avatar className="size-6">
        <AvatarImage src={person.image || ""} />
        <AvatarFallback className="text-3xs">{person.name?.charAt(0)}</AvatarFallback>
      </Avatar>
      <div className="min-w-0">
        <p className="truncate text-sm font-medium">{person.name}</p>
        {person.email && <p className="truncate text-xs text-muted-foreground">{person.email}</p>}
      </div>
    </div>
  );
}

const ACTIVITY_TYPES = [
  { value: "call", label: "Call" },
  { value: "query", label: "Query" },
  { value: "document", label: "Document" },
  { value: "meeting", label: "Meeting" },
  { value: "note", label: "Note" },
];

export default function ClientAccountDetailPage() {
  const qc = useQueryClient();
  const params = useParams();
  const clientId = Number(params.clientId);

  const { data: account, isLoading } = useClientAccount(clientId);

  const [showActivityForm, setShowActivityForm] = useState(false);
  const [activityType, setActivityType] = useState("note");
  const [activityTitle, setActivityTitle] = useState("");
  const [activityDescription, setActivityDescription] = useState("");

  const [showInvestmentModal, setShowInvestmentModal] = useState(false);
  const [investmentAmount, setInvestmentAmount] = useState("");
  const [planName, setPlanName] = useState("");
  const [transactionRef, setTransactionRef] = useState("");

  const updateStatusMutation = useUpdateClientAccount();
  const logActivityMutation = useLogClientActivity();

  function invalidateClient() {
    qc.invalidateQueries({ queryKey: queryKeys.clients.detail(clientId) });
  }

  const handleStatusChange = (newStatus: string) => {
    if (newStatus === "INVESTED") {
      setShowInvestmentModal(true);
      return;
    }
    updateStatusMutation.mutate(
      { id: clientId, status: newStatus as typeof STATUSES[number] },
      { onSuccess: () => { invalidateClient(); toast.success("Status updated"); }, onError: (err) => toast.error(err.message) }
    );
  };

  const handleInvestmentSubmit = () => {
    if (!investmentAmount) {
      toast.error("Investment amount is required");
      return;
    }
    updateStatusMutation.mutate(
      {
        id: clientId,
        status: "INVESTED",
        investmentAmount,
        planName: planName || undefined,
        transactionRef: transactionRef || undefined,
      },
      { onSuccess: () => { invalidateClient(); toast.success("Status updated"); }, onError: (err) => toast.error(err.message) }
    );
    setShowInvestmentModal(false);
  };

  if (isLoading) {
    return (
      <div className="space-y-6 px-4 pt-6 sm:px-6 xl:px-8">
        <Skeleton className="h-10 w-64" />
        <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  if (!account) {
    return (
      <div className="px-4 pt-6 sm:px-6 xl:px-8">
        <EmptyState
          illustration={<EmptyPersonIllustration className="size-32" />}
          title="Client account not found."
        />
      </div>
    );
  }

  const currentStep = STATUS_CONFIG[account.status]?.step ?? 0;
  const currentStatus = STATUS_CONFIG[account.status] ?? STATUS_CONFIG.ACCOUNT_OPENING;

  return (
    <PageWrapper
      title={account.clientName}
      subtitle={
        <span className="inline-flex flex-wrap items-center gap-2">
          <span className="font-mono tabular-nums">Client Account #{account.id}</span>
          <StatusPill tone={currentStatus.tone} dot>{currentStatus.label}</StatusPill>
        </span>
      }
      actions={
        <>
          <AIChurnRiskButton clientId={clientId} compact />
          {account.status !== "INVESTED" && (
            <Select onValueChange={handleStatusChange} disabled={updateStatusMutation.isPending}>
              <SelectTrigger className="h-8 w-44 text-xs">
                <SelectValue placeholder="Change stage..." />
              </SelectTrigger>
              <SelectContent>
                {STATUSES.filter(s => s !== account.status).map(s => (
                  <SelectItem key={s} value={s} className="text-xs">{STATUS_CONFIG[s].label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </>
      }
    >

      <Card className="mb-6">
        <CardContent className="p-5">
          <h3 className="mb-4 text-sm font-semibold">Account Pipeline</h3>
          <ol className="flex items-start overflow-x-auto pb-1">
            {STATUSES.map((status, idx) => {
              const config = STATUS_CONFIG[status];
              const isComplete = idx < currentStep;
              const isCurrent = idx === currentStep;
              return (
                <li key={status} className="flex min-w-28 flex-1 flex-col items-center gap-2 text-center" aria-current={isCurrent ? "step" : undefined}>
                  <div className="flex w-full items-center">
                    <span className={cn("h-px flex-1", idx === 0 ? "bg-transparent" : idx <= currentStep ? "bg-primary" : "bg-border")} />
                    <span
                      className={cn(
                        "flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold tabular-nums",
                        isComplete && "bg-primary text-primary-foreground",
                        isCurrent && "bg-card text-foreground ring-2 ring-primary",
                        !isComplete && !isCurrent && "bg-muted text-muted-foreground",
                      )}
                    >
                      {isComplete ? <Check className="size-4" aria-hidden="true" /> : idx + 1}
                    </span>
                    <span className={cn("h-px flex-1", idx === STATUSES.length - 1 ? "bg-transparent" : idx < currentStep ? "bg-primary" : "bg-border")} />
                  </div>
                  <span className={cn("text-xs font-medium", isCurrent ? "text-foreground" : "text-muted-foreground")}>
                    {config.label}
                  </span>
                </li>
              );
            })}
          </ol>
        </CardContent>
      </Card>

      <DetailLayout
        main={
          <div className="space-y-6">
            {account.status === "INVESTED" && (
              <Card className="border-success-500/40 bg-success-soft">
                <CardContent className="space-y-3 p-5">
                  <h4 className="flex items-center gap-2 text-sm font-semibold text-success-strong">
                    <IconChip icon={IndianRupee} tone="success" size="sm" /> Investment Details
                  </h4>
                  <dl className="grid gap-3 text-sm sm:grid-cols-2">
                    <div><dt className="text-xs text-muted-foreground">Amount</dt><dd className="font-semibold tabular-nums">{formatINR(account.investmentAmount)}</dd></div>
                    <div><dt className="text-xs text-muted-foreground">Plan</dt><dd>{account.planName || ""}</dd></div>
                    <div><dt className="text-xs text-muted-foreground">Date</dt><dd className="tabular-nums">{account.investmentDate ? new Date(account.investmentDate).toLocaleDateString(DEFAULT_LOCALE) : ""}</dd></div>
                    <div><dt className="text-xs text-muted-foreground">Ref</dt><dd className="font-mono text-xs">{account.transactionRef || ""}</dd></div>
                  </dl>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-2">
                <CardTitle className="text-base">Activity Timeline</CardTitle>
                <Button size="sm" variant="outline" onClick={() => setShowActivityForm(true)}>
                  <Plus className="size-4" /> Log Activity
                </Button>
              </CardHeader>
              <CardContent>
                <Timeline
                  emptyLabel="No activities logged yet."
                  items={(account.activities ?? []).map((activity) => {
                    const meta = ACTIVITY_ICONS[activity.activityType] ?? { icon: User, tone: "neutral" as Tone };
                    return {
                      id: String(activity.id),
                      icon: meta.icon,
                      tone: meta.tone,
                      actor: activity.user?.name || "Unknown",
                      title: (
                        <>
                          {activity.title}{" "}
                          <Badge variant="outline" className="ml-1 align-middle capitalize">{activity.activityType}</Badge>
                        </>
                      ),
                      body: activity.description || undefined,
                      timestamp: activity.createdAt,
                    };
                  })}
                />
              </CardContent>
            </Card>
          </div>
        }
        rail={
          <>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Client Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <PropertyList
                  items={[
                    { label: "Email", value: account.clientEmail ? <span className="inline-flex items-center gap-1.5"><Mail className="size-3.5 text-muted-foreground" aria-hidden="true" />{account.clientEmail}</span> : null },
                    { label: "Phone", value: account.clientPhone ? <span className="inline-flex items-center gap-1.5 tabular-nums"><Phone className="size-3.5 text-muted-foreground" aria-hidden="true" />{account.clientPhone}</span> : null },
                    { label: "WhatsApp", value: account.clientWhatsapp ? <span className="inline-flex items-center gap-1.5 tabular-nums"><MessageSquare className="size-3.5 text-muted-foreground" aria-hidden="true" />{account.clientWhatsapp}</span> : null },
                    { label: "Converted", value: <span className="tabular-nums">{new Date(account.convertedAt).toLocaleDateString(DEFAULT_LOCALE)}</span> },
                    { label: "Est. Investment", value: <span className="font-semibold tabular-nums">{formatINR(account.estimatedInvestment)}</span> },
                  ]}
                />
                {account.conversionNotes && (
                  <div className="space-y-1 border-t pt-3">
                    <p className="text-xs text-muted-foreground">Conversion Notes</p>
                    <p className="text-sm">{account.conversionNotes}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Team</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1.5">
                  <p className="text-xs text-muted-foreground">Sales Rep</p>
                  {account.salesRep ? <PersonRow person={account.salesRep} /> : null}
                </div>
                <div className="space-y-1.5">
                  <p className="text-xs text-muted-foreground">CRM Rep</p>
                  {account.assignedCrm ? (
                    <PersonRow person={account.assignedCrm} />
                  ) : (
                    <div className="flex items-center gap-2">
                      <IconChip icon={User} tone="neutral" size="sm" />
                      <p className="text-sm text-muted-foreground">Not assigned</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </>
        }
      />

      <Dialog open={showActivityForm} onOpenChange={setShowActivityForm}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Log Activity</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Type</Label>
              <Select value={activityType} onValueChange={setActivityType}>
                <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ACTIVITY_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Title *</Label>
              <Input value={activityTitle} onChange={(e) => setActivityTitle(e.target.value)} placeholder="Brief description..." />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Details</Label>
              <Textarea value={activityDescription} onChange={(e) => setActivityDescription(e.target.value)} rows={3} placeholder="Additional details..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowActivityForm(false)}>Cancel</Button>
            <Button
              loading={logActivityMutation.isPending}
              disabled={!activityTitle.trim() || logActivityMutation.isPending}
              onClick={() => logActivityMutation.mutate(
                { clientAccountId: clientId, activityType, title: activityTitle, description: activityDescription || undefined },
                {
                  onSuccess: () => {
                    invalidateClient();
                    setShowActivityForm(false);
                    setActivityTitle("");
                    setActivityDescription("");
                    toast.success("Activity logged");
                  },
                  onError: (err) => toast.error(err.message),
                }
              )}
            >
              Log Activity
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showInvestmentModal} onOpenChange={setShowInvestmentModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Record Investment</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Investment Amount *</Label>
              <Input type="number" value={investmentAmount} onChange={(e) => setInvestmentAmount(e.target.value)} placeholder="e.g., 500000" />
            </div>
            <div className="space-y-1.5">
              <Label>Plan Name</Label>
              <Input value={planName} onChange={(e) => setPlanName(e.target.value)} placeholder="e.g., Growth SIP" />
            </div>
            <div className="space-y-1.5">
              <Label>Transaction Reference</Label>
              <Input value={transactionRef} onChange={(e) => setTransactionRef(e.target.value)} placeholder="e.g., TXN-12345" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowInvestmentModal(false)}>Cancel</Button>
            <Button onClick={handleInvestmentSubmit} loading={updateStatusMutation.isPending}>
              Record Investment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageWrapper>
  );
}
