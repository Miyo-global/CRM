"use client";

import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { getErrorMessage } from "@/lib/get-error-message";
import { isAdminOrOwner } from "@/lib/auth/role-guards";
import {
  useInterviewQuestions,
  useCreateInterviewQuestion,
  useDeleteInterviewQuestion,
  useUpdateInterviewQuestion,
  useBulkDeleteInterviewQuestions,
  type InterviewQuestion,
} from "@/lib/api/hooks/hr/recruitment";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { PageBackButton } from "@/components/ui/page-back-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle, SheetTrigger,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
} from "@/components/ui/command";
import { ConfirmActionDialog } from "@/features/hr/confirm-action-dialog";
import { DataTablePagination } from "@/components/shared/data-table-pagination";
import { usePaginationParams } from "@/hooks/use-pagination-params";
import { type PageSizeOption } from "@/lib/pagination-constants";
import { toast } from "sonner";
import { Plus, Search, MoreHorizontal, Trash2, BookOpen, X, Check, ChevronsUpDown, Pencil } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { EmptyDocumentsIllustration } from "@/components/illustrations";
import { cn } from "@/lib/utils";
import { parseInterviewQuestionText, parseInterviewQuestionTagsField } from "@/lib/validations/interview-questions";

const CATEGORIES = ["GENERAL", "TECHNICAL", "BEHAVIOURAL", "SITUATIONAL", "ROLE_SPECIFIC", "CULTURE_FIT"];
const DIFFICULTIES = ["EASY", "MEDIUM", "HARD"];

const DIFFICULTY_VARIANT: Record<string, "default" | "secondary" | "destructive"> = {
  EASY: "secondary",
  MEDIUM: "default",
  HARD: "destructive",
};

function matchesSearch(question: InterviewQuestion, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return [question.question, question.role, question.category, question.difficulty, ...(question.tags ?? []), ...(question.keywords ?? [])]
    .filter(Boolean)
    .some((value) => String(value).toLowerCase().includes(q));
}


