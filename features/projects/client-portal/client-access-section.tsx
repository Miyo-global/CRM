"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Eye, UserX } from "lucide-react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { getErrorMessage } from "@/lib/get-error-message";
import { isAdminOrOwner } from "@/lib/auth/role-guards";
import { useOrgFeatureFlags, useUpdateFeatureFlag } from "@/lib/api/hooks/ai";

type Grant = {
  id: number;
  canViewMilestones: boolean;
  canViewTasks: boolean;
  canSubmitRequests: boolean;
  user: { id: string; name: string | null; email: string };
};

const CAPS = [
  { key: "canViewMilestones", label: "Milestones" },
  { key: "canViewTasks", label: "Shared tickets" },
  { key: "canSubmitRequests", label: "Send requests" },
] as const;

const grantSchema = z.object({ email: z.string().trim().toLowerCase().email("Enter the client's email") });

export function ClientAccessSection({ projectId, canManage }: { projectId: number; canManage: boolean }) {
  const { data: session } = useSession();
  const queryClient = useQueryClient();
  const flags = useOrgFeatureFlags();
  const setFlag = useUpdateFeatureFlag();
  const enabled = !!flags.data?.clientPortal;
  const key = [...queryKeys.projects.all, "clientGrants", projectId];
  const grants = useQuery<Grant[]>({
    queryKey: key,
    queryFn: () => apiClient.get(`/projects/${projectId}/client-grants`),
    enabled: enabled && canManage,
  });
  const [revoking, setRevoking] = useState<Grant | null>(null);
  const form = useForm<z.infer<typeof grantSchema>>({ resolver: zodResolver(grantSchema), defaultValues: { email: "" } });

  const refresh = () => queryClient.invalidateQueries({ queryKey: key });
  const add = useMutation<unknown, Error, string>({
    mutationFn: (email) => apiClient.post(`/projects/${projectId}/client-grants`, { email }),
    onSuccess: (_d, email) => {
      toast.success(`Gave ${email} client access`);
      form.reset();
      refresh();
    },
    onError: (error) => form.setError("email", { message: getErrorMessage(error) }),
  });
  const patch = useMutation<unknown, Error, { id: number; data: Record<string, boolean> }>({
    mutationFn: ({ id, data }) => apiClient.patch(`/projects/${projectId}/client-grants/${id}`, data),
    onSuccess: refresh,
    onError: (error) => toast.error(getErrorMessage(error)),
  });
  const revoke = useMutation<unknown, Error, Grant>({
    mutationFn: (g) => apiClient.delete(`/projects/${projectId}/client-grants/${g.id}`),
    onSuccess: (_d, g) => {
      toast.success(`Removed client access for ${g.user.name ?? g.user.email}`);
      refresh();
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });

  if (!canManage) return null;
  const orgAdmin = isAdminOrOwner(session?.user?.role);

  return (
    <Card>
      <div className="flex flex-wrap items-center gap-3 border-b border-border px-5 py-4">
        <Eye className="size-4 text-muted-foreground" aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-semibold leading-tight">Client access</h2>
          <p className="text-sm text-muted-foreground">Clients see only the milestones and tickets you mark as visible to them.</p>
        </div>
        {orgAdmin && (
          <label className="flex min-h-10 items-center gap-2 text-sm">
            <Switch
              checked={enabled}
              onCheckedChange={(on) => setFlag.mutate({ flag: "clientPortal", enabled: on }, { onError: (e) => toast.error(getErrorMessage(e)) })}
            />
            Client portal {enabled ? "on" : "off"}
          </label>
        )}
      </div>

      {!enabled ? (
        <p className="px-5 py-8 text-center text-sm text-muted-foreground">
          {orgAdmin ? "Turn on the client portal to share this project with clients." : "An organization admin needs to turn on the client portal first."}
        </p>
      ) : (
        <>
          <div className="border-b border-border px-5 py-4">
            <Form {...form}>
              <form onSubmit={form.handleSubmit((v) => add.mutate(v.email))} className="flex flex-wrap items-start gap-2">
                <FormField control={form.control} name="email" render={({ field }) => (
                  <FormItem className="min-w-0 flex-1">
                    <FormLabel className="sr-only">Client email</FormLabel>
                    <FormControl><Input type="email" placeholder="Client email (they need an account first)" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <Button type="submit" loading={add.isPending}>Give access</Button>
              </form>
            </Form>
          </div>
          {(grants.data ?? []).length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-muted-foreground">No clients have access yet.</p>
          ) : (
            <ul className="divide-y divide-border">
              {(grants.data ?? []).map((g) => (
                <li key={g.id} className="flex flex-wrap items-center gap-4 px-5 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{g.user.name ?? g.user.email}</p>
                    <p className="truncate text-xs text-muted-foreground">{g.user.email}</p>
                  </div>
                  {CAPS.map((c) => (
                    <label key={c.key} className="flex min-h-10 items-center gap-2 text-sm">
                      <Checkbox checked={g[c.key]} onCheckedChange={(v) => patch.mutate({ id: g.id, data: { [c.key]: v === true } })} />
                      {c.label}
                    </label>
                  ))}
                  <Button variant="ghost" size="icon" className="size-10" aria-label={`Remove access for ${g.user.email}`} onClick={() => setRevoking(g)}>
                    <UserX className="size-4" aria-hidden="true" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
      <ConfirmDialog
        open={!!revoking}
        onOpenChange={(open) => !open && setRevoking(null)}
        title="Remove client access?"
        description="They can no longer see this project in the client portal."
        confirmLabel="Remove access"
        destructive
        onConfirm={() => {
          if (revoking) revoke.mutate(revoking);
          setRevoking(null);
        }}
      />
    </Card>
  );
}
