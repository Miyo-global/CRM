"use client";

import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import {
  TrendingUp, Plus, Trash2, IndianRupee, CalendarDays, Tag,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { StatCard } from "@/components/ui/stat-card";
import { cn } from "@/lib/utils";
import { staggerContainer, fadeUp } from "@/lib/motion-variants";
import {
  useClientOpportunities,
  useCreateClientOpportunity,
  useUpdateClientOpportunity,
  useDeleteClientOpportunity,
  useSimpleClientsList,
  type ClientOpportunity,
  type CreateClientOpportunityInput,
} from "@/lib/api/hooks/crm";
import { CURRENCY_SYMBOL, DEFAULT_CURRENCY, DEFAULT_LOCALE } from "@/lib/constants/locale";


type OppStage = "identified" | "proposed" | "negotiating" | "won" | "lost";
type OppType = "upsell" | "cross_sell";

const STAGES: {
  id: OppStage;
  label: string;
  headerBg: string;
  badgeClass: string;
  dot: string;
}[] = [
  {
    id: "identified",
    label: "Identified",
    headerBg: "bg-blue-500",
    badgeClass: "text-blue-700 bg-blue-50 border-blue-200",
    dot: "bg-blue-500",
  },
  {
    id: "proposed",
    label: "Proposed",
    headerBg: "bg-amber-500",
    badgeClass: "text-amber-700 bg-amber-50 border-amber-200",
    dot: "bg-amber-500",
  },
  {
    id: "negotiating",
    label: "Negotiating",
    headerBg: "bg-violet-500",
    badgeClass: "text-violet-700 bg-violet-50 border-violet-200",
    dot: "bg-violet-500",
  },
  {
    id: "won",
    label: "Won",
    headerBg: "bg-emerald-500",
    badgeClass: "text-emerald-700 bg-emerald-50 border-emerald-200",
    dot: "bg-emerald-500",
  },
  {
    id: "lost",
    label: "Lost",
    headerBg: "bg-red-500",
    badgeClass: "text-red-700 bg-red-50 border-red-200",
    dot: "bg-red-500",
  },
];


function formatInrShort(value: string | null | undefined): string {
  if (!value) return "";
  const num = Number(value);
  if (!Number.isFinite(num) || num === 0) return "";
  if (num >= 1_00_00_000) return `${CURRENCY_SYMBOL}${(num / 1_00_00_000).toFixed(2)}Cr`;
  if (num >= 1_00_000) return `${CURRENCY_SYMBOL}${(num / 1_00_000).toFixed(2)}L`;
  return new Intl.NumberFormat(DEFAULT_LOCALE, {
    style: "currency",
    currency: DEFAULT_CURRENCY,
    maximumFractionDigits: 0,
  }).format(num);
}

function sumValues(opps: ClientOpportunity[]): number {
  return opps.reduce((acc, o) => acc + (Number(o.value) || 0), 0);
}


interface OppCardProps {
  opp: ClientOpportunity;
  onStageChange: (id: number, stage: OppStage) => void;
  onDelete: (id: number) => void;
  isPending: boolean;
}

function OppCard({ opp, onStageChange, onDelete, isPending }: OppCardProps) {
  const stageCfg = STAGES.find((s) => s.id === opp.stage) ?? STAGES[0];

  return (
    <motion.div variants={fadeUp}>
      <Card className="group hover:shadow-md transition-shadow">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-sm text-foreground truncate">{opp.title}</p>
              {opp.client?.name && (
                <p className="text-xs text-muted-foreground truncate">{opp.client.name}</p>
              )}
            </div>
            <Badge
              variant="outline"
              className={cn("text-[10px] shrink-0 capitalize whitespace-nowrap", stageCfg.badgeClass)}
            >
              <span className={cn("w-1.5 h-1.5 rounded-full mr-1 inline-block", stageCfg.dot)} />
              {stageCfg.label}
            </Badge>
          </div>

          <div className="flex items-center gap-2">
            <Badge
              variant="secondary"
              className={cn(
                "text-[10px]",
                opp.type === "upsell"
                  ? "bg-blue-100 text-blue-700"
                  : "bg-purple-100 text-purple-700"
              )}
            >
              <Tag className="h-2.5 w-2.5 mr-1" />
              {opp.type === "upsell" ? "Upsell" : "Cross-sell"}
            </Badge>
          </div>

          {opp.value && (
            <div className="flex items-center gap-1 text-sm font-medium text-foreground">
              <IndianRupee className="h-3.5 w-3.5 text-muted-foreground" />
              {formatInrShort(opp.value)}
            </div>
          )}

          {opp.expectedCloseDate && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <CalendarDays className="h-3 w-3" />
              {new Date(opp.expectedCloseDate).toLocaleDateString(DEFAULT_LOCALE)}
            </div>
          )}

          <Select
            value={opp.stage}
            onValueChange={(v) => onStageChange(opp.id, v as OppStage)}
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

          <Button
            variant="ghost"
            size="sm"
            className="w-full h-7 text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
            onClick={() => onDelete(opp.id)}
            disabled={isPending}
          >
            <Trash2 className="h-3.5 w-3.5 mr-1" />
            Delete
          </Button>
        </CardContent>
      </Card>
    </motion.div>
  );
}


