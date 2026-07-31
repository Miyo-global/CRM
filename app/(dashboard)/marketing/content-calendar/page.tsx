"use client";

import { useState, useCallback, memo } from "react";
import {
  CalendarRange, Plus, Trash2, ChevronLeft, ChevronRight,
  FileText, Mail, Share2, Video, Globe, BookOpen,
} from "lucide-react";
import { format, addMonths, subMonths, parseISO } from "date-fns";
import { toast } from "sonner";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter,
} from "@/components/ui/sheet";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  useContentCalendar, useCreateContentItem, useUpdateContentItem, useDeleteContentItem,
  type ContentCalendarItem, type CreateContentItemInput,
} from "@/lib/api/hooks/marketing";


const CONTENT_TYPES = [
  { value: "blog", label: "Blog", icon: FileText },
  { value: "email", label: "Email", icon: Mail },
  { value: "social", label: "Social", icon: Share2 },
  { value: "video", label: "Video", icon: Video },
  { value: "webinar", label: "Webinar", icon: Globe },
  { value: "whitepaper", label: "Whitepaper", icon: BookOpen },
] as const;

const CHANNELS = [
  { value: "linkedin", label: "LinkedIn" },
  { value: "twitter", label: "Twitter / X" },
  { value: "instagram", label: "Instagram" },
  { value: "email", label: "Email" },
  { value: "website", label: "Website" },
  { value: "youtube", label: "YouTube" },
] as const;

const STATUSES = [
  { value: "idea", label: "Idea", color: "bg-slate-100 text-slate-700" },
  { value: "in_progress", label: "In Progress", color: "bg-blue-100 text-blue-700" },
  { value: "review", label: "Review", color: "bg-yellow-100 text-yellow-700" },
  { value: "scheduled", label: "Scheduled", color: "bg-purple-100 text-purple-700" },
  { value: "published", label: "Published", color: "bg-emerald-100 text-emerald-700" },
] as const;

type StatusValue = (typeof STATUSES)[number]["value"];


function getContentTypeIcon(type: string) {
  const found = CONTENT_TYPES.find((t) => t.value === type);
  const Icon = found?.icon ?? FileText;
  return <Icon className="h-3.5 w-3.5" />;
}

