import { ATS_MODULE_ENABLED } from "@/lib/constants/modules";

export type Permission = {
  name: string;
  resource: string;
  action: string;
  description: string;
};

export const PERMISSIONS: Permission[] = [
  {
    name: "hr:employees:view",
    resource: "hr:employees",
    action: "view",
    description: "View employees list",
  },
  {
    name: "hr:employees:create",
    resource: "hr:employees",
    action: "create",
    description: "Create new employees",
  },
  {
    name: "hr:employees:update",
    resource: "hr:employees",
    action: "update",
    description: "Update employee information",
  },
  {
    name: "hr:employees:delete",
    resource: "hr:employees",
    action: "delete",
    description: "Delete employees",
  },
  {
    name: "hr:attendance:view",
    resource: "hr:attendance",
    action: "view",
    description: "View attendance records",
  },
  {
    name: "hr:attendance:manage",
    resource: "hr:attendance",
    action: "manage",
    description: "Manage attendance records",
  },
  {
    name: "hr:leaves:view",
    resource: "hr:leaves",
    action: "view",
    description: "View leave requests",
  },
  {
    name: "hr:leaves:create",
    resource: "hr:leaves",
    action: "create",
    description: "Create leave requests",
  },
  {
    name: "hr:leaves:approve",
    resource: "hr:leaves",
    action: "approve",
    description: "Approve/reject leave requests",
  },
  {
    name: "hr:payroll:view",
    resource: "hr:payroll",
    action: "view",
    description: "View payroll information",
  },
  {
    name: "hr:payroll:generate",
    resource: "hr:payroll",
    action: "generate",
    description: "Generate payroll",
  },
  {
    name: "hr:payroll:approve",
    resource: "hr:payroll",
    action: "approve",
    description: "Approve payroll",
  },
  {
    name: "hr:salary:view",
    resource: "hr:salary",
    action: "view",
    description: "View salary structures",
  },
  {
    name: "hr:salary:manage",
    resource: "hr:salary",
    action: "manage",
    description: "Manage salary structures",
  },
  {
    name: "hr:payroll:pt:view",
    resource: "hr:payroll:pt",
    action: "view",
    description: "View other employees' professional tax amount",
  },
  {
    name: "hr:payroll:pt:edit",
    resource: "hr:payroll:pt",
    action: "edit",
    description: "Set or change an employee's professional tax amount",
  },
  {
    name: "hr:expenses:view",
    resource: "hr:expenses",
    action: "view",
    description: "View expenses",
  },
  {
    name: "hr:expenses:create",
    resource: "hr:expenses",
    action: "create",
    description: "Create expense requests",
  },
  {
    name: "hr:expenses:approve",
    resource: "hr:expenses",
    action: "approve",
    description: "Approve expense requests",
  },
  {
    name: "hr:assets:view",
    resource: "hr:assets",
    action: "view",
    description: "View assets",
  },
  {
    name: "hr:assets:manage",
    resource: "hr:assets",
    action: "manage",
    description: "Manage assets",
  },
  {
    name: "hr:documents:view",
    resource: "hr:documents",
    action: "view",
    description: "View documents",
  },
  {
    name: "hr:documents:manage",
    resource: "hr:documents",
    action: "manage",
    description: "Manage documents",
  },
  {
    name: "hr:performance:view",
    resource: "hr:performance",
    action: "view",
    description: "View performance reviews",
  },
  {
    name: "hr:performance:manage",
    resource: "hr:performance",
    action: "manage",
    description: "Manage performance reviews",
  },
  {
    name: "hr:goals:view",
    resource: "hr:goals",
    action: "view",
    description: "View goals",
  },
  {
    name: "hr:goals:manage",
    resource: "hr:goals",
    action: "manage",
    description: "Manage goals",
  },
  {
    name: "projects:view",
    resource: "projects",
    action: "view",
    description: "View projects",
  },
  {
    name: "projects:create",
    resource: "projects",
    action: "create",
    description: "Create projects",
  },
  {
    name: "projects:update",
    resource: "projects",
    action: "update",
    description: "Update projects",
  },
  {
    name: "projects:delete",
    resource: "projects",
    action: "delete",
    description: "Delete projects",
  },
  {
    name: "projects:tickets:view",
    resource: "projects:tickets",
    action: "view",
    description: "View tickets",
  },
  {
    name: "projects:tickets:create",
    resource: "projects:tickets",
    action: "create",
    description: "Create tickets",
  },
  {
    name: "projects:tickets:update",
    resource: "projects:tickets",
    action: "update",
    description: "Update tickets",
  },
  {
    name: "projects:tickets:delete",
    resource: "projects:tickets",
    action: "delete",
    description: "Delete tickets",
  },
  {
    name: "projects:tickets:assign",
    resource: "projects:tickets",
    action: "assign",
    description: "Assign tickets",
  },
  {
    name: "projects:sprints:view",
    resource: "projects:sprints",
    action: "view",
    description: "View sprints",
  },
  {
    name: "projects:sprints:manage",
    resource: "projects:sprints",
    action: "manage",
    description: "Manage sprints",
  },
  {
    name: "projects:timesheets:view",
    resource: "projects:timesheets",
    action: "view",
    description: "View timesheets",
  },
  {
    name: "projects:timesheets:create",
    resource: "projects:timesheets",
    action: "create",
    description: "Create timesheet entries",
  },
  {
    name: "reports:view",
    resource: "reports",
    action: "view",
    description: "View reports",
  },
  {
    name: "reports:create",
    resource: "reports",
    action: "create",
    description: "Create reports",
  },
  {
    name: "reports:export",
    resource: "reports",
    action: "export",
    description: "Export reports",
  },
  {
    name: "settings:view",
    resource: "settings",
    action: "view",
    description: "View settings",
  },
  {
    name: "settings:manage",
    resource: "settings",
    action: "manage",
    description: "Manage settings",
  },
  {
    name: "settings:rbac:manage",
    resource: "settings:rbac",
    action: "manage",
    description: "Manage RBAC permissions",
  },

  {
    name: "dashboard:support:view",
    resource: "dashboard:support",
    action: "view",
    description: "View Support dashboard",
  },

  {
    name: "self:attendance",
    resource: "self",
    action: "attendance",
    description: "Check in/out own attendance",
  },
  {
    name: "self:leaves",
    resource: "self",
    action: "leaves",
    description: "Submit and view own leave requests",
  },
  {
    name: "self:expenses",
    resource: "self",
    action: "expenses",
    description: "Submit and view own expense claims",
  },
  {
    name: "self:payslips",
    resource: "self",
    action: "payslips",
    description: "View own payslips",
  },

  { name: "reports:generate", resource: "reports", action: "generate", description: "Generate reports" },
  { name: "reports:schedule", resource: "reports", action: "schedule", description: "Schedule reports" },

];

