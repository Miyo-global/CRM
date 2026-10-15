"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Form, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCreateProject } from "@/lib/api/hooks/projects";
import { useHrEmployees } from "@/lib/api/hooks/hr";
import { getErrorMessage } from "@/lib/get-error-message";
import type { CreateProjectInput, Project, ProjectPriority } from "@/types/projects";
import { projectCreateSchema, STEP_FIELDS, type ProjectCreateValues } from "./project-create-schema";
import { BasicsStep } from "./basics-step";
import { SetupStep } from "./setup-step";
import { TeamPicker } from "./team-picker";
import { useKeyAvailability } from "./use-key-availability";

const STEPS = ["Basics", "Team", "Setup", "Review"];
const DEFAULTS: ProjectCreateValues = {
  name: "",
  key: "",
  description: "",
  priority: "NONE",
  memberIds: [],
  templateId: "none",
  modules: { sprints: true, epics: true, timeTracking: true, wiki: true },
};

function toInput(v: ProjectCreateValues): CreateProjectInput {
  return {
    name: v.name.trim(),
    key: v.key,
    description: v.description || undefined,
    priority: v.priority === "NONE" ? undefined : (v.priority as ProjectPriority),
    startDate: v.startDate || undefined,
    endDate: v.endDate || undefined,
    managerId: v.managerId || undefined,
    memberIds: v.memberIds,
    templateId: v.templateId === "none" ? undefined : Number(v.templateId),
    modules: v.modules,
  };
}

export function ProjectCreateWizard({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const create = useCreateProject();
  const { data: employeesData } = useHrEmployees();
  const people = Array.isArray(employeesData) ? employeesData : employeesData?.data ?? [];
  const form = useForm<ProjectCreateValues>({ resolver: zodResolver(projectCreateSchema), defaultValues: DEFAULTS, mode: "onTouched" });
  const keyCheck = useKeyAvailability(form.watch("key"));

  const close = (next: boolean) => {
    onOpenChange(next);
    if (!next) {
      form.reset(DEFAULTS);
      setStep(0);
    }
  };

  const next = async () => {
    const valid = await form.trigger(STEP_FIELDS[step]);
    if (!valid) return;
    if (step === 0 && keyCheck.data && !keyCheck.data.available) {
      form.setError("key", { message: "That key is already in use" });
      return;
    }
    setStep((s) => s + 1);
  };

  const submit = form.handleSubmit((values) => {
    create.mutate(toInput(values), {
      onSuccess: (project) => {
        toast.success(`Created ${values.name}`);
        close(false);
        router.push(`/projects/${(project as Project).id}`);
      },
      onError: (error) => {
        toast.error(getErrorMessage(error));
        if (getErrorMessage(error).toLowerCase().includes("key")) setStep(0);
      },
    });
  });

  const values = form.watch();
  const managerName = people.find((p) => p.id === values.managerId)?.name ?? "You decide later";

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="size-4" aria-hidden="true" />
          New project
        </Button>
      </DialogTrigger>
      <DialogContent size="md" className="max-h-[90dvh] grid-rows-[auto_minmax(0,1fr)] max-sm:h-dvh max-sm:max-h-dvh max-sm:w-full max-sm:max-w-full max-sm:rounded-none">
        <DialogHeader className="text-left">
          <DialogTitle>New project</DialogTitle>
          <DialogDescription>
            Step {step + 1} of {STEPS.length}: {STEPS[step]}
          </DialogDescription>
          <ol className="mt-2 grid grid-cols-4 gap-1" aria-label="Progress">
            {STEPS.map((label, i) => (
              <li key={label} aria-current={i === step ? "step" : undefined} className={`h-1 rounded-full ${i <= step ? "bg-primary" : "bg-muted"}`}>
                <span className="sr-only">{label}</span>
              </li>
            ))}
          </ol>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={(e) => { e.preventDefault(); if (step === STEPS.length - 1) void submit(); else void next(); }} className="flex min-h-0 flex-col">
            <div className="-mx-6 min-h-0 flex-1 overflow-y-auto px-6 pb-1">
              {step === 0 && <BasicsStep form={form} />}
              {step === 1 && (
                <div className="space-y-4">
                  <FormField
                    control={form.control}
                    name="managerId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Project manager</FormLabel>
                        <Select value={field.value ?? ""} onValueChange={field.onChange}>
                          <SelectTrigger aria-label="Project manager">
                            <SelectValue placeholder="Choose a manager" />
                          </SelectTrigger>
                          <SelectContent>
                            {people.map((p) => (
                              <SelectItem key={p.id} value={p.id}>{p.name || p.email}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="memberIds"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Members</FormLabel>
                        <TeamPicker people={people} value={field.value} onChange={field.onChange} />
                      </FormItem>
                    )}
                  />
                </div>
              )}
              {step === 2 && <SetupStep form={form} />}
              {step === 3 && (
                <dl className="grid grid-cols-[8rem_1fr] gap-x-4 gap-y-3 text-sm">
                  <dt className="text-muted-foreground">Name</dt>
                  <dd className="font-medium">{values.name}</dd>
                  <dt className="text-muted-foreground">Key</dt>
                  <dd className="font-mono">{values.key}</dd>
                  <dt className="text-muted-foreground">Manager</dt>
                  <dd>{managerName}</dd>
                  <dt className="text-muted-foreground">Members</dt>
                  <dd>{values.memberIds.length === 0 ? "None yet" : `${values.memberIds.length} people`}</dd>
                  <dt className="text-muted-foreground">Dates</dt>
                  <dd>{values.startDate || "No start"} to {values.endDate || "no due date"}</dd>
                  <dt className="text-muted-foreground">Features</dt>
                  <dd>
                    {Object.entries(values.modules).filter(([, on]) => on).map(([k]) => k.replace("timeTracking", "time tracking")).join(", ") || "None"}
                  </dd>
                </dl>
              )}
            </div>

            <DialogFooter className="mt-6 shrink-0">
              {step > 0 ? (
                <Button type="button" variant="outline" onClick={() => setStep((s) => s - 1)} disabled={create.isPending}>
                  Back
                </Button>
              ) : (
                <Button type="button" variant="outline" onClick={() => close(false)}>
                  Cancel
                </Button>
              )}
              <Button type="submit" loading={create.isPending} disabled={create.isPending}>
                {step === STEPS.length - 1 ? "Create project" : "Continue"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
