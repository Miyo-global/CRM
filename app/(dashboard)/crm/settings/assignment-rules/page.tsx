"use client";

import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import { useForm, useFieldArray, type Control } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Plus, Trash2, GripVertical, Power, PowerOff, ChevronUp, ChevronDown, Settings,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Switch } from "@/components/ui/switch";
import {
  Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle, SheetTrigger,
} from "@/components/ui/sheet";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { QueryErrorState } from "@/components/ui/query-error-state";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Form, FormField, FormItem, FormLabel, FormControl, FormMessage,
} from "@/components/ui/form";
import { cn } from "@/lib/utils";
import { staggerContainer, fadeUp } from "@/lib/motion-variants";
import {
  useAssignmentRules, useCreateAssignmentRule, useUpdateAssignmentRule,
  useDeleteAssignmentRule, useReorderAssignmentRules,
} from "@/lib/api/hooks/crm-settings";
import { useHrEmployees } from "@/lib/api/hooks/hr";
import { toast } from "sonner";

const FIELDS = [
  { value: "source", label: "Source" },
  { value: "priority", label: "Priority" },
  { value: "city", label: "City" },
  { value: "company", label: "Company" },
  { value: "potentialValue", label: "Potential Value" },
];

const OPERATORS = [
  { value: "eq", label: "Equals" },
  { value: "contains", label: "Contains" },
  { value: "gt", label: "Greater than" },
  { value: "lt", label: "Less than" },
  { value: "in", label: "In (comma-sep)" },
];

const conditionSchema = z.object({
  field: z.string().min(1),
  operator: z.string().min(1),
  value: z.string().min(1),
});

const createRuleSchema = z.object({
  name: z.string().min(1, "Name required").max(100),
  assignmentType: z.enum(["assign_user", "round_robin"]),
  assignToUserId: z.string().optional(),
  roundRobinUserIds: z.string().optional(),
  conditions: z.array(conditionSchema).min(1, "At least one condition required"),
});
type CreateRuleForm = z.infer<typeof createRuleSchema>;

type AssignmentRuleData = {
  id: number;
  name: string;
  isActive: boolean;
  assignmentType: string;
  priority: number;
  conditions: unknown;
};

interface RuleCardProps {
  rule: AssignmentRuleData;
  index: number;
  totalRules: number;
  onMove: (index: number, direction: "up" | "down") => void;
  onToggle: (id: number, isActive: boolean) => void;
  onDelete: (id: number) => void;
}

