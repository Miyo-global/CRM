"use client";

import { useCallback } from "react";
import { RefreshCcw, UserCheck, IndianRupee } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { useRenewalAccounts, useUpdateRenewal } from "@/lib/api/hooks/crm";
import type { ClientAccount } from "@/types/crm";
import { cn } from "@/lib/utils";
import { DEFAULT_CURRENCY, DEFAULT_LOCALE } from "@/lib/constants/locale";


type RenewalStage = "upcoming" | "in_discussion" | "renewed" | "churned";

const STAGES: {
  id: RenewalStage;
  label: string;
  color: string;
  headerBg: string;
  dot: string;
}[] = [
  {
    id: "upcoming",
    label: "Upcoming",
    color: "text-blue-700 bg-blue-50 border-blue-200",
    headerBg: "bg-blue-500",
    dot: "bg-blue-500",
  },
  {
    id: "in_discussion",
    label: "In Discussion",
    color: "text-amber-700 bg-amber-50 border-amber-200",
    headerBg: "bg-amber-500",
    dot: "bg-amber-500",
  },
  {
    id: "renewed",
    label: "Renewed",
    color: "text-emerald-700 bg-emerald-50 border-emerald-200",
    headerBg: "bg-emerald-500",
    dot: "bg-emerald-500",
  },
  {
    id: "churned",
    label: "Churned",
    color: "text-red-700 bg-red-50 border-red-200",
    headerBg: "bg-red-500",
    dot: "bg-red-500",
  },
];


function formatInr(value: string | null | undefined): string {
  if (!value) return "";
  const num = Number(value);
  if (!Number.isFinite(num)) return "";
  return new Intl.NumberFormat(DEFAULT_LOCALE, {
    style: "currency",
    currency: DEFAULT_CURRENCY,
    maximumFractionDigits: 0,
  }).format(num);
}


interface AccountCardProps {
  account: ClientAccount;
  onStageChange: (accountId: number, stage: RenewalStage) => void;
  isPending: boolean;
}

function AccountCard({ account, onStageChange, isPending }: AccountCardProps) {
  const stageCfg = STAGES.find((s) => s.id === account.renewalStage) ?? STAGES[0];

  return (
    <Card className="group hover:shadow-md transition-shadow">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="font-semibold text-sm text-foreground truncate">{account.clientName}</p>
            {account.planName && (
              <p className="text-xs text-muted-foreground truncate">{account.planName}</p>
            )}
          </div>
          <Badge
            variant="outline"
            className={cn("text-[10px] shrink-0 capitalize", stageCfg.color)}
          >
            <span className={cn("w-1.5 h-1.5 rounded-full mr-1", stageCfg.dot)} />
            {stageCfg.label}
          </Badge>
        </div>

        <div className="flex items-center gap-1 text-sm font-medium text-foreground">
          <IndianRupee className="h-3.5 w-3.5 text-muted-foreground" />
          {formatInr(account.investmentAmount ?? account.estimatedInvestment)}
        </div>

        {account.renewalDate && (
          <p className="text-xs text-muted-foreground">
            Renewal: {new Date(account.renewalDate).toLocaleDateString(DEFAULT_LOCALE)}
          </p>
        )}

        {account.salesRep && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <UserCheck className="h-3 w-3" />
            {account.salesRep.name ?? "Unknown"}
          </div>
        )}

        <Select
          value={account.renewalStage}
          onValueChange={(v) => onStageChange(account.id, v as RenewalStage)}
          disabled={isPending}
        >
          <SelectTrigger className="h-7 text-xs">
            <SelectValue placeholder="Move to stage…" />
          </SelectTrigger>
          <SelectContent>
            {STAGES.map((s) => (
              <SelectItem key={s.id} value={s.id} className="text-xs">
                {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </CardContent>
    </Card>
  );
}


interface KanbanColumnProps {
  stage: (typeof STAGES)[number];
  accounts: ClientAccount[];
  onStageChange: (accountId: number, stage: RenewalStage) => void;
  mutatingId: number | null;
}

function KanbanColumn({ stage, accounts, onStageChange, mutatingId }: KanbanColumnProps) {
  return (
    <div className="flex flex-col gap-2 min-w-[260px] flex-1">
      <div className={cn("rounded-t-lg px-3 py-2 flex items-center justify-between", stage.headerBg)}>
        <span className="text-white text-sm font-semibold">{stage.label}</span>
        <span className="bg-white/20 text-white text-xs font-bold px-2 py-0.5 rounded-full">
          {accounts.length}
        </span>
      </div>

      <div className="flex flex-col gap-2 p-2 bg-muted/30 rounded-b-lg flex-1 min-h-[200px]">
        {accounts.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-8">No accounts</p>
        ) : (
          accounts.map((account) => (
            <AccountCard
              key={account.id}
              account={account}
              onStageChange={onStageChange}
              isPending={mutatingId === account.id}
            />
          ))
        )}
      </div>
    </div>
  );
}


export default function RenewalPipelinePage() {
  const { data: accounts, isLoading } = useRenewalAccounts();
  const { mutate: updateRenewal, variables } = useUpdateRenewal();

  const handleStageChange = useCallback(
    (accountId: number, stage: RenewalStage) => {
      updateRenewal({ accountId, renewalStage: stage });
    },
    [updateRenewal]
  );

  const mutatingId = variables?.accountId ?? null;

  if (isLoading) {
    return (
      <PageWrapper
        title="Renewal Pipeline"
        subtitle="Track and manage client renewal stages"
      >
        <div className="flex gap-4 overflow-x-auto pb-4">
          {STAGES.map((s) => (
            <div key={s.id} className="min-w-[260px] flex-1 space-y-2">
              <Skeleton className="h-9 w-full rounded-t-lg" />
              {[1, 2].map((i) => (
                <Skeleton key={i} className="h-32 w-full rounded-lg" />
              ))}
            </div>
          ))}
        </div>
      </PageWrapper>
    );
  }

  const grouped = STAGES.reduce<Record<RenewalStage, ClientAccount[]>>(
    (acc, s) => {
      acc[s.id] = (accounts ?? []).filter(
        (a) => (a.renewalStage ?? "upcoming") === s.id
      );
      return acc;
    },
    { upcoming: [], in_discussion: [], renewed: [], churned: [] }
  );

  return (
    <PageWrapper
      title="Renewal Pipeline"
      subtitle="Track and manage client renewal stages"
      actions={
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <RefreshCcw className="h-4 w-4" />
          <span>{accounts?.length ?? 0} accounts</span>
        </div>
      }
    >
      <div className="flex gap-4 overflow-x-auto pb-4">
        {STAGES.map((stage) => (
          <KanbanColumn
            key={stage.id}
            stage={stage}
            accounts={grouped[stage.id]}
            onStageChange={handleStageChange}
            mutatingId={mutatingId}
          />
        ))}
      </div>
    </PageWrapper>
  );
}