interface KanbanColumnProps {
  stage: (typeof STAGES)[number];
  opps: ClientOpportunity[];
  onStageChange: (id: number, stage: OppStage) => void;
  onDelete: (id: number) => void;
  mutatingId: number | null;
}

function KanbanColumn({ stage, opps, onStageChange, onDelete, mutatingId }: KanbanColumnProps) {
  return (
    <div className="flex flex-col gap-2 min-w-[260px] flex-1">
      <div className="rounded-t-lg overflow-hidden">
        <div className={cn("px-3 py-2 flex items-center justify-between", stage.headerBg)}>
          <span className="text-white font-semibold text-sm">{stage.label}</span>
          <span className="bg-white/20 text-white text-xs font-bold px-1.5 py-0.5 rounded-full">
            {opps.length}
          </span>
        </div>
      </div>

      <motion.div
        className="flex flex-col gap-2 min-h-[120px]"
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
      >
        {opps.length === 0 && (
          <div className="rounded-lg border-2 border-dashed border-border p-4 text-center text-xs text-muted-foreground">
            No opportunities
          </div>
        )}
        {opps.map((opp) => (
          <OppCard
            key={opp.id}
            opp={opp}
            onStageChange={onStageChange}
            onDelete={onDelete}
            isPending={mutatingId === opp.id}
          />
        ))}
      </motion.div>
    </div>
  );
}


interface CreateFormState {
  clientId: string;
  title: string;
  type: OppType;
  stage: OppStage;
  value: string;
  expectedCloseDate: string;
  notes: string;
}

const INITIAL_FORM: CreateFormState = {
  clientId: "",
  title: "",
  type: "upsell",
  stage: "identified",
  value: "",
  expectedCloseDate: "",
  notes: "",
};


