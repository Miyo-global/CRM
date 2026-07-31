"use client";

import { useState, useCallback } from "react";
import {
  FlaskConical,
  Plus,
  Play,
  CheckCircle2,
  BarChart2,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
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
import { EmptyState } from "@/components/ui/empty-state";
import { EmptyTargetIllustration } from "@/components/illustrations";
import { HrSheet } from "@/features/hr/hr-sheet";
import {
  useAbTests,
  useCreateAbTest,
  useUpdateAbTest,
  useDeleteAbTest,
} from "@/lib/api/hooks/marketing";
import type { AbTest } from "@/lib/api/hooks/marketing";
import { getErrorMessage } from "@/lib/get-error-message";
import { toast } from "sonner";
import { TestCard } from "@/features/marketing/ab-testing/test-card";
import { AbTestFormFields } from "@/features/marketing/ab-testing/ab-test-form";
import { DeclareWinnerDialog } from "@/features/marketing/ab-testing/declare-winner-dialog";
import {
  EMPTY_FORM,
  calcOpenRate,
  type AbTestForm,
} from "@/features/marketing/ab-testing/helpers";

export default function AbTestingPage() {
  const { data, isLoading } = useAbTests();
  const createTest = useCreateAbTest();
  const updateTest = useUpdateAbTest();
  const deleteTest = useDeleteAbTest();

  const tests: AbTest[] = data?.tests ?? [];

  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingTest, setEditingTest] = useState<AbTest | null>(null);
  const [form, setForm] = useState<AbTestForm>(EMPTY_FORM);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [winnerTestId, setWinnerTestId] = useState<number | null>(null);

  const totalTests = tests.length;
  const runningTests = tests.filter((t) => t.status === "running").length;
  const completedTests = tests.filter((t) => t.status === "completed").length;
  const avgOpenRate = (() => {
    const withData = tests.filter((t) => t.audienceSize > 0);
    if (withData.length === 0) return 0;
    const total = withData.reduce((sum, t) => {
      const rateA = calcOpenRate(t.variantAOpens, t.variantASent);
      const rateB = calcOpenRate(t.variantBOpens, t.variantBSent);
      return sum + Math.max(rateA, rateB);
    }, 0);
    return Math.round((total / withData.length) * 10) / 10;
  })();

  const handleFormChange = useCallback((updated: Partial<AbTestForm>) => {
    setForm((f) => ({ ...f, ...updated }));
  }, []);

  const openCreateSheet = useCallback(() => {
    setEditingTest(null);
    setForm(EMPTY_FORM);
    setSheetOpen(true);
  }, []);

  const openEditSheet = useCallback((test: AbTest) => {
    setEditingTest(test);
    setForm({
      name: test.name,
      description: test.description ?? "",
      variantASubject: test.variantASubject,
      variantBSubject: test.variantBSubject,
      variantABody: test.variantABody ?? "",
      variantBBody: test.variantBBody ?? "",
      splitPercent: test.splitPercent,
      audienceSize: test.audienceSize,
    });
    setSheetOpen(true);
  }, []);

  const handleSubmit = useCallback(() => {
    if (!form.name.trim()) {
      toast.error("Name is required");
      return;
    }
    if (!form.variantASubject.trim()) {
      toast.error("Variant A subject is required");
      return;
    }
    if (!form.variantBSubject.trim()) {
      toast.error("Variant B subject is required");
      return;
    }

    const payload = {
      name: form.name.trim(),
      description: form.description.trim() || undefined,
      variantASubject: form.variantASubject.trim(),
      variantBSubject: form.variantBSubject.trim(),
      variantABody: form.variantABody.trim() || undefined,
      variantBBody: form.variantBBody.trim() || undefined,
      splitPercent: form.splitPercent,
      audienceSize: form.audienceSize,
    };

    if (editingTest) {
      updateTest.mutate(
        { id: editingTest.id, ...payload },
        {
          onSuccess: () => {
            toast.success("A/B test updated");
            setSheetOpen(false);
          },
          onError: (e) => toast.error(getErrorMessage(e)),
        },
      );
    } else {
      createTest.mutate(payload, {
        onSuccess: () => {
          toast.success("A/B test created");
          setSheetOpen(false);
        },
        onError: (e) => toast.error(getErrorMessage(e)),
      });
    }
  }, [form, editingTest, createTest, updateTest]);

  const handleStart = useCallback(
    (test: AbTest) => {
      updateTest.mutate(
        { id: test.id, status: "running" },
        {
          onSuccess: () => toast.success("Test started"),
          onError: (e) => toast.error(getErrorMessage(e)),
        },
      );
    },
    [updateTest],
  );

  const handleStop = useCallback(
    (test: AbTest) => {
      updateTest.mutate(
        { id: test.id, status: "paused" },
        {
          onSuccess: () => toast.success("Test paused"),
          onError: (e) => toast.error(getErrorMessage(e)),
        },
      );
    },
    [updateTest],
  );

  const handleDeclareWinner = useCallback((test: AbTest) => {
    setWinnerTestId(test.id);
  }, []);

  const confirmWinner = useCallback(
    (variant: "A" | "B") => {
      if (!winnerTestId) return;
      updateTest.mutate(
        { id: winnerTestId, winnerVariant: variant, status: "completed" },
        {
          onSuccess: () => {
            toast.success(`Variant ${variant} declared winner`);
            setWinnerTestId(null);
          },
          onError: (e) => {
            toast.error(getErrorMessage(e));
            setWinnerTestId(null);
          },
        },
      );
    },
    [winnerTestId, updateTest],
  );

  const handleDelete = useCallback(() => {
    if (!deleteId) return;
    deleteTest.mutate(deleteId, {
      onSuccess: () => {
        toast.success("A/B test deleted");
        setDeleteId(null);
      },
      onError: (e) => {
        toast.error(getErrorMessage(e));
        setDeleteId(null);
      },
    });
  }, [deleteId, deleteTest]);

  const handleDeleteRequest = useCallback((id: number) => setDeleteId(id), []);
  const handleWinnerDialogChange = useCallback((open: boolean) => {
    if (!open) setWinnerTestId(null);
  }, []);
  const handleDeleteDialogChange = useCallback((open: boolean) => {
    if (!open) setDeleteId(null);
  }, []);

  const isPending = createTest.isPending || updateTest.isPending;

  return (
    <PageWrapper
      title="A/B Testing"
      subtitle="Compare email subject lines and content variants to find what resonates"
      actions={
        <Button size="sm" className="gap-1.5" onClick={openCreateSheet}>
          <Plus className="h-4 w-4" />
          New A/B Test
        </Button>
      }
    >
      <div className="space-y-5">
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Total Tests"
            value={totalTests}
            icon={FlaskConical}
            color="gold"
            index={0}
          />
          <StatCard
            label="Running Tests"
            value={runningTests}
            icon={Play}
            color="green"
            index={1}
          />
          <StatCard
            label="Completed Tests"
            value={completedTests}
            icon={CheckCircle2}
            color="blue"
            index={2}
          />
          <StatCard
            label="Avg Open Rate"
            value={`${avgOpenRate}%`}
            icon={BarChart2}
            color="purple"
            index={3}
          />
        </div>

        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-2">
            {Array.from({ length: 2 }).map((_, i) => (
              <div
                key={i}
                className="rounded-xl border border-border bg-card p-4 h-48 animate-pulse"
              />
            ))}
          </div>
        ) : tests.length === 0 ? (
          <EmptyState
            illustration={<EmptyTargetIllustration className="h-40 w-40" />}
            title="No A/B Tests Yet"
            description="Create your first A/B test to start comparing email variants and optimizing open rates."
            action={{ label: "New A/B Test", onClick: openCreateSheet }}
          />
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {tests.map((test) => (
              <TestCard
                key={test.id}
                test={test}
                onEdit={openEditSheet}
                onStart={handleStart}
                onStop={handleStop}
                onDeclareWinner={handleDeclareWinner}
                onDelete={handleDeleteRequest}
              />
            ))}
          </div>
        )}
      </div>

      <HrSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        title={editingTest ? "Edit A/B Test" : "New A/B Test"}
        description={
          editingTest
            ? "Update test details and variants."
            : "Set up two variants to compare and find the best performer."
        }
        onSubmit={handleSubmit}
        submitLabel={editingTest ? "Save Changes" : "Create Test"}
        isPending={isPending}
      >
        <AbTestFormFields form={form} onChange={handleFormChange} />
      </HrSheet>

      <AlertDialog
        open={deleteId !== null}
        onOpenChange={handleDeleteDialogChange}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete A/B Test?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the test and all its data. This
              action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDelete}
              disabled={deleteTest.isPending}
            >
              {deleteTest.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <DeclareWinnerDialog
        open={winnerTestId !== null}
        isPending={updateTest.isPending}
        onOpenChange={handleWinnerDialogChange}
        onConfirm={confirmWinner}
      />
    </PageWrapper>
  );
}
