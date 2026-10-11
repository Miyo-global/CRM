"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import { useDebouncedValue } from "@/hooks/use-debounce";
import { EmptyTasksIllustration } from "@/components/illustrations";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Card } from "@/components/ui/card";
import { StatsStrip } from "@/components/shared/stats-strip";
import { StatusPill } from "@/components/ui/status-pill";
import { EmptyState } from "@/components/ui/empty-state";
import { QueryErrorState } from "@/components/ui/query-error-state";
import { STATUS_CONFIG } from "@/features/crm/leads/leads-constants";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CsvUploadDialog } from "@/features/crm/leads/csv-upload-dialog";
import { LeadDistributionDialog } from "@/features/crm/leads/lead-distribution-dialog";
import { Search, Users, ArrowRight, FileSpreadsheet } from "lucide-react";
import { useLeads } from "@/lib/api/hooks/leads";
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";

interface DistributeLeadRowProps {
  lead: { id: number; name: string; email?: string | null; phone?: string | null; source?: string | null; status: string; assignedTo?: { id: string | number; name?: string | null } | null };
  isSelected: boolean;
  onToggle: (id: number) => void;
}

function DistributeLeadRow({ lead, isSelected, onToggle }: DistributeLeadRowProps) {
  const handleToggle = useCallback(() => onToggle(lead.id), [lead.id, onToggle]);
  return (
    <TableRow className={isSelected ? "bg-brand-soft" : ""}>
      <TableCell className="px-3">
        <Checkbox checked={isSelected} onCheckedChange={handleToggle} />
      </TableCell>
      <TableCell className="text-sm font-medium">{lead.name}</TableCell>
      <TableCell className="text-xs text-muted-foreground">{lead.email || ""}</TableCell>
      <TableCell className="font-mono text-xs tabular-nums text-muted-foreground">{lead.phone || ""}</TableCell>
      <TableCell>
        {lead.source && <Badge variant="secondary" className="capitalize">{lead.source.replace("_", " ")}</Badge>}
      </TableCell>
      <TableCell>
        {(() => {
          const cfg = STATUS_CONFIG[lead.status as keyof typeof STATUS_CONFIG];
          return cfg ? <StatusPill tone={cfg.tone} dot>{cfg.label}</StatusPill> : <Badge variant="secondary">{lead.status}</Badge>;
        })()}
      </TableCell>
      <TableCell className="text-xs">
        {lead.assignedTo?.name || <span className="text-subtle-foreground">Unassigned</span>}
      </TableCell>
    </TableRow>
  );
}

export default function LeadDistributionPage() {
  const qc = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("NEW");
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [showDistribute, setShowDistribute] = useState(false);

  const debouncedSearch = useDebouncedValue(searchQuery, 300);
  const effectiveSearch = debouncedSearch.trim().length >= 2 ? debouncedSearch.trim() : undefined;

  const { data, isLoading, isError, error } = useLeads({
    status: statusFilter as "NEW" | "CONTACTED" | "INTERESTED" | "QUALIFIED" | "CONVERTED" | "LOST" | undefined,
    search: effectiveSearch,
    sortBy: "createdAt",
    sortOrder: "desc",
    limit: 100,
  });

  useEffect(() => {
    setSelectedIds(new Set());
  }, [statusFilter, effectiveSearch]);

  const refetch = useCallback(() => {
    qc.invalidateQueries({ queryKey: queryKeys.leads.all });
  }, [qc]);

  const filteredLeads = data?.leads ?? [];

  const allSelected = filteredLeads.length > 0 && filteredLeads.every((l) => selectedIds.has(l.id));

  const toggleAll = () => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredLeads.map((l) => l.id)));
    }
  };

  const toggleSelect = (id: number) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const unassignedCount = useMemo(() =>
    filteredLeads.filter((l) => !l.assignedTo?.id).length,
  [filteredLeads]);

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value), []);
  const handleClearSelection = useCallback(() => setSelectedIds(new Set()), []);
  const handleShowDistribute = useCallback(() => setShowDistribute(true), []);
  const handleRefetch = useCallback(() => refetch(), [refetch]);

  return (
    <PageWrapper
      title="Lead Distribution"
      subtitle="Upload leads and distribute to your sales team via round-robin"
      filters={
        <>
          <div className="relative w-full min-w-48 sm:w-64">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-subtle-foreground" aria-hidden="true" />
            <Input
              type="search"
              data-page-search
              aria-label="Search leads"
              placeholder="Search leads..."
              value={searchQuery}
              onChange={handleSearchChange}
              className="pl-9"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-9 w-[130px] text-xs" aria-label="Status"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="NEW" className="text-xs">New</SelectItem>
              <SelectItem value="CONTACTED" className="text-xs">Contacted</SelectItem>
              <SelectItem value="INTERESTED" className="text-xs">Interested</SelectItem>
              <SelectItem value="QUALIFIED" className="text-xs">Qualified</SelectItem>
            </SelectContent>
          </Select>
          {selectedIds.size > 0 && (
            <Button variant="ghost" size="sm" onClick={handleClearSelection}>
              Clear selection
            </Button>
          )}
        </>
      }
      actions={
        <>
          <CsvUploadDialog onSuccess={handleRefetch} />
          <Button
            disabled={selectedIds.size === 0}
            onClick={handleShowDistribute}
          >
            <Users /> Distribute ({selectedIds.size})
          </Button>
        </>
      }
    >

      <StatsStrip
        className="mb-4"
        items={[
          { label: "Total Leads", value: data?.totalCount || 0, icon: FileSpreadsheet },
          { label: "Unassigned", value: unassignedCount, icon: Users, tone: unassignedCount > 0 ? "warning" : undefined },
          { label: "Selected", value: selectedIds.size, icon: ArrowRight, tone: selectedIds.size > 0 ? "brand" : undefined },
        ]}
      />

      {isError && <QueryErrorState title="Couldn't load leads" error={error} onRetry={handleRefetch} className="mb-4" />}

      <Card className="overflow-hidden p-0">
        <ScrollArea className="max-h-[60vh] w-full" type="auto">
          <div className="min-w-max">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10 px-3">
                  <Checkbox checked={allSelected} onCheckedChange={toggleAll} />
                </TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Assigned To</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={7} className="h-12">
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  </TableRow>
                ))
              ) : filteredLeads.length === 0 ? (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={7} className="p-4">
                    <EmptyState compact illustration={<EmptyTasksIllustration />} title="No leads found. Upload leads or adjust filters." className="border-0 bg-transparent" />
                  </TableCell>
                </TableRow>
              ) : (
                filteredLeads.map((lead) => (
                  <DistributeLeadRow
                    key={lead.id}
                    lead={lead}
                    isSelected={selectedIds.has(lead.id)}
                    onToggle={toggleSelect}
                  />
                ))
              )}
            </TableBody>
          </Table>
          </div>
        </ScrollArea>
      </Card>

      <LeadDistributionDialog
        open={showDistribute}
        onOpenChange={setShowDistribute}
        leadIds={[...selectedIds]}
        onSuccess={() => { setSelectedIds(new Set()); refetch(); }}
      />
    </PageWrapper>
  );
}
