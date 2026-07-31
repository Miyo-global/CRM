"use client";

import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import Script from "next/script";
import { z } from "zod";
import { PhoneInput } from "@/components/ui/phone-input";

const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

const fieldSchema = z
  .object({
    name: z.string().min(1, "Name is required").max(200),
    email: z.string().email("Enter a valid email address").optional().or(z.literal("")),
    phone: z.string().max(30).optional(),
    message: z.string().max(5000).optional(),
  })
  .refine((data) => !!(data.email && data.email.length) || !!(data.phone && data.phone.length), {
    message: "Provide an email or phone number",
    path: ["email"],
  });

type FieldValues = z.infer<typeof fieldSchema>;
type FieldErrors = Partial<Record<keyof FieldValues, string>>;

interface UtmParams {
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  utmContent: string | null;
  utmTerm: string | null;
  referrerUrl: string | null;
}

interface Props {
  orgId: string;
  utm: UtmParams;
}

export function LandingForm({ orgId, utm }: Props) {
  const searchParams = useSearchParams();

  const resolvedUtm: UtmParams = useMemo(
    () => ({
      utmSource: searchParams.get("utm_source") ?? utm.utmSource,
      utmMedium: searchParams.get("utm_medium") ?? utm.utmMedium,
      utmCampaign: searchParams.get("utm_campaign") ?? utm.utmCampaign,
      utmContent: searchParams.get("utm_content") ?? utm.utmContent,
      utmTerm: searchParams.get("utm_term") ?? utm.utmTerm,
      referrerUrl: searchParams.get("ref") ?? utm.referrerUrl,
    }),
    [searchParams, utm],
  );

  const [values, setValues] = useState<FieldValues>({
    name: "",
    email: "",
    phone: "",
    message: "",
  });
  const [errors, setErrors] = useState<FieldErrors>({});
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [serverError, setServerError] = useState<string | null>(null);

  const turnstileRef = useRef<HTMLDivElement>(null);
  const turnstileTokenRef = useRef<string | null>(null);
  const turnstileWidgetIdRef = useRef<string | null>(null);

  const renderTurnstile = useCallback(() => {
    if (!TURNSTILE_SITE_KEY || !turnstileRef.current) return;
    if (turnstileWidgetIdRef.current) return;
    const w = window as unknown as { turnstile?: { render: (el: HTMLElement, opts: Record<string, unknown>) => string } };
    if (!w.turnstile) return;
    turnstileWidgetIdRef.current = w.turnstile.render(turnstileRef.current, {
      sitekey: TURNSTILE_SITE_KEY,
      callback: (token: string) => { turnstileTokenRef.current = token; },
      "expired-callback": () => { turnstileTokenRef.current = null; },
      "error-callback": () => { turnstileTokenRef.current = null; },
    });
  }, []);

  useEffect(() => {
    renderTurnstile();
  }, [renderTurnstile]);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const { name, value } = e.target;
      setValues((prev) => ({ ...prev, [name]: value }));
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    },
    [],
  );

  const handleSubmit = useCallback(
    async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      setServerError(null);

      const result = fieldSchema.safeParse(values);
      if (!result.success) {
        const errs: FieldErrors = {};
        for (const issue of result.error.issues) {
          const key = issue.path[0] as keyof FieldValues;
          if (key) errs[key] = issue.message;
        }
        setErrors(errs);
        return;
      }

      setStatus("loading");

      try {
        if (TURNSTILE_SITE_KEY && !turnstileTokenRef.current) {
          setServerError("Please complete the bot verification challenge.");
          setStatus("error");
          return;
        }

        const res = await fetch("/api/landing/submit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            orgId,
            name: result.data.name,
            email: result.data.email || null,
            phone: result.data.phone || null,
            message: result.data.message || null,
            ...resolvedUtm,
            ...(turnstileTokenRef.current && { cfTurnstileToken: turnstileTokenRef.current }),
          }),
        });

        if (!res.ok) {
          const json = (await res.json()) as { error?: string };
          setServerError(json.error ?? "Submission failed. Please try again.");
          setStatus("error");
          return;
        }

        setStatus("success");
      } catch {
        setServerError("Network error. Please check your connection and try again.");
        setStatus("error");
      }
    },
    [values, orgId, resolvedUtm],
  );

  if (status === "success") {
    return (
      <div className="rounded-xl border border-border bg-card p-8 text-center shadow-sm">
        <div className="mb-3 text-4xl" aria-hidden="true">&#10003;</div>
        <h2 className="text-xl font-semibold text-foreground mb-2">Thank you!</h2>
        <p className="text-muted-foreground">
          Your message has been received. We&apos;ll be in touch soon.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-foreground mb-1">Get in Touch</h2>
      <p className="text-sm text-muted-foreground mb-6">
        Fill in your details and we&apos;ll reach out to you shortly.
      </p>

      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        <div>
          <label htmlFor="lf-name" className="block text-sm font-medium text-foreground mb-1">
            Name <span className="text-destructive" aria-hidden="true">*</span>
          </label>
          <input
            id="lf-name"
            name="name"
            type="text"
            required
            autoComplete="name"
            value={values.name}
            onChange={handleChange}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            placeholder="Your full name"
            aria-invalid={!!errors.name}
            aria-describedby={errors.name ? "lf-name-err" : undefined}
          />
          {errors.name && (
            <p id="lf-name-err" className="mt-1 text-xs text-destructive">
              {errors.name}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="lf-email" className="block text-sm font-medium text-foreground mb-1">
            Email
          </label>
          <input
            id="lf-email"
            name="email"
            type="email"
            autoComplete="email"
            value={values.email}
            onChange={handleChange}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            placeholder="you@example.com"
            aria-invalid={!!errors.email}
            aria-describedby={errors.email ? "lf-email-err" : undefined}
          />
          {errors.email && (
            <p id="lf-email-err" className="mt-1 text-xs text-destructive">
              {errors.email}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="lf-phone" className="block text-sm font-medium text-foreground mb-1">
            Phone
          </label>
          <PhoneInput
            id="lf-phone"
            autoComplete="tel"
            value={values.phone}
            onChange={(v) => {
              setValues((prev) => ({ ...prev, phone: v ?? "" }));
              setErrors((prev) => ({ ...prev, phone: undefined }));
            }}
          />
        </div>

        <div>
          <label htmlFor="lf-message" className="block text-sm font-medium text-foreground mb-1">
            Message
          </label>
          <textarea
            id="lf-message"
            name="message"
            rows={4}
            value={values.message}
            onChange={handleChange}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-y"
            placeholder="Tell us how we can help..."
          />
        </div>

        {TURNSTILE_SITE_KEY && (
          <div ref={turnstileRef} className="mt-1" aria-label="Bot verification" />
        )}

        {serverError && (
          <p className="text-sm text-destructive" role="alert">
            {serverError}
          </p>
        )}

        <button
          type="submit"
          disabled={status === "loading"}
          className="w-full rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {status === "loading" ? "Sending..." : "Send Message"}
        </button>
      </form>

      {TURNSTILE_SITE_KEY && (
        <Script
          src="https://challenges.cloudflare.com/turnstile/v0/api.js"
          strategy="lazyOnload"
          onLoad={renderTurnstile}
        />
      )}
    </div>
  );
}
