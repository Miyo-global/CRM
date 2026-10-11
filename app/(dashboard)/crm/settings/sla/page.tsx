"use client";

import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Plus, Trash2, Pencil, Clock, Shield, AlertTriangle,
  CheckCircle2, XCircle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { PageWrapper } from "@/components/ui/page-wrapper";
import {
  Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle, SheetTrigger,
} from "@/components/ui/sheet";
import { StatsStrip } from "@/components/shared/stats-strip";
import { StatusPill } from "@/components/ui/status-pill";
import { IconChip } from "@/components/ui/icon-chip";
import { EmptyState } from "@/components/ui/empty-state";
import { QueryErrorState } from "@/components/ui/query-error-state";
import type { Tone } from "@/lib/design/tones";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Form, FormField, FormItem, FormLabel, FormControl, FormMessage,
} from "@/components/ui/form";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { staggerContainer, fadeUp } from "@/lib/motion-variants";
import {
  useSlaPolicies, useSlaReport, useSlaBreachedLeads,
  useCreateSlaPolicy, useUpdateSlaPolicy, useDeleteSlaPolicy,
} from "@/lib/api/hooks/crm-settings";
import { toast } from "sonner";

const PRIORITY_TONES: Record<string, Tone> = {
  low: "info",
  medium: "warning",
  high: "warning",
  urgent: "danger",
};

const policySchema = z.object({
  name: z.string().min(1, "Name required").max(100),
  appliesTo: z.enum(["lead", "deal", "both"]),
  priority: z.enum(["low", "medium", "high", "urgent"]),
  firstResponseHours: z.coerce.number().int().positive("Must be positive"),
  resolutionHours: z.coerce.number().int().positive("Must be positive"),
});
type PolicyForm = z.infer<typeof policySchema>;

