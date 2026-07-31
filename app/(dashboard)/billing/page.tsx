"use client";

import Link from "next/link";
import { EmptyExpensesIllustration } from "@/components/illustrations";
import { format, isPast } from "date-fns";
import {
  DollarSign,
  FileText,
  AlertCircle,
  CheckCircle2,
  Clock,
  ChevronRight,
  Plus,
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
import { PageWrapper } from "@/components/ui/page-wrapper";
import { StatCard } from "@/components/ui/stat-card";
import { DashboardGate } from "@/components/shared/dashboard-gate";
import { useInvoiceStats, useInvoices } from "@/lib/api/hooks/invoice";
import type { InvoiceStatus } from "@/types/invoice";

const STATUS_BADGE: Record<InvoiceStatus, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  DRAFT: { label: "Draft", variant: "secondary" },
  SENT: { label: "Sent", variant: "default" },
  PAID: { label: "Paid", variant: "outline" },
  OVERDUE: { label: "Overdue", variant: "destructive" },
  CANCELLED: { label: "Cancelled", variant: "secondary" },
};

function fmt(amount: string | number) {
  return `₹${Number(amount).toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

export default function BillingPage() {
  return (
    <DashboardGate allowedRoles={["CEO", "HR"]}>
      <BillingContent />
    </DashboardGate>
  );
}

function BillingContent() {
  const { data: stats, isLoading: statsLoading } = useInvoiceStats();
  const { data: recentData } = useInvoices({ limit: 5 });
  const { data: overdueData } = useInvoices({ status: "OVERDUE", limit: 5 });

  const recentInvoices = recentData?.items ?? [];
  const overdueInvoices = overdueData?.items ?? [];

  return (
    <PageWrapper
      title="Billing & Finance"
      subtitle="Track invoices, payments, and revenue"
      actions={
        <Link href="/billing/invoices/new">
          <Button size="sm">
            <Plus className="h-3.5 w-3.5 mr-1.5" />
            New Invoice
          </Button>
        </Link>
      }
    >
      <div className="space-y-6">

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Total Invoiced"
            value={statsLoading ? "" : fmt(stats ? (stats.totalOutstanding + stats.totalPaid) : 0)}
            icon={FileText}
            color="blue"
          />
          <StatCard
            label="Received (Paid)"
            value={statsLoading ? "" : fmt(stats?.totalPaid ?? 0)}
            icon={CheckCircle2}
            color="green"
          />
          <StatCard
            label="Outstanding"
            value={statsLoading ? "" : fmt(stats?.totalOutstanding ?? 0)}
            icon={Clock}
            color="gold"
          />
          <StatCard
            label="Overdue"
            value={statsLoading ? "" : `${stats?.overdue ?? 0} invoices`}
            icon={AlertCircle}
            color="red"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-5">
          {(["DRAFT", "SENT", "PAID", "OVERDUE", "CANCELLED"] as InvoiceStatus[]).map((s) => {
            const badge = STATUS_BADGE[s];
            const count = stats?.[s.toLowerCase() as keyof typeof stats] as number ?? 0;
            return (
              <Link key={s} href={`/billing/invoices?status=${s}`}>
                <div className="rounded-lg border border-border bg-card px-4 py-3 hover:bg-muted/50 transition-colors cursor-pointer">
                  <p className="text-xs text-muted-foreground mb-1">{badge.label}</p>
                  <p className="text-2xl font-bold">{count}</p>
                </div>
              </Link>
            );
          })}
        </div>

        <div className="rounded-lg border border-border bg-card overflow-hidden">
          <div className="px-4 py-3 flex items-center justify-between border-b border-border">
            <p className="text-sm font-semibold">Recent Invoices</p>
            <Link href="/billing/invoices">
              <Button variant="ghost" size="sm" className="text-xs gap-1">
                View all <ChevronRight className="h-3 w-3" />
              </Button>
            </Link>
          </div>
          <InvoiceTable invoices={recentInvoices} />
        </div>

        {overdueInvoices.length > 0 && (
          <div className="rounded-lg border border-destructive/30 bg-card overflow-hidden">
            <div className="px-4 py-3 flex items-center justify-between border-b border-destructive/30 bg-destructive/5">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-destructive" />
                <p className="text-sm font-semibold text-destructive">Overdue Invoices</p>
              </div>
              <Link href="/billing/invoices?status=OVERDUE">
                <Button variant="ghost" size="sm" className="text-xs gap-1">
                  View all <ChevronRight className="h-3 w-3" />
                </Button>
              </Link>
            </div>
            <InvoiceTable invoices={overdueInvoices} />
          </div>
        )}

        <div className="flex gap-3 flex-wrap">
          <Link href="/billing/invoices">
            <Button variant="outline" size="sm">All Invoices</Button>
          </Link>
          <Link href="/billing/invoices/new">
            <Button variant="outline" size="sm">Create Invoice</Button>
          </Link>
        </div>
      </div>
    </PageWrapper>
  );
}

function InvoiceTable({
  invoices,
}: {
  invoices: Array<{
    id: number;
    invoiceNumber: string;
    status: InvoiceStatus;
    total: string;
    dueDate: string | null;
    client: { id: number; name: string } | null;
    createdAt: Date;
  }>;
}) {
  if (!invoices.length) {
    return (
      <div className="px-4 py-8 text-center text-sm text-muted-foreground">
        <EmptyExpensesIllustration className="mx-auto mb-3 h-36 w-36 opacity-95" />
        No invoices found.
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Invoice #</TableHead>
          <TableHead>Client</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Due Date</TableHead>
          <TableHead className="text-right">Amount</TableHead>
          <TableHead />
        </TableRow>
      </TableHeader>
      <TableBody>
        {invoices.map((inv) => {
          const badge = STATUS_BADGE[inv.status];
          const overdue =
            inv.status !== "PAID" &&
            inv.status !== "CANCELLED" &&
            inv.dueDate &&
            isPast(new Date(inv.dueDate));
          return (
            <TableRow key={inv.id}>
              <TableCell className="font-mono text-xs font-medium">
                {inv.invoiceNumber}
              </TableCell>
              <TableCell className="text-sm">
                {inv.client?.name ?? null}
              </TableCell>
              <TableCell>
                <Badge variant={badge.variant} className="text-[11px]">
                  {badge.label}
                </Badge>
              </TableCell>
              <TableCell className={`text-xs ${overdue ? "text-destructive font-medium" : "text-muted-foreground"}`}>
                {inv.dueDate ? format(new Date(inv.dueDate), "dd MMM yyyy") : ""}
              </TableCell>
              <TableCell className="text-right font-medium text-sm">
                {fmt(inv.total)}
              </TableCell>
              <TableCell>
                <Link href={`/billing/invoices/${inv.id}`}>
                  <Button variant="ghost" size="sm" className="text-xs">
                    View
                  </Button>
                </Link>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