/**
 * R3-ROLE-01: what used to be hard-coded "Super Admin only" checks, named so
 * the permission matrix shows the real difference between Super Admin and
 * Admin. The routes check these names (lib/auth/role-change-rules.ts).
 */
const SUPER_ADMIN_ONLY_PERMISSIONS: Permission[] = [
  { name: "roles:manage", resource: "roles", action: "manage", description: "Grant or remove the Admin and HR roles; create custom roles (Super Admin only)" },
  { name: "hr:termination:approve", resource: "hr:termination", action: "approve", description: "Approve or reject a termination (Super Admin only)" },
];

PERMISSIONS.push(
  ...SUPER_ADMIN_ONLY_PERMISSIONS,
  { name: "hr:termination:complete", resource: "hr:termination", action: "complete", description: "Complete an approved termination (deactivate, F&F, asset return)" },
);

export const SUPER_ADMIN_ONLY_PERMISSION_NAMES: readonly string[] = SUPER_ADMIN_ONLY_PERMISSIONS.map((p) => p.name);

const EMPLOYEE_SELF_SERVICE = [
  "self:attendance",
  "self:leaves",
  "self:expenses",
  "self:payslips",
  "hr:leaves:create",
  "hr:expenses:create",
  // KB-0003: Streamline's UNIVERSAL_MEMBER_PERMISSION_GRANTS. Everyone can read
  // the wiki; what they can read is then narrowed by space and page access.
  "kb:articles:view",
  "kb:spaces:view",
  "kb:pages:view",
];

/**
 * MIYO-0628: the ATS. A recruiter works the hiring pipeline and nothing else
 * in HR; per-job scoping on top of these lives in lib/ats/access.ts.
 */
const ATS_PERMISSIONS: Permission[] = [
  { name: "ats:jobs:view", resource: "ats:jobs", action: "view", description: "View job postings and requisitions" },
  { name: "ats:jobs:manage", resource: "ats:jobs", action: "manage", description: "Create, edit, publish and close jobs" },
  { name: "ats:requisitions:approve", resource: "ats:requisitions", action: "approve", description: "Approve or reject a hiring requisition" },
  { name: "ats:candidates:view", resource: "ats:candidates", action: "view", description: "View candidates and applications" },
  { name: "ats:candidates:manage", resource: "ats:candidates", action: "manage", description: "Add, edit, move and reject candidates" },
  { name: "ats:candidates:erase", resource: "ats:candidates", action: "erase", description: "Erase or export a candidate's data on request" },
  { name: "ats:interviews:view", resource: "ats:interviews", action: "view", description: "View interviews and scorecards" },
  { name: "ats:interviews:manage", resource: "ats:interviews", action: "manage", description: "Schedule interviews and submit scorecards" },
  { name: "ats:offers:view", resource: "ats:offers", action: "view", description: "View offers" },
  { name: "ats:offers:manage", resource: "ats:offers", action: "manage", description: "Draft, send and withdraw offers" },
  { name: "ats:settings:manage", resource: "ats:settings", action: "manage", description: "Stages, refuse reasons, templates and retention" },
];

