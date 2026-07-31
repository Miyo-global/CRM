"use client";
import { getErrorMessage } from "@/lib/get-error-message";
import {
  formatJobPostingLocation,
  formatJobPostingStatusLabel,
  formatJobPostingTitle,
  formatJobTypeLabel,
} from "@/lib/hr/job-posting-format";
import { JOB_TYPE_OPTIONS } from "@/lib/validations/job-opening";

import { useState, useCallback, useMemo, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useJobPostings, useUpdateJobPosting, useDeleteJobPosting, useHrDepartments } from "@/lib/api/hooks/hr";
import { usePublishJobToBoards, useJobShareLinks } from "@/lib/api/hooks/hr/recruitment";
import type { JobBoardPlatform, JobShareLinks } from "@/lib/api/hooks/hr/recruitment";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { PageBackButton } from "@/components/ui/page-back-button";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import {
  Plus,
  MoreHorizontal,
  Pencil,
  Trash2,
  Play,
  Pause,
  Share2,
  Loader2,
  Copy,
  ExternalLink,
  Search,
  X,
} from "lucide-react";
import type { JobPosting, JobPostingStatus } from "@/types/hr";
import { EmptyState } from "@/components/ui/empty-state";
import { EmptyJobPostingsIllustration } from "@/components/illustrations";
import { ConfirmActionDialog } from "@/features/hr/confirm-action-dialog";

type PendingJobAction =
  | { kind: "delete"; jobId: number; jobTitle: string }
  | { kind: "status"; jobId: number; jobTitle: string; status: JobPostingStatus; actionLabel: string }
  | { kind: "publish-boards"; jobId: number; jobTitle: string };

function getJobActionConfirmCopy(action: PendingJobAction) {
  switch (action.kind) {
    case "delete":
      return {
        title: "Delete job posting?",
        description: `"${action.jobTitle}" will be permanently removed. This cannot be undone.`,
        confirmLabel: "Delete",
        variant: "destructive" as const,
      };
    case "status":
      return {
        title: `${action.actionLabel} job posting?`,
        description: `Are you sure you want to ${action.actionLabel.toLowerCase()} "${action.jobTitle}"?`,
        confirmLabel: action.actionLabel,
        variant: "default" as const,
      };
    case "publish-boards":
      return {
        title: "Post to job boards?",
        description: `"${action.jobTitle}" will be published to connected job boards (LinkedIn, Naukri, Indeed).`,
        confirmLabel: "Post",
        variant: "default" as const,
      };
  }
}

const JOB_SEARCH_MIN_LENGTH = 3;

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: "ALL", label: "All Status" },
  { value: "DRAFT", label: "Draft" },
  { value: "OPEN", label: "Open" },
  { value: "PAUSED", label: "Paused" },
  { value: "CLOSED", label: "Closed" },
  { value: "FILLED", label: "Filled" },
];

const TYPE_FILTER_OPTIONS: { value: string; label: string }[] = [
  { value: "ALL", label: "All Types" },
  ...JOB_TYPE_OPTIONS.map((o) => ({ value: o.value, label: o.label })),
];

const PLATFORM_ICONS: Record<string, string> = {
  LINKEDIN: "in",
  WHATSAPP: "wa",
  TWITTER: "𝕏",
};

