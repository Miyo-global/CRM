"use client";

import { useState, useCallback, memo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { toast } from "sonner";
import { useCreateProject } from "@/lib/api/hooks/projects";
import { Plus, Check, User, Search } from "lucide-react";
import { useHrEmployees } from "@/lib/api/hooks/hr";
import { cn } from "@/lib/utils";

const formSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  key: z.string().min(2, "Key must be at least 2 characters").regex(/^[A-Z]+$/, "Key must be uppercase letters only"),
  description: z.string().optional(),
  memberIds: z.array(z.string()).optional(),
  modules: z.object({
      sprints: z.boolean(),
      epics: z.boolean(),
      timeTracking: z.boolean(),
      wiki: z.boolean(),
  }),
});

interface NewProjectDialogProps {
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function NewProjectDialog({ trigger, open: controlledOpen, onOpenChange }: NewProjectDialogProps = {}) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen ?? internalOpen;
  const setOpen = onOpenChange ?? setInternalOpen;
  const [memberSearch, setMemberSearch] = useState("");
  const { data: employeesData } = useHrEmployees();
  const createProjectMutation = useCreateProject();
  const employees = Array.isArray(employeesData)
    ? employeesData
    : employeesData?.data ?? [];

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      key: "",
      description: "",
      memberIds: [],
      modules: {
          sprints: true,
          epics: true,
          timeTracking: true,
          wiki: true,
      }
    },
  });

  function onSubmit(values: z.infer<typeof formSchema>) {
    const capitalizedValues = {
      ...values,
      name: values.name.replace(/^\w/, (c) => c.toUpperCase()),
    };
    toast.promise(
      createProjectMutation.mutateAsync(capitalizedValues),
      {
        loading: "Creating project...",
        success: () => {
          setOpen(false);
          form.reset();
          return "Project created successfully";
        },
        error: "Failed to create project",
      }
    );
  }
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const name = e.target.value;
      form.setValue("name", name);
      if (name) {
          const letters = name.replace(/[^a-zA-Z]/g, "").substring(0, 4).toUpperCase();
          const key = letters.length >= 2 ? letters : (letters + "PR").substring(0, 2);
          form.setValue("key", key, { shouldValidate: true });
      }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button>
            <Plus className="size-4" aria-hidden="true" />
            New Project
          </Button>
        )}
      </DialogTrigger>
      <DialogContent size="md" className="max-h-[90dvh] grid-rows-[auto_minmax(0,1fr)]">
        <DialogHeader className="text-left">
          <DialogTitle>Create Project</DialogTitle>
          <DialogDescription>
            Launch a new initiative and assemble your team.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex min-h-0 flex-col">
            <div className="-mx-6 min-h-0 flex-1 overflow-y-auto px-6 pb-1">
            <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                        <FormItem className="sm:col-span-2">
                            <FormLabel className="text-sm font-medium">Project Name</FormLabel>
                            <FormControl>
                                <Input
                                    placeholder="e.g. Website Redesign"
                                    {...field}
                                    onChange={handleNameChange}
                                />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <FormField
                    control={form.control}
                    name="key"
                    render={({ field }) => (
                        <FormItem className="hidden">
                            <FormControl>
                                <Input {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                        <FormItem className="sm:col-span-2">
                            <FormLabel className="text-sm font-medium">Description <span className="text-muted-foreground font-normal ml-1">(Optional)</span></FormLabel>
                            <FormControl>
                                <Textarea
                                    placeholder="Briefly describe the project goals..."
                                    className="min-h-24 resize-none"
                                    {...field}
                                />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <FormField
                    control={form.control}
                    name="memberIds"
                    render={({ field }) => (
                        <FormItem className="sm:col-span-2">
                            <FormLabel className="text-sm font-medium">Team Customization</FormLabel>
                            <FormControl>
                                <Popover onOpenChange={(open) => { if (!open) setMemberSearch(""); }}>
                                    <PopoverTrigger asChild>
                                        <Button variant="outline" className="w-full justify-between px-3 font-normal text-muted-foreground hover:text-foreground">
                                            {field.value?.length && field.value.length > 0
                                                ? <span className="text-foreground font-medium">{field.value.length} members added</span>
                                                : <span>Assign team members...</span>}
                                            <User className="h-4 w-4 opacity-50" />
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent
                                        className="w-[450px] max-w-[calc(100vw-2rem)] p-0 max-h-[70vh] overflow-hidden flex flex-col"
                                        align="start"
                                        onOpenAutoFocus={(e) => e.preventDefault()}
                                    >
                                        <div className="shrink-0 space-y-2 border-b border-border bg-surface-sunken/60 p-3">
                                            <h4 className="font-medium text-sm">Select Team Members</h4>
                                            <div className="relative">
                                                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                                <Input
                                                    placeholder="Search by name or email..."
                                                    value={memberSearch}
                                                    onChange={(e) => setMemberSearch(e.target.value)}
                                                    onKeyDown={(e) => e.stopPropagation()}
                                                    autoFocus
                                                    className="bg-background pl-8"
                                                />
                                            </div>
                                        </div>
                                        <div
                                            className="p-2 space-y-1 flex-1 overflow-y-auto overscroll-contain"
                                            onWheelCapture={(e) => e.stopPropagation()}
                                        >
                                            {(employees ?? [])
                                                .filter((emp) => {
                                                    if (!memberSearch.trim()) return true;
                                                    const q = memberSearch.trim().toLowerCase();
                                                    const name = (emp.name ?? "").toLowerCase();
                                                    const email = (emp.email ?? "").toLowerCase();
                                                    return name.includes(q) || email.includes(q);
                                                })
                                                .map((emp) => {
                                                const isSelected = field.value?.includes(emp.id);
                                                return (
                                                    <div key={emp.id}
                                                         onClick={() => {
                                                             const current = field.value || [];
                                                             const newData = isSelected
                                                                 ? current.filter(id => id !== emp.id)
                                                                 : [...current, emp.id];
                                                             field.onChange(newData);
                                                         }}
                                                         className={cn(
                                                             "flex items-center space-x-3 p-2 rounded-md cursor-pointer transition-colors",
                                                             isSelected ? "bg-brand-soft" : "hover:bg-muted"
                                                         )}
                                                    >
                                                        <Checkbox
                                                            checked={isSelected}
                                                            className="pointer-events-none"
                                                        />
                                                        <div className="flex-1 flex items-center justify-between">
                                                            <div className="flex items-center space-x-3">
                                                                <div className="flex size-8 items-center justify-center rounded-full bg-brand-soft text-xs font-semibold text-brand-soft-foreground">
                                                                    {emp.name?.charAt(0) || <User className="h-4 w-4" />}
                                                                </div>
                                                                <div className="flex flex-col">
                                                                    <span className={cn("text-sm font-medium", isSelected && "text-brand-text")}>{emp.name}</span>
                                                                    <span className="text-xs text-muted-foreground">{emp.email}</span>
                                                                </div>
                                                            </div>
                                                            {isSelected && <Check className="size-4 text-brand-text" aria-hidden="true" />}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                            {!employees?.length && <div className="text-sm text-center py-6 text-muted-foreground">No employees available</div>}
                                            {employees?.length && memberSearch.trim() && (employees ?? []).filter((emp) => {
                                                const q = memberSearch.trim().toLowerCase();
                                                const name = (emp.name ?? "").toLowerCase();
                                                const email = (emp.email ?? "").toLowerCase();
                                                return name.includes(q) || email.includes(q);
                                            }).length === 0 && (
                                                <div className="text-sm text-center py-6 text-muted-foreground">No members match your search</div>
                                            )}
                                        </div>
                                    </PopoverContent>
                                </Popover>
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <div className="pt-2 sm:col-span-2">
                    <FormLabel className="text-sm font-medium text-foreground mb-3 block">Project Modules</FormLabel>
                    <div className="grid gap-3 sm:grid-cols-2">
                        <FormField
                            control={form.control}
                            name="modules.sprints"
                            render={({ field }) => (
                                <FormItem className="flex flex-row items-center justify-between rounded-lg border border-border bg-card p-3 transition-colors hover:bg-muted/50">
                                    <div className="space-y-0.5">
                                        <FormLabel className="text-sm font-medium cursor-pointer">Sprints</FormLabel>
                                        <div className="text-2xs text-muted-foreground">Agile cycles</div>
                                    </div>
                                    <FormControl>
                                        <Checkbox
                                            checked={field.value}
                                            onCheckedChange={field.onChange}
                                        />
                                    </FormControl>
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="modules.epics"
                            render={({ field }) => (
                                <FormItem className="flex flex-row items-center justify-between rounded-lg border border-border bg-card p-3 transition-colors hover:bg-muted/50">
                                    <div className="space-y-0.5">
                                        <FormLabel className="text-sm font-medium cursor-pointer">Epics</FormLabel>
                                        <div className="text-2xs text-muted-foreground">Large initiatives</div>
                                    </div>
                                    <FormControl>
                                        <Checkbox
                                            checked={field.value}
                                            onCheckedChange={field.onChange}
                                        />
                                    </FormControl>
                                </FormItem>
                            )}
                        />
                         <FormField
                            control={form.control}
                            name="modules.timeTracking"
                            render={({ field }) => (
                                <FormItem className="flex flex-row items-center justify-between rounded-lg border border-border bg-card p-3 transition-colors hover:bg-muted/50">
                                    <div className="space-y-0.5">
                                        <FormLabel className="text-sm font-medium cursor-pointer">Time Tracking</FormLabel>
                                        <div className="text-2xs text-muted-foreground">Log work hours</div>
                                    </div>
                                    <FormControl>
                                        <Checkbox
                                            checked={field.value}
                                            onCheckedChange={field.onChange}
                                        />
                                    </FormControl>
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="modules.wiki"
                            render={({ field }) => (
                                <FormItem className="flex flex-row items-center justify-between rounded-lg border border-border bg-card p-3 transition-colors hover:bg-muted/50">
                                    <div className="space-y-0.5">
                                        <FormLabel className="text-sm font-medium cursor-pointer">Wiki</FormLabel>
                                        <div className="text-2xs text-muted-foreground">Docs & Pages</div>
                                    </div>
                                    <FormControl>
                                        <Checkbox
                                            checked={field.value}
                                            onCheckedChange={field.onChange}
                                        />
                                    </FormControl>
                                </FormItem>
                            )}
                        />
                    </div>
                </div>
            </div>
            </div>

            <DialogFooter className="mt-6 shrink-0">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button
                type="submit"
                loading={form.formState.isSubmitting || createProjectMutation.isPending}
              >
                {form.formState.isSubmitting || createProjectMutation.isPending ? "Creating..." : "Create Project"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
