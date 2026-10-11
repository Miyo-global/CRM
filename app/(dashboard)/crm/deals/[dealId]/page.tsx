"use client";

import { use, useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  ArrowLeft, Calendar, User, Edit2, Trophy, XCircle,
  Check, Clock, Phone, Mail, StickyNote, PhoneCall, Video,
  Copy, FolderKanban, Briefcase,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { staggerContainer, fadeUp } from "@/lib/motion-variants";
import {
  useDealDetail, useUpdateDeal, useUpdateDealStage, useDealActivities, useLogDealActivity,
  useDealMeetings, useCreateDealMeeting, useDeleteDealMeeting, useCloneDeal,
} from "@/lib/api/hooks/crm";
import { formatDealId, formatINRCompact as formatINR } from "@/lib/format-utils";
import { toast } from "sonner";
import Link from "next/link";
import { apiClient } from "@/lib/api-client";
import { DealEditForm, type EditFormValues } from "@/features/crm/deals/detail/deal-edit-form";
import { ActivityTimeline } from "@/features/crm/deals/detail/activity-timeline";
import { LogActivityDialog } from "@/features/crm/deals/detail/log-activity-dialog";
import { AIPredictDealButton } from "@/features/crm/deals/ai-predict-deal-button";
import { MeetingsCard } from "@/features/crm/deals/detail/meetings-card";
import { MeetingDialog, CreateProjectDialog } from "@/features/crm/deals/detail/deal-dialogs";
import { DEFAULT_LOCALE } from "@/lib/constants/locale";
import type { Tone } from "@/lib/design/tones";
import { StatusPill } from "@/components/ui/status-pill";
import { EmptyState } from "@/components/ui/empty-state";
import { NotFoundIllustration } from "@/components/illustrations";
import { DetailHeader, DetailLayout } from "@/components/shared/detail-header";
import { PropertyList } from "@/components/shared/property-list";
import { StatsStrip } from "@/components/shared/stats-strip";

const STAGES = [
  { key: "LEAD", label: "Lead", tone: "info" },
  { key: "CONTACTED", label: "Contacted", tone: "teal" },
  { key: "PROPOSAL", label: "Proposal", tone: "warning" },
  { key: "NEGOTIATION", label: "Negotiation", tone: "plum" },
  { key: "WON", label: "Won", tone: "success" },
  { key: "LOST", label: "Lost", tone: "danger" },
] as const satisfies readonly { key: string; label: string; tone: Tone }[];

type DealStage = typeof STAGES[number]["key"];


export default function DealDetailPage({
  params,
}: {
  params: Promise<{ dealId: string }>;
}) {
  const { dealId: dealIdStr } = use(params);
  const dealId = Number(dealIdStr);
  const router = useRouter();

  const { data: deal, isLoading } = useDealDetail(dealId);
  const [isEditing, setIsEditing] = useState(false);
  const [pendingAction, setPendingAction] = useState<{
    type: "call" | "note" | "email" | "meeting";
    label: string;
  } | null>(null);
  const [meetingDialogOpen, setMeetingDialogOpen] = useState(false);
  const [createProjectOpen, setCreateProjectOpen] = useState(false);
  const [isCreatingProject, setIsCreatingProject] = useState(false);

  const updateDeal = useUpdateDeal();
  const { data: activities } = useDealActivities(dealId, 30);
  const { data: meetings } = useDealMeetings(dealId);
  const logActivity = useLogDealActivity();
  const createMeeting = useCreateDealMeeting(dealId);
  const deleteMeeting = useDeleteDealMeeting(dealId);
  const updateStage = useUpdateDealStage();
  const cloneDeal = useCloneDeal();

  const handleClone = useCallback(() => {
    cloneDeal.mutate(dealId, {
      onSuccess: (newDeal) => {
        toast.success("Deal cloned");
        router.push(`/crm/deals/${newDeal.id}`);
      },
      onError: () => toast.error("Failed to clone deal"),
    });
  }, [dealId, cloneDeal, router]);

  const currentStageIndex = useMemo(() => {
    if (!deal) return -1;
    return STAGES.findIndex(s => s.key === deal.stage);
  }, [deal]);

  const handleStageChange = useCallback((stage: DealStage) => {
    updateStage.mutate(
      { id: dealId, stage },
      { onSuccess: () => toast.success("Stage updated"), onError: (err) => toast.error(err.message) },
    );
  }, [dealId, updateStage]);

  const onEditSubmit = useCallback((data: EditFormValues) => {
    updateDeal.mutate(
      {
        id: dealId,
        name: data.name,
        value: data.value || "0",
        stage: data.stage,
        probability: data.probability,
        contactPerson: data.contactPerson || undefined,
        contactEmail: data.contactEmail || undefined,
        contactPhone: data.contactPhone || undefined,
        expectedCloseDate: data.expectedCloseDate || undefined,
        notes: data.notes || undefined,
        lostReason: data.lostReason || undefined,
      },
      { onSuccess: () => { toast.success("Deal updated"); setIsEditing(false); }, onError: (err) => toast.error(err.message) },
    );
  }, [dealId, updateDeal]);

  const handleBackToDeals = useCallback(() => router.push("/crm/deals"), [router]);
  const handleToggleEdit = useCallback(() => setIsEditing((v) => !v), []);
  const handleCancelEdit = useCallback(() => setIsEditing(false), []);
  const handleMarkWon = useCallback(() => handleStageChange("WON"), [handleStageChange]);
  const handleMarkLost = useCallback(() => handleStageChange("LOST"), [handleStageChange]);

  const handleStagePipelineClick = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    const stage = e.currentTarget.dataset.stage as DealStage;
    if (stage) handleStageChange(stage);
  }, [handleStageChange]);

  const handleQuickActionClick = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    const type = e.currentTarget.dataset.actionType as "call" | "note" | "email" | "meeting";
    const label = e.currentTarget.dataset.actionLabel ?? "";
    setPendingAction({ type, label });
  }, []);

  const handleLogActivity = useCallback((notes: string) => {
    if (!pendingAction) return;
    logActivity.mutate(
      { dealId, type: pendingAction.type, subject: pendingAction.label, notes },
      {
        onSuccess: () => { toast.success("Activity logged"); setPendingAction(null); },
        onError: (err) => toast.error(err.message),
      },
    );
  }, [pendingAction, logActivity, dealId]);

  const handleCloseLogDialog = useCallback(() => setPendingAction(null), []);

  const handleCreateMeeting = useCallback((data: {
    title: string;
    scheduledAt: string;
    durationMinutes: number;
    attendees: string[];
    agenda?: string;
    notes?: string;
    actionItems?: string;
    recordingLink?: string;
  }) => {
    if (!data.title.trim() || !data.scheduledAt) {
      toast.error("Title and date are required");
      return;
    }
    createMeeting.mutate(data, {
      onSuccess: () => {
        toast.success("Meeting added");
        setMeetingDialogOpen(false);
      },
      onError: () => toast.error("Failed to add meeting"),
    });
  }, [createMeeting]);

  const handleDeleteMeeting = useCallback((meetingId: number) => {
    deleteMeeting.mutate(meetingId, {
      onSuccess: () => toast.success("Meeting removed"),
      onError: () => toast.error("Failed to remove meeting"),
    });
  }, [deleteMeeting]);

  const handleCreateProject = useCallback(async (data: { name: string; startDate?: string; endDate?: string }) => {
    if (!data.name.trim()) {
      toast.error("Project name is required");
      return;
    }
    setIsCreatingProject(true);
    try {
      const newProject = await apiClient.post<{ id: number }>("/projects/from-deal", {
        dealId,
        name: data.name.trim(),
        startDate: data.startDate,
        endDate: data.endDate,
      });
      toast.success("Project created successfully");
      setCreateProjectOpen(false);
      router.push(`/projects/${newProject.id}`);
    } catch {
      toast.error("Failed to create project");
    } finally {
      setIsCreatingProject(false);
    }
  }, [dealId, router]);

  if (isLoading) {
    return (
      <div className="space-y-6 px-4 pt-6 pb-10 sm:px-6 xl:px-8">
        <div className="flex items-center gap-4">
          <Skeleton className="size-16 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-7 w-56" />
            <Skeleton className="h-4 w-40" />
          </div>
        </div>
        <Skeleton className="h-16 w-full" />
        <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
          <Skeleton className="h-96" />
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  if (!deal) {
    return (
      <div className="px-4 pt-6 pb-10 sm:px-6 xl:px-8">
        <EmptyState
          illustration={<NotFoundIllustration />}
          title="Deal not found"
          action={{ label: "Back to Deals", onClick: handleBackToDeals }}
        />
      </div>
    );
  }

  const stageConfig = STAGES.find(s => s.key === deal.stage) ?? STAGES[0];
  const dealValue = Number(deal.value ?? 0);
  const isClosed = deal.stage === "WON" || deal.stage === "LOST";

  return (
    <div className="px-4 pt-6 pb-10 sm:px-6 xl:px-8">
      <motion.div className="space-y-6" variants={staggerContainer} initial="hidden" animate="visible">
        <motion.div variants={fadeUp}>
          <DetailHeader
            back={
              <Button variant="ghost" size="sm" className="-ml-2" onClick={handleBackToDeals} aria-label="Back to deals">
                <ArrowLeft />
                Deals
              </Button>
            }
            icon={Briefcase}
            iconTone={stageConfig.tone}
            title={deal.name}
            status={<StatusPill tone={stageConfig.tone} dot>{stageConfig.label}</StatusPill>}
            meta={
              <>
                <span className="select-all font-mono text-xs tabular-nums">{formatDealId(dealId)}</span>
                {deal.assignedTo?.name && (
                  <span className="flex items-center gap-1">
                    <User className="size-3.5" aria-hidden="true" />
                    {deal.assignedTo.name}
                  </span>
                )}
              </>
            }
            actions={
              <>
                <AIPredictDealButton dealId={dealId} compact />
                <Button variant="outline" size="sm" onClick={handleClone} loading={cloneDeal.isPending}>
                  {!cloneDeal.isPending && <Copy />}
                  Clone
                </Button>
                <Button variant="outline" size="sm" onClick={handleToggleEdit}>
                  <Edit2 />
                  {isEditing ? "Cancel" : "Edit"}
                </Button>
                {!isClosed && (
                  <>
                    <Button size="sm" variant="outline" className="text-destructive hover:bg-danger-soft hover:text-danger-strong" onClick={handleMarkLost} disabled={updateStage.isPending}>
                      <XCircle />
                      Mark Lost
                    </Button>
                    <Button size="sm" onClick={handleMarkWon} loading={updateStage.isPending}>
                      {!updateStage.isPending && <Trophy />}
                      Mark Won
                    </Button>
                  </>
                )}
                {(deal.stage === "WON" || deal.stage === "NEGOTIATION") && (
                  <Button size="sm" variant={isClosed ? "default" : "secondary"} onClick={() => setCreateProjectOpen(true)}>
                    <FolderKanban />
                    Create Project
                  </Button>
                )}
              </>
            }
          />
        </motion.div>

        <motion.div variants={fadeUp}>
          <Card>
            <CardContent className="p-4">
              <ol aria-label="Deal stages" className="flex items-start overflow-x-auto pb-1">
                {STAGES.map((stage, i) => {
                  const isActive = stage.key === deal.stage;
                  const isPast = i < currentStageIndex;
                  const isLost = stage.key === "LOST";
                  return (
                    <li key={stage.key} className="flex min-w-24 flex-1 items-start" aria-current={isActive ? "step" : undefined}>
                      <button
                        data-stage={stage.key}
                        onClick={handleStagePipelineClick}
                        disabled={updateStage.isPending || isActive}
                        title={`Move to ${stage.label}`}
                        className="group flex shrink-0 flex-col items-center gap-1.5 rounded-md px-1 outline-none focus-visible:focus-ring disabled:cursor-not-allowed"
                      >
                        <span
                          className={cn(
                            "flex size-6 items-center justify-center rounded-full transition-colors",
                            isActive
                              ? isLost ? "bg-card ring-2 ring-danger-500" : "bg-card ring-2 ring-primary"
                              : isPast
                                ? "bg-primary text-primary-foreground"
                                : "bg-muted ring-1 ring-border group-hover:ring-border-strong",
                          )}
                        >
                          {isActive ? (
                            <span className={cn("size-2.5 rounded-full", isLost ? "bg-danger-500" : "bg-primary")} />
                          ) : isPast ? (
                            <Check className="size-3.5" aria-hidden="true" />
                          ) : null}
                        </span>
                        <span className={cn("whitespace-nowrap text-xs font-medium leading-none", isActive ? (isLost ? "text-danger-strong" : "text-foreground") : "text-muted-foreground group-hover:text-foreground")}>
                          {stage.label}
                        </span>
                      </button>
                      {i < STAGES.length - 1 && (
                        <span aria-hidden="true" className={cn("mx-1 mt-3 h-px flex-1", isPast ? "bg-primary" : "bg-border")} />
                      )}
                    </li>
                  );
                })}
              </ol>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={fadeUp}>
          <StatsStrip
            items={[
              { label: "Deal Value", value: formatINR(dealValue), tone: "brand" },
              {
                label: "Weighted",
                value: deal.probability ? formatINR(Math.round(dealValue * (deal.probability / 100))) : "—",
              },
              { label: "Probability", value: `${deal.probability ?? 0}%` },
              {
                label: "Expected Close",
                value: deal.expectedCloseDate ? new Date(deal.expectedCloseDate).toLocaleDateString(DEFAULT_LOCALE) : "—",
              },
            ]}
          />
        </motion.div>

        <motion.div variants={fadeUp}>
          <DetailLayout
            main={
              <div className="space-y-6">
                {isEditing ? (
                  <DealEditForm
                    deal={deal}
                    isPending={updateDeal.isPending}
                    onSubmit={onEditSubmit}
                    onCancel={handleCancelEdit}
                  />
                ) : (
                  <Card>
                    <CardHeader>
                      <CardTitle className="font-sans text-base font-semibold">Deal Information</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
                        {[
                          { icon: User, label: "Contact Person", value: deal.contactPerson },
                          { icon: Mail, label: "Contact Email", value: deal.contactEmail, href: deal.contactEmail ? `mailto:${deal.contactEmail}` : undefined },
                          { icon: Phone, label: "Contact Phone", value: deal.contactPhone, href: deal.contactPhone ? `tel:${deal.contactPhone}` : undefined },
                          { icon: Calendar, label: "Expected Close", value: deal.expectedCloseDate ? new Date(deal.expectedCloseDate).toLocaleDateString(DEFAULT_LOCALE) : null },
                          { icon: Calendar, label: "Actual Close", value: deal.actualCloseDate ? new Date(deal.actualCloseDate).toLocaleDateString(DEFAULT_LOCALE) : null },
                          { icon: Clock, label: "Probability", value: `${deal.probability ?? 0}%` },
                        ].map(item => (
                          <div key={item.label} className="flex min-w-0 items-start gap-2">
                            <item.icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                            <div className="min-w-0">
                              <p className="text-xs text-muted-foreground">{item.label}</p>
                              {item.href ? (
                                <a href={item.href} className="block truncate text-sm text-brand-text hover:underline">{item.value || ""}</a>
                              ) : (
                                <p className="truncate text-sm tabular-nums">{item.value || ""}</p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>

                      {deal.probability !== null && deal.probability > 0 && (
                        <div>
                          <div className="h-2 overflow-hidden rounded-full bg-muted">
                            <div className="h-full rounded-full bg-primary" style={{ width: `${deal.probability}%` }} />
                          </div>
                          <p className="mt-1 text-xs tabular-nums text-muted-foreground">
                            Weighted: {formatINR(Math.round(dealValue * (deal.probability / 100)))}
                          </p>
                        </div>
                      )}

                      {deal.notes && (
                        <div className="rounded-lg border border-border bg-surface-sunken p-3">
                          <p className="mb-1 text-xs text-muted-foreground">Notes</p>
                          <p className="whitespace-pre-wrap text-sm">{deal.notes}</p>
                        </div>
                      )}

                      {deal.lostReason && (
                        <div className="rounded-lg bg-danger-soft p-3">
                          <p className="mb-1 text-xs font-medium text-danger-strong">Lost Reason</p>
                          <p className="text-sm">{deal.lostReason}</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}

                <Card>
                  <CardHeader className="flex-row flex-wrap items-center justify-between gap-2 space-y-0">
                    <CardTitle className="font-sans text-base font-semibold">Activity Timeline</CardTitle>
                    <div className="flex flex-wrap gap-2">
                      {[
                        { label: "Log Call", icon: PhoneCall, type: "call" as const },
                        { label: "Add Note", icon: StickyNote, type: "note" as const },
                        { label: "Log Email", icon: Mail, type: "email" as const },
                        { label: "Log Meeting", icon: Video, type: "meeting" as const },
                      ].map(action => (
                        <Button
                          key={action.type}
                          variant="outline"
                          size="xs"
                          data-action-type={action.type}
                          data-action-label={action.label}
                          onClick={handleQuickActionClick}
                        >
                          <action.icon />
                          {action.label}
                        </Button>
                      ))}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <ActivityTimeline activities={activities ?? []} />
                  </CardContent>
                </Card>
              </div>
            }
            rail={
              <>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="font-sans text-sm font-semibold">Details</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <PropertyList
                      items={[
                        { label: "Assigned To", value: deal.assignedTo?.name || null },
                        {
                          label: "Linked Lead",
                          value: deal.lead ? (
                            <Link href={`/crm/leads/${deal.lead.id}`} className="text-brand-text hover:underline">
                              {deal.lead.name}
                            </Link>
                          ) : null,
                        },
                        { label: "Linked Client", value: deal.client?.name || null },
                        ...[
                          { label: "Created", value: deal.createdAt },
                          { label: "Updated", value: deal.updatedAt },
                          { label: "Actual Close", value: deal.actualCloseDate },
                        ]
                          .filter(d => d.value)
                          .map(d => ({
                            label: d.label,
                            value: <span className="tabular-nums">{new Date(d.value!).toLocaleDateString(DEFAULT_LOCALE)}</span>,
                          })),
                      ]}
                    />
                  </CardContent>
                </Card>

                <MeetingsCard
                  meetings={meetings}
                  onAddMeeting={() => setMeetingDialogOpen(true)}
                  onDeleteMeeting={handleDeleteMeeting}
                />
              </>
            }
          />
        </motion.div>
      </motion.div>

      <MeetingDialog
        open={meetingDialogOpen}
        onOpenChange={setMeetingDialogOpen}
        onSubmit={handleCreateMeeting}
        isPending={createMeeting.isPending}
      />

      <CreateProjectDialog
        open={createProjectOpen}
        onOpenChange={setCreateProjectOpen}
        defaultName={deal.name}
        onSubmit={handleCreateProject}
        isPending={isCreatingProject}
      />

      <LogActivityDialog
        open={pendingAction !== null}
        actionLabel={pendingAction?.label ?? ""}
        isPending={logActivity.isPending}
        onClose={handleCloseLogDialog}
        onSubmit={handleLogActivity}
      />
    </div>
  );
}