// R3-INV-01: with the ATS off (the default) its permissions are not in the
// catalogue, so the roles page and matrix never list an "ATS" group and no role
// is granted them. Migration 0190 drops the names already stored on roles.
if (ATS_MODULE_ENABLED) PERMISSIONS.push(...ATS_PERMISSIONS);

/** Everything a recruiter does day to day. */
export const ATS_RECRUITER_PERMISSIONS: string[] = ATS_PERMISSIONS.map((p) => p.name).filter(
  (name) => name !== "ats:candidates:erase" && name !== "ats:settings:manage",
);

/**
 * KB-0002: the Knowledge Base. Ported verbatim from Streamline
 * SB/modules/rbac/permissions/kb.ts. Space roles and per-page grants layer on
 * top of these in lib/knowledge/access-levels.ts.
 */
const KB_PERMISSIONS: Permission[] = [
  { name: "kb:articles:view", resource: "kb:articles", action: "view", description: "View knowledge base articles" },
  { name: "kb:articles:create", resource: "kb:articles", action: "create", description: "Create knowledge base articles" },
  { name: "kb:articles:update", resource: "kb:articles", action: "update", description: "Update knowledge base articles" },
  { name: "kb:articles:delete", resource: "kb:articles", action: "delete", description: "Delete knowledge base articles" },
  { name: "kb:articles:manage", resource: "kb:articles", action: "manage", description: "Manage knowledge base articles" },
  { name: "kb:categories:manage", resource: "kb:categories", action: "manage", description: "Manage knowledge base categories" },
  { name: "kb:spaces:view", resource: "kb:spaces", action: "view", description: "View knowledge base spaces" },
  { name: "kb:spaces:manage", resource: "kb:spaces", action: "manage", description: "Manage knowledge base spaces" },
  { name: "kb:analytics:view", resource: "kb:analytics", action: "view", description: "View knowledge base analytics" },
  { name: "kb:ai:generate", resource: "kb:ai", action: "generate", description: "Generate AI answers from the knowledge base" },
  { name: "kb:pages:view", resource: "kb:pages", action: "view", description: "View wiki pages" },
  { name: "kb:pages:create", resource: "kb:pages", action: "create", description: "Create wiki pages" },
  { name: "kb:pages:update", resource: "kb:pages", action: "update", description: "Update wiki pages" },
  { name: "kb:pages:delete", resource: "kb:pages", action: "delete", description: "Delete wiki pages (soft-delete subtree)" },
  { name: "kb:pages:purge", resource: "kb:pages", action: "purge", description: "Permanently delete wiki pages and empty the trash" },
  { name: "kb:pages:manage", resource: "kb:pages", action: "manage", description: "Lock/unlock pages and manage wiki workspace" },
  { name: "kb:templates:manage", resource: "kb:templates", action: "manage", description: "Create and delete wiki page templates" },
  { name: "kb:reviews:view", resource: "kb:reviews", action: "view", description: "View page review requests" },
  { name: "kb:reviews:manage", resource: "kb:reviews", action: "manage", description: "Create, approve, and reject page review requests" },
  { name: "kb:pages:import", resource: "kb:pages", action: "import", description: "Import pages from markdown, html, or zip" },
  { name: "kb:pages:export", resource: "kb:pages", action: "export", description: "Export pages to markdown or html" },
  { name: "kb:settings:manage", resource: "kb:settings", action: "manage", description: "Manage knowledge base settings" },
];

PERMISSIONS.push(...KB_PERMISSIONS);

/** Every kb:* name, for the roles that get the lot. */
export const KB_PERMISSION_NAMES: string[] = KB_PERMISSIONS.map((p) => p.name);

/** HR and Customer Support get everything but the irreversible purge (D8, §2.4). */
export const KB_FULL_EXCEPT_PURGE: string[] = KB_PERMISSION_NAMES.filter(
  (name) => name !== "kb:pages:purge",
);

/**
 * On top of the universal view grants in EMPLOYEE_SELF_SERVICE. Creating and
 * editing pages in a private space or a space they are an editor of comes from
 * kb_space_members, not from this list (D8).
 */
const KB_EMPLOYEE_PERMISSIONS: string[] = ["kb:ai:generate", "kb:pages:export", "kb:reviews:view"];

const EMPLOYEE_PERMISSIONS: string[] = [
  ...EMPLOYEE_SELF_SERVICE,
  ...KB_EMPLOYEE_PERMISSIONS,
  "projects:view",
  "projects:tickets:view",
  "projects:tickets:create",
  "projects:tickets:update",
  "projects:sprints:view",
  "projects:timesheets:view",
  "projects:timesheets:create",
];

