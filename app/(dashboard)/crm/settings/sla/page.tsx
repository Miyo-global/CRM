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
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
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
import { cn } from "@/lib/utils";
import { staggerContainer, fadeUp } from "@/lib/motion-variants";
import {
  useSlaPolicies, useSlaReport, useSlaBreachedLeads,
  useCreateSlaPolicy, useUpdateSlaPolicy, useDeleteSlaPolicy,
} from "@/lib/api/hooks/crm-settings";
import { toast } from "sonner";

const PRIORITY_COLORS: Record<string, { color: string; bg: string }> = {
  low: { color: "text-blue-400", bg: "bg-blue-500/15" },
  medium: { color: "text-amber-400", bg: "bg-amber-500/15" },
  high: { color: "text-orange-400", bg: "bg-orange-500/15" },
  urgent: { color: "text-red-400", bg: "bg-red-500/15" },
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
  const { data: policies, isLoading } = useSlaPolicies();
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
      <div className="space-y-6 p-6">
        <Skeleton className="h-10 w-48" />
        <div className="grid gap-4 md:grid-cols-3">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-24" />)}
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <PageWrapper
      title="SLA Policies"
      subtitle="Service Level Agreement policies for leads and deals"
      actions={
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button className="bg-gold hover:bg-gold/90 text-white">
              <Plus className="h-4 w-4 mr-2" />
              New Policy
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Create SLA Policy</DialogTitle>
            </DialogHeader>
            <Form {...createForm}>
              <form onSubmit={createForm.handleSubmit(onCreateSubmit)} className="space-y-4">
                <FormField control={createForm.control} name="name" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Policy Name</FormLabel>
                    <FormControl><Input {...field} placeholder="e.g. Hot Lead SLA" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <div className="grid grid-cols-2 gap-4">
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
                <Button type="submit" className="w-full bg-gold hover:bg-gold/90 text-white" disabled={createPolicy.isPending}>
                  {createPolicy.isPending ? "Creating..." : "Create Policy"}
                </Button>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      }
    >
      <motion.div
        className="space-y-6"
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
      >
        {slaReport && (
          <motion.div variants={fadeUp} className="grid gap-4 grid-cols-2 md:grid-cols-4">
            {[
              { label: "Total with SLA", value: slaReport.total, icon: Shield, color: "text-blue-400" },
              { label: "Compliant", value: slaReport.compliant, icon: CheckCircle2, color: "text-emerald-400" },
              { label: "Breached", value: slaReport.breached, icon: XCircle, color: "text-red-400" },
              {
                label: "Compliance Rate",
                value: `${slaReport.complianceRate}%`,
                icon: Clock,
                color: slaReport.complianceRate >= 80 ? "text-emerald-400" : slaReport.complianceRate >= 50 ? "text-amber-400" : "text-red-400",
              },
            ].map(stat => (
              <Card key={stat.label} className="shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <stat.icon className={cn("h-5 w-5", stat.color)} />
                    <span className="text-2xl font-bold tabular-nums">{stat.value}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{stat.label}</p>
                </CardContent>
              </Card>
            ))}
          </motion.div>
        )}

        <motion.div variants={fadeUp}>
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">Policies</CardTitle>
            </CardHeader>
            <CardContent>
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
                <div className="text-center py-8 text-muted-foreground">
                  <Shield className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No SLA policies defined</p>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {editingId !== null && (
          <motion.div variants={fadeUp}>
            <Card className="shadow-sm border-gold/30">
              <CardHeader>
                <CardTitle className="text-base">Edit Policy</CardTitle>
              </CardHeader>
              <CardContent>
                <Form {...editForm}>
                  <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4">
                    <FormField control={editForm.control} name="name" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Policy Name</FormLabel>
                        <FormControl><Input {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <div className="grid grid-cols-2 gap-4">
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
                    <div className="flex justify-end gap-3">
                      <Button type="button" variant="outline" onClick={handleCancelEdit}>Cancel</Button>
                      <Button type="submit" className="bg-gold hover:bg-gold/90 text-white" disabled={updatePolicy.isPending}>
                        {updatePolicy.isPending ? "Saving..." : "Save Changes"}
                      </Button>
                    </div>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {breachedLeads && breachedLeads.length > 0 && (
          <motion.div variants={fadeUp}>
            <Card className="shadow-sm border-red-500/20">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-red-400" />
                  SLA Breached Leads ({breachedLeads.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
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
                          <Badge variant="secondary" className="text-[10px]">{lead.status}</Badge>
                        </TableCell>
                        <TableCell className="text-xs text-right text-red-400">
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
  const pColor = PRIORITY_COLORS[policy.priority] ?? PRIORITY_COLORS.medium;
  const handleEdit = useCallback(() => onEdit(policy), [policy, onEdit]);
  const handleDelete = useCallback(() => onDelete(policy.id), [policy.id, onDelete]);

  return (
    <TableRow>
      <TableCell className="text-xs font-medium">{policy.name}</TableCell>
      <TableCell>
        <Badge variant="secondary" className="text-[10px] capitalize">{policy.appliesTo}</Badge>
      </TableCell>
      <TableCell>
        <Badge className={cn("text-[10px] capitalize", pColor.bg, pColor.color)}>{policy.priority}</Badge>
      </TableCell>
      <TableCell className="text-xs text-right">{policy.firstResponseHours}h</TableCell>
      <TableCell className="text-xs text-right">{policy.resolutionHours}h</TableCell>
      <TableCell className="text-right">
        <div className="flex items-center justify-end gap-1">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleEdit} aria-label="Edit">
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" aria-label="Delete">
                <Trash2 className="h-3.5 w-3.5" />
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
