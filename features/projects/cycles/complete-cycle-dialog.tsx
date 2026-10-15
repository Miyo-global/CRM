"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCompleteCycle, type CycleDetail } from "@/lib/api/hooks/projects/cycle-detail";
import { getErrorMessage } from "@/lib/get-error-message";
import { completeCycleSchema, type CompleteCycleValues } from "./complete-cycle-schema";

const BACKLOG = "backlog";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: number;
  detail: CycleDetail;
};

export function CompleteCycleDialog({ open, onOpenChange, projectId, detail }: Props) {
  const complete = useCompleteCycle(projectId, detail.cycle.id);
  const unfinished = detail.stats.total - detail.stats.done;
  const firstTarget = detail.carryTargets[0]?.id;
  const form = useForm<CompleteCycleValues>({
    resolver: zodResolver(completeCycleSchema),
    defaultValues: { target: firstTarget ? String(firstTarget) : BACKLOG },
  });

  const submit = form.handleSubmit(({ target }) => {
    complete.mutate(
      { carryForwardCycleId: target === BACKLOG ? null : Number(target) },
      {
        onSuccess: (res) => {
          toast.success(res.carried > 0 ? `Completed ${detail.cycle.name} and moved ${res.carried} tickets` : `Completed ${detail.cycle.name}`);
          onOpenChange(false);
        },
        onError: (error) => form.setError("target", { message: getErrorMessage(error) }),
      },
    );
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="sm">
        <DialogHeader>
          <DialogTitle>Complete {detail.cycle.name}?</DialogTitle>
          <DialogDescription>
            {unfinished === 0
              ? "Every ticket in this cycle is done."
              : `${unfinished} ${unfinished === 1 ? "ticket is" : "tickets are"} not done yet. Choose where they go.`}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={submit} className="space-y-4">
            {unfinished > 0 && (
              <FormField
                control={form.control}
                name="target"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Move unfinished tickets to</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {detail.carryTargets.map((c) => (
                          <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                        ))}
                        <SelectItem value={BACKLOG}>No cycle (backlog)</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={complete.isPending}>
                Cancel
              </Button>
              <Button type="submit" loading={complete.isPending} disabled={complete.isPending}>
                Complete cycle
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