function RuleCard({ rule, index, totalRules, onMove, onToggle, onDelete }: RuleCardProps) {
  const conditions = rule.conditions as { field: string; operator: string; value: string }[];
  const handleMoveUp = useCallback(() => onMove(index, "up"), [index, onMove]);
  const handleMoveDown = useCallback(() => onMove(index, "down"), [index, onMove]);
  const handleToggle = useCallback(() => onToggle(rule.id, rule.isActive), [rule.id, rule.isActive, onToggle]);
  const handleDelete = useCallback(() => onDelete(rule.id), [rule.id, onDelete]);

  return (
    <Card className={cn("transition-opacity", !rule.isActive && "opacity-60")}>
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className="flex flex-col gap-0.5">
            <Button variant="ghost" size="icon-xs" disabled={index === 0} onClick={handleMoveUp} aria-label="Move rule up">
              <ChevronUp className="size-3.5" />
            </Button>
            <Button variant="ghost" size="icon-xs" disabled={index === totalRules - 1} onClick={handleMoveDown} aria-label="Move rule down">
              <ChevronDown className="size-3.5" />
            </Button>
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="truncate text-sm font-semibold">{rule.name}</h3>
              <Badge variant="secondary" className="tabular-nums">Priority {rule.priority}</Badge>
              <Badge variant={rule.assignmentType === "round_robin" ? "default" : "secondary"}>
                {rule.assignmentType === "round_robin" ? "Round Robin" : "Direct Assign"}
              </Badge>
            </div>
            <div className="flex flex-wrap gap-1.5 mt-1.5">
              {conditions.map((c, ci) => (
                <Badge key={ci} variant="outline" className="font-mono">
                  {FIELDS.find(f => f.value === c.field)?.label ?? c.field} {c.operator} {c.value}
                </Badge>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Switch checked={rule.isActive} onCheckedChange={handleToggle} aria-label={`${rule.isActive ? "Disable" : "Enable"} ${rule.name}`} />
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="icon-sm" className="text-destructive hover:bg-danger-soft hover:text-destructive" aria-label="Delete rule">
                  <Trash2 className="size-3.5" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete assignment rule?</AlertDialogTitle>
                  <AlertDialogDescription>
                    &quot;{rule.name}&quot; will be permanently deleted. This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={handleDelete}>
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface ConditionRowProps {
  cField: { id: string };
  index: number;
  control: Control<CreateRuleForm>;
  showRemove: boolean;
  onRemove: (index: number) => void;
}

function ConditionRow({ cField: _, index: i, control, showRemove, onRemove }: ConditionRowProps) {
  const handleRemove = useCallback(() => onRemove(i), [i, onRemove]);
  return (
    <div className="flex flex-wrap items-center gap-2 sm:flex-nowrap">
      <FormField control={control} name={`conditions.${i}.field`} render={({ field }) => (
        <Select onValueChange={field.onChange} value={field.value}>
          <SelectTrigger className="h-8 w-28 text-xs"><SelectValue placeholder="Field" /></SelectTrigger>
          <SelectContent>{FIELDS.map(f => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}</SelectContent>
        </Select>
      )} />
      <FormField control={control} name={`conditions.${i}.operator`} render={({ field }) => (
        <Select onValueChange={field.onChange} value={field.value}>
          <SelectTrigger className="h-8 w-28 text-xs"><SelectValue placeholder="Op" /></SelectTrigger>
          <SelectContent>{OPERATORS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
        </Select>
      )} />
      <FormField control={control} name={`conditions.${i}.value`} render={({ field }) => (
        <Input {...field} className="h-8 min-w-24 flex-1 text-xs" placeholder="Value" />
      )} />
      {showRemove && (
        <Button type="button" variant="ghost" size="icon-sm" className="shrink-0 text-destructive hover:bg-danger-soft hover:text-destructive" onClick={handleRemove} aria-label="Remove condition">
          <Trash2 className="size-3.5" />
        </Button>
      )}
    </div>
  );
}

export default function AssignmentRulesPage() {
  const { data: rules, isLoading, isError, error, refetch } = useAssignmentRules();
  const { data: rawEmployees } = useHrEmployees();
  const employees = Array.isArray(rawEmployees) ? rawEmployees : rawEmployees?.data ?? [];
  const [createOpen, setCreateOpen] = useState(false);

  const createRule = useCreateAssignmentRule();
  const updateRule = useUpdateAssignmentRule();
  const deleteRule = useDeleteAssignmentRule();
  const reorderRules = useReorderAssignmentRules();

  const form = useForm<CreateRuleForm>({
    resolver: zodResolver(createRuleSchema),
    defaultValues: {
      name: "",
      assignmentType: "assign_user",
      assignToUserId: "",
      roundRobinUserIds: "",
      conditions: [{ field: "", operator: "eq", value: "" }],
    },
  });

  const { fields: conditionFields, append: addCondition, remove: removeCondition } = useFieldArray({
    control: form.control,
    name: "conditions",
  });

  const assignmentType = form.watch("assignmentType");

  const onCreateSubmit = useCallback((data: CreateRuleForm) => {
    createRule.mutate(
      {
        name: data.name,
        assignmentType: data.assignmentType,
        assignToUserId: data.assignmentType === "assign_user" ? data.assignToUserId || undefined : undefined,
        roundRobinUserIds: data.assignmentType === "round_robin"
          ? data.roundRobinUserIds?.split(",").map(s => s.trim()).filter(Boolean) ?? []
          : undefined,
        conditions: data.conditions,
        priority: (rules?.length ?? 0),
      },
      {
        onSuccess: () => { toast.success("Rule created"); setCreateOpen(false); form.reset(); },
        onError: (err) => toast.error(err.message),
      }
    );
  }, [createRule, form, rules]);

  const toggleActive = useCallback((id: number, currentActive: boolean) => {
    updateRule.mutate(
      { id, isActive: !currentActive },
      { onSuccess: () => toast.success("Rule updated"), onError: (err) => toast.error(err.message) }
    );
  }, [updateRule]);

  const moveRule = useCallback((index: number, direction: "up" | "down") => {
    if (!rules) return;
    const newRules = [...rules];
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newRules.length) return;
    [newRules[index], newRules[targetIndex]] = [newRules[targetIndex], newRules[index]];
    reorderRules.mutate(
      { rules: newRules.map((r, i) => ({ id: r.id, priority: i })) },
      { onError: (err) => toast.error(err.message) }
    );
  }, [rules, reorderRules]);

  const handleAddCondition = useCallback(() => {
    addCondition({ field: "", operator: "eq", value: "" });
  }, [addCondition]);

  const handleDeleteRule = useCallback((id: number) => {
    deleteRule.mutate(id, {
      onSuccess: () => toast.success("Rule deleted"),
      onError: (err) => toast.error(err.message),
    });
  }, [deleteRule]);

  if (isLoading) {
    return (
      <PageWrapper title="Assignment Rules" subtitle="Auto-assign leads based on conditions" contentClassName="max-w-5xl">
        <div className="space-y-3">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-20 rounded-lg" />)}
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper
      title="Assignment Rules"
      subtitle="Auto-assign leads based on conditions"
      actions={
        <Sheet open={createOpen} onOpenChange={setCreateOpen}>
          <SheetTrigger asChild>
            <Button>
              <Plus className="size-4" />
              New Rule
            </Button>
          </SheetTrigger>
          <SheetContent size="md" className="gap-0 p-0">
            <SheetHeader className="border-b px-6">
              <SheetTitle>Create Assignment Rule</SheetTitle>
            </SheetHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onCreateSubmit)} className="flex min-h-0 flex-1 flex-col">
                <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-5">
                <FormField control={form.control} name="name" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Rule Name</FormLabel>
                    <FormControl><Input {...field} placeholder="e.g. Mumbai Leads to Ravi" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <div>
                  <FormLabel className="text-sm">Conditions</FormLabel>
                  <div className="space-y-2 mt-2">
                    {conditionFields.map((cField, i) => (
                    <ConditionRow
                      key={cField.id}
                      cField={cField}
                      index={i}
                      control={form.control}
                      showRemove={conditionFields.length > 1}
                      onRemove={removeCondition}
                    />
                  ))}
                  </div>
                  <Button type="button" variant="outline" size="xs" className="mt-2" onClick={handleAddCondition}>
                    <Plus className="size-3.5" /> Add Condition
                  </Button>
                </div>

                <FormField control={form.control} name="assignmentType" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Assignment Type</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="assign_user">Assign to User</SelectItem>
                        <SelectItem value="round_robin">Round Robin</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />

                {assignmentType === "assign_user" && (
                  <FormField control={form.control} name="assignToUserId" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Assign To</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger><SelectValue placeholder="Select user" /></SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {employees?.map(e => (
                            <SelectItem key={e.id} value={e.id}>{e.name || e.id}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                )}

                {assignmentType === "round_robin" && (
                  <FormField control={form.control} name="roundRobinUserIds" render={({ field }) => (
                    <FormItem>
                      <FormLabel>User IDs (comma-separated)</FormLabel>
                      <FormControl><Input {...field} placeholder="user-id-1, user-id-2, ..." /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                )}

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
        <QueryErrorState title="Couldn't load assignment rules" error={error} onRetry={() => refetch()} />
      ) : (
      <motion.div
        className="space-y-3"
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
      >
        <motion.div variants={fadeUp} className="space-y-3">
          {rules && rules.length > 0 ? (
            rules.map((rule, index) => (
              <RuleCard
                key={rule.id}
                rule={rule}
                index={index}
                totalRules={rules.length}
                onMove={moveRule}
                onToggle={toggleActive}
                onDelete={handleDeleteRule}
              />
            ))
          ) : (
            <EmptyState
              icon={Settings}
              title="No assignment rules defined"
              description="Create rules to auto-assign leads"
              action={{ label: "New Rule", onClick: () => setCreateOpen(true) }}
            />
          )}
        </motion.div>
      </motion.div>
      )}
    </PageWrapper>
  );
}
