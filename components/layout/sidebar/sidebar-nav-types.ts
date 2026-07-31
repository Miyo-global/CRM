export interface NavRoute {
  label: string;
  icon: React.ElementType;
  href: string;
  badge?: "leaves";
  isProjectsList?: boolean;
  isSubItem?: boolean;
}

export interface NavSubGroup {
  label: string;
  routes: NavRoute[];
  defaultCollapsed?: boolean;
}

export interface NavGroup {
  label: string;
  routes?: NavRoute[];
  subGroups?: NavSubGroup[];
  defaultCollapsed?: boolean;
}

export function flattenNavGroupRoutes(group: NavGroup): NavRoute[] {
  return [...(group.routes ?? []), ...(group.subGroups?.flatMap((sg) => sg.routes) ?? [])];
}
