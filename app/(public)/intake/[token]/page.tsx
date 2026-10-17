"use client";

import { use, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import axios from "axios";
import { CheckCircle2, Link2Off, Loader2 } from "lucide-react";
import { TokenPageShell, TokenState } from "../../_components/token-page-shell";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { publicIntakeSchema, type PublicIntakeValues } from "./public-intake-schema";
import { TurnstileWidget } from "@/components/security/turnstile-widget";

type Load = { state: "loading" } | { state: "closed" } | { state: "open"; projectName: string } | { state: "sent"; projectName: string };

export default function PublicIntakePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const [load, setLoad] = useState<Load>({ state: "loading" });
  const [submitError, setSubmitError] = useState<string | null>(null);
  // MIYO-0130: null until Turnstile hands over a token (or it is not configured).
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const form = useForm<PublicIntakeValues>({ resolver: zodResolver(publicIntakeSchema), defaultValues: { title: "", description: "", submitterEmail: "" } });

  useEffect(() => {
    let alive = true;
    axios
      .get<{ projectName: string }>(`/api/public/intake/${encodeURIComponent(token)}`)
      .then((res) => alive && setLoad({ state: "open", projectName: res.data.projectName }))
      .catch(() => alive && setLoad({ state: "closed" }));
    return () => {
      alive = false;
    };
  }, [token]);

  const submit = form.handleSubmit(async (values) => {
    setSubmitError(null);
    try {
      await axios.post(`/api/public/intake/${encodeURIComponent(token)}`, {
        title: values.title,
        description: values.description || undefined,
        submitterEmail: values.submitterEmail || undefined,
        turnstileToken: turnstileToken ?? undefined,
      });
      setLoad((prev) => ({ state: "sent", projectName: prev.state === "open" ? prev.projectName : "" }));
    } catch (error) {
      const message = axios.isAxiosError(error) ? (error.response?.data as { error?: string })?.error : undefined;
      setSubmitError(message ?? "We couldn't send your request. Try again in a moment.");
    }
  });

  if (load.state === "loading") {
    return (
      <TokenPageShell title="Submit a request">
        <div className="flex justify-center py-10" role="status">
          <Loader2 className="size-6 animate-spin text-muted-foreground" aria-hidden="true" />
          <span className="sr-only">Loading</span>
        </div>
      </TokenPageShell>
    );
  }
  if (load.state === "closed") {
    return (
      <TokenPageShell title="Submit a request">
        <TokenState icon={Link2Off} tone="neutral" title="This form is closed">
          <p className="text-sm text-muted-foreground">The link may be wrong, or the team stopped taking requests here.</p>
        </TokenState>
      </TokenPageShell>
    );
  }
  if (load.state === "sent") {
    return (
      <TokenPageShell title="Request sent">
        <TokenState icon={CheckCircle2} tone="success" title="Thanks, we got it">
          <p className="text-sm text-muted-foreground">The team will review your request.</p>
          <Button
            variant="outline"
            onClick={() => {
              form.reset();
              setLoad({ state: "open", projectName: load.projectName });
            }}
          >
            Send another
          </Button>
        </TokenState>
      </TokenPageShell>
    );
  }

  return (
    <TokenPageShell title="Submit a request" subtitle={load.projectName}>
      <Form {...form}>
        <form onSubmit={submit} className="space-y-4" noValidate>
          <FormField
            control={form.control}
            name="title"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Title</FormLabel>
                <FormControl>
                  <Input {...field} autoFocus />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Details</FormLabel>
                <FormControl>
                  <Textarea {...field} className="min-h-32" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="submitterEmail"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Your email (optional)</FormLabel>
                <FormControl>
                  <Input type="email" autoComplete="email" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <TurnstileWidget onToken={setTurnstileToken} />
          {submitError && (
            <p role="alert" className="text-sm text-destructive">{submitError}</p>
          )}
          <Button type="submit" className="w-full" loading={form.formState.isSubmitting} disabled={form.formState.isSubmitting}>
            Send request
          </Button>
        </form>
      </Form>
    </TokenPageShell>
  );
}
