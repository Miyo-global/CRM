"use client";

import { useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useHrEmployees } from "@/lib/api/hooks/hr";
import { useInviteToProject } from "@/lib/api/hooks/projects";
import { getErrorMessage } from "@/lib/get-error-message";
import { addMemberSchema, type AddMemberValues } from "./add-member-schema";

const ROLES = [
  { value: "OWNER", label: "Owner" },
  { value: "MANAGER", label: "Manager" },
  { value: "CONTRIBUTOR", label: "Contributor" },
  { value: "VIEWER", label: "Viewer" },
] as const;

export function AddMemberForm({ projectId, existingIds, allowOwner }: { projectId: number; existingIds: string[]; allowOwner: boolean }) {
  const { data: employeesData } = useHrEmployees({ fields: "picker" });
  const people = useMemo(() => {
    const list = Array.isArray(employeesData) ? employeesData : employeesData?.data ?? [];
    return list.filter((p) => !existingIds.includes(p.id));
  }, [employeesData, existingIds]);
  const invite = useInviteToProject(projectId);
  const form = useForm<AddMemberValues>({ resolver: zodResolver(addMemberSchema), defaultValues: { person: "", role: "CONTRIBUTOR" } });

  const submit = form.handleSubmit((values) => {
    invite.mutate(
      { email: values.person, role: values.role },
      {
        onSuccess: (res) => {
          toast.success(res.invited ? `Sent an invitation to ${values.person}` : `Added ${values.person} to the project`);
          form.reset({ person: "", role: values.role });
        },
        onError: (error) => form.setError("person", { message: getErrorMessage(error) }),
      },
    );
  });

  const busy = invite.isPending;

  return (
    <Form {...form}>
      <form onSubmit={submit} className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_10rem_auto] sm:items-end">
        <FormField
          control={form.control}
          name="person"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Add a person</FormLabel>
              <FormControl>
                <Input {...field} list="project-member-options" type="email" placeholder="Work email of a teammate, or someone to invite" autoComplete="off" />
              </FormControl>
              <datalist id="project-member-options">
                {people.map((p) => (
                  <option key={p.id} value={p.email ?? ""}>{p.name ?? p.email}</option>
                ))}
              </datalist>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="role"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Role</FormLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {ROLES.filter((r) => allowOwner || r.value !== "OWNER").map((r) => (
                    <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormItem>
          )}
        />
        <Button type="submit" loading={busy} disabled={busy}>
          Add
        </Button>
      </form>
    </Form>
  );
}
