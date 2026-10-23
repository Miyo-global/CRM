/**
 * MIYO-0210: which mail a person's notification preferences allow. Kept apart
 * from the query so the rule can be read, and tested, without a database.
 *
 * The keys match the categories on /settings/notifications.
 */
export type EmailCategory =
  | "leaves"
  | "expenses"
  | "payroll"
  | "attendance"
  | "tasks"
  | "hr"
  | "system";

/** A saved preferences row, as far as this decision is concerned. */
export interface EmailPreferenceRow {
  emailEnabled: boolean | null;
  categories: Record<string, boolean> | null;
}

/** Email off entirely, or this category switched off, blocks the mail. */
export function blocksCategory(row: EmailPreferenceRow, category: EmailCategory): boolean {
  return row.emailEnabled === false || row.categories?.[category] === false;
}
