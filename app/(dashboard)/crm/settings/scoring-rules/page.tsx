"use client";

import { useState, useCallback, useMemo } from "react";
import { motion } from "framer-motion";
import { useForm, type Resolver, type UseFormReturn } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Trash2, Pencil, Zap } from "lucide-react";
import { EmptyTargetIllustration } from "@/components/illustrations";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { PageWrapper } from "@/components/ui/page-wrapper";
import {
  Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle, SheetTrigger,
} from "@/components/ui/sheet";
import { IconChip } from "@/components/ui/icon-chip";
import { EmptyState } from "@/components/ui/empty-state";
import { QueryErrorState } from "@/components/ui/query-error-state";
import { toneSoft } from "@/lib/design/tones";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Form, FormField, FormItem, FormLabel, FormControl, FormMessage,
} from "@/components/ui/form";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader,
  AlertDialogFooter, AlertDialogTitle, AlertDialogDescription,
  AlertDialogAction, AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import { staggerContainer, fadeUp } from "@/lib/motion-variants";
import {
  useScoringRules, useCreateScoringRule, useUpdateScoringRule, useDeleteScoringRule,
} from "@/lib/api/hooks/crm-settings";
import { toast } from "sonner";

const FIELDS = [
  { value: "source", label: "Source" },
  { value: "priority", label: "Priority" },
  { value: "status", label: "Status" },
  { value: "company", label: "Company" },
  { value: "city", label: "City" },
  { value: "potentialValue", label: "Potential Value" },
  { value: "investmentInterest", label: "Investment Interest" },
];

const OPERATORS = [
  { value: "eq", label: "Equals" },
  { value: "gt", label: "Greater than" },
  { value: "lt", label: "Less than" },
  { value: "contains", label: "Contains" },
  { value: "in", label: "In (comma-sep)" },
];

const ruleSchema = z.object({
  field: z.string().min(1, "Select a field"),
  operator: z.enum(["eq", "gt", "lt", "contains", "in"]),
  value: z.string().min(1, "Value required"),
  points: z.coerce.number().int("Must be integer"),
});
type RuleForm = z.infer<typeof ruleSchema>;

const SAMPLE_LEAD = {
  name: "Rahul Sharma",
  email: "rahul@example.com",
  phone: "+919876543210",
  source: "referral",
  priority: "HOT",
  status: "INTERESTED",
  company: "TechCorp India",
  city: "Mumbai",
  potentialValue: "5000000",
  investmentInterest: "3000000",
};

