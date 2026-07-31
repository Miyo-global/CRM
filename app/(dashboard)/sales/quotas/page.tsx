"use client";

import { useState, useCallback } from "react";
import { format } from "date-fns";
import {
  Target,
  Plus,
  TrendingUp,
  DollarSign,
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { StatCard } from "@/components/ui/stat-card";
import { DatePicker } from "@/components/ui/date-picker";
import { HrSheet } from "@/features/hr/hr-sheet";
import { useSalesQuotas, useCreateSalesQuota } from "@/lib/api/hooks/crm";
import { useHrEmployees } from "@/lib/api/hooks";
import { getErrorMessage } from "@/lib/get-error-message";
import { toast } from "sonner";
import type { SalesQuota } from "@/lib/api/hooks/crm";
import { EmptyTargetIllustration } from "@/components/illustrations";

function fmt(amount: string | number) {
  return `₹${Number(amount).toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

export default function SalesQuotasPage() {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [userId, setUserId] = useState("");
  const [period, setPeriod] = useState("monthly");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [targetRevenue, setTargetRevenue] = useState("");
  const [notes, setNotes] = useState("");

  const { data: quotas, isLoading } = useSalesQuotas();
  const { data: employeesData } = useHrEmployees({ limit: 100 });
  const createQuota = useCreateSalesQuota();

  const items: SalesQuota[] = Array.isArray(quotas) ? quotas : [];
  const employees = (employeesData as { data?: Array<{ id: string; name: string }>; items?: Array<{ id: string; name: string }> } | Array<{ id: string; name: string }> | undefined);
  const employeeList: Array<{ id: string; name: string }> = Array.isArray(employees) ? employees : (employees?.data ?? employees?.items ?? []);

  const totalTarget = items.reduce((s, q) => s + Number(q.targetRevenue), 0);
  const totalActual = items.reduce((s, q) => s + Number(q.actualRevenue), 0);
  const overallAttainment = totalTarget > 0 ? Math.round((totalActual / totalTarget) * 100) : 0;

  const resetForm = useCallback(() => {
    setUserId(""); setPeriod("monthly"); setStartDate(""); setEndDate("");
    setTargetRevenue(""); setNotes("");
  }, []);

  const handleCreate = useCallback(() => {
    if (!userId || !startDate || !endDate || !targetRevenue) {
      toast.error("Employee, dates, and target revenue are required");
      return;
    }
    createQuota.mutate(
      { userId, period, startDate, endDate, targetRevenue, notes: notes || undefined },
      {
        onSuccess: () => { toast.success("Quota created"); setSheetOpen(false); resetForm(); },
        onError: (e) => toast.error(getErrorMessage(e)),
      },
    );
  }, [userId, period, startDate, endDate, targetRevenue, notes, createQuota, resetForm]);

  return (
    <PageWrapper
      title="Sales Quotas"
      subtitle="Manage revenue targets per rep"
      actions={
        <Button size="sm" onClick={() => setSheetOpen(true)}>
          <Plus className="h-3.5 w-3.5 mr-1.5" />
          Set Quota
        </Button>
      }
    >
      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-3">
          <StatCard label="Total Target" value={fmt(totalTarget)} icon={Target} color="blue" />
          <StatCard label="Total Actual" value={fmt(totalActual)} icon={DollarSign} color="green" />
          <StatCard label="Overall Attainment" value={`${overallAttainment}%`} icon={TrendingUp} color={overallAttainment >= 80 ? "green" : overallAttainment >= 50 ? "gold" : "red"} />
        </div>

        <div className="rounded-lg border border-border bg-card overflow-hidden">
          <ScrollArea className="w-full" type="auto">
            <div className="min-w-[700px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Rep</TableHead>
                    <TableHead>Period</TableHead>
                    <TableHead className="text-right">Target</TableHead>
                    <TableHead className="text-right">Actual</TableHead>
                    <TableHead>Attainment</TableHead>
                    <TableHead>Dates</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
                  ) : items.length === 0 ? (
                    <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground"><div className="flex flex-col items-center justify-center gap-2 py-2">
                      <EmptyTargetIllustration className="h-36 w-36 opacity-95" />
                      <p>No quotas set yet.</p>
                    </div></TableCell></TableRow>
                  ) : items.map((q) => (
                    <TableRow key={q.id}>
                      <TableCell className="font-medium text-sm">{q.userName ?? ""}</TableCell>
                      <TableCell><Badge variant="secondary" className="text-[11px] capitalize">{q.period}</Badge></TableCell>
                      <TableCell className="text-right text-sm">{fmt(q.targetRevenue)}</TableCell>
                      <TableCell className="text-right text-sm">{fmt(q.actualRevenue)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-20 rounded-full bg-muted overflow-hidden">
                            <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${Math.min(q.attainmentPct, 100)}%` }} />
                          </div>
                          <span className="text-xs font-medium tabular-nums">{q.attainmentPct}%</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {q.startDate && q.endDate ? `${format(new Date(q.startDate), "dd MMM")} – ${format(new Date(q.endDate), "dd MMM yyyy")}` : ""}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </ScrollArea>
        </div>
      </div>

      <HrSheet open={sheetOpen} onOpenChange={setSheetOpen} title="Set Sales Quota" description="Assign a revenue target to a team member." onSubmit={handleCreate} submitLabel="Create Quota" isPending={createQuota.isPending}>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Employee</label>
          <Select value={userId} onValueChange={setUserId}>
            <SelectTrigger><SelectValue placeholder="Select employee" /></SelectTrigger>
            <SelectContent>
              {employeeList.map((emp) => (
                <SelectItem key={emp.id} value={emp.id}>{emp.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Period</label>
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="monthly">Monthly</SelectItem>
              <SelectItem value="quarterly">Quarterly</SelectItem>
              <SelectItem value="yearly">Yearly</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Start Date</label>
            <DatePicker value={startDate} onChange={setStartDate} placeholder="Start date" />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">End Date</label>
            <DatePicker value={endDate} onChange={setEndDate} placeholder="End date" />
          </div>
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Target Revenue (₹)</label>
          <Input type="text" value={targetRevenue} onChange={(e) => setTargetRevenue(e.target.value)} placeholder="e.g. 500000" />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Notes</label>
          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional notes..." rows={2} />
        </div>
      </HrSheet>
    </PageWrapper>
  );
}
