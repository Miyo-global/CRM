"use client";

import { useState, useCallback } from "react";
import {
  DollarSign,
  Plus,
  Clock,
  CheckCircle2,
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
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Tabs,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { StatCard } from "@/components/ui/stat-card";
import { useCommissions, useCommissionRules, useCreateCommissionRule } from "@/lib/api/hooks/crm";
import { getErrorMessage } from "@/lib/get-error-message";
import { toast } from "sonner";
import { EmptyExpensesIllustration } from "@/components/illustrations";

function fmt(amount: string | number) {
  return `₹${Number(amount).toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

const STATUS_BADGE: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  pending: { label: "Pending", variant: "secondary" },
  approved: { label: "Approved", variant: "default" },
  paid: { label: "Paid", variant: "outline" },
};

export default function CommissionsPage() {
  const [statusFilter, setStatusFilter] = useState<string | undefined>();
  const [ruleDialogOpen, setRuleDialogOpen] = useState(false);
  const [ruleName, setRuleName] = useState("");
  const [ruleType, setRuleType] = useState("flat_percent");
  const [ruleRate, setRuleRate] = useState("");

  const { data, isLoading } = useCommissions({ status: statusFilter });
  const { data: rules } = useCommissionRules();
  const createRule = useCreateCommissionRule();

  const items = (data?.items ?? []) as Array<{
    id: number; userName: string | null; dealName: string | null;
    dealValue: string; commissionRate: string; commissionAmount: string;
    status: string; createdAt: string | null;
  }>;

  const handleCreateRule = useCallback(() => {
    if (!ruleName.trim()) { toast.error("Rule name is required"); return; }
    if (ruleType === "flat_percent") {
      const rate = Number(ruleRate);
      if (ruleRate.trim() === "" || Number.isNaN(rate) || rate < 0 || rate > 100) {
        toast.error("Rate must be a number between 0 and 100");
        return;
      }
    }
    createRule.mutate(
      { name: ruleName.trim(), type: ruleType, flatRate: ruleRate || undefined },
      {
        onSuccess: () => { toast.success("Commission rule created"); setRuleDialogOpen(false); setRuleName(""); setRuleRate(""); },
        onError: (e) => toast.error(getErrorMessage(e)),
      },
    );
  }, [ruleName, ruleType, ruleRate, createRule]);

  return (
    <PageWrapper
      title="Commissions"
      subtitle="Track earned commissions"
      actions={
        <Button size="sm" variant="outline" onClick={() => setRuleDialogOpen(true)}>
          <Plus className="h-3.5 w-3.5 mr-1.5" />
          Commission Rule
        </Button>
      }
      filters={
        <Tabs value={statusFilter ?? "all"} onValueChange={(v) => setStatusFilter(v === "all" ? undefined : v)}>
          <TabsList className="h-8">
            <TabsTrigger value="all" className="text-xs px-3 h-7">All</TabsTrigger>
            <TabsTrigger value="pending" className="text-xs px-3 h-7">Pending</TabsTrigger>
            <TabsTrigger value="approved" className="text-xs px-3 h-7">Approved</TabsTrigger>
            <TabsTrigger value="paid" className="text-xs px-3 h-7">Paid</TabsTrigger>
          </TabsList>
        </Tabs>
      }
    >
      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <StatCard label="Pending" value={fmt(data?.totalPending ?? 0)} icon={Clock} color="gold" />
          <StatCard label="Paid" value={fmt(data?.totalPaid ?? 0)} icon={CheckCircle2} color="green" />
        </div>

        <div className="rounded-lg border border-border bg-card overflow-hidden">
          <ScrollArea className="w-full" type="auto">
            <div className="min-w-[700px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Rep</TableHead>
                    <TableHead>Deal</TableHead>
                    <TableHead className="text-right">Deal Value</TableHead>
                    <TableHead className="text-right">Rate</TableHead>
                    <TableHead className="text-right">Commission</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
                  ) : items.length === 0 ? (
                    <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground"><div className="flex flex-col items-center justify-center gap-2 py-2">
                      <EmptyExpensesIllustration className="h-36 w-36 opacity-95" />
                      <p>No commissions found.</p>
                    </div></TableCell></TableRow>
                  ) : items.map((c) => {
                    const badge = STATUS_BADGE[c.status] ?? { label: c.status, variant: "secondary" as const };
                    return (
                      <TableRow key={c.id}>
                        <TableCell className="font-medium text-sm">{c.userName ?? ""}</TableCell>
                        <TableCell className="text-sm">{c.dealName ?? ""}</TableCell>
                        <TableCell className="text-right text-sm">{fmt(c.dealValue)}</TableCell>
                        <TableCell className="text-right text-sm">{Number(c.commissionRate)}%</TableCell>
                        <TableCell className="text-right font-medium text-sm">{fmt(c.commissionAmount)}</TableCell>
                        <TableCell><Badge variant={badge.variant} className="text-[11px]">{badge.label}</Badge></TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </ScrollArea>
        </div>

        {Array.isArray(rules) && rules.length > 0 && (
          <div className="rounded-lg border border-border bg-card overflow-hidden">
            <div className="px-4 py-3 border-b border-border">
              <p className="text-sm font-semibold">Commission Rules</p>
            </div>
            <div className="p-4 space-y-2">
              {rules.map((r: Record<string, unknown>) => (
                <div key={String(r.id)} className="flex items-center justify-between text-sm py-1.5 px-2 rounded-md bg-muted/40">
                  <span className="font-medium">{String(r.name)}</span>
                  <span className="text-muted-foreground">{r.type === "flat_percent" ? `${r.flatRate}%` : "Tiered"}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <Sheet open={ruleDialogOpen} onOpenChange={setRuleDialogOpen}>
        <SheetContent className="flex flex-col p-0 sm:max-w-[440px]">
          <SheetHeader className="px-6 pt-5 pb-3 border-b shrink-0">
            <SheetTitle>Create Commission Rule</SheetTitle>
            <SheetDescription>Define how commissions are calculated for deals.</SheetDescription>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Rule Name</label>
              <Input value={ruleName} onChange={(e) => setRuleName(e.target.value)} placeholder="e.g. Standard 5%" />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Type</label>
              <Select value={ruleType} onValueChange={setRuleType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="flat_percent">Flat Percentage</SelectItem>
                  <SelectItem value="tiered">Tiered</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Rate (%)</label>
              <Input value={ruleRate} onChange={(e) => setRuleRate(e.target.value)} type="number" step="0.1" placeholder="e.g. 5" />
            </div>
          </div>
          <SheetFooter className="px-6 py-3 border-t shrink-0">
            <Button variant="outline" onClick={() => setRuleDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleCreateRule} disabled={createRule.isPending}>
              {createRule.isPending ? "Creating..." : "Create Rule"}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </PageWrapper>
  );
}
