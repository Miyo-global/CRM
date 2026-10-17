"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { validateResumeFileClient } from "@/lib/files/resume-file-validation";
import { CONSENT_TEXT } from "@/lib/validations/ats-apply";

export interface ApplyQuestion {
  id: number;
  label: string;
  type: string;
  options: string[] | null;
  required: boolean;
}

const input =
  "w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground";


/**
 * The shadcn Select is not a form control, so the chosen value is mirrored
 * into a hidden input for the FormData the form posts.
 */
function QuestionSelect({ name, options }: { name: string; options: string[] }) {
  const [value, setValue] = useState("");
  return (
    <>
      <Select value={value || undefined} onValueChange={setValue}>
        <SelectTrigger>
          <SelectValue placeholder="Choose one" />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option} value={option}>
              {option}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {/* A hidden input is skipped by browser validation, so a required
          question is enforced by the API, which answers with its label. */}
      <input type="hidden" name={name} value={value} />
    </>
  );
}

/**
 * MIYO-0639: the apply form. Plain HTML fields, posted as multipart with the
 * resume; MIYO-0640 adds the honeypot and the Turnstile token.
 */
export function ApplyForm({
  jobId,
  questions,
  turnstileSiteKey,
}: {
  jobId: number;
  questions: ApplyQuestion[];
  turnstileSiteKey?: string;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const form = event.currentTarget;
    const data = new FormData(form);

    const resume = data.get("resume");
    if (!(resume instanceof File) || resume.size === 0) {
      setError("Attach your resume.");
      return;
    }
    const fileError = validateResumeFileClient(resume);
    if (fileError) {
      setError(fileError);
      return;
    }

    const answers: Record<string, string> = {};
    for (const question of questions) {
      const value = data.get(`q_${question.id}`);
      data.delete(`q_${question.id}`);
      if (value !== null) answers[String(question.id)] = String(value);
    }
    if (Object.keys(answers).length > 0) data.set("answers", JSON.stringify(answers));
    data.set("jobId", String(jobId));

    setSending(true);
    try {
      const res = await fetch("/api/public/ats/apply", { method: "POST", body: data });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(body?.error ?? "Could not send your application.");
        return;
      }
      router.push(`/careers/thank-you`);
    } finally {
      setSending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="mt-8 grid gap-5">
      {/* MIYO-0640: bots fill this; it is hidden from people and screen readers. */}
      <input
        type="text"
        name="website"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        className="hidden"
      />

      <div className="grid gap-5 sm:grid-cols-2">
        <label className="grid gap-2 text-sm">
          <span className="text-foreground">First name</span>
          <input name="firstName" required maxLength={80} className={input} />
        </label>
        <label className="grid gap-2 text-sm">
          <span className="text-foreground">Last name</span>
          <input name="lastName" required maxLength={80} className={input} />
        </label>
        <label className="grid gap-2 text-sm">
          <span className="text-foreground">Email</span>
          <input name="email" type="email" required maxLength={160} className={input} />
        </label>
        <label className="grid gap-2 text-sm">
          <span className="text-foreground">Phone</span>
          <input name="phone" type="tel" required maxLength={20} className={input} />
        </label>
      </div>

      <label className="grid gap-2 text-sm">
        <span className="text-foreground">LinkedIn (optional)</span>
        <input name="linkedinUrl" type="url" maxLength={300} className={input} />
      </label>

      <label className="grid gap-2 text-sm">
        <span className="text-foreground">Resume</span>
        <input
          name="resume"
          type="file"
          accept=".pdf,.doc,.docx"
          required
          className="text-sm text-foreground"
        />
        <span className="text-xs text-muted-foreground">PDF or Word, up to 5MB.</span>
      </label>

      <label className="grid gap-2 text-sm">
        <span className="text-foreground">Anything you want us to know (optional)</span>
        <textarea name="coverLetter" rows={5} maxLength={5000} className={input} />
      </label>

      {questions.map((question) => (
        <label key={question.id} className="grid gap-2 text-sm">
          <span className="text-foreground">{question.label}</span>
          {question.type === "TEXTAREA" ? (
            <textarea name={`q_${question.id}`} rows={4} required={question.required} className={input} />
          ) : question.type === "SELECT" && question.options ? (
            <QuestionSelect name={`q_${question.id}`} options={question.options} />
          ) : question.type === "BOOLEAN" ? (
            <QuestionSelect name={`q_${question.id}`} options={["Yes", "No"]} />
          ) : (
            <input
              name={`q_${question.id}`}
              type={question.type === "NUMBER" ? "number" : "text"}
              required={question.required}
              className={input}
            />
          )}
        </label>
      ))}

      <label className="flex items-start gap-3 text-sm text-foreground">
        <input type="checkbox" name="consent" value="true" required className="mt-1" />
        <span>{CONSENT_TEXT}</span>
      </label>

      {turnstileSiteKey && (
        <>
          <div className="cf-turnstile" data-sitekey={turnstileSiteKey} data-response-field-name="turnstileToken" />
          <script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer />
        </>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div>
        <button
          type="submit"
          disabled={sending}
          className="rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground disabled:opacity-60"
        >
          {sending ? "Sending…" : "Send application"}
        </button>
      </div>
    </form>
  );
}
