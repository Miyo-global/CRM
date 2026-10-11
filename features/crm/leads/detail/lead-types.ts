import { z } from "zod";
import { StickyNote, ListTodo, Mail, Phone } from "lucide-react";
import { toneSoft, toneText, type Tone } from "@/lib/design/tones";

// Soft pill (no border): callers render `bg` + `color` on an outline Badge.
const pill = (t: Tone) => ({ color: toneText[t], bg: `${toneSoft[t]} border-transparent` });

export const STATUS_PIPELINE = [
  "NEW",
  "CONTACTED",
  "INTERESTED",
  "QUALIFIED",
  "CONVERTED",
  "LOST",
] as const;

export type PipelineStatus = (typeof STATUS_PIPELINE)[number];

export const STATUS_STYLES: Record<string, { color: string; bg: string }> = {
  NEW: pill("info"),
  CONTACTED: pill("teal"),
  INTERESTED: pill("plum"),
  QUALIFIED: pill("brand"),
  CONVERTED: pill("success"),
  LOST: pill("danger"),
};

export const PRIORITY_STYLES: Record<
  string,
  { label: string; color: string; bg: string }
> = {
  HOT: { label: "Hot", ...pill("danger") },
  WARM: { label: "Warm", ...pill("warning") },
  COLD: { label: "Cold", ...pill("info") },
};

export const TIMELINE_ICONS: Record<
  string,
  { icon: React.ElementType; color: string }
> = {
  note: { icon: StickyNote, color: toneSoft.warning },
  task: { icon: ListTodo, color: toneSoft.plum },
  email: { icon: Mail, color: toneSoft.info },
  activity: { icon: Phone, color: toneSoft.success },
};

export type QuickAction = "call" | "email" | "note" | "task" | "draft" | null;

export const noteSchema = z.object({
  body: z.string().min(1, "Note cannot be empty"),
});
export type NoteForm = z.infer<typeof noteSchema>;

export const taskSchema = z.object({
  title: z.string().min(1, "Title is required").max(200),
  dueDate: z.string().optional(),
});
export type TaskForm = z.infer<typeof taskSchema>;

export const emailSchema = z.object({
  to: z.string().email("Valid email required"),
  subject: z.string().min(1, "Subject required"),
  body: z.string().min(1, "Body required"),
});
export type EmailForm = z.infer<typeof emailSchema>;

export const callSchema = z.object({
  subject: z.string().optional(),
  duration: z.string().optional(),
  outcome: z.string().optional(),
  notes: z.string().optional(),
});
export type CallForm = z.infer<typeof callSchema>;

export const editSchema = z.object({
  name: z.string().min(1),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional(),
  company: z.string().optional(),
  city: z.string().optional(),
  priority: z.enum(["HOT", "WARM", "COLD"]).optional(),
  potentialValue: z.string().optional(),
  investmentInterest: z.string().optional(),
  notes: z.string().optional(),
});
export type EditForm = z.infer<typeof editSchema>;

export function getScoreBadge(score: number | null | undefined) {
  const s = score ?? 0;
  if (s <= 30) return { label: "Low", ...pill("neutral") };
  if (s <= 60) return { label: "Medium", ...pill("warning") };
  return { label: "Hot", ...pill("success") };
}

export function getSlaCountdown(deadline: Date | string | null | undefined) {
  if (!deadline) return null;
  const now = new Date();
  const dl = new Date(deadline);
  const diff = dl.getTime() - now.getTime();
  if (diff <= 0)
    return { label: "Breached", color: `${toneSoft.danger} border border-transparent` };
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  if (hours < 4)
    return { label: `${hours}h ${mins}m left`, color: `${toneSoft.warning} border border-transparent` };
  return { label: `${hours}h ${mins}m left`, color: `${toneSoft.success} border border-transparent` };
}
