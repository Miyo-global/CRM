"use client";

import { use, useState, useCallback } from "react";
import {
  useIntakeRequests, useCreateIntakeRequest, useUpdateIntakeRequest,
  useProjectMembers, useCycles, useModules,
} from "@/lib/api/hooks/projects";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyInboxIllustration } from "@/components/illustrations";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger,
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, ExternalLink, Copy, ArrowRight } from "lucide-react";
import { useForm, Controller } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { IntakeItemCard } from "@/features/projects/intake/intake-item-card";
import {
  projectMemberLabel,
  projectMemberUserId,
} from "@/lib/projects/project-member-select";

const createIntakeSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
});
type CreateIntakeForm = z.infer<typeof createIntakeSchema>;

const acceptSchema = z.object({
  state: z.string().min(1, "State is required"),
  assigneeId: z.string().optional(),
  cycleId: z.number().optional(),
  moduleId: z.number().optional(),
});
type AcceptForm = z.infer<typeof acceptSchema>;

const declineSchema = z.object({
  reason: z.string().min(1, "Reason is required"),
});
type DeclineForm = z.infer<typeof declineSchema>;

const WORK_STATES = ["backlog", "todo", "in_progress", "done", "cancelled"] as const;

export default function IntakePage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId: projectIdStr } = use(params);
  const projectId = parseInt(projectIdStr);

  const [createOpen, setCreateOpen] = useState(false);
  const [acceptOpen, setAcceptOpen] = useState(false);
  const [declineOpen, setDeclineOpen] = useState(false);
  const [selectedItemId, setSelectedItemId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState("pending");

  const { data: intakeData, isLoading } = useIntakeRequests(projectId);
  const { data: members } = useProjectMembers(projectId);
  const { data: cycles } = useCycles(projectId);
  const { data: modules } = useModules(projectId);

  const createMutation = useCreateIntakeRequest();
  const updateMutation = useUpdateIntakeRequest();

  const createForm = useForm<CreateIntakeForm>({ resolver: zodResolver(createIntakeSchema) });
  const acceptForm = useForm<AcceptForm>({ resolver: zodResolver(acceptSchema) });
  const declineForm = useForm<DeclineForm>({ resolver: zodResolver(declineSchema) });

  const onCreateSubmit = useCallback((data: CreateIntakeForm) => {
    createMutation.mutate(
      { ...data, projectId },
      {
        onSuccess: () => {
          setCreateOpen(false);
          createForm.reset();
          toast.success("Intake item created");
        },
        onError: (err) => toast.error((err as Error).message),
      }
    );
  }, [createMutation, projectId, createForm]);

  const onAcceptSubmit = useCallback((_data: AcceptForm) => {
    if (selectedItemId === null) return;
    updateMutation.mutate(
      { id: selectedItemId, projectId, status: "accepted" },
      {
        onSuccess: () => {
          setAcceptOpen(false);
          acceptForm.reset();
          toast.success("Item accepted and work item created");
        },
        onError: (err) => toast.error((err as Error).message),
      }
    );
  }, [selectedItemId, updateMutation, projectId, acceptForm]);

  const onDeclineSubmit = useCallback((data: DeclineForm) => {
    if (selectedItemId === null) return;
    updateMutation.mutate(
      { id: selectedItemId, projectId, status: "declined", declineReason: data.reason },
      {
        onSuccess: () => {
          setDeclineOpen(false);
          declineForm.reset();
          toast.success("Item declined");
        },
        onError: (err) => toast.error((err as Error).message),
      }
    );
  }, [selectedItemId, updateMutation, projectId, declineForm]);

  const handleAccept = useCallback((itemId: number) => {
    setSelectedItemId(itemId);
    acceptForm.reset();
    setAcceptOpen(true);
  }, [acceptForm]);

  const handleDecline = useCallback((itemId: number) => {
    setSelectedItemId(itemId);
    declineForm.reset();
    setDeclineOpen(true);
  }, [declineForm]);

  const handleDuplicate = useCallback((itemId: number) => {
    updateMutation.mutate(
      { id: itemId, projectId, status: "duplicate" },
      {
        onSuccess: () => toast.success("Item marked as duplicate"),
        onError: (err) => toast.error((err as Error).message),
      }
    );
  }, [updateMutation, projectId]);

  const handleCopyFormUrl = useCallback(() => {
    const formUrl = `${typeof window !== "undefined" ? window.location.origin : ""}/intake/${projectId}`;
    navigator.clipboard.writeText(formUrl);
    toast.success("Form URL copied to clipboard");
  }, [projectId]);

  const handleOpenCreate = useCallback(() => setCreateOpen(true), []);

  const allItems = intakeData?.items ?? [];
  const filteredItems = allItems.filter((item) => activeTab === "all" || item.status === activeTab);
  const pendingCount = allItems.filter((i) => i.status === "pending").length;

  const formUrl = `${typeof window !== "undefined" ? window.location.origin : ""}/intake/${projectId}`;

  if (isLoading) {
    return (
      <PageWrapper title="Intake">
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper
      title="Intake"
      actions={
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleCopyFormUrl}>
            <ExternalLink className="h-4 w-4 mr-1" /> Copy Form URL
          </Button>
          <Sheet open={createOpen} onOpenChange={setCreateOpen}>
            <SheetTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-1" /> New Item
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="sm:max-w-md overflow-y-auto">
              <SheetHeader>
                <SheetTitle>Create Intake Item</SheetTitle>
              </SheetHeader>
              <form onSubmit={createForm.handleSubmit(onCreateSubmit)} className="space-y-4 p-4">
                <div>
                  <Label htmlFor="intake-title">Title</Label>
                  <Input id="intake-title" {...createForm.register("title")} />
                  {createForm.formState.errors.title && (
                    <p className="text-xs text-destructive mt-1">{createForm.formState.errors.title.message}</p>
                  )}
                </div>
                <div>
                  <Label htmlFor="intake-desc">Description</Label>
                  <Textarea id="intake-desc" {...createForm.register("description")} />
                </div>
                <Button type="submit" disabled={createMutation.isPending} className="w-full">
                  {createMutation.isPending ? "Creating..." : "Create Item"}
                </Button>
              </form>
            </SheetContent>
          </Sheet>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 rounded-lg px-3 py-2">
          <ExternalLink className="h-4 w-4 shrink-0" />
          <span className="truncate">Public form: {formUrl}</span>
          <Button variant="ghost" size="sm" className="h-6 px-2 shrink-0" onClick={handleCopyFormUrl}>
            <Copy className="h-3 w-3" />
          </Button>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="pending">
              Pending
              {pendingCount > 0 && (
                <Badge variant="secondary" className="ml-1.5 h-5 px-1.5 text-xs">{pendingCount}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="accepted">Accepted</TabsTrigger>
            <TabsTrigger value="declined">Declined</TabsTrigger>
            <TabsTrigger value="all">All</TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="mt-4">
            {filteredItems.length === 0 ? (
              <div className="text-center py-16">
                <EmptyInboxIllustration className="mx-auto mb-4 w-36 h-36" />
                <h3 className="text-lg font-semibold mb-1">
                  {activeTab === "pending" ? "No pending items" : `No ${activeTab} items`}
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  {activeTab === "pending"
                    ? "Share the form URL to start receiving submissions."
                    : "Items will appear here once triaged."}
                </p>
                {activeTab === "pending" && (
                  <Button onClick={handleOpenCreate}>
                    <Plus className="h-4 w-4 mr-1" /> Create First Item
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {filteredItems.map((item) => (
                  <IntakeItemCard
                    key={item.id}
                    item={item}
                    onAccept={handleAccept}
                    onDecline={handleDecline}
                    onDuplicate={handleDuplicate}
                  />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      <Sheet open={acceptOpen} onOpenChange={setAcceptOpen}>
        <SheetContent side="right" className="sm:max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Accept Intake Item</SheetTitle>
          </SheetHeader>
          <form onSubmit={acceptForm.handleSubmit(onAcceptSubmit)} className="space-y-4 p-4">
            <div>
              <Label>State</Label>
              <Controller
                control={acceptForm.control}
                name="state"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger><SelectValue placeholder="Select state..." /></SelectTrigger>
                    <SelectContent>
                      {WORK_STATES.map((s) => (
                        <SelectItem key={s} value={s}>
                          {s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {acceptForm.formState.errors.state && (
                <p className="text-xs text-destructive mt-1">{acceptForm.formState.errors.state.message}</p>
              )}
            </div>
            <div>
              <Label>Assignee</Label>
              <Controller
                control={acceptForm.control}
                name="assigneeId"
                render={({ field }) => (
                  <Select
                    value={field.value ?? ""}
                    onValueChange={(v) => field.onChange(v || undefined)}
                  >
                    <SelectTrigger><SelectValue placeholder="Select assignee..." /></SelectTrigger>
                    <SelectContent>
                      {members && members.length === 0 ? (
                        <SelectItem value="__no_members__" disabled className="cursor-default opacity-100">
                          No project members
                        </SelectItem>
                      ) : (
                        members?.map((m) => {
                          const uid = projectMemberUserId(m);
                          return (
                            <SelectItem key={uid} value={uid}>
                              {projectMemberLabel(m)}
                            </SelectItem>
                          );
                        })
                      )}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div>
              <Label>Cycle</Label>
              <Controller
                control={acceptForm.control}
                name="cycleId"
                render={({ field }) => (
                  <Select
                    value={field.value?.toString() ?? ""}
                    onValueChange={(v) => field.onChange(v ? parseInt(v) : undefined)}
                  >
                    <SelectTrigger><SelectValue placeholder="Select cycle..." /></SelectTrigger>
                    <SelectContent>
                      {cycles?.map((c) => (
                        <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div>
              <Label>Module</Label>
              <Controller
                control={acceptForm.control}
                name="moduleId"
                render={({ field }) => (
                  <Select
                    value={field.value?.toString() ?? ""}
                    onValueChange={(v) => field.onChange(v ? parseInt(v) : undefined)}
                  >
                    <SelectTrigger><SelectValue placeholder="Select module..." /></SelectTrigger>
                    <SelectContent>
                      {modules?.map((m) => (
                        <SelectItem key={m.id} value={m.id.toString()}>{m.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <Button type="submit" disabled={updateMutation.isPending} className="w-full">
              {updateMutation.isPending ? "Accepting..." : "Accept & Create Work Item"}
              <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          </form>
        </SheetContent>
      </Sheet>

      <Sheet open={declineOpen} onOpenChange={setDeclineOpen}>
        <SheetContent side="right" className="sm:max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Decline Intake Item</SheetTitle>
          </SheetHeader>
          <form onSubmit={declineForm.handleSubmit(onDeclineSubmit)} className="space-y-4 p-4">
            <div>
              <Label htmlFor="decline-reason">Reason</Label>
              <Textarea
                id="decline-reason"
                placeholder="Why is this being declined?"
                {...declineForm.register("reason")}
              />
              {declineForm.formState.errors.reason && (
                <p className="text-xs text-destructive mt-1">{declineForm.formState.errors.reason.message}</p>
              )}
            </div>
            <Button type="submit" variant="destructive" disabled={updateMutation.isPending} className="w-full">
              {updateMutation.isPending ? "Declining..." : "Decline Item"}
            </Button>
          </form>
        </SheetContent>
      </Sheet>
    </PageWrapper>
  );
}