function RoleCombobox({
  value,
  onChange,
  roles,
}: {
  value: string;
  onChange: (v: string) => void;
  roles: string[];
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const filtered = roles.filter((r) => r.toLowerCase().includes(query.toLowerCase()));
  const showCreate =
    query.trim().length > 0 &&
    !roles.some((r) => r.toLowerCase() === query.trim().toLowerCase());

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="h-9 w-full justify-between font-normal text-sm"
        >
          <span className={cn("truncate", !value && "text-muted-foreground")}>
            {value || "Select or type role…"}
          </span>
          <ChevronsUpDown className="ml-2 h-3.5 w-3.5 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[var(--radix-popover-trigger-width)] p-0 overflow-hidden"
        align="start"
        onWheel={(e) => e.stopPropagation()}
      >
        <Command
          shouldFilter={false}
          className="flex h-auto max-h-[min(300px,70vh)] min-h-0 w-full flex-col overflow-hidden"
        >
          <CommandInput
            placeholder="Search or type new role…"
            value={query}
            onValueChange={setQuery}
            className="h-9 shrink-0"
          />
          <CommandList
            className="max-h-[min(240px,60vh)] min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-contain"
            onWheel={(e) => e.stopPropagation()}
          >
            <CommandEmpty>No matching roles.</CommandEmpty>
            <CommandGroup>
              <CommandItem
                value="__none__"
                onSelect={() => { onChange(""); setOpen(false); setQuery(""); }}
              >
                <span className="text-muted-foreground text-sm">None</span>
              </CommandItem>
              {filtered.map((r) => (
                <CommandItem
                  key={r}
                  value={r}
                  onSelect={() => { onChange(r); setOpen(false); setQuery(""); }}
                >
                  <Check className={cn("mr-2 h-3.5 w-3.5", value === r ? "opacity-100" : "opacity-0")} />
                  {r}
                </CommandItem>
              ))}
              {showCreate && (
                <CommandItem
                  value={`__create__${query}`}
                  onSelect={() => { onChange(query.trim()); setOpen(false); setQuery(""); }}
                >
                  <Plus className="mr-2 h-3.5 w-3.5" />
                  Use &ldquo;{query.trim()}&rdquo;
                </CommandItem>
              )}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

interface QuestionFormState {
  question: string;
  category: string;
  difficulty: "EASY" | "MEDIUM" | "HARD";
  role: string;
  tags: string;
  sampleAnswer: string;
  keywords: string;
}

const EMPTY_FORM: QuestionFormState = {
  question: "",
  category: "GENERAL",
  difficulty: "MEDIUM",
  role: "",
  tags: "",
  sampleAnswer: "",
  keywords: "",
};

function QuestionFormFields({
  form,
  onChange,
  roles,
}: {
  form: QuestionFormState;
  onChange: (patch: Partial<QuestionFormState>) => void;
  roles: string[];
}) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <label className="text-sm font-medium">Question</label>
        <Textarea
          placeholder="e.g. Tell me about a time you handled a conflict with a colleague…"
          value={form.question}
          onChange={(e) => onChange({ question: e.target.value })}
          rows={4}
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">Category</label>
          <Select value={form.category} onValueChange={(v) => onChange({ category: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {CATEGORIES.map((c) => (
                <SelectItem key={c} value={c}>{c.replace("_", " ")}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">Difficulty</label>
          <Select value={form.difficulty} onValueChange={(v) => onChange({ difficulty: v as "EASY" | "MEDIUM" | "HARD" })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {DIFFICULTIES.map((d) => (
                <SelectItem key={d} value={d}>{d}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium">
          For Role <span className="text-muted-foreground font-normal">(optional)</span>
        </label>
        <RoleCombobox value={form.role} onChange={(v) => onChange({ role: v })} roles={roles} />
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium">
          Tags <span className="text-muted-foreground font-normal">(comma-separated)</span>
        </label>
        <Input
          placeholder="e.g. leadership, problem-solving"
          value={form.tags}
          onChange={(e) => onChange({ tags: e.target.value })}
        />
        <p className="text-[10px] text-muted-foreground">
          Letters, numbers, spaces, and hyphens only. Separate with commas.
        </p>
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium">
          Sample Answer <span className="text-muted-foreground font-normal">(optional)</span>
        </label>
        <Textarea
          placeholder="Describe what a strong answer looks like…"
          value={form.sampleAnswer}
          onChange={(e) => onChange({ sampleAnswer: e.target.value })}
          rows={4}
        />
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium">
          Required Keywords <span className="text-muted-foreground font-normal">(comma-separated)</span>
        </label>
        <Input
          placeholder="e.g. ownership, metrics, stakeholder"
          value={form.keywords}
          onChange={(e) => onChange({ keywords: e.target.value })}
        />
        <p className="text-[10px] text-muted-foreground">
          Letters, numbers, spaces, and hyphens only. Separate with commas.
        </p>
      </div>
    </div>
  );
}

function QuestionDetailSheet({
  question,
  open,
  onOpenChange,
  roles,
  canManage,
}: {
  question: InterviewQuestion | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  roles: string[];
  canManage: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<QuestionFormState>(EMPTY_FORM);
  const updateQuestion = useUpdateInterviewQuestion();

  useEffect(() => {
    if (question) {
      setForm({
        question: question.question,
        category: question.category,
        difficulty: question.difficulty as "EASY" | "MEDIUM" | "HARD",
        role: question.role ?? "",
        tags: (question.tags ?? []).join(", "),
        sampleAnswer: question.sampleAnswer ?? "",
        keywords: (question.keywords ?? []).join(", "),
      });
    }
    setEditing(false);
  }, [question]);

  const handleSave = useCallback(() => {
    if (!question) return;
    const parsed = parseInterviewQuestionText(form.question);
    if (!parsed.ok) {
      toast.error(parsed.message);
      return;
    }

    const tagsParsed = parseInterviewQuestionTagsField(form.tags, "Tags");
    if (!tagsParsed.ok) {
      toast.error(tagsParsed.message);
      return;
    }
    const keywordsParsed = parseInterviewQuestionTagsField(form.keywords, "Keywords");
    if (!keywordsParsed.ok) {
      toast.error(keywordsParsed.message);
      return;
    }

    updateQuestion.mutate(
      {
        id: question.id,
        question: parsed.value,
        category: form.category,
        difficulty: form.difficulty,
        role: form.role.trim() || null,
        tags: tagsParsed.value,
        sampleAnswer: form.sampleAnswer.trim() || null,
        keywords: keywordsParsed.value,
      },
      {
        onSuccess: () => {
          toast.success("Question updated");
          setEditing(false);
        },
        onError: (e) => {
          const msg = getErrorMessage(e);
          if (msg.toLowerCase().includes("not found")) {
            toast.error("This question no longer exists. It may have been deleted.");
            onOpenChange(false);
          } else {
            toast.error(msg);
          }
        },
      },
    );
  }, [question, form, updateQuestion, onOpenChange]);

  if (!question) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex flex-col p-0 gap-0 sm:max-w-lg">
        <SheetHeader className="shrink-0 px-4 pt-4 pb-3 border-b">
          <div className="flex items-center justify-between gap-2 pr-12 sm:pr-14">
            <SheetTitle className="text-base min-w-0 truncate pr-2">
              {editing ? "Edit Question" : "Question Detail"}
            </SheetTitle>
            {canManage && !editing && (
              <Button variant="ghost" size="sm" className="h-7 shrink-0 gap-1.5 text-xs" onClick={() => setEditing(true)}>
                <Pencil className="h-3 w-3" />Edit
              </Button>
            )}
          </div>
          <SheetDescription className="text-xs">
            {editing ? "Update this question and its evaluation hints." : "View question details and evaluation hints."}
          </SheetDescription>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto px-4 py-4">
          {editing ? (
            <QuestionFormFields
              form={form}
              onChange={(patch) => setForm((prev) => ({ ...prev, ...patch }))}
              roles={roles}
            />
          ) : (
            <div className="space-y-5">
              <div>
                <p className="text-xs text-muted-foreground mb-1 font-medium uppercase tracking-wide">Question</p>
                <p className="text-sm leading-relaxed">{question.question}</p>
              </div>
              <div className="flex gap-6">
                <div>
                  <p className="text-xs text-muted-foreground mb-1 font-medium uppercase tracking-wide">Category</p>
                  <Badge variant="outline" className="text-xs">
                    <BookOpen className="mr-1 h-3 w-3" />
                    {question.category.replace("_", " ")}
                  </Badge>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1 font-medium uppercase tracking-wide">Difficulty</p>
                  <Badge variant={DIFFICULTY_VARIANT[question.difficulty] ?? "secondary"} className="text-xs">
                    {question.difficulty}
                  </Badge>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1 font-medium uppercase tracking-wide">Role</p>
                  <p className="text-sm">{question.role || ""}</p>
                </div>
              </div>
              {(question.tags ?? []).length > 0 && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1.5 font-medium uppercase tracking-wide">Tags</p>
                  <div className="flex flex-wrap gap-1">
                    {(question.tags ?? []).map((tag) => (
                      <Badge key={tag} variant="secondary" className="text-xs">{tag}</Badge>
                    ))}
                  </div>
                </div>
              )}
              {question.sampleAnswer && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1 font-medium uppercase tracking-wide">Sample Answer</p>
                  <p className="text-sm leading-relaxed text-muted-foreground whitespace-pre-wrap">{question.sampleAnswer}</p>
                </div>
              )}
              {(question.keywords ?? []).length > 0 && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1.5 font-medium uppercase tracking-wide">Required Keywords</p>
                  <div className="flex flex-wrap gap-1">
                    {(question.keywords ?? []).map((kw) => (
                      <Badge key={kw} variant="outline" className="text-xs font-mono">{kw}</Badge>
                    ))}
                  </div>
                </div>
              )}
              {!question.sampleAnswer && (question.keywords ?? []).length === 0 && (
                <p className="text-xs text-muted-foreground italic">No sample answer or keywords defined yet.</p>
              )}
            </div>
          )}
        </div>
        {editing && (
          <SheetFooter className="shrink-0 px-4 py-3 border-t flex-row gap-2">
            <Button variant="outline" className="flex-1" onClick={() => setEditing(false)}>Cancel</Button>
            <Button className="flex-1" onClick={handleSave} disabled={updateQuestion.isPending}>
              {updateQuestion.isPending ? "Saving…" : "Save Changes"}
            </Button>
          </SheetFooter>
        )}
      </SheetContent>
    </Sheet>
  );
}

export default function QuestionBankPage() {
  const { data: session } = useSession();
  const canManage = isAdminOrOwner(session?.user?.role);

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("ALL");
  const [difficulty, setDifficulty] = useState("ALL");
  const [addSheetOpen, setAddSheetOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [deleteTarget, setDeleteTarget] = useState<"single" | "bulk" | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<number | null>(null);
  const [detailQuestion, setDetailQuestion] = useState<InterviewQuestion | null>(null);

  const [form, setForm] = useState<QuestionFormState>(EMPTY_FORM);

  const { page, pageSize, setPage, setPageSize, resetPage } = usePaginationParams({ defaultPageSize: 10 });

  const { status: sessionStatus } = useSession();
  const { data: allQuestions, isLoading, isError, error } = useInterviewQuestions();
  const listLoading = sessionStatus === "loading" || isLoading;
  const createQuestion = useCreateInterviewQuestion();
  const deleteQuestion = useDeleteInterviewQuestion();
  const bulkDelete = useBulkDeleteInterviewQuestions();

  const existingRoles = useMemo(
    () => [...new Set((allQuestions ?? []).map((q) => q.role).filter(Boolean) as string[])].sort(),
    [allQuestions],
  );

  const filteredQuestions = useMemo(() => {
    return (allQuestions ?? [])
      .slice()
      .sort((a, b) => b.id - a.id)
      .filter((q) => {
        if (category !== "ALL" && q.category !== category) return false;
        if (difficulty !== "ALL" && q.difficulty !== difficulty) return false;
        return matchesSearch(q, search);
      });
  }, [allQuestions, category, difficulty, search]);

  const totalPages = Math.max(1, Math.ceil(filteredQuestions.length / pageSize));
  const currentPage = Math.min(page, totalPages);

  const paginatedQuestions = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredQuestions.slice(start, start + pageSize);
  }, [filteredQuestions, currentPage, pageSize]);

  const filterKey = `${search}|${category}|${difficulty}`;
  const prevFilterKey = useRef(filterKey);
  useEffect(() => {
    if (prevFilterKey.current !== filterKey) {
      prevFilterKey.current = filterKey;
      resetPage();
    }
  }, [filterKey, resetPage]);

  const pageSelectedCount = useMemo(
    () => paginatedQuestions.filter((q) => selectedIds.has(q.id)).length,
    [paginatedQuestions, selectedIds],
  );

  const allPageSelected =
    paginatedQuestions.length > 0 && pageSelectedCount === paginatedQuestions.length;

  const filteredSelectedCount = useMemo(
    () => filteredQuestions.filter((q) => selectedIds.has(q.id)).length,
    [filteredQuestions, selectedIds],
  );

  const requireManagePermission = useCallback((): boolean => {
    if (canManage) return true;
    toast.error("Only Admin or HR can manage the question bank");
    return false;
  }, [canManage]);

  const toggleSelect = useCallback((id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleSelectAllOnPage = useCallback(() => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allPageSelected) {
        for (const q of paginatedQuestions) next.delete(q.id);
      } else {
        for (const q of paginatedQuestions) next.add(q.id);
      }
      return next;
    });
  }, [allPageSelected, paginatedQuestions]);

  const handlePageSizeChange = useCallback(
    (size: number) => setPageSize(size as PageSizeOption),
    [setPageSize],
  );

  const clearSelection = useCallback(() => setSelectedIds(new Set()), []);

  const requestSingleDelete = useCallback((questionId: number) => {
    if (!requireManagePermission()) return;
    setPendingDeleteId(questionId);
    setDeleteTarget("single");
  }, [requireManagePermission]);

  const requestBulkDelete = useCallback(() => {
    if (!requireManagePermission()) return;
    if (selectedIds.size === 0) return;
    setDeleteTarget("bulk");
  }, [requireManagePermission, selectedIds.size]);

  const handleConfirmDelete = useCallback(() => {
    if (deleteTarget === "single" && pendingDeleteId !== null) {
      deleteQuestion.mutate(pendingDeleteId, {
        onSuccess: () => {
          toast.success("Question deleted");
          setSelectedIds((prev) => {
            const next = new Set(prev);
            next.delete(pendingDeleteId);
            return next;
          });
          if (detailQuestion?.id === pendingDeleteId) setDetailQuestion(null);
          setDeleteTarget(null);
          setPendingDeleteId(null);
        },
        onError: (e) => toast.error(getErrorMessage(e)),
      });
      return;
    }

    if (deleteTarget === "bulk") {
      const ids = Array.from(selectedIds);
      bulkDelete.mutate(ids, {
        onSuccess: () => {
          toast.success(`${ids.length} question${ids.length === 1 ? "" : "s"} deleted`);
          clearSelection();
          setDeleteTarget(null);
        },
        onError: (e) => toast.error(getErrorMessage(e)),
      });
    }
  }, [deleteTarget, pendingDeleteId, deleteQuestion, bulkDelete, selectedIds, clearSelection, detailQuestion]);

  const handleCreate = useCallback(() => {
    if (!requireManagePermission()) return;
    const parsed = parseInterviewQuestionText(form.question);
    if (!parsed.ok) {
      toast.error(parsed.message);
      return;
    }
    const questionText = parsed.value;

    const isDuplicate = (allQuestions ?? []).some(
      (q) => q.question.trim().toLowerCase() === questionText.toLowerCase(),
    );
    if (isDuplicate) {
      toast.error("This question already exists in the bank");
      return;
    }

    const tagsParsed = parseInterviewQuestionTagsField(form.tags, "Tags");
    if (!tagsParsed.ok) {
      toast.error(tagsParsed.message);
      return;
    }
    const keywordsParsed = parseInterviewQuestionTagsField(form.keywords, "Keywords");
    if (!keywordsParsed.ok) {
      toast.error(keywordsParsed.message);
      return;
    }

    createQuestion.mutate(
      {
        question: questionText,
        category: form.category,
        difficulty: form.difficulty,
        role: form.role.trim() || undefined,
        tags: tagsParsed.value,
        sampleAnswer: form.sampleAnswer.trim() || null,
        keywords: keywordsParsed.value,
      },
      {
        onSuccess: () => {
          toast.success("Question added to bank");
          setAddSheetOpen(false);
          setForm(EMPTY_FORM);
        },
        onError: (e) => toast.error(getErrorMessage(e)),
      },
    );
  }, [form, allQuestions, createQuestion, requireManagePermission]);

  const deleteDialogOpen = deleteTarget !== null;
  const deletePending = deleteTarget === "bulk" ? bulkDelete.isPending : deleteQuestion.isPending;
  const deleteDescription =
    deleteTarget === "bulk"
      ? `Delete ${selectedIds.size} selected question${selectedIds.size === 1 ? "" : "s"}? This cannot be undone.`
      : "Delete this question from the bank? This cannot be undone.";

  return (
    <PageWrapper
      title="Interview Question Bank"
      subtitle="Curated questions per role and round for interviewers"
      badge={
        allQuestions?.length
          ? `${filteredQuestions.length} of ${allQuestions.length} questions`
          : undefined
      }
      actions={
        <div className="flex items-center gap-2">
          <PageBackButton fallback="/hr/recruitment" />
          {canManage && (
            <Sheet open={addSheetOpen} onOpenChange={setAddSheetOpen}>
              <SheetTrigger asChild>
                <Button size="sm"><Plus className="mr-2 h-4 w-4" />Add Question</Button>
              </SheetTrigger>
              <SheetContent className="flex flex-col p-0 gap-0 sm:max-w-lg">
                <SheetHeader className="shrink-0 px-4 pt-4 pb-3 border-b">
                  <SheetTitle className="text-base">Add Question</SheetTitle>
                  <SheetDescription className="text-xs">Add a question to the interview bank.</SheetDescription>
                </SheetHeader>
                <div className="flex-1 overflow-y-auto px-4 py-4">
                  <QuestionFormFields
                    form={form}
                    onChange={(patch) => setForm((prev) => ({ ...prev, ...patch }))}
                    roles={existingRoles}
                  />
                </div>
                <SheetFooter className="shrink-0 px-4 py-3 border-t flex-row gap-2">
                  <Button variant="outline" className="flex-1" onClick={() => setAddSheetOpen(false)}>Cancel</Button>
                  <Button className="flex-1" onClick={handleCreate} disabled={createQuestion.isPending}>
                    {createQuestion.isPending ? "Adding…" : "Add Question"}
                  </Button>
                </SheetFooter>
              </SheetContent>
            </Sheet>
          )}
        </div>
      }
      filters={
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              className="pl-8 h-8 w-[200px] text-sm"
              placeholder="Search questions…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="w-[150px] h-8 text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Categories</SelectItem>
              {CATEGORIES.map((c) => (
                <SelectItem key={c} value={c}>{c.replace("_", " ")}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={difficulty} onValueChange={setDifficulty}>
            <SelectTrigger className="w-[120px] h-8 text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Levels</SelectItem>
              {DIFFICULTIES.map((d) => (
                <SelectItem key={d} value={d}>{d}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      }
    >
      {canManage && selectedIds.size > 0 && (
        <div className="flex items-center gap-3 rounded-lg border border-primary/30 bg-primary/5 px-4 py-2.5 mb-4">
          <span className="text-sm font-medium text-primary">
            {selectedIds.size} selected
            {filteredSelectedCount !== selectedIds.size && (
              <span className="text-muted-foreground font-normal">
                {" "}({filteredSelectedCount} in current filters)
              </span>
            )}
          </span>
          <div className="flex items-center gap-2 ml-auto">
            <Button
              size="sm"
              variant="destructive"
              className="h-8 text-xs"
              onClick={requestBulkDelete}
              disabled={bulkDelete.isPending}
            >
              <Trash2 className="mr-1.5 h-3.5 w-3.5" />
              Delete selected
            </Button>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={clearSelection}>
              <X className="h-3.5 w-3.5" />
              <span className="sr-only">Clear selection</span>
            </Button>
          </div>
        </div>
      )}

      <Card>
        <CardContent className="p-0">
          {listLoading ? (
            <div className="p-4 space-y-3">
              {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : isError ? (
            <EmptyState
              illustration={<EmptyDocumentsIllustration className="h-32 w-32 opacity-95" />}
              title="Failed to load questions"
              description={getErrorMessage(error)}
            />
          ) : !allQuestions?.length ? (
            <EmptyState
              illustration={<EmptyDocumentsIllustration className="h-32 w-32 opacity-95" />}
              title="No questions yet"
              description="Add questions to build your interview bank."
              {...(canManage ? { action: { label: "Add question", onClick: () => setAddSheetOpen(true) } } : {})}
            />
          ) : !filteredQuestions.length ? (
            <EmptyState
              illustration={<EmptyDocumentsIllustration className="h-32 w-32 opacity-95" />}
              title="No matching questions"
              description="Try a different search or filter."
            />
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    {canManage && (
                      <TableHead className="w-10">
                        <Checkbox
                          checked={allPageSelected}
                          onCheckedChange={toggleSelectAllOnPage}
                          aria-label="Select all questions on this page"
                        />
                      </TableHead>
                    )}
                    <TableHead>Question</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Difficulty</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Tags</TableHead>
                    {canManage && <TableHead className="w-[50px]" />}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedQuestions.map((q) => (
                    <TableRow
                      key={q.id}
                      className={cn(
                        "cursor-pointer",
                        selectedIds.has(q.id) ? "bg-primary/5" : undefined,
                      )}
                      onClick={() => setDetailQuestion(q)}
                    >
                      {canManage && (
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <Checkbox
                            checked={selectedIds.has(q.id)}
                            onCheckedChange={() => toggleSelect(q.id)}
                            aria-label={`Select question ${q.id}`}
                          />
                        </TableCell>
                      )}
                      <TableCell className="max-w-[400px]">
                        <p className="text-sm line-clamp-2">{q.question}</p>
                        {(q.keywords ?? []).length > 0 && (
                          <p className="text-[11px] text-muted-foreground mt-0.5">
                            Keywords: {(q.keywords ?? []).slice(0, 3).join(", ")}{(q.keywords ?? []).length > 3 ? "…" : ""}
                          </p>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          <BookOpen className="mr-1 h-3 w-3" />
                          {q.category.replace("_", " ")}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={DIFFICULTY_VARIANT[q.difficulty] ?? "secondary"} className="text-xs">
                          {q.difficulty}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{q.role ?? ""}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {(q.tags ?? []).slice(0, 3).map((tag) => (
                            <Badge key={tag} variant="secondary" className="text-[10px] px-1 py-0">{tag}</Badge>
                          ))}
                          {(q.tags ?? []).length > 3 && (
                            <Badge variant="secondary" className="text-[10px] px-1 py-0">+{(q.tags ?? []).length - 3}</Badge>
                          )}
                        </div>
                      </TableCell>
                      {canManage && (
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => setDetailQuestion(q)}>
                                <Pencil className="mr-2 h-4 w-4" />View / Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={() => requestSingleDelete(q.id)}
                              >
                                <Trash2 className="mr-2 h-4 w-4" />Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <div className="border-t px-4">
                <DataTablePagination
                  page={currentPage}
                  totalPages={totalPages}
                  total={filteredQuestions.length}
                  limit={pageSize}
                  onPageChange={setPage}
                  onLimitChange={handlePageSizeChange}
                />
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <QuestionDetailSheet
        question={detailQuestion}
        open={detailQuestion !== null}
        onOpenChange={(v) => { if (!v) setDetailQuestion(null); }}
        roles={existingRoles}
        canManage={canManage}
      />

      <ConfirmActionDialog
        open={deleteDialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteTarget(null);
            setPendingDeleteId(null);
          }
        }}
        title={deleteTarget === "bulk" ? "Delete selected questions" : "Delete question"}
        description={deleteDescription}
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={handleConfirmDelete}
        isPending={deletePending}
      />
    </PageWrapper>
  );
}
