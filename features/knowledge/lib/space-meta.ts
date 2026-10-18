import { TAG_TONE_CYCLE, type Tone } from "@/lib/design/tones";

/** KB-0084: the six space types, in the words the UI uses. */
export const KB_SPACE_TYPE_LABELS: Record<string, string> = {
  private: "Private",
  team: "Team",
  company: "Company",
  module: "Module",
  support: "Support",
  project: "Project",
};

export const KB_SPACE_TYPES = Object.keys(KB_SPACE_TYPE_LABELS);

export const KB_SPACE_AUDIENCES: Record<string, string> = {
  internal: "Internal",
  customer: "Customers",
  partner: "Partners",
};

/**
 * Space colours are the tone palette, not free hex: a space picked out in an
 * arbitrary colour stops matching the rest of the app the moment the theme
 * changes, and no gradient can creep in this way.
 */
export const KB_SPACE_COLORS: readonly Tone[] = TAG_TONE_CYCLE;

export function spaceTypeLabel(type: string | null | undefined): string {
  return KB_SPACE_TYPE_LABELS[type ?? "team"] ?? (type ?? "Team");
}

export function spaceColorTone(color: string | null | undefined): Tone {
  return (KB_SPACE_COLORS as readonly string[]).includes(color ?? "")
    ? (color as Tone)
    : "neutral";
}

/** A slug suggestion, so nobody has to type one. */
export function slugifySpaceName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 50);
}