export default function ScoringRulesPage() {
  const { data: rules, isLoading, isError, error, refetch } = useScoringRules();
  const [createOpen, setCreateOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const createRule = useCreateScoringRule();
  const updateRule = useUpdateScoringRule();
  const deleteRule = useDeleteScoringRule();

  const ruleResolver = zodResolver(ruleSchema) as unknown as Resolver<RuleForm>;

  const form = useForm<RuleForm>({
    resolver: ruleResolver,
    defaultValues: { field: "", operator: "eq", value: "", points: 0 },
  });

  const editForm = useForm<RuleForm>({
    resolver: ruleResolver,
  });

  const onCreateSubmit = useCallback((data: RuleForm) => {
    createRule.mutate(
      data,
      {
        onSuccess: () => { toast.success("Rule created"); setCreateOpen(false); form.reset(); },
        onError: (err) => toast.error(err.message),
      }
    );
  }, [createRule, form]);

  const onEditSubmit = useCallback((data: RuleForm) => {
    if (editingId === null) return;
    updateRule.mutate(
      { id: editingId, ...data },
      {
        onSuccess: () => { toast.success("Rule updated"); setEditingId(null); },
        onError: (err) => toast.error(err.message),
      }
    );
  }, [editingId, updateRule]);

  const startEdit = useCallback((rule: { id: number; field: string; operator: string; value: string; points: number }) => {
    setEditingId(rule.id);
    editForm.reset({
      field: rule.field,
      operator: rule.operator as RuleForm["operator"],
      value: rule.value,
      points: rule.points,
    });
  }, [editForm]);

  const handleCancelEdit = useCallback(() => setEditingId(null), []);

  const handleDeleteScoringRule = useCallback((id: number) => {
    deleteRule.mutate(id, {
      onSuccess: () => toast.success("Rule deleted"),
      onError: (err) => toast.error(err.message),
    });
  }, [deleteRule]);

  const sampleScore = useMemo(() => {
    if (!rules) return 0;
    let score = 0;
    const record = SAMPLE_LEAD as Record<string, string>;
    for (const rule of rules) {
      const fieldVal = record[rule.field] ?? "";
      let match = false;
      switch (rule.operator) {
        case "eq": match = fieldVal === rule.value; break;
        case "gt": {
          const a = Number(fieldVal), b = Number(rule.value);
          match = Number.isFinite(a) && Number.isFinite(b) && a > b;
          break;
        }
        case "lt": {
          const a = Number(fieldVal), b = Number(rule.value);
          match = Number.isFinite(a) && Number.isFinite(b) && a < b;
          break;
        }
        case "contains": match = fieldVal.toLowerCase().includes(rule.value.toLowerCase()); break;
        case "in": match = rule.value.split(",").map(v => v.trim()).includes(fieldVal); break;
      }
      if (match) score += rule.points;
    }
    return score;
  }, [rules]);

  if (isLoading) {
    return (
      <PageWrapper title="Lead Scoring Rules" subtitle="Define rules to automatically score leads" contentClassName="max-w-5xl">
        <div className="space-y-6">
          <Skeleton className="h-64 rounded-lg" />
          <Skeleton className="h-40 rounded-lg" />
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper
      title="Lead Scoring Rules"
      subtitle="Define rules to automatically score leads"
      actions={
        <Sheet open={createOpen} onOpenChange={setCreateOpen}>
          <SheetTrigger asChild>
            <Button>
              <Plus className="size-4" />
              New Rule
            </Button>
          </SheetTrigger>
          <SheetContent size="sm" className="gap-0 p-0">
            <SheetHeader className="border-b px-6">
              <SheetTitle>Create Scoring Rule</SheetTitle>
            </SheetHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onCreateSubmit)} className="flex min-h-0 flex-1 flex-col">
                <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-5">
                <FormField control={form.control} name="field" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Field</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger><SelectValue placeholder="Pick a field" /></SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {FIELDS.map(f => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="operator" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Operator</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {OPERATORS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="value" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Value</FormLabel>
                    <FormControl><Input {...field} placeholder="e.g. HOT or 1000000" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="points" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Points</FormLabel>
                    <FormControl><Input type="number" {...field} placeholder="e.g. 20" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                </div>
                <SheetFooter>
                  <Button type="button" variant="ghost" onClick={() => setCreateOpen(false)}>Cancel</Button>
                  <Button type="submit" loading={createRule.isPending} disabled={createRule.isPending}>
                    {createRule.isPending ? "Creating..." : "Create Rule"}
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
        <QueryErrorState title="Couldn't load scoring rules" error={error} onRetry={() => refetch()} />
      ) : (
      <motion.div
        className="space-y-6"
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
      >
        <motion.div variants={fadeUp}>
          <Card>
            <CardHeader className="border-b">
              <CardTitle className="text-base">Rules</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {rules && rules.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Field</TableHead>
                      <TableHead className="text-xs">Operator</TableHead>
                      <TableHead className="text-xs">Value</TableHead>
                      <TableHead className="text-xs text-right">Points</TableHead>
                      <TableHead className="text-xs text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rules.map(rule => (
                      <ScoringRuleRow
                        key={rule.id}
                        rule={rule}
                        isEditing={editingId === rule.id}
                        editForm={editForm}
                        onEditSubmit={onEditSubmit}
                        onEdit={startEdit}
                        onDelete={handleDeleteScoringRule}
                        onCancelEdit={handleCancelEdit}
                        updatePending={updateRule.isPending}
                      />
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <EmptyState
                  className="border-0"
                  illustration={<EmptyTargetIllustration className="size-32" />}
                  title="No scoring rules defined"
                  description="Create your first rule to start scoring leads automatically."
                  action={{ label: "New Rule", onClick: () => setCreateOpen(true) }}
                />
              )}
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={fadeUp}>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <IconChip icon={Zap} size="sm" />
                Live Preview - Sample Lead
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-3 text-xs sm:grid-cols-2 md:grid-cols-4">
                {Object.entries(SAMPLE_LEAD).map(([key, value]) => (
                  <div key={key}>
                    <span className="text-muted-foreground capitalize">{key}: </span>
                    <span className="break-words font-medium">{value}</span>
                  </div>
                ))}
              </div>
              <div className="mt-4 flex items-center justify-between rounded-lg border bg-surface-sunken p-4">
                <span className="text-sm font-medium">Calculated Score</span>
                <span className={cn(
                  "inline-flex h-9 items-center rounded-full px-4 font-display text-lg font-bold tabular-nums",
                  sampleScore <= 30 ? toneSoft.danger :
                  sampleScore <= 60 ? toneSoft.warning :
                  toneSoft.success
                )}>
                  {sampleScore} pts
                </span>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>
      )}
    </PageWrapper>
  );
}

type ScoringRuleData = { id: number; field: string; operator: string; value: string; points: number };

interface ScoringRuleRowProps {
  rule: ScoringRuleData;
  isEditing: boolean;
  editForm: UseFormReturn<RuleForm>;
  onEditSubmit: (data: RuleForm) => void;
  onEdit: (rule: ScoringRuleData) => void;
  onDelete: (id: number) => void;
  onCancelEdit: () => void;
  updatePending: boolean;
}

function ScoringRuleRow({ rule, isEditing, editForm, onEditSubmit, onEdit, onDelete, onCancelEdit, updatePending }: ScoringRuleRowProps) {
  const handleEdit = useCallback(() => onEdit(rule), [rule, onEdit]);
  const handleDelete = useCallback(() => onDelete(rule.id), [rule.id, onDelete]);

  return (
    <TableRow>
      {isEditing ? (
        <>
          <TableCell colSpan={4}>
            <Form {...editForm}>
              <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="flex flex-wrap items-end gap-2">
                <FormField control={editForm.control} name="field" render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger className="h-8 w-28 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>{FIELDS.map(f => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}</SelectContent>
                  </Select>
                )} />
                <FormField control={editForm.control} name="operator" render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger className="h-8 w-28 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>{OPERATORS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
                  </Select>
                )} />
                <FormField control={editForm.control} name="value" render={({ field }) => (
                  <Input {...field} className="h-8 w-24 text-xs" />
                )} />
                <FormField control={editForm.control} name="points" render={({ field }) => (
                  <Input type="number" {...field} className="h-8 w-16 text-xs" />
                )} />
                <Button type="submit" size="sm" loading={updatePending} disabled={updatePending}>Save</Button>
                <Button type="button" variant="ghost" size="sm" onClick={onCancelEdit}>Cancel</Button>
              </form>
            </Form>
          </TableCell>
          <TableCell />
        </>
      ) : (
        <>
          <TableCell className="text-xs capitalize">{FIELDS.find(f => f.value === rule.field)?.label ?? rule.field}</TableCell>
          <TableCell className="text-xs">{OPERATORS.find(o => o.value === rule.operator)?.label ?? rule.operator}</TableCell>
          <TableCell className="font-mono text-xs">{rule.value}</TableCell>
          <TableCell className="text-xs text-right">
            <Badge variant={rule.points >= 0 ? "success" : "destructive"} className="tabular-nums">
              {rule.points > 0 ? "+" : ""}{rule.points}
            </Badge>
          </TableCell>
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
                    <AlertDialogTitle>Delete scoring rule?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will permanently remove this scoring rule. This action cannot be undone.
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
        </>
      )}
    </TableRow>
  );
}
