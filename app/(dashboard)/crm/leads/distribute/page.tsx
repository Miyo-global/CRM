"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import { useDebouncedValue } from "@/hooks/use-debounce";
import { EmptyTasksIllustration } from "@/components/illustrations";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
    <TableRow className={isSelected ? "bg-gold/5" : ""}>
      <TableCell className="px-3">
        <Checkbox checked={isSelected} onCheckedChange={handleToggle} />
      </TableCell>
      <TableCell className="text-sm font-medium">{lead.name}</TableCell>
      <TableCell className="text-xs text-muted-foreground">{lead.email || ""}</TableCell>
      <TableCell className="text-xs text-muted-foreground font-mono">{lead.phone || ""}</TableCell>
      <TableCell>
        <Badge variant="outline" className="text-[10px]">{lead.source || ""}</Badge>
      </TableCell>
      <TableCell>
        <Badge variant="outline" className="text-[10px]">{lead.status}</Badge>
      </TableCell>
      <TableCell className="text-xs">
        {lead.assignedTo?.name || <span className="text-muted-foreground">Unassigned</span>}
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

  const { data, isLoading } = useLeads({
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
          <div className="relative flex-1 max-w-sm min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search leads..."
              value={searchQuery}
              onChange={handleSearchChange}
              className="pl-9"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[130px] h-9 text-xs"><SelectValue placeholder="Status" /></SelectTrigger>
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
            size="sm"
            variant="outline"
            disabled={selectedIds.size === 0}
            onClick={handleShowDistribute}
          >
            <Users className="h-4 w-4 mr-1" /> Distribute ({selectedIds.size})
          </Button>
        </>
      }
    >

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <FileSpreadsheet className="h-5 w-5 text-muted-foreground" />
              <span className="text-2xl font-bold tabular-nums">{data?.totalCount || 0}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Total Leads</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <Users className="h-5 w-5 text-amber-400" />
              <span className="text-2xl font-bold tabular-nums">{unassignedCount}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Unassigned</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <ArrowRight className="h-5 w-5 text-blue-400" />
              <span className="text-2xl font-bold tabular-nums">{selectedIds.size}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Selected</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <ScrollArea className="w-full max-h-[60vh]" type="auto">
          <div className="min-w-max">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10 px-3">
                  <Checkbox checked={allSelected} onCheckedChange={toggleAll} />
                </TableHead>
                <TableHead className="text-xs">Name</TableHead>
                <TableHead className="text-xs">Email</TableHead>
                <TableHead className="text-xs">Phone</TableHead>
                <TableHead className="text-xs">Source</TableHead>
                <TableHead className="text-xs">Status</TableHead>
                <TableHead className="text-xs">Assigned To</TableHead>
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
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <EmptyTasksIllustration className="h-36 w-36 opacity-95" />
                      <p>No leads found. Upload leads or adjust filters.</p>
                    </div>
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
