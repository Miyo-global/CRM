"use client";

import { getErrorMessage } from "@/lib/get-error-message";
import { useState, useCallback, useMemo, useEffect } from "react";
import { useRecognitions, useCreateRecognition, type Recognition } from "@/lib/api/hooks/hr";
import { useHrEmployees } from "@/lib/api/hooks/hr";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { HrSheet } from "@/features/hr/hr-sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { format, formatDistanceToNow, subDays } from "date-fns";
import { resolveImageUrl } from "@/lib/utils";
import { SearchableMultiSelect } from "@/components/ui/searchable-multi-select";
import { Heart, Plus, Award, Users, Lightbulb, Zap, Trophy, Sparkles, TrendingUp, History, ArrowUpRight, ArrowDownLeft, Download, X, Mail, AlertTriangle } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { QueryErrorState } from "@/components/ui/query-error-state";
import { StatusPill } from "@/components/ui/status-pill";
import { IconChip } from "@/components/ui/icon-chip";
import { StatsStrip } from "@/components/shared/stats-strip";
import { ListToolbar } from "@/components/shared/list-toolbar";
import { toneBar, toneSoft, toneText, type Tone } from "@/lib/design/tones";
import { RecognitionExportSheet } from "@/features/hr/recognition/recognition-export-sheet";
import type { RecognitionExportFilters } from "@/lib/hr/recognition-export-filters";
import { recognitionExportFilename } from "@/lib/hr/recognition-export-filters";
import { buildRecognitionCsvText } from "@/lib/hr/recognition-export-rows";
import { Input } from "@/components/ui/input";
import type { Employee } from "@/types/hr";
import { DataTablePagination } from "@/components/shared/data-table-pagination";
import { DEFAULT_PAGE_SIZE, type PageSizeOption } from "@/lib/pagination-constants";
import { useSession } from "next-auth/react";
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

const CATEGORY_DEFS: { value: string; label: string; icon: typeof Heart; tone: Tone }[] = [
  { value: "KUDOS", label: "Kudos", icon: Heart, tone: "plum" },
  { value: "TEAMWORK", label: "Teamwork", icon: Users, tone: "info" },
  { value: "INNOVATION", label: "Innovation", icon: Lightbulb, tone: "warning" },
  { value: "LEADERSHIP", label: "Leadership", icon: Award, tone: "brand" },
  { value: "ABOVE_AND_BEYOND", label: "Above & Beyond", icon: Zap, tone: "success" },
];
const CATEGORIES = CATEGORY_DEFS.map((c) => ({ ...c, color: toneText[c.tone], bg: toneSoft[c.tone], bar: toneBar[c.tone] }));

function getCategoryMeta(category: string | null) {
  return CATEGORIES.find((c) => c.value === category) ?? CATEGORIES[0];
}

interface RecognitionStats {
  total: number;
  thisMonth: number;
  topRecognized: { id: string; name: string | null; image: string | null; count: number }[];
  byCategory: { value: string; label: string; count: number; color: string; bg: string; bar: string; icon: typeof Heart }[];
}