function StatusBadge({ status }: { status: string }) {
  const s = STATUSES.find((st) => st.value === status) ?? STATUSES[0];
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${s.color}`}>
      {s.label}
    </span>
  );
}


const ContentItemCard = memo(function ContentItemCard({
  item,
  onStatusChange,
}: {
  item: ContentCalendarItem;
  onStatusChange: (id: number, status: string) => void;
}) {
  const deleteItem = useDeleteContentItem();

  const handleDelete = useCallback(() => {
    deleteItem.mutate(item.id, {
      onSuccess: () => toast.success("Item deleted"),
      onError: () => toast.error("Failed to delete"),
    });
  }, [deleteItem, item.id]);

  const handleStatusChange = useCallback(
    (v: string) => onStatusChange(item.id, v),
    [item.id, onStatusChange],
  );

  return (
    <div className="bg-card border rounded-lg p-3 space-y-2 shadow-sm">
      <div className="flex items-start justify-between gap-1">
        <p className="text-sm font-medium leading-snug line-clamp-2">{item.title}</p>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button size="icon" variant="ghost" className="h-6 w-6 shrink-0 text-muted-foreground">
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Content Item</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete &quot;{item.title}&quot;? This cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      <div className="flex items-center gap-1.5 flex-wrap">
        <Badge variant="outline" className="gap-1 text-xs py-0">
          {getContentTypeIcon(item.contentType)}
          {CONTENT_TYPES.find((t) => t.value === item.contentType)?.label ?? item.contentType}
        </Badge>
        {item.channel && (
          <Badge variant="secondary" className="text-xs py-0">
            {CHANNELS.find((c) => c.value === item.channel)?.label ?? item.channel}
          </Badge>
        )}
      </div>

      {item.scheduledDate && (
        <p className="text-xs text-muted-foreground">
          {format(parseISO(item.scheduledDate), "MMM d, yyyy")}
        </p>
      )}

      {item.tags && item.tags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {item.tags.slice(0, 3).map((tag) => (
            <span key={tag} className="inline-flex items-center rounded-full bg-muted px-1.5 py-0.5 text-xs">
              {tag}
            </span>
          ))}
        </div>
      )}

      <Select
        value={item.status ?? "idea"}
        onValueChange={handleStatusChange}
      >
        <SelectTrigger className="h-7 text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {STATUSES.map((s) => (
            <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
});


function CreateSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [title, setTitle] = useState("");
  const [contentType, setContentType] = useState("blog");
  const [channel, setChannel] = useState<string>("");
  const [status, setStatus] = useState<StatusValue>("idea");
  const [scheduledDate, setScheduledDate] = useState("");
  const [description, setDescription] = useState("");
  const [tagsInput, setTagsInput] = useState("");

  const create = useCreateContentItem();

  const handleSheetOpenChange = useCallback((o: boolean) => { if (!o) onClose(); }, [onClose]);
  const handleStatusChange = useCallback((v: string) => setStatus(v as StatusValue), []);

  const handleSubmit = async () => {
    if (!title.trim()) {
      toast.error("Title is required");
      return;
    }

    const input: CreateContentItemInput = {
      title: title.trim(),
      contentType,
      channel: channel || null,
      status,
      scheduledDate: scheduledDate || null,
      description: description || null,
      tags: tagsInput ? tagsInput.split(",").map((t) => t.trim()).filter(Boolean) : [],
    };

    try {
      await create.mutateAsync(input);
      toast.success("Content item created");
      setTitle(""); setContentType("blog"); setChannel(""); setStatus("idea");
      setScheduledDate(""); setDescription(""); setTagsInput("");
      onClose();
    } catch {
      toast.error("Failed to create item");
    }
  };

  return (
    <Sheet open={open} onOpenChange={handleSheetOpenChange}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Add Content Item</SheetTitle>
        </SheetHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-1">
            <Label>Title <span className="text-destructive">*</span></Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Blog post title..." />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Content Type</Label>
              <Select value={contentType} onValueChange={setContentType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CONTENT_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label>Channel</Label>
              <Select value={channel} onValueChange={setChannel}>
                <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">None</SelectItem>
                  {CHANNELS.map((c) => (
                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Status</Label>
              <Select value={status} onValueChange={handleStatusChange}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STATUSES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label>Scheduled Date</Label>
              <Input type="date" value={scheduledDate} onChange={(e) => setScheduledDate(e.target.value)} />
            </div>
          </div>

          <div className="space-y-1">
            <Label>Description</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} placeholder="Brief overview..." />
          </div>

          <div className="space-y-1">
            <Label>Tags</Label>
            <Input
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              placeholder="seo, product, announcement (comma-separated)"
            />
          </div>
        </div>

        <SheetFooter className="flex-row gap-2 border-t pt-4">
          <Button variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button className="flex-1" onClick={handleSubmit} disabled={create.isPending}>
            {create.isPending ? "Creating..." : "Create"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}


export default function ContentCalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [createOpen, setCreateOpen] = useState(false);

  const monthKey = format(currentDate, "yyyy-MM");
  const { data: allItems = [], isLoading } = useContentCalendar(monthKey);
  const updateItem = useUpdateContentItem();

  const handleStatusChange = useCallback(
    (id: number, newStatus: string) => {
      updateItem.mutate(
        { id, status: newStatus },
        { onError: () => toast.error("Failed to update status") }
      );
    },
    [updateItem]
  );

  const handleOpenCreate = useCallback(() => setCreateOpen(true), []);
  const handleCloseCreate = useCallback(() => setCreateOpen(false), []);
  const handlePrevMonth = useCallback(() => setCurrentDate((d) => subMonths(d, 1)), []);
  const handleNextMonth = useCallback(() => setCurrentDate((d) => addMonths(d, 1)), []);

  const filteredItems = statusFilter === "all"
    ? allItems
    : allItems.filter((i) => i.status === statusFilter);

  const kanbanColumns: StatusValue[] = ["idea", "in_progress", "review", "scheduled", "published"];

  return (
    <PageWrapper
      title="Content Calendar"
      subtitle="Plan and track your content across all channels"
      actions={
        <Button onClick={handleOpenCreate}>
          <Plus className="h-4 w-4 mr-2" /> Add Content
        </Button>
      }
      filters={
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 border rounded-md px-2 py-1">
            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={handlePrevMonth}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm font-medium w-28 text-center">{format(currentDate, "MMMM yyyy")}</span>
            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={handleNextMonth}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-36 h-8">
              <SelectValue placeholder="Filter status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              {STATUSES.map((s) => (
                <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      }
    >
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {kanbanColumns.map((col) => (
            <div key={col} className="space-y-2">
              <div className="h-7 bg-muted rounded animate-pulse" />
              {Array.from({ length: 2 }).map((_, i) => (
                <div key={i} className="h-24 bg-muted rounded animate-pulse" />
              ))}
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {kanbanColumns.map((col) => {
            const colItems = filteredItems.filter((i) => (i.status ?? "idea") === col);
            const meta = STATUSES.find((s) => s.value === col)!;
            return (
              <div key={col} className="space-y-2">
                <Card className="sticky top-0 z-10">
                  <CardHeader className="p-2 pb-2">
                    <CardTitle className="text-sm flex items-center justify-between">
                      <StatusBadge status={col} />
                      <span className="text-xs text-muted-foreground font-normal">{colItems.length}</span>
                    </CardTitle>
                  </CardHeader>
                </Card>

                <div className="space-y-2 min-h-[4rem]">
                  {colItems.length === 0 ? (
                    <div className="border border-dashed rounded-lg p-4 text-center text-xs text-muted-foreground">
                      No items
                    </div>
                  ) : (
                    colItems.map((item) => (
                      <ContentItemCard
                        key={item.id}
                        item={item}
                        onStatusChange={handleStatusChange}
                      />
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <CreateSheet open={createOpen} onClose={handleCloseCreate} />
    </PageWrapper>
  );
}
