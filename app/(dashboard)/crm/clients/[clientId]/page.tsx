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
  ClipboardList, FileCheck, Search, CheckCircle2,
  ArrowRight, Plus, User,
} from "lucide-react";
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

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; step: number }> = {
  ACCOUNT_OPENING: { label: "Account Opening", color: "text-blue-400", bg: "bg-blue-500", step: 0 },
  QUERIES: { label: "Queries", color: "text-amber-400", bg: "bg-amber-500", step: 1 },
  PLAN_SELECTED: { label: "Plan Selected", color: "text-purple-400", bg: "bg-purple-500", step: 2 },
  INVESTED: { label: "Invested", color: "text-emerald-400", bg: "bg-emerald-500", step: 3 },
};

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
      <div className="space-y-6 p-4 md:p-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid gap-6 md:grid-cols-3">
          <Skeleton className="h-64 md:col-span-2" />
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  if (!account) {
    return (
      <div className="p-6 text-center text-muted-foreground">
        Client account not found.
      </div>
    );
  }

  const currentStep = STATUS_CONFIG[account.status]?.step ?? 0;

  return (
    <PageWrapper
      title={account.clientName}
      subtitle={`Client Account #${account.id}`}
      actions={
        <>
          <AIChurnRiskButton clientId={clientId} compact />
          {account.status !== "INVESTED" && (
            <Select onValueChange={handleStatusChange}>
              <SelectTrigger className="w-[180px] h-8 text-xs">
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
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold">Account Pipeline</h3>
          </div>
          <div className="flex items-center gap-2">
            {STATUSES.map((status, idx) => {
              const config = STATUS_CONFIG[status];
              const isComplete = idx < currentStep;
              const isCurrent = idx === currentStep;
              return (
                <div key={status} className="flex items-center flex-1">
                  <div className={cn(
                    "flex items-center gap-2 px-3 py-2 rounded-lg flex-1 text-xs font-medium transition-colors",
                    isComplete && `${config.bg}/20 ${config.color}`,
                    isCurrent && `${config.bg}/30 ${config.color} ring-1 ring-current`,
                    !isComplete && !isCurrent && "bg-muted/30 text-muted-foreground",
                  )}>
                    {isComplete ? (
                      <CheckCircle2 className="h-4 w-4 shrink-0" />
                    ) : (
                      <span className={cn("h-4 w-4 rounded-full border-2 shrink-0", isCurrent ? "border-current" : "border-muted-foreground/30")} />
                    )}
                    <span className="truncate">{config.label}</span>
                  </div>
                  {idx < STATUSES.length - 1 && (
                    <ArrowRight className={cn("h-4 w-4 shrink-0 mx-1", idx < currentStep ? "text-muted-foreground" : "text-muted-foreground/30")} />
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-3">

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Client Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Email</p>
                <p className="text-sm flex items-center gap-1.5"><Mail className="h-3.5 w-3.5 text-muted-foreground" /> {account.clientEmail || ""}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Phone</p>
                <p className="text-sm flex items-center gap-1.5"><Phone className="h-3.5 w-3.5 text-muted-foreground" /> {account.clientPhone || ""}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">WhatsApp</p>
                <p className="text-sm flex items-center gap-1.5"><MessageSquare className="h-3.5 w-3.5 text-muted-foreground" /> {account.clientWhatsapp || ""}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Converted</p>
                <p className="text-sm flex items-center gap-1.5"><CalendarDays className="h-3.5 w-3.5 text-muted-foreground" /> {new Date(account.convertedAt).toLocaleDateString(DEFAULT_LOCALE)}</p>
              </div>
            </div>

            {account.conversionNotes && (
              <div className="space-y-1 pt-2 border-t">
                <p className="text-xs text-muted-foreground">Conversion Notes</p>
                <p className="text-sm">{account.conversionNotes}</p>
              </div>
            )}

            {account.status === "INVESTED" && (
              <div className="p-4 bg-emerald-500/5 border border-emerald-500/20 rounded-lg space-y-2">
                <h4 className="text-sm font-medium text-emerald-400 flex items-center gap-1.5">
                  <IndianRupee className="h-4 w-4" /> Investment Details
                </h4>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div><span className="text-xs text-muted-foreground">Amount:</span> <span className="font-medium">{formatINR(account.investmentAmount)}</span></div>
                  <div><span className="text-xs text-muted-foreground">Plan:</span> {account.planName || ""}</div>
                  <div><span className="text-xs text-muted-foreground">Date:</span> {account.investmentDate ? new Date(account.investmentDate).toLocaleDateString(DEFAULT_LOCALE) : ""}</div>
                  <div><span className="text-xs text-muted-foreground">Ref:</span> {account.transactionRef || ""}</div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Team</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Sales Rep</p>
              {account.salesRep ? (
                <div className="flex items-center gap-2">
                  <Avatar className="h-6 w-6">
                    <AvatarImage src={account.salesRep.image || ""} />
                    <AvatarFallback className="text-[9px]">{account.salesRep.name?.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-medium">{account.salesRep.name}</p>
                    <p className="text-[10px] text-muted-foreground">{account.salesRep.email}</p>
                  </div>
                </div>
              ) : null}
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">CRM Rep</p>
              {account.assignedCrm ? (
                <div className="flex items-center gap-2">
                  <Avatar className="h-6 w-6">
                    <AvatarImage src={account.assignedCrm.image || ""} />
                    <AvatarFallback className="text-[9px]">{account.assignedCrm.name?.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-medium">{account.assignedCrm.name}</p>
                    <p className="text-[10px] text-muted-foreground">{account.assignedCrm.email}</p>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center py-2">
                  <EmptyPersonIllustration className="h-24 w-24 opacity-95 mb-2" />
                  <p className="text-sm text-muted-foreground text-center">Not assigned</p>
                </div>
              )}
            </div>
            <div className="pt-2">
              <p className="text-xs text-muted-foreground mb-1">Estimated Investment</p>
              <p className="text-lg font-bold">{formatINR(account.estimatedInvestment)}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Activity Timeline</CardTitle>
            <Button size="sm" variant="outline" onClick={() => setShowActivityForm(true)}>
              <Plus className="h-4 w-4 mr-1" /> Log Activity
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {account.activities?.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No activities logged yet.</p>
          ) : (
            <div className="space-y-4">
              {(account.activities ?? []).map((activity) => (
                <div key={activity.id} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                      <User className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="w-px flex-1 bg-border mt-1" />
                  </div>
                  <div className="pb-4 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium">{activity.title}</p>
                      <Badge variant="outline" className="text-[9px]">{activity.activityType}</Badge>
                    </div>
                    {activity.description && (
                      <p className="text-xs text-muted-foreground mt-0.5">{activity.description}</p>
                    )}
                    <p className="text-[10px] text-muted-foreground mt-1">
                      {activity.user?.name || "Unknown"} • {new Date(activity.createdAt).toLocaleString(DEFAULT_LOCALE)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

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
            <Button onClick={handleInvestmentSubmit} className="bg-emerald-600 hover:bg-emerald-700">
              Record Investment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageWrapper>
  );
}