function computeStats(recognitions: Recognition[]): RecognitionStats {
  const now = new Date();
  const monthKey = `${now.getFullYear()}-${now.getMonth()}`;

  let thisMonth = 0;
  const recipientCounts = new Map<string, { name: string | null; image: string | null; count: number }>();
  const categoryCounts = new Map<string, number>();

  for (const r of recognitions) {
    if (r.createdAt) {
      const d = new Date(r.createdAt);
      if (`${d.getFullYear()}-${d.getMonth()}` === monthKey) thisMonth += 1;
    }
    if (r.toUser?.id) {
      const existing = recipientCounts.get(r.toUser.id);
      if (existing) existing.count += 1;
      else recipientCounts.set(r.toUser.id, { name: r.toUser.name, image: r.toUser.image, count: 1 });
    }
    const cat = r.category ?? "KUDOS";
    categoryCounts.set(cat, (categoryCounts.get(cat) ?? 0) + 1);
  }

  const topRecognized = Array.from(recipientCounts.entries())
    .map(([id, v]) => ({ id, ...v }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  const byCategory = CATEGORIES.map((c) => ({
    value: c.value,
    label: c.label,
    color: c.color,
    bg: c.bg,
    bar: c.bar,
    icon: c.icon,
    count: categoryCounts.get(c.value) ?? 0,
  }))
    .filter((c) => c.count > 0)
    .sort((a, b) => b.count - a.count);

  return { total: recognitions.length, thisMonth, topRecognized, byCategory };
}

function HistoryCard({ r, currentUserId }: { r: Recognition; currentUserId: string | undefined }) {
  const catMeta = getCategoryMeta(r.category);
  const Icon = catMeta.icon;
  const isSent = r.fromUserId === currentUserId;
  const isReceived = r.toUserId === currentUserId;

  return (
    <Card>
      <CardContent className="space-y-3 p-5">
        <div className="flex items-start justify-between gap-2">
          <StatusPill tone={catMeta.tone}>
            <Icon aria-hidden="true" />{catMeta.label}
          </StatusPill>
          <span className="shrink-0 whitespace-nowrap text-2xs tabular-nums text-muted-foreground">
            {r.createdAt ? format(new Date(r.createdAt), "dd MMM yyyy, hh:mm a") : "—"}
          </span>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <Avatar className="h-8 w-8 shrink-0">
              <AvatarImage src={resolveImageUrl(r.fromUser?.image ?? null)} />
              <AvatarFallback className="bg-brand-soft text-3xs text-brand-soft-foreground">{r.fromUser?.name?.[0] ?? "?"}</AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-sm font-medium truncate">{r.fromUser?.name ?? "—"}</span>
                {isSent && <StatusPill tone="info"><ArrowUpRight aria-hidden="true" />Sent</StatusPill>}
              </div>
              {r.fromUserDept && <p className="text-2xs text-muted-foreground">{r.fromUserDept}</p>}
            </div>
          </div>
          <ArrowUpRight className="size-4 shrink-0 rotate-45 text-subtle-foreground" aria-hidden="true" />
          <div className="flex items-center gap-2 min-w-0 flex-1 justify-end">
            <div className="min-w-0 text-right">
              <div className="flex items-center justify-end gap-1.5 flex-wrap">
                {isReceived && <StatusPill tone="success"><ArrowDownLeft aria-hidden="true" />Received</StatusPill>}
                <span className="text-sm font-medium truncate">{r.toUser?.name ?? "—"}</span>
              </div>
              {r.toUserDept && <p className="text-2xs text-muted-foreground">{r.toUserDept}</p>}
            </div>
            <Avatar className="h-8 w-8 shrink-0">
              <AvatarImage src={resolveImageUrl(r.toUser?.image ?? null)} />
              <AvatarFallback className="bg-brand-soft text-3xs text-brand-soft-foreground">{r.toUser?.name?.[0] ?? "?"}</AvatarFallback>
            </Avatar>
          </div>
        </div>

        {r.message && (
          <p className="line-clamp-2 border-t border-border pt-3 text-sm leading-relaxed text-muted-foreground">{r.message}</p>
        )}
      </CardContent>
    </Card>
  );
}

export default function RecognitionPage() {
  const { data: session } = useSession();
  const currentUserId = session?.user?.id;
  const isAdmin = ["CEO", "HR", "ADMIN"].includes(session?.user?.role ?? "");

  const { data: recognitions, isLoading, isError, error, refetch } = useRecognitions();
  const { data: employeesRaw } = useHrEmployees();
  const createRecognition = useCreateRecognition();

  const [sheetOpen, setSheetOpen] = useState(false);
  const [confirmSendOpen, setConfirmSendOpen] = useState(false);
  const [toUserIds, setToUserIds] = useState<string[]>([]);
  const [isSendingBulk, setIsSendingBulk] = useState(false);
  const [message, setMessage] = useState("");
  const [category, setCategory] = useState("KUDOS");
  const [historyFilter, setHistoryFilter] = useState<"ALL" | "SENT" | "RECEIVED">("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState("ALL");
  const [filterDept, setFilterDept] = useState("ALL");
  const [filterFrom, setFilterFrom] = useState("ALL");
  const [filterTo, setFilterTo] = useState("ALL");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [exportSheetOpen, setExportSheetOpen] = useState(false);
  const [exportSheetTab, setExportSheetTab] = useState<"download" | "email">("download");
  const [historyPage, setHistoryPage] = useState(1);
  const [historyPageSize, setHistoryPageSize] = useState<PageSizeOption>(DEFAULT_PAGE_SIZE);

  const employees = useMemo(
    () => (Array.isArray(employeesRaw) ? employeesRaw : (employeesRaw as { data?: Employee[] })?.data ?? []) as Employee[],
    [employeesRaw]
  );
  const employeeOptions = useMemo(
    () => employees
      .filter((e) => e.id !== currentUserId)
      .map((e) => ({ value: e.id, label: e.name ?? e.email })),
    [employees, currentUserId]
  );

  const recognitionList = useMemo(
    () => (Array.isArray(recognitions) ? recognitions : []),
    [recognitions]
  );
  const stats = useMemo(() => computeStats(recognitionList), [recognitionList]);

  // Build unique department list
  const allDepts = useMemo(() => {
    const set = new Set<string>();
    for (const r of recognitionList) {
      if (r.fromUserDept) set.add(r.fromUserDept);
      if (r.toUserDept) set.add(r.toUserDept);
    }
    return [...set].sort();
  }, [recognitionList]);

  // Build unique person lists for from/to filters
  const allFromPeople = useMemo(() => {
    const map = new Map<string, string>();
    for (const r of recognitionList) {
      if (r.fromUserId && r.fromUser?.name) map.set(r.fromUserId, r.fromUser.name);
    }
    return [...map.entries()].map(([value, label]) => ({ value, label })).sort((a, b) => a.label.localeCompare(b.label));
  }, [recognitionList]);

  const allToPeople = useMemo(() => {
    const map = new Map<string, string>();
    for (const r of recognitionList) {
      if (r.toUserId && r.toUser?.name) map.set(r.toUserId, r.toUser.name);
    }
    return [...map.entries()].map(([value, label]) => ({ value, label })).sort((a, b) => a.label.localeCompare(b.label));
  }, [recognitionList]);

  const hasActiveFilters =
    searchQuery ||
    filterCategory !== "ALL" ||
    filterDept !== "ALL" ||
    filterFrom !== "ALL" ||
    filterTo !== "ALL" ||
    dateFrom ||
    dateTo ||
    (!isAdmin && historyFilter !== "ALL");

  const clearFilters = useCallback(() => {
    setSearchQuery("");
    setFilterCategory("ALL");
    setFilterDept("ALL");
    setFilterFrom("ALL");
    setFilterTo("ALL");
    setDateFrom("");
    setDateTo("");
    if (!isAdmin) setHistoryFilter("ALL");
  }, [isAdmin]);

  // Employee history: sent + received; admin: all — then apply filters
  const historyRows = useMemo(() => {
    let rows = recognitionList;

    // Role scope
    if (!isAdmin) {
      if (historyFilter === "SENT") rows = rows.filter((r) => r.fromUserId === currentUserId);
      else if (historyFilter === "RECEIVED") rows = rows.filter((r) => r.toUserId === currentUserId);
      else rows = rows.filter((r) => r.fromUserId === currentUserId || r.toUserId === currentUserId);
    }

    // Search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      rows = rows.filter((r) =>
        r.fromUser?.name?.toLowerCase().includes(q) ||
        r.toUser?.name?.toLowerCase().includes(q) ||
        r.fromUser?.email?.toLowerCase().includes(q) ||
        r.toUser?.email?.toLowerCase().includes(q) ||
        r.message?.toLowerCase().includes(q)
      );
    }

    // Category
    if (filterCategory !== "ALL") rows = rows.filter((r) => r.category === filterCategory);

    // Department
    if (filterDept !== "ALL") rows = rows.filter((r) => r.fromUserDept === filterDept || r.toUserDept === filterDept);

    // From person
    if (filterFrom !== "ALL") rows = rows.filter((r) => r.fromUserId === filterFrom);

    // To person
    if (filterTo !== "ALL") rows = rows.filter((r) => r.toUserId === filterTo);

    // Date range
    if (dateFrom) rows = rows.filter((r) => r.createdAt && new Date(r.createdAt) >= new Date(dateFrom));
    if (dateTo) rows = rows.filter((r) => r.createdAt && new Date(r.createdAt) <= new Date(dateTo + "T23:59:59"));

    return rows;
  }, [recognitionList, isAdmin, currentUserId, historyFilter, searchQuery, filterCategory, filterDept, filterFrom, filterTo, dateFrom, dateTo]);

  const exportFilters = useMemo<RecognitionExportFilters>(
    () => ({
      searchQuery: searchQuery.trim() || undefined,
      category: filterCategory as RecognitionExportFilters["category"],
      department: filterDept,
      fromUserId: filterFrom,
      toUserId: filterTo,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
      historyFilter,
    }),
    [searchQuery, filterCategory, filterDept, filterFrom, filterTo, dateFrom, dateTo, historyFilter],
  );

  useEffect(() => {
    setHistoryPage(1);
  }, [searchQuery, filterCategory, filterDept, filterFrom, filterTo, dateFrom, dateTo, historyFilter]);

  const historyTotalPages = Math.max(1, Math.ceil(historyRows.length / historyPageSize));
  const historySafePage = Math.min(historyPage, historyTotalPages);

  const paginatedHistoryRows = useMemo(() => {
    const start = (historySafePage - 1) * historyPageSize;
    return historyRows.slice(start, start + historyPageSize);
  }, [historyRows, historySafePage, historyPageSize]);

  const handleHistoryPageSizeChange = useCallback((size: number) => {
    setHistoryPageSize(size as PageSizeOption);
    setHistoryPage(1);
  }, []);

  const exportCsv = useCallback(() => {
    if (historyRows.length === 0) return;
    const csv = buildRecognitionCsvText(historyRows);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = recognitionExportFilename();
    a.click();
    URL.revokeObjectURL(url);
  }, [historyRows]);

  const handleSend = useCallback(() => {
    if (toUserIds.length === 0 || !message.trim()) {
      toast.error("Select at least one recipient and enter a message");
      return;
    }
    const sevenDaysAgo = subDays(new Date(), 7);
    const duplicateIds = toUserIds.filter((id) =>
      recognitionList.some(
        (r) =>
          r.fromUserId === currentUserId &&
          r.toUserId === id &&
          r.category === category &&
          r.createdAt != null &&
          new Date(r.createdAt) > sevenDaysAgo,
      ),
    );
    if (duplicateIds.length > 0) {
      const names = duplicateIds
        .map((id) => employeeOptions.find((o) => o.value === id)?.label ?? "this person")
        .join(", ");
      toast.error(
        duplicateIds.length === 1
          ? `You already gave this recognition to ${names} this week. Try again after 7 days.`
          : `You already gave this recognition to ${names} this week. Remove them or try again after 7 days.`,
      );
      return;
    }
    // Close the sheet before confirming: a dialog opened on top of the open
    // sheet was unreachable, so Send Kudos looked like a no-op (QA-0013).
    setSheetOpen(false);
    setConfirmSendOpen(true);
  }, [toUserIds, message, category, currentUserId, recognitionList, employeeOptions]);

  const confirmRecipientSummary = useMemo(() => {
    if (toUserIds.length === 0) return "your teammates";
    const names = toUserIds.map(
      (id) => employeeOptions.find((o) => o.value === id)?.label ?? "Teammate",
    );
    if (names.length === 1) return names[0]!;
    if (names.length === 2) return `${names[0]} and ${names[1]}`;
    return `${names.slice(0, 2).join(", ")}, and ${names.length - 2} other${names.length - 2 === 1 ? "" : "s"}`;
  }, [toUserIds, employeeOptions]);

  const confirmCategoryLabel = useMemo(
    () => CATEGORIES.find((c) => c.value === category)?.label ?? "Kudos",
    [category],
  );

  const handleConfirmSend = useCallback(async () => {
    const trimmedMessage = message.trim();
    const recipients = [...toUserIds];
    setIsSendingBulk(true);
    let sent = 0;
    const failures: string[] = [];

    for (const toUserId of recipients) {
      try {
        await createRecognition.mutateAsync({ toUserId, message: trimmedMessage, category });
        sent += 1;
      } catch (e) {
        const label = employeeOptions.find((o) => o.value === toUserId)?.label ?? "Recipient";
        failures.push(`${label}: ${getErrorMessage(e)}`);
      }
    }

    setIsSendingBulk(false);

    if (sent > 0) {
      toast.success(
        sent === 1 ? "Recognition sent!" : `Recognition sent to ${sent} teammates!`,
        failures.length > 0
          ? { description: `${failures.length} could not be sent.` }
          : undefined,
      );
      setConfirmSendOpen(false);
      setToUserIds([]);
      setMessage("");
      setCategory("KUDOS");
    }

    if (failures.length > 0) {
      toast.error(
        failures.length === recipients.length ? "Could not send recognition" : "Some recognitions failed",
        { description: failures.slice(0, 3).join(" · ") },
      );
      // Nothing was sent: put the user back in the form with their input.
      if (sent === 0) {
        setConfirmSendOpen(false);
        setSheetOpen(true);
      }
    }
  }, [toUserIds, message, category, createRecognition, employeeOptions]);

  if (isLoading) {
    return (
      <PageWrapper title="Recognition">
        <div className="space-y-4">
          <Skeleton className="h-20 rounded-lg" />
          <div className="max-w-2xl space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-lg" />)}</div>
        </div>
      </PageWrapper>
    );
  }

  const summaryCards = [
    { label: "Total Kudos", value: stats.total, icon: Heart, tone: "plum" as const },
    { label: "This Month", value: stats.thisMonth, icon: TrendingUp, tone: "success" as const },
    { label: "People Recognized", value: stats.topRecognized.length, icon: Users, tone: "info" as const },
    {
      label: "Top Category",
      value: stats.byCategory[0]?.count ? stats.byCategory[0].label : "—",
      icon: Sparkles,
    },
  ];

  return (
    <PageWrapper
      title="Recognition"
      badge={`${stats.total} kudos`}
      actions={
        <Button size="sm" onClick={() => setSheetOpen(true)}>
          <Plus className="size-4" aria-hidden="true" />Give Kudos
        </Button>
      }
    >
      {isError ? (
        <QueryErrorState error={error} onRetry={() => void refetch()} />
      ) : (
      <Tabs defaultValue="wall">
        <TabsList variant="underline" className="mb-4">
          <TabsTrigger value="wall"><Heart className="size-4" aria-hidden="true" />Wall</TabsTrigger>
          <TabsTrigger value="history"><History className="size-4" aria-hidden="true" />History</TabsTrigger>
        </TabsList>

        {/* ── WALL TAB ── */}
        <TabsContent value="wall">
          {stats.total === 0 ? (
            <EmptyState
              title="No recognition yet. Be the first to celebrate a teammate!"
              action={{ label: "Give Kudos", onClick: () => setSheetOpen(true) }}
            />
          ) : (
            <div className="space-y-5">
              <StatsStrip items={summaryCards} />

              <div className="grid gap-5 lg:grid-cols-3">
                <div className="space-y-5 lg:col-span-1">
                  <Card>
                    <CardContent className="p-5">
                      <div className="mb-3 flex items-center gap-2">
                        <IconChip icon={Trophy} tone="brand" size="sm" />
                        <p className="text-sm font-semibold">Top Recognized</p>
                      </div>
                      {stats.topRecognized.length === 0 ? (
                        <p className="text-xs text-muted-foreground">No one recognized yet.</p>
                      ) : (
                        <div className="space-y-2.5">
                          {stats.topRecognized.map((person, idx) => (
                            <div key={person.id} className="flex items-center gap-2.5">
                              <span className="w-4 text-xs font-bold tabular-nums text-muted-foreground">{idx + 1}</span>
                              <Avatar className="size-7">
                                <AvatarImage src={resolveImageUrl(person.image ?? null)} />
                                <AvatarFallback className="bg-brand-soft text-3xs text-brand-soft-foreground">{person.name?.[0] ?? "?"}</AvatarFallback>
                              </Avatar>
                              <span className="flex-1 truncate text-sm">{person.name ?? "Teammate"}</span>
                              <Badge variant="plum" className="shrink-0 tabular-nums">
                                <Heart className="fill-current" aria-hidden="true" />
                                {person.count}
                              </Badge>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-5">
                      <div className="mb-3 flex items-center gap-2">
                        <IconChip icon={Sparkles} tone="plum" size="sm" />
                        <p className="text-sm font-semibold">By Category</p>
                      </div>
                      <div className="space-y-2.5">
                        {stats.byCategory.length === 0 ? (
                          <p className="text-xs text-muted-foreground">No category data yet.</p>
                        ) : (
                          stats.byCategory.map((cat) => {
                            const Icon = cat.icon;
                            const pct =
                              stats.total > 0 && cat.count > 0
                                ? Math.max(Math.round((cat.count / stats.total) * 100), 6)
                                : 0;
                            return (
                              <div key={cat.value} className="space-y-1">
                                <div className="flex items-center justify-between text-xs">
                                  <span className={`flex items-center gap-1.5 ${cat.color}`}>
                                    <Icon className="size-3.5" aria-hidden="true" />
                                    <span className="text-foreground">{cat.label}</span>
                                  </span>
                                  <span className="text-muted-foreground tabular-nums">{cat.count}</span>
                                </div>
                                <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                                  <div
                                    className={`h-full rounded-full transition-[width] duration-500 motion-reduce:transition-none ${cat.bar}`}
                                    style={{ width: `${pct}%` }}
                                  />
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <div className="lg:col-span-2">
                  <div className="mb-3 flex items-center gap-2">
                    <IconChip icon={Heart} tone="plum" size="sm" />
                    <p className="text-sm font-semibold">Recent Recognition</p>
                  </div>
                  <div className="space-y-3">
                    {recognitionList.map((r: Recognition) => {
                      const catMeta = getCategoryMeta(r.category);
                      const Icon = catMeta.icon;
                      return (
                        <Card key={r.id}>
                          <CardContent className="p-5">
                            <div className="flex items-start gap-3">
                              <Avatar className="size-9 shrink-0">
                                <AvatarImage src={resolveImageUrl(r.fromUser?.image ?? null)} />
                                <AvatarFallback className="bg-brand-soft text-xs text-brand-soft-foreground">{r.fromUser?.name?.[0]}</AvatarFallback>
                              </Avatar>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="text-sm font-semibold">{r.fromUser?.name}</span>
                                  <span className="text-xs text-muted-foreground">recognized</span>
                                  <span className="text-sm font-semibold">{r.toUser?.name}</span>
                                  <StatusPill tone={catMeta.tone}>
                                    <Icon aria-hidden="true" />
                                    {catMeta.label}
                                  </StatusPill>
                                </div>
                                <p className="mt-1.5 text-sm text-foreground">{r.message}</p>
                                <p
                                  className="mt-1.5 text-xs text-muted-foreground"
                                  title={r.createdAt ? format(new Date(r.createdAt), "dd MMM yyyy, hh:mm a") : undefined}
                                >
                                  {r.createdAt ? formatDistanceToNow(new Date(r.createdAt), { addSuffix: true }) : ""}
                                </p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}
        </TabsContent>

        {/* ── HISTORY TAB ── */}
        <TabsContent value="history">
          <div className="space-y-3">
            <ListToolbar
              search={{ value: searchQuery, onChange: setSearchQuery, placeholder: "Search name, email, or message…" }}
              filters={
                <>
                  <Select value={filterCategory} onValueChange={setFilterCategory}>
                    <SelectTrigger className="h-9 w-36 text-sm">
                      <SelectValue placeholder="Category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">All Categories</SelectItem>
                      {CATEGORIES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                    </SelectContent>
                  </Select>

                  {isAdmin ? (
                    <>
                      <Select value={filterDept} onValueChange={setFilterDept}>
                        <SelectTrigger className="h-9 w-40 text-sm">
                          <SelectValue placeholder="Department" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ALL">All Departments</SelectItem>
                          {allDepts.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                        </SelectContent>
                      </Select>

                      <Select value={filterFrom} onValueChange={setFilterFrom}>
                        <SelectTrigger className="h-9 w-40 text-sm">
                          <SelectValue placeholder="From person" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ALL">From Anyone</SelectItem>
                          {allFromPeople.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
                        </SelectContent>
                      </Select>

                      <Select value={filterTo} onValueChange={setFilterTo}>
                        <SelectTrigger className="h-9 w-40 text-sm">
                          <SelectValue placeholder="To person" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ALL">To Anyone</SelectItem>
                          {allToPeople.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </>
                  ) : (
                    <Select value={historyFilter} onValueChange={(v) => setHistoryFilter(v as typeof historyFilter)}>
                      <SelectTrigger className="h-9 w-36 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ALL">All</SelectItem>
                        <SelectItem value="SENT">Sent by me</SelectItem>
                        <SelectItem value="RECEIVED">Received by me</SelectItem>
                      </SelectContent>
                    </Select>
                  )}

                  <label className="flex items-center gap-1.5">
                    <span className="text-xs text-muted-foreground">From</span>
                    <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="h-9 w-36 text-sm tabular-nums" />
                  </label>

                  <label className="flex items-center gap-1.5">
                    <span className="text-xs text-muted-foreground">To</span>
                    <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="h-9 w-36 text-sm tabular-nums" />
                  </label>

                  {hasActiveFilters && (
                    <Button size="sm" variant="ghost" className="text-muted-foreground" onClick={clearFilters}>
                      <X className="size-4" aria-hidden="true" />Clear
                    </Button>
                  )}
                </>
              }
              actions={
                <>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setExportSheetTab("download");
                      setExportSheetOpen(true);
                    }}
                    disabled={historyRows.length === 0}
                  >
                    <Download className="size-4" aria-hidden="true" />Export
                  </Button>
                  {isAdmin ? (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setExportSheetTab("email");
                        setExportSheetOpen(true);
                      }}
                      disabled={historyRows.length === 0}
                    >
                      <Mail className="size-4" aria-hidden="true" />Send mail
                    </Button>
                  ) : null}
                </>
              }
            />

            <div className="flex items-center justify-between">
              <p className="text-xs tabular-nums text-muted-foreground">
                {isAdmin
                  ? `All organisation recognitions — ${historyRows.length} record${historyRows.length !== 1 ? "s" : ""}`
                  : `Your recognition history — ${historyRows.length} record${historyRows.length !== 1 ? "s" : ""}`}
                {hasActiveFilters && " (filtered)"}
              </p>
            </div>

            {historyRows.length === 0 ? (
              hasActiveFilters ? (
                <EmptyState
                  title="No results for these filters"
                  description="No records match the current filters."
                  action={{ label: "Clear filters", onClick: clearFilters }}
                />
              ) : (
                <EmptyState
                  title="No recognition records found."
                />
              )
            ) : (
              <div className="space-y-3">
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                  {paginatedHistoryRows.map((r) => (
                    <HistoryCard key={r.id} r={r} currentUserId={currentUserId} />
                  ))}
                </div>
                <div className="rounded-lg border border-border bg-card px-2">
                  <DataTablePagination
                    page={historySafePage}
                    totalPages={historyTotalPages}
                    total={historyRows.length}
                    limit={historyPageSize}
                    onPageChange={setHistoryPage}
                    onLimitChange={handleHistoryPageSizeChange}
                  />
                </div>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
      )}

      <RecognitionExportSheet
        open={exportSheetOpen}
        onOpenChange={setExportSheetOpen}
        defaultTab={exportSheetTab}
        filters={exportFilters}
        rowCount={historyRows.length}
        canEmailExport={isAdmin}
        onDownloadCsv={exportCsv}
      />

      <HrSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        title="Give recognition"
        onSubmit={handleSend}
        submitLabel={toUserIds.length > 1 ? `Send Kudos (${toUserIds.length})` : "Send Kudos"}
        isPending={createRecognition.isPending || isSendingBulk}
      >
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Who deserves recognition?</label>
          <SearchableMultiSelect
            options={employeeOptions}
            values={toUserIds}
            onValuesChange={setToUserIds}
            placeholder="Search teammates…"
            searchPlaceholder="Type to search…"
            selectedLabel={(count) => `${count} teammates selected`}
            emptyText="No teammate found."
          />
          <p className="text-2xs text-muted-foreground">Select one or more teammates to recognize.</p>
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Category</label>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {CATEGORIES.map((c) => (
                <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Message</label>
          <Textarea
            placeholder="What did they do that was awesome?"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={4}
            maxLength={500}
          />
          <p className="text-2xs text-muted-foreground text-right">{message.length}/500</p>
        </div>
      </HrSheet>

      <AlertDialog open={confirmSendOpen} onOpenChange={setConfirmSendOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Send recognition?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3 text-sm text-muted-foreground">
                <p>
                  You are about to send <strong className="text-foreground">{confirmCategoryLabel}</strong> to{" "}
                  <strong className="text-foreground">{confirmRecipientSummary}</strong>.
                </p>
                {toUserIds.length > 1 ? (
                  <ul className="list-disc pl-5 text-xs space-y-0.5">
                    {toUserIds.map((id) => {
                      const name = employeeOptions.find((o) => o.value === id)?.label ?? "Teammate";
                      return <li key={id}>{name}</li>;
                    })}
                  </ul>
                ) : null}
                <div className="flex gap-2.5 rounded-md bg-warning-soft p-3 text-warning-strong">
                  <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
                  <p className="text-xs leading-relaxed">
                    This will notify the recipient and send a team shoutout. Once sent, the message and notification{" "}
                    <strong>cannot be edited or recalled</strong>.
                  </p>
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={createRecognition.isPending || isSendingBulk}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                void handleConfirmSend();
              }}
              disabled={createRecognition.isPending || isSendingBulk}
            >
              {isSendingBulk
                ? `Sending${toUserIds.length > 1 ? ` (${toUserIds.length})…` : "…"}`
                : toUserIds.length > 1
                  ? `Send to ${toUserIds.length} people`
                  : "Send Kudos"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageWrapper>
  );
}
