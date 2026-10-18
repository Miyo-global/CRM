/**
 * KB-0064: locale handling for page translations.
 *
 * Streamline: SB/modules/kb/core/kb-translations.service.ts.
 */
export const KB_TRANSLATION_STATUSES = [
  "draft",
  "in_progress",
  "translated",
  "published",
  "outdated",
] as const;

export type KbTranslationStatus = (typeof KB_TRANSLATION_STATUSES)[number];

/**
 * A BCP-47 tag, canonicalised ("pt-br" becomes "pt-BR") so one language does
 * not end up stored under several spellings and the unique on
 * (page_id, locale) actually holds.
 *
 * Intl does the validating rather than a regex: it already knows the grammar,
 * and a regex loose enough to pass real tags is loose enough to pass junk.
 */
export function normalizeLocale(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed || trimmed.length > 35) return null;
  try {
    const [canonical] = Intl.getCanonicalLocales(trimmed);
    return canonical ?? null;
  } catch {
    return null;
  }
}
