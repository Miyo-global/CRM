"use client";

import Image from "next/image";
import { useState, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { format } from "date-fns";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { DatePicker } from "@/components/ui/date-picker";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  useProjects,
  useProject,
  useLogTime,
} from "@/lib/api/hooks/projects";
import { Plus, Loader2, Link as LinkIcon, Upload, X, FileText } from "lucide-react";
import { addTimeEntryInputSchema } from "@/lib/validations/project";
import type { ProjectListItem, Ticket } from "@/types/projects";
import { ScrollArea } from "../ui/scroll-area";

interface LogTimeDialogProps {
  trigger?: React.ReactNode;
}

const ACCEPT_ATTACHMENTS = "image/jpeg,image/png,image/gif,image/webp,application/pdf";
const MAX_ATTACHMENT_SIZE = 10 * 1024 * 1024;

export function LogTimeDialog({ trigger }: LogTimeDialogProps) {
  const [open, setOpen] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
  const [attachmentFiles, setAttachmentFiles] = useState<File[]>([]);
  const [attachmentPreviews, setAttachmentPreviews] = useState<(string | null)[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: projectsData } = useProjects();
  const projects = projectsData?.data ?? [];
  const { data: projectDetails, isLoading: isLoadingTickets } = useProject(
    selectedProjectId ?? 0
  );

  const mutation = useLogTime();

  const handleAttachmentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const allowed = ACCEPT_ATTACHMENTS.split(",").map((t) => t.trim());
    const file = files[0];

    if (file.size > MAX_ATTACHMENT_SIZE) {
      toast.error(`${file.name} is too large (max 10MB)`);
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }
    if (!allowed.includes(file.type)) {
      toast.error(`${file.name}: Only images (JPEG, PNG, GIF, WebP) or PDF allowed`);
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    setAttachmentFiles([file]);
    setAttachmentPreviews([null]);
    if (file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setAttachmentPreviews([reader.result as string]);
      };
      reader.readAsDataURL(file);
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeAttachment = (index: number) => {
    setAttachmentFiles((prev) => prev.filter((_, i) => i !== index));
    setAttachmentPreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const uploadAttachment = async (file: File): Promise<string | null> => {
    try {
      setUploading(true);
      const formData = new FormData();
      formData.append("file", file);
      formData.append("folder", "time-entries");

      const response = await fetch("/api/storage/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Upload failed");
      }

      const data = await response.json();
      return data.url ?? data.key ?? null;
    } catch {
      toast.error("Failed to upload file");
      return null;
    } finally {
      setUploading(false);
    }
  };

  const form = useForm<z.infer<typeof addTimeEntryInputSchema>>({
    resolver: zodResolver(addTimeEntryInputSchema),
    defaultValues: {
      ticketId: undefined as unknown as number,
      hours: 0,
      description: "",
      date: new Date(),
      workLink: "",
    },
  });

  async function onSubmit(values: z.infer<typeof addTimeEntryInputSchema>) {
    if (!selectedProjectId) {
      toast.error("Select a project");
      return;
    }
    let imageUrl: string | undefined;
    if (attachmentFiles.length > 0) {
      const url = await uploadAttachment(attachmentFiles[0]);
      if (!url) return;
      imageUrl = url;
    }
    const submitValues = {
      ...values,
      projectId: selectedProjectId,
      workLink: (values.workLink || "").trim() || undefined,
      imageUrl: imageUrl ?? values.imageUrl ?? "",
    };
    mutation.mutate(submitValues, {
      onSuccess: () => {
        toast.success("Time logged successfully");
        setOpen(false);
        form.reset();
        setSelectedProjectId(null);
        setAttachmentFiles([]);
        setAttachmentPreviews([]);
      },
      onError: (err) => {
        toast.error((err as Error).message || "Failed to log time");
      },
    });
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        {trigger || (
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Log Time
          </Button>
        )}
      </SheetTrigger>
      <SheetContent side="right" className="w-full sm:max-w-[540px] p-0 gap-0">
        <SheetHeader className="px-4 py-3 border-b">
          <SheetTitle className="text-sm">Log Time</SheetTitle>
          <SheetDescription className="text-xs">
            Record your work hours on a ticket.
          </SheetDescription>
        </SheetHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col flex-1 min-h-0">
            <ScrollArea className="flex-1 min-h-0">
              <div className="px-4 py-4 space-y-6">
                <FormItem>
                  <FormLabel>Project</FormLabel>
                  <Select
                    value={selectedProjectId?.toString()}
                    onValueChange={(val) => {
                      setSelectedProjectId(parseInt(val));
                      form.setValue("ticketId", undefined as unknown as number);
                    }}
                  >
                    <FormControl>
                      <SelectTrigger className="w-full capitalize">
                        <SelectValue placeholder="Select Project" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {projects?.map((p: ProjectListItem) => (
                        <SelectItem key={p.id} value={p.id.toString()} className="truncate capitalize">
                          {p.name} ({p.key})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormItem>

                <FormField
                  control={form.control}
                  name="ticketId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Ticket</FormLabel>
                      <Select
                        disabled={!selectedProjectId || isLoadingTickets}
                        onValueChange={(val) => field.onChange(parseInt(val))}
                        value={field.value?.toString()}
                      >
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder={isLoadingTickets ? "Loading tickets..." : "Select Ticket"} className="truncate" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="max-w-[500px] w-(--radix-select-trigger-width)">
                          {projectDetails?.tickets && projectDetails.tickets.length > 0 ? (
                            projectDetails.tickets.map((t: Ticket) => (
                              <SelectItem key={t.id} value={t.id.toString()} className="truncate capitalize">
                                {`Ticket #${t.id}`}: {t.title || "Untitled"}
                              </SelectItem>
                            ))
                          ) : (
                            <div className="p-2 text-sm text-muted-foreground">
                              {isLoadingTickets ? "Loading..." : "No tickets found"}
                            </div>
                          )}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="date"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Date</FormLabel>
                        <FormControl>
                          <DatePicker
                            value={field.value ? format(field.value, "yyyy-MM-dd") : ""}
                            onChange={(v) => field.onChange(v ? new Date(v) : new Date())}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="hours"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Hours</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.5"
                            placeholder="8"
                            value={field.value || ""}
                            onChange={(e) => {
                              const value = e.target.value;
                              field.onChange(value === "" ? 0 : parseFloat(value));
                            }}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="What did you work on?"
                          className="min-h-[100px]"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="workLink"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Work Link</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <LinkIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            type="url"
                            placeholder="https://example.com/work-done"
                            className="pl-9"
                            {...field}
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="imageUrl"
                  render={() => (
                    <FormItem>
                      <FormLabel>Attachments (images or PDF)</FormLabel>
                      <FormControl>
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => fileInputRef.current?.click()}
                              disabled={uploading}
                            >
                              <Upload className="h-4 w-4 mr-2" />
                              {uploading ? "Uploading..." : "Upload file"}
                            </Button>
                            <Input
                              ref={fileInputRef}
                              type="file"
                              className="hidden"
                              accept={ACCEPT_ATTACHMENTS}
                              onChange={handleAttachmentChange}
                            />
                          </div>
                          {attachmentFiles.length > 0 && (
                            <div className="space-y-2">
                              {attachmentFiles.map((file, index) => (
                                <div key={`${file.name}-${index}`} className="flex items-center gap-3 p-3 rounded-lg border border-border bg-muted/30">
                                  {attachmentPreviews[index] ? (
                                    <Image
                                      src={attachmentPreviews[index]!}
                                      alt="Preview"
                                      width={48}
                                      height={48}
                                      unoptimized
                                      className="h-12 w-12 object-cover rounded"
                                    />
                                  ) : file.type === "application/pdf" ? (
                                    <div className="h-12 w-12 rounded bg-red-50 dark:bg-red-900/20 flex items-center justify-center">
                                      <FileText className="h-6 w-6 text-red-500" />
                                    </div>
                                  ) : (
                                    <div className="h-12 w-12 rounded bg-muted flex items-center justify-center">
                                      <FileText className="h-6 w-6 text-muted-foreground" />
                                    </div>
                                  )}
                                  <div className="flex-1 min-w-0">
                                    <span className="text-sm truncate block">
                                      {file.name}
                                    </span>
                                    <span className="text-xs text-muted-foreground">
                                      {(file.size / 1024).toFixed(1)} KB
                                    </span>
                                  </div>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => removeAttachment(index)}
                                    aria-label={`Remove ${file.name}`}
                                  >
                                    <X className="h-4 w-4" />
                                  </Button>
                                </div>
                              ))}
                            </div>
                          )}
                          <p className="text-xs text-muted-foreground">
                            Images (JPEG, PNG, GIF, WebP) or PDF, max 10MB.
                          </p>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </ScrollArea>

            <SheetFooter className="px-4 py-3">
              <Button type="submit" className="flex-1" disabled={mutation.isPending || uploading}>
                {(mutation.isPending || uploading) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Log Time
              </Button>
            </SheetFooter>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