export default function UpsellTrackerPage() {
  const { data: opps = [], isLoading } = useClientOpportunities();
  const { data: clientsList = [] } = useSimpleClientsList();
  const { mutate: updateOpp, isPending: isUpdating } = useUpdateClientOpportunity();
  const { mutate: deleteOpp, isPending: isDeleting } = useDeleteClientOpportunity();
  const { mutate: createOpp, isPending: isCreating } = useCreateClientOpportunity();

  const [sheetOpen, setSheetOpen] = useState(false);
  const [form, setForm] = useState<CreateFormState>(INITIAL_FORM);
  const [mutatingId, setMutatingId] = useState<number | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);


  const totalCount = opps.length;
  const pipelineValue = sumValues(opps.filter((o) => !["won", "lost"].includes(o.stage)));
  const wonValue = sumValues(opps.filter((o) => o.stage === "won"));
  const wonCount = opps.filter((o) => o.stage === "won").length;
  const closedCount = opps.filter((o) => ["won", "lost"].includes(o.stage)).length;
  const winRate = closedCount > 0 ? Math.round((wonCount / closedCount) * 100) : 0;


  const handleStageChange = useCallback((id: number, stage: OppStage) => {
    setMutatingId(id);
    updateOpp({ id, stage }, { onSettled: () => setMutatingId(null) });
  }, [updateOpp]);

  const handleDeleteConfirm = useCallback(() => {
    if (deleteId === null) return;
    setMutatingId(deleteId);
    deleteOpp(deleteId, {
      onSettled: () => {
        setMutatingId(null);
        setDeleteId(null);
      },
    });
  }, [deleteId, deleteOpp]);

  const handleCreate = useCallback(() => {
    if (!form.clientId || !form.title.trim()) return;
    const input: CreateClientOpportunityInput = {
      clientId: Number(form.clientId),
      title: form.title.trim(),
      type: form.type,
      stage: form.stage,
      value: form.value || undefined,
      expectedCloseDate: form.expectedCloseDate || undefined,
      notes: form.notes.trim() || undefined,
    };
    createOpp(input, {
      onSuccess: () => {
        setSheetOpen(false);
        setForm(INITIAL_FORM);
      },
    });
  }, [form, createOpp]);


  const actions = (
    <Button size="sm" onClick={() => setSheetOpen(true)}>
      <Plus className="h-4 w-4 mr-1" />
      Add Opportunity
    </Button>
  );

  return (
    <PageWrapper
      title="Upsell / Cross-sell Tracker"
      subtitle="Track upsell and cross-sell opportunities across the pipeline"
      actions={actions}
    >
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          label="Total Opportunities"
          value={totalCount}
          icon={TrendingUp}
          color="blue"
          index={0}
        />
        <StatCard
          label="Pipeline Value"
          value={formatInrShort(String(pipelineValue))}
          icon={IndianRupee}
          color="gold"
          index={1}
        />
        <StatCard
          label="Won Value"
          value={formatInrShort(String(wonValue))}
          icon={IndianRupee}
          color="green"
          index={2}
        />
        <StatCard
          label="Win Rate"
          value={`${winRate}%`}
          icon={TrendingUp}
          color="purple"
          index={3}
        />
      </div>

      {isLoading ? (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {STAGES.map((s) => (
            <div key={s.id} className="min-w-[260px] flex-1 space-y-2">
              <Skeleton className="h-9 w-full rounded-lg" />
              <Skeleton className="h-32 w-full rounded-lg" />
              <Skeleton className="h-24 w-full rounded-lg" />
            </div>
          ))}
        </div>
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {STAGES.map((stage) => (
            <KanbanColumn
              key={stage.id}
              stage={stage}
              opps={opps.filter((o) => o.stage === stage.id)}
              onStageChange={handleStageChange}
              onDelete={(id) => setDeleteId(id)}
              mutatingId={mutatingId}
            />
          ))}
        </div>
      )}

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Add Opportunity</SheetTitle>
          </SheetHeader>

          <div className="py-4 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="opp-client">Client *</Label>
              <Select
                value={form.clientId}
                onValueChange={(v) => setForm((f) => ({ ...f, clientId: v }))}
              >
                <SelectTrigger id="opp-client">
                  <SelectValue placeholder="Select client…" />
                </SelectTrigger>
                <SelectContent>
                  {clientsList.map((c) => (
                    <SelectItem key={c.id} value={String(c.id)}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="opp-title">Title *</Label>
              <Input
                id="opp-title"
                placeholder="e.g. Upgrade to Premium Plan"
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="opp-type">Type</Label>
              <Select
                value={form.type}
                onValueChange={(v) => setForm((f) => ({ ...f, type: v as OppType }))}
              >
                <SelectTrigger id="opp-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="upsell">Upsell</SelectItem>
                  <SelectItem value="cross_sell">Cross-sell</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="opp-stage">Stage</Label>
              <Select
                value={form.stage}
                onValueChange={(v) => setForm((f) => ({ ...f, stage: v as OppStage }))}
              >
                <SelectTrigger id="opp-stage">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STAGES.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="opp-value">Value (₹)</Label>
              <Input
                id="opp-value"
                type="number"
                placeholder="0"
                value={form.value}
                onChange={(e) => setForm((f) => ({ ...f, value: e.target.value }))}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="opp-date">Expected Close Date</Label>
              <Input
                id="opp-date"
                type="date"
                value={form.expectedCloseDate}
                onChange={(e) => setForm((f) => ({ ...f, expectedCloseDate: e.target.value }))}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="opp-notes">Notes</Label>
              <Textarea
                id="opp-notes"
                placeholder="Any context or notes…"
                rows={3}
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              />
            </div>
          </div>

          <SheetFooter>
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => { setSheetOpen(false); setForm(INITIAL_FORM); }}
            >
              Cancel
            </Button>
            <Button
              className="flex-1"
              onClick={handleCreate}
              disabled={!form.clientId || !form.title.trim() || isCreating}
            >
              {isCreating ? "Creating…" : "Create"}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <AlertDialog open={deleteId !== null} onOpenChange={(open) => { if (!open) setDeleteId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Opportunity?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove the opportunity. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={handleDeleteConfirm}
              disabled={isDeleting}
            >
              {isDeleting ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageWrapper>
  );
}
