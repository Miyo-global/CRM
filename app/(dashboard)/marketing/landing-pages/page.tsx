"use client";

import { useState, useCallback, useMemo } from "react";
import Link from "next/link";
import {
  Plus,
  ExternalLink,
  Trash2,
  Pencil,
  Copy,
  Check,
  BarChart2,
  Globe,
  Eye,
  TrendingUp,
  FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { StatCard } from "@/components/ui/stat-card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  useLandingPages,
  useLandingPageDetail,
  useCreateLandingPage,
  useUpdateLandingPage,
  useDeleteLandingPage,
  type LandingPage,
} from "@/lib/api/hooks/marketing";
import { getErrorMessage } from "@/lib/get-error-message";
import { toast } from "sonner";
import { PageDetailContent } from "@/features/marketing/landing-pages/page-detail-content";
import { CrmHostedPagesTab } from "@/features/marketing/landing-pages/crm-hosted-pages-tab";


function fmtDate(d: string | null | undefined) {
  if (!d) return "";
  return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function truncateUrl(url: string, max = 40) {
  try {
    const u = new URL(url);
    const path = u.hostname + u.pathname;
    return path.length > max ? path.slice(0, max) + "…" : path;
  } catch {
    return url.length > max ? url.slice(0, max) + "…" : url;
  }
}


export default function LandingPagesPage() {
  const [sheetMode, setSheetMode] = useState<"create" | "edit" | "detail" | null>(null);
  const [selectedPage, setSelectedPage] = useState<LandingPage | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [description, setDescription] = useState("");

  const { data, isLoading } = useLandingPages();
  const createPage = useCreateLandingPage();
  const updatePage = useUpdateLandingPage();
  const deletePage = useDeleteLandingPage();

  const pages: LandingPage[] = data?.pages ?? [];

  const totalPages = pages.length;
  const totalViews = pages.reduce((s, p) => s + p.totalViews, 0);
  const todayViews = pages.reduce((s, p) => s + p.todayViews, 0);
  const weekViews = pages.reduce((s, p) => s + p.weekViews, 0);

  const resetForm = useCallback(() => {
    setName(""); setUrl(""); setDescription("");
  }, []);

  const openCreate = useCallback(() => {
    resetForm();
    setSelectedPage(null);
    setSheetMode("create");
  }, [resetForm]);

  const openEdit = useCallback((page: LandingPage) => {
    setName(page.name);
    setUrl(page.url);
    setDescription(page.description ?? "");
    setSelectedPage(page);
    setSheetMode("edit");
  }, []);

  const openDetail = useCallback((page: LandingPage) => {
    setSelectedPage(page);
    setSheetMode("detail");
  }, []);

  const closeSheet = useCallback(() => {
    setSheetMode(null);
    setSelectedPage(null);
    resetForm();
  }, [resetForm]);

  const handleCreate = useCallback(() => {
    if (!name.trim()) { toast.error("Name is required"); return; }
    if (!url.trim()) { toast.error("URL is required"); return; }
    createPage.mutate(
      { name: name.trim(), url: url.trim(), description: description.trim() || undefined },
      {
        onSuccess: () => { toast.success("Landing page created"); closeSheet(); },
        onError: (e) => toast.error(getErrorMessage(e)),
      },
    );
  }, [name, url, description, createPage, closeSheet]);

  const handleEdit = useCallback(() => {
    if (!selectedPage) return;
    if (!name.trim()) { toast.error("Name is required"); return; }
    if (!url.trim()) { toast.error("URL is required"); return; }
    updatePage.mutate(
      { id: selectedPage.id, name: name.trim(), url: url.trim(), description: description.trim() || undefined },
      {
        onSuccess: () => { toast.success("Landing page updated"); closeSheet(); },
        onError: (e) => toast.error(getErrorMessage(e)),
      },
    );
  }, [selectedPage, name, url, description, updatePage, closeSheet]);

  const handleToggleActive = useCallback((page: LandingPage) => {
    updatePage.mutate(
      { id: page.id, isActive: !page.isActive },
      {
        onSuccess: () => toast.success(page.isActive ? "Page deactivated" : "Page activated"),
        onError: (e) => toast.error(getErrorMessage(e)),
      },
    );
  }, [updatePage]);

  const handleDelete = useCallback(() => {
    if (!deleteId) return;
    deletePage.mutate(deleteId, {
      onSuccess: () => { toast.success("Landing page deleted"); setDeleteId(null); },
      onError: (e) => { toast.error(getErrorMessage(e)); setDeleteId(null); },
    });
  }, [deleteId, deletePage]);

  const sheetTitle = useMemo(() => {
    if (sheetMode === "create") return "Add Landing Page";
    if (sheetMode === "edit") return "Edit Landing Page";
    return selectedPage?.name ?? "Page Details";
  }, [sheetMode, selectedPage]);

  return (
    <PageWrapper
      title="Landing Pages"
      subtitle="Track analytics and performance of your landing pages"
      actions={
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href="/marketing/landing-pages/new">
              <Plus className="mr-1 h-4 w-4" />
              New Hosted Page
            </Link>
          </Button>
          <Button onClick={openCreate} size="sm" aria-label="Add landing page">
            <Plus className="mr-1 h-4 w-4" />
            Track External Page
          </Button>
        </div>
      }
    >
      <Tabs defaultValue="hosted" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="hosted">
            <FileText className="mr-1.5 h-3.5 w-3.5" />
            Hosted Pages
          </TabsTrigger>
          <TabsTrigger value="tracked">
            <BarChart2 className="mr-1.5 h-3.5 w-3.5" />
            Tracked Pages
          </TabsTrigger>
        </TabsList>

        <TabsContent value="hosted">
          <CrmHostedPagesTab />
        </TabsContent>

        <TabsContent value="tracked">

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Total Pages" value={totalPages} icon={Globe} color="blue" />
        <StatCard label="Total Views" value={totalViews.toLocaleString()} icon={Eye} color="gold" />
        <StatCard label="Views Today" value={todayViews} icon={BarChart2} color="green" />
        <StatCard label="Views This Week" value={weekViews.toLocaleString()} icon={TrendingUp} color="purple" />
      </div>

      <ScrollArea className="w-full" type="auto">
        <div className="min-w-[720px]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Page Name</TableHead>
                <TableHead>URL</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Total Views</TableHead>
                <TableHead className="text-right">This Week</TableHead>
                <TableHead className="text-right">Today</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 8 }).map((__, j) => (
                      <TableCell key={j}><Skeleton className="h-5 w-full" /></TableCell>
                    ))}
                  </TableRow>
                ))
              ) : pages.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                    No landing pages yet. Add one to start tracking analytics.
                  </TableCell>
                </TableRow>
              ) : (
                pages.map((page) => (
                  <TableRow key={page.id}>
                    <TableCell>
                      <button
                        onClick={() => openDetail(page)}
                        className="text-sm font-medium hover:text-primary hover:underline underline-offset-2 text-left"
                        aria-label={`View details for ${page.name}`}
                      >
                        {page.name}
                      </button>
                    </TableCell>
                    <TableCell>
                      <a
                        href={page.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                        aria-label={`Open ${page.url} in new tab`}
                      >
                        {truncateUrl(page.url)}
                        <ExternalLink className="h-3 w-3 flex-shrink-0" />
                      </a>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={page.isActive
                          ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-transparent"
                          : "bg-muted text-muted-foreground border-transparent"}
                      >
                        {page.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-medium">{page.totalViews.toLocaleString()}</TableCell>
                    <TableCell className="text-right text-muted-foreground">{page.weekViews}</TableCell>
                    <TableCell className="text-right text-muted-foreground">{page.todayViews}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{fmtDate(page.createdAt)}</TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => openEdit(page)}
                          aria-label={`Edit ${page.name}`}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Switch
                          checked={page.isActive}
                          onCheckedChange={() => handleToggleActive(page)}
                          aria-label={`Toggle active status for ${page.name}`}
                          className="scale-75"
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive hover:text-destructive"
                          onClick={() => setDeleteId(page.id)}
                          aria-label={`Delete ${page.name}`}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </ScrollArea>

      <Sheet open={sheetMode !== null} onOpenChange={(o) => { if (!o) closeSheet(); }}>
        <SheetContent side="right" className="flex flex-col p-0 gap-0 w-full sm:max-w-md">
          <SheetHeader className="shrink-0 px-4 pt-4 pb-3 border-b">
            <SheetTitle className="text-base">{sheetTitle}</SheetTitle>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto px-4 py-4">
            {sheetMode === "detail" && selectedPage ? (
              <PageDetailContent pageId={selectedPage.id} />
            ) : (
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="lp-name">Name</Label>
                  <Input
                    id="lp-name"
                    placeholder="My Pricing Page"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="lp-url">URL</Label>
                  <Input
                    id="lp-url"
                    type="url"
                    placeholder="https://example.com/pricing"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="lp-desc">Description</Label>
                  <Textarea
                    id="lp-desc"
                    placeholder="Optional description…"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                  />
                </div>
              </div>
            )}
          </div>

          {sheetMode !== "detail" && (
            <SheetFooter className="shrink-0 px-4 py-3 border-t flex-row gap-2">
              <Button variant="outline" className="flex-1" onClick={closeSheet}>
                Cancel
              </Button>
              <Button
                className="flex-1"
                onClick={sheetMode === "edit" ? handleEdit : handleCreate}
                disabled={createPage.isPending || updatePage.isPending}
                aria-label={sheetMode === "edit" ? "Save changes" : "Create landing page"}
              >
                {sheetMode === "edit" ? "Save Changes" : "Create Landing Page"}
              </Button>
            </SheetFooter>
          )}
        </SheetContent>
      </Sheet>

      <AlertDialog open={deleteId !== null} onOpenChange={(o) => { if (!o) setDeleteId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Landing Page?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the landing page and all associated view data. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

        </TabsContent>
      </Tabs>
    </PageWrapper>
  );
}

