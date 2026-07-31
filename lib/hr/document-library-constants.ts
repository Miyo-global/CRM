export const BUILT_IN_CATEGORY_TABS = [
  "All Files",
  "Contracts",
  "Policies",
  "Tax Forms",
  "Templates",
  "Payroll",
] as const;

export type BuiltInCategoryTab = (typeof BUILT_IN_CATEGORY_TABS)[number];

export function isBuiltInCategoryTab(tab: string): tab is BuiltInCategoryTab {
  return (BUILT_IN_CATEGORY_TABS as readonly string[]).includes(tab);
}

export function isCustomFolderTab(tab: string, customFolderNames: string[]): boolean {
  return customFolderNames.some((f) => f.toLowerCase() === tab.toLowerCase());
}