function ShareJobDialog({ jobId, onClose }: { jobId: number; onClose: () => void }) {
  const { data, isLoading } = useJobShareLinks(jobId);

  const copyLink = (url: string) => {
    navigator.clipboard.writeText(url).then(() => toast.success("Copied to clipboard")).catch(() => toast.error("Failed to copy to clipboard"));
  };

  return (
    <Sheet open onOpenChange={(v) => { if (!v) onClose(); }}>
      <SheetContent className="sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="text-base">Share Job Posting</SheetTitle>
          <SheetDescription className="text-xs">
            Share this job on social platforms with UTM tracking.
          </SheetDescription>
        </SheetHeader>
        {isLoading ? (
          <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
        ) : data ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2 rounded-md border px-3 py-2 bg-muted/40">
              <span className="flex-1 text-xs text-muted-foreground truncate">{data.directLink}</span>
              <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={() => copyLink(data.directLink)}>
                <Copy className="h-3 w-3" />
              </Button>
            </div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Share on</p>
            <div className="space-y-2">
              {data.shareLinks.map((link: JobShareLinks["shareLinks"][number]) => (
                <div key={link.platform} className="flex items-center gap-2 rounded-md border px-3 py-2">
                  <span className="w-6 text-center text-xs font-bold text-muted-foreground">{PLATFORM_ICONS[link.platform] ?? link.platform[0]}</span>
                  <span className="flex-1 text-sm">{link.name}</span>
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => copyLink(link.utmUrl)}>
                    <Copy className="h-3 w-3" />
                  </Button>
                  <a href={link.url} target="_blank" rel="noopener noreferrer">
                    <Button variant="ghost" size="icon" className="h-6 w-6">
                      <ExternalLink className="h-3 w-3" />
                    </Button>
                  </a>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-4">Could not load share links.</p>
        )}
      </SheetContent>
    </Sheet>
  );
}

function statusBadgeVariant(status: string | null): "default" | "secondary" | "outline" | "destructive" {
  switch (status) {
    case "OPEN": return "default";
    case "DRAFT": return "secondary";
    case "PAUSED": return "outline";
    case "CLOSED": case "FILLED": return "destructive";
    default: return "secondary";
  }
}

export default function JobPostingsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const statusFilter = searchParams.get("status") as JobPostingStatus | null;

  const { data: jobs, isLoading } = useJobPostings(
    statusFilter ? { status: statusFilter } : undefined
  );
  const { data: departments } = useHrDepartments();
  const departmentName = useCallback(
    (id: number | null | undefined) =>
      id == null ? "" : departments?.find((d) => d.id === id)?.name ?? "",
    [departments]
  );
  const updateJob = useUpdateJobPosting();
  const deleteJob = useDeleteJobPosting();
  const publishToBoards = usePublishJobToBoards();

  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [shareJobId, setShareJobId] = useState<number | null>(null);
  const [pendingAction, setPendingAction] = useState<PendingJobAction | null>(null);

  const editJobIdParam = searchParams.get("edit");
  useEffect(() => {
    if (editJobIdParam) {
      router.replace(`/hr/recruitment/jobs/${editJobIdParam}/edit`);
    }
  }, [editJobIdParam, router]);

  const openEditPage = useCallback(
    (job: JobPosting) => {
      router.push(`/hr/recruitment/jobs/${job.id}/edit`);
    },
    [router],
  );

  const setFilter = useCallback(
    (key: string, value: string | null) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value && value !== "ALL") params.set(key, value);
      else params.delete(key);
      router.replace(`?${params.toString()}`, { scroll: false });
    },
    [searchParams, router]
  );

  const handleConfirmAction = useCallback(() => {
    if (!pendingAction) return;

    if (pendingAction.kind === "delete") {
      deleteJob.mutate(pendingAction.jobId, {
        onSuccess: () => {
          toast.success("Job posting deleted");
          setPendingAction(null);
        },
        onError: (e) => toast.error(getErrorMessage(e)),
      });
      return;
    }

    if (pendingAction.kind === "status") {
      updateJob.mutate(
        { id: pendingAction.jobId, status: pendingAction.status },
        {
          onSuccess: () => {
            toast.success("Status updated");
            setPendingAction(null);
          },
          onError: (e) => toast.error(getErrorMessage(e)),
        },
      );
      return;
    }

    const platforms: JobBoardPlatform[] = ["LINKEDIN", "NAUKRI", "INDEED"];
    publishToBoards.mutate({ jobId: pendingAction.jobId, platforms }, {
      onSuccess: (data) => {
        if (data.publishedCount > 0) {
          toast.success(`Posted to ${data.publishedCount} platform${data.publishedCount !== 1 ? "s" : ""}`);
        } else {
          toast.error("No connected platforms available. Configure integrations in Settings.");
        }
        setPendingAction(null);
      },
      onError: (e) => toast.error(getErrorMessage(e)),
    });
  }, [pendingAction, deleteJob, updateJob, publishToBoards]);

  const isConfirmPending =
    pendingAction?.kind === "delete"
      ? deleteJob.isPending
      : pendingAction?.kind === "status"
        ? updateJob.isPending
        : pendingAction?.kind === "publish-boards"
          ? publishToBoards.isPending
          : false;

  const confirmCopy = pendingAction ? getJobActionConfirmCopy(pendingAction) : null;

  const searchActive = searchQuery.trim().length >= JOB_SEARCH_MIN_LENGTH;

  const filteredJobs = useMemo(() => {
    if (!jobs?.length) return [];
    let list = jobs;
    if (typeFilter !== "ALL") {
      list = list.filter((job) => job.type === typeFilter);
    }
    const q = searchQuery.trim().toLowerCase();
    if (q.length >= JOB_SEARCH_MIN_LENGTH) {
      list = list.filter((job) => {
        const haystack = [
          job.title,
          job.location,
          job.type,
          job.status,
          departmentName(job.departmentId),
          formatJobTypeLabel(job.type),
          formatJobPostingStatusLabel(job.status),
          String(job.openings ?? ""),
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return haystack.includes(q);
      });
    }
    return list;
  }, [jobs, searchQuery, typeFilter, departmentName]);

  const hasClientFilters = typeFilter !== "ALL" || searchActive;
  const hasUrlStatusFilter = !!statusFilter;

  const handleClearFilters = useCallback(() => {
    setSearchQuery("");
    setTypeFilter("ALL");
    if (hasUrlStatusFilter) setFilter("status", null);
  }, [hasUrlStatusFilter, setFilter]);

  if (isLoading) {
    return (
      <PageWrapper title="Job Postings" subtitle="Manage open positions">
        <Card><CardContent className="pt-6 space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</CardContent></Card>
      </PageWrapper>
    );
  }

  return (
    <>
    <PageWrapper
      title="Job Postings"
      subtitle="Manage open positions"
      badge={
        hasClientFilters || hasUrlStatusFilter
          ? `${filteredJobs.length} of ${jobs?.length ?? 0} jobs`
          : `${jobs?.length ?? 0} jobs`
      }
      actions={
        <div className="flex items-center gap-2">
        <PageBackButton fallback="/hr/recruitment" />
        <Button size="sm" asChild>
          <Link href="/hr/recruitment/jobs/new"><Plus className="mr-2 h-4 w-4" />New Job</Link>
        </Button>
        </div>
      }
      filters={
        <div className="flex flex-wrap items-center gap-2 w-full">
          <div className="relative flex-1 min-w-[220px] max-w-md">
            <Search
              className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground pointer-events-none"
              aria-hidden
            />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={`Search title, location… (min ${JOB_SEARCH_MIN_LENGTH} chars)`}
              className="h-9 pl-8"
              aria-label="Search job postings"
            />
          </div>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-[140px] h-9">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              {TYPE_FILTER_OPTIONS.map((t) => (
                <SelectItem key={t.value} value={t.value}>
                  {t.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={statusFilter ?? "ALL"} onValueChange={(v) => setFilter("status", v)}>
            <SelectTrigger className="w-[140px] h-9">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((s) => (
                <SelectItem key={s.value} value={s.value}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {(hasClientFilters || hasUrlStatusFilter) && (
            <Button type="button" variant="ghost" size="sm" className="h-9 gap-1" onClick={handleClearFilters}>
              <X className="h-3.5 w-3.5" />
              Clear
            </Button>
          )}
        </div>
      }
    >
      <Card>
        {searchQuery.trim().length > 0 && searchQuery.trim().length < JOB_SEARCH_MIN_LENGTH ? (
          <p className="px-4 pt-3 text-xs text-muted-foreground">
            Type at least {JOB_SEARCH_MIN_LENGTH} characters to search.
          </p>
        ) : null}
        <CardContent className="p-0">
          <ScrollArea className="w-full" type="auto">
            <div className="min-w-[820px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Job Title</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Openings</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-[50px]" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {!jobs?.length ? (
                    <TableRow><TableCell colSpan={7} className="py-8">
                      <EmptyState
                        compact
                        illustration={<EmptyJobPostingsIllustration className="h-20 w-20 opacity-95" />}
                        title="No job postings yet"
                        description="Create your first job posting to start recruiting."
                        action={{ label: "New job", onClick: () => router.push("/hr/recruitment/jobs/new") }}
                        className="border-0 bg-transparent"
                      />
                    </TableCell></TableRow>
                  ) : filteredJobs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="py-8">
                        <EmptyState
                          compact
                          icon={Search}
                          title="No matches"
                          description="Try adjusting your search or filters."
                          action={{ label: "Clear filters", onClick: handleClearFilters }}
                          className="border-0 bg-transparent"
                        />
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredJobs.map((job) => (
                      <TableRow
                        key={job.id}
                        className="cursor-pointer"
                        onClick={() => openEditPage(job)}
                      >
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <span>{formatJobPostingTitle(job.title)}</span>
                            {job.externalPostingIds && Object.keys(job.externalPostingIds as Record<string, string>).length > 0 && (
                              <div className="flex gap-1">
                                {Object.keys(job.externalPostingIds as Record<string, string>).map((platform) => (
                                  <Badge key={platform} variant="secondary" className="text-[9px] px-1 py-0 h-4 uppercase">{platform}</Badge>
                                ))}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">{departmentName(job.departmentId)}</TableCell>
                        <TableCell>{job.location ? formatJobPostingLocation(job.location) : ""}</TableCell>
                        <TableCell className="text-sm">{formatJobTypeLabel(job.type)}</TableCell>
                        <TableCell>{job.openings}</TableCell>
                        <TableCell>
                          <Badge variant={statusBadgeVariant(job.status)}>
                            {formatJobPostingStatusLabel(job.status)}
                          </Badge>
                        </TableCell>
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => openEditPage(job)}>
                                <Pencil className="mr-2 h-4 w-4" />Edit
                              </DropdownMenuItem>
                              {job.status === "DRAFT" && (
                                <DropdownMenuItem
                                  onClick={() =>
                                    setPendingAction({
                                      kind: "status",
                                      jobId: job.id,
                                      jobTitle: job.title,
                                      status: "OPEN",
                                      actionLabel: "Publish",
                                    })
                                  }
                                >
                                  <Play className="mr-2 h-4 w-4" />Publish
                                </DropdownMenuItem>
                              )}
                              {job.status === "OPEN" && (
                                <>
                                  <DropdownMenuItem
                                    onClick={() =>
                                      setPendingAction({
                                        kind: "publish-boards",
                                        jobId: job.id,
                                        jobTitle: job.title,
                                      })
                                    }
                                    disabled={publishToBoards.isPending}
                                  >
                                    <Share2 className="mr-2 h-4 w-4" />Post to Job Boards
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => setShareJobId(job.id)}>
                                    <ExternalLink className="mr-2 h-4 w-4" />Share Job Link
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() =>
                                      setPendingAction({
                                        kind: "status",
                                        jobId: job.id,
                                        jobTitle: job.title,
                                        status: "PAUSED",
                                        actionLabel: "Pause",
                                      })
                                    }
                                  >
                                    <Pause className="mr-2 h-4 w-4" />Pause
                                  </DropdownMenuItem>
                                </>
                              )}
                              {job.status === "PAUSED" && (
                                <DropdownMenuItem
                                  onClick={() =>
                                    setPendingAction({
                                      kind: "status",
                                      jobId: job.id,
                                      jobTitle: job.title,
                                      status: "OPEN",
                                      actionLabel: "Resume",
                                    })
                                  }
                                >
                                  <Play className="mr-2 h-4 w-4" />Resume
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem
                                onClick={() =>
                                  setPendingAction({
                                    kind: "delete",
                                    jobId: job.id,
                                    jobTitle: job.title,
                                  })
                                }
                                className="text-destructive"
                              >
                                <Trash2 className="mr-2 h-4 w-4" />Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </PageWrapper>
    {shareJobId !== null && (
      <ShareJobDialog jobId={shareJobId} onClose={() => setShareJobId(null)} />
    )}
    {confirmCopy && (
      <ConfirmActionDialog
        open={pendingAction !== null}
        onOpenChange={(open) => {
          if (!open && !isConfirmPending) setPendingAction(null);
        }}
        title={confirmCopy.title}
        description={confirmCopy.description}
        confirmLabel={confirmCopy.confirmLabel}
        variant={confirmCopy.variant}
        isPending={isConfirmPending}
        onConfirm={handleConfirmAction}
      />
    )}
    </>
  );
}