export default function SlaPage() {
  const { data: policies, isLoading, isError, error, refetch } = useSlaPolicies();
  const { data: slaReport, isLoading: reportLoading } = useSlaReport();
  const { data: breachedLeads } = useSlaBreachedLeads({ limit: 10 });
  const [createOpen, setCreateOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const createPolicy = useCreateSlaPolicy();
  const updatePolicy = useUpdateSlaPolicy();
  const deletePolicy = useDeleteSlaPolicy();

  const policyResolver = zodResolver(policySchema) as unknown as Resolver<PolicyForm>;

  const createForm = useForm<PolicyForm>({
    resolver: policyResolver,
    defaultValues: { name: "", appliesTo: "both", priority: "medium", firstResponseHours: 4, resolutionHours: 24 },
  });

  const editForm = useForm<PolicyForm>({
    resolver: policyResolver,
  });

  const onCreateSubmit = useCallback((data: PolicyForm) => {
    createPolicy.mutate(
      data,
      {
        onSuccess: () => { toast.success("SLA policy created"); setCreateOpen(false); createForm.reset(); },
        onError: (err) => toast.error(err.message),
      }
    );
  }, [createPolicy, createForm]);

  const onEditSubmit = useCallback((data: PolicyForm) => {
    if (editingId === null) return;
    updatePolicy.mutate(
      { id: editingId, ...data },
      {
        onSuccess: () => { toast.success("Policy updated"); setEditingId(null); },
        onError: (err) => toast.error(err.message),
      }
    );
  }, [editingId, updatePolicy]);

  const startEdit = useCallback((policy: { id: number; name: string; appliesTo: string; priority: string; firstResponseHours: number; resolutionHours: number }) => {
    setEditingId(policy.id);
    editForm.reset({
      name: policy.name,
      appliesTo: policy.appliesTo as PolicyForm["appliesTo"],
      priority: policy.priority as PolicyForm["priority"],
      firstResponseHours: policy.firstResponseHours,
      resolutionHours: policy.resolutionHours,
    });
  }, [editForm]);

  const handleCancelEdit = useCallback(() => setEditingId(null), []);

  const handleDeletePolicy = useCallback((id: number) => {
    deletePolicy.mutate(id, {
      onSuccess: () => toast.success("Policy deleted"),
      onError: (err) => toast.error(err.message),
    });
  }, [deletePolicy]);

  if (isLoading) {
    return (
      <PageWrapper title="SLA Policies" subtitle="Service Level Agreement policies for leads and deals" contentClassName="max-w-5xl">
        <div className="space-y-6">
          <Skeleton className="h-20 rounded-lg" />
          <Skeleton className="h-64 rounded-lg" />
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper
      title="SLA Policies"
      subtitle="Service Level Agreement policies for leads and deals"
      actions={
        <Sheet open={createOpen} onOpenChange={setCreateOpen}>
          <SheetTrigger asChild>
            <Button>
              <Plus className="size-4" />
              New Policy
            </Button>
          </SheetTrigger>
          <SheetContent size="md" className="gap-0 p-0">
            <SheetHeader className="border-b px-6">
              <SheetTitle>Create SLA Policy</SheetTitle>
            </SheetHeader>
            <Form {...createForm}>
              <form onSubmit={createForm.handleSubmit(onCreateSubmit)} className="flex min-h-0 flex-1 flex-col">
                <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-5">
                <FormField control={createForm.control} name="name" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Policy Name</FormLabel>
                    <FormControl><Input {...field} placeholder="e.g. Hot Lead SLA" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField control={createForm.control} name="appliesTo" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Applies To</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                        <SelectContent>
                          <SelectItem value="lead">Lead</SelectItem>
                          <SelectItem value="deal">Deal</SelectItem>
                          <SelectItem value="both">Both</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={createForm.control} name="priority" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Priority</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                        <SelectContent>
                          <SelectItem value="low">Low</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="high">High</SelectItem>
                          <SelectItem value="urgent">Urgent</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={createForm.control} name="firstResponseHours" render={({ field }) => (
                    <FormItem>
                      <FormLabel>First Response (hrs)</FormLabel>
                      <FormControl><Input type="number" min={1} {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={createForm.control} name="resolutionHours" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Resolution (hrs)</FormLabel>
                      <FormControl><Input type="number" min={1} {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
                </div>
                <SheetFooter>
                  <Button type="button" variant="ghost" onClick={() => setCreateOpen(false)}>Cancel</Button>
                  <Button type="submit" loading={createPolicy.isPending} disabled={createPolicy.isPending}>
                    {createPolicy.isPending ? "Creating..." : "Create Policy"}
                  </Button>
                </SheetFooter>
              </form>
            </Form>
          </SheetContent>
        </Sheet>
      }
      contentClassName="max-w-5xl"
    >
      {isError ? (
        <QueryErrorState title="Couldn't load SLA policies" error={error} onRetry={() => refetch()} />
      ) : (
      <motion.div
        className="space-y-6"
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
      >
        {slaReport && (
          <motion.div variants={fadeUp}>
            <StatsStrip
              items={[
                { label: "Total with SLA", value: slaReport.total, icon: Shield, tone: "info" },
                { label: "Compliant", value: slaReport.compliant, icon: CheckCircle2, tone: "success" },
                { label: "Breached", value: slaReport.breached, icon: XCircle, tone: "danger" },
                {
                  label: "Compliance Rate",
                  value: `${slaReport.complianceRate}%`,
                  icon: Clock,
                  tone: slaReport.complianceRate >= 80 ? "success" : slaReport.complianceRate >= 50 ? "warning" : "danger",
                },
              ]}
            />
          </motion.div>
        )}

        <motion.div variants={fadeUp}>
          <Card>
            <CardHeader className="border-b">
              <CardTitle className="text-base">Policies</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {policies && policies.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Name</TableHead>
                      <TableHead className="text-xs">Applies To</TableHead>
                      <TableHead className="text-xs">Priority</TableHead>
                      <TableHead className="text-xs text-right">First Response</TableHead>
                      <TableHead className="text-xs text-right">Resolution</TableHead>
                      <TableHead className="text-xs text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {policies.map(policy => (
                      <SlaTableRow
                        key={policy.id}
                        policy={policy}
                        onEdit={startEdit}
                        onDelete={handleDeletePolicy}
                      />
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <EmptyState
                  compact
                  icon={Shield}
                  title="No SLA policies defined"
                  className="border-0"
                  action={{ label: "New Policy", onClick: () => setCreateOpen(true) }}
                />
              )}
            </CardContent>
          </Card>
        </motion.div>

        <Sheet open={editingId !== null} onOpenChange={(open) => { if (!open) handleCancelEdit(); }}>
          <SheetContent size="md" className="gap-0 p-0">
            <SheetHeader className="border-b px-6">
              <SheetTitle>Edit Policy</SheetTitle>
            </SheetHeader>
                <Form {...editForm}>
                  <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="flex min-h-0 flex-1 flex-col">
                    <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-5">
                    <FormField control={editForm.control} name="name" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Policy Name</FormLabel>
                        <FormControl><Input {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <div className="grid gap-4 sm:grid-cols-2">
                      <FormField control={editForm.control} name="appliesTo" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Applies To</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                            <SelectContent>
                              <SelectItem value="lead">Lead</SelectItem>
                              <SelectItem value="deal">Deal</SelectItem>
                              <SelectItem value="both">Both</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={editForm.control} name="priority" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Priority</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                            <SelectContent>
                              <SelectItem value="low">Low</SelectItem>
                              <SelectItem value="medium">Medium</SelectItem>
                              <SelectItem value="high">High</SelectItem>
                              <SelectItem value="urgent">Urgent</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={editForm.control} name="firstResponseHours" render={({ field }) => (
                        <FormItem>
                          <FormLabel>First Response (hrs)</FormLabel>
                          <FormControl><Input type="number" min={1} {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={editForm.control} name="resolutionHours" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Resolution (hrs)</FormLabel>
                          <FormControl><Input type="number" min={1} {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                    </div>
                    </div>
                    <SheetFooter>
                      <Button type="button" variant="ghost" onClick={handleCancelEdit}>Cancel</Button>
                      <Button type="submit" loading={updatePolicy.isPending} disabled={updatePolicy.isPending}>
                        {updatePolicy.isPending ? "Saving..." : "Save Changes"}
                      </Button>
                    </SheetFooter>
                  </form>
                </Form>
          </SheetContent>
        </Sheet>

        {breachedLeads && breachedLeads.length > 0 && (
          <motion.div variants={fadeUp}>
            <Card className="border-danger-500/40">
              <CardHeader className="border-b">
                <CardTitle className="flex items-center gap-2 text-base">
                  <IconChip icon={AlertTriangle} tone="danger" size="sm" />
                  SLA Breached Leads <span className="tabular-nums text-muted-foreground">({breachedLeads.length})</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Lead</TableHead>
                      <TableHead className="text-xs">Status</TableHead>
                      <TableHead className="text-xs text-right">Breached Since</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {breachedLeads.map(lead => (
                      <TableRow key={lead.id}>
                        <TableCell className="text-xs font-medium">{lead.name}</TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="text-2xs">{lead.status}</Badge>
                        </TableCell>
                        <TableCell className="text-xs text-right tabular-nums text-danger-strong">
                          {lead.slaDeadline ? new Date(lead.slaDeadline).toLocaleDateString() : "N/A"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </motion.div>
      )}
    </PageWrapper>
  );
}

type SlaPolicyData = {
  id: number;
  name: string;
  appliesTo: string;
  priority: string;
  firstResponseHours: number;
  resolutionHours: number;
};

interface SlaTableRowProps {
  policy: SlaPolicyData;
  onEdit: (policy: SlaPolicyData) => void;
  onDelete: (id: number) => void;
}

function SlaTableRow({ policy, onEdit, onDelete }: SlaTableRowProps) {
  const tone = PRIORITY_TONES[policy.priority] ?? PRIORITY_TONES.medium;
  const handleEdit = useCallback(() => onEdit(policy), [policy, onEdit]);
  const handleDelete = useCallback(() => onDelete(policy.id), [policy.id, onDelete]);

  return (
    <TableRow>
      <TableCell className="text-xs font-medium">{policy.name}</TableCell>
      <TableCell>
        <Badge variant="secondary" className="text-2xs capitalize">{policy.appliesTo}</Badge>
      </TableCell>
      <TableCell>
        <StatusPill tone={tone} dot className="capitalize">{policy.priority}</StatusPill>
      </TableCell>
      <TableCell className="text-xs text-right tabular-nums">{policy.firstResponseHours}h</TableCell>
      <TableCell className="text-xs text-right tabular-nums">{policy.resolutionHours}h</TableCell>
      <TableCell className="text-right">
        <div className="flex items-center justify-end gap-1">
          <Button variant="ghost" size="icon-sm" onClick={handleEdit} aria-label="Edit">
            <Pencil className="size-3.5" />
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="icon-sm" className="text-destructive hover:bg-danger-soft hover:text-destructive" aria-label="Delete">
                <Trash2 className="size-3.5" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete SLA Policy</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to delete <strong>{policy.name}</strong>? This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  onClick={handleDelete}
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </TableCell>
    </TableRow>
  );
}