export const SYSTEM_ROLES = [
  "CEO",
  "HR",
  "ADMIN",
  "SALES",
  "CUSTOMER_SUPPORT",
  "ENGINEERING",
  "DESIGN",
  "VIDEO_EDITOR",
  "DIGITAL_MARKETING",
  "RECRUITER",
  "EMPLOYEE",
] as const;

export type SystemRole = (typeof SYSTEM_ROLES)[number];

export const ROLE_DEFAULT_PERMISSIONS: Record<string, string[]> = {

  CEO: PERMISSIONS.map((p) => p.name),

  ADMIN: PERMISSIONS.map((p) => p.name).filter((name) => !SUPER_ADMIN_ONLY_PERMISSION_NAMES.includes(name)),

  RECRUITER: [
    ...EMPLOYEE_SELF_SERVICE,
    ...(ATS_MODULE_ENABLED ? ATS_RECRUITER_PERMISSIONS : []),
    "hr:employees:view",
  ],

  HR: [
    ...EMPLOYEE_SELF_SERVICE,
    ...(ATS_MODULE_ENABLED ? ATS_PERMISSIONS.map((p) => p.name) : []),
    ...KB_FULL_EXCEPT_PURGE,
    "hr:employees:view",
    "hr:employees:create",
    "hr:employees:update",
    "hr:employees:delete",
    "hr:attendance:view",
    "hr:attendance:manage",
    "hr:leaves:view",
    "hr:leaves:approve",
    "hr:payroll:view",
    "hr:payroll:generate",
    "hr:payroll:approve",
    "hr:salary:view",
    "hr:salary:manage",
    "hr:payroll:pt:view",
    "hr:payroll:pt:edit",
    "hr:expenses:view",
    "hr:expenses:approve",
    "hr:documents:view",
    "hr:documents:manage",
    "hr:assets:view",
    "hr:assets:manage",
    "hr:performance:view",
    "hr:performance:manage",
    "hr:goals:view",
    "hr:goals:manage",
    "projects:view",
    "projects:create",
    "projects:update",
    "projects:tickets:view",
    "reports:view",
    "reports:create",
    "reports:export",
    "settings:view",
    "settings:manage",
    "dashboard:support:view",
    "hr:termination:complete",
  ],

  SALES: [
    ...EMPLOYEE_SELF_SERVICE,
    ...KB_EMPLOYEE_PERMISSIONS,
    "projects:view",
    "projects:tickets:view",
    "projects:tickets:create",
    "projects:tickets:update",
    "projects:timesheets:view",
    "projects:timesheets:create",
  ],

  CUSTOMER_SUPPORT: [
    ...EMPLOYEE_SELF_SERVICE,
    ...KB_FULL_EXCEPT_PURGE,
    "dashboard:support:view",
    "projects:view",
    "projects:tickets:view",
    "projects:tickets:create",
    "projects:tickets:update",
    "projects:timesheets:view",
    "projects:timesheets:create",
  ],

  ENGINEERING: EMPLOYEE_PERMISSIONS,

  // QA-ROLE-01: the single non-admin role. It carries what Engineering always
  // had, the widest of the old job-title sets, so nobody moved onto it loses
  // a page they could open.
  EMPLOYEE: EMPLOYEE_PERMISSIONS,

  DESIGN: [
    ...EMPLOYEE_SELF_SERVICE,
    ...KB_EMPLOYEE_PERMISSIONS,
    "projects:view",
    "projects:tickets:view",
    "projects:tickets:create",
    "projects:tickets:update",
    "projects:timesheets:view",
    "projects:timesheets:create",
  ],

  VIDEO_EDITOR: [
    ...EMPLOYEE_SELF_SERVICE,
    ...KB_EMPLOYEE_PERMISSIONS,
    "projects:view",
    "projects:tickets:view",
    "projects:tickets:create",
    "projects:tickets:update",
    "projects:timesheets:view",
    "projects:timesheets:create",
  ],

  DIGITAL_MARKETING: [
    ...EMPLOYEE_SELF_SERVICE,
    ...KB_EMPLOYEE_PERMISSIONS,
    "projects:view",
    "projects:tickets:view",
    "projects:tickets:create",
    "projects:tickets:update",
    "projects:timesheets:view",
    "projects:timesheets:create",
  ],


};

export function getPermissionName(resource: string, action: string): string {
  return `${resource}:${action}`;
}

export function parsePermission(permission: string): { resource: string; action: string } {
  const lastColon = permission.lastIndexOf(":");
  if (lastColon === -1) {
    return { resource: permission, action: "" };
  }
  return {
    resource: permission.slice(0, lastColon),
    action: permission.slice(lastColon + 1),
  };
}
