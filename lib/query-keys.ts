

const base = ["miyoglobal"] as const;

export const queryKeys = {

  hr: {
    all: [...base, "hr"] as const,
    departments: () => [...base, "hr", "departments"] as const,
    employees: (params?: Record<string, unknown>) => [...base, "hr", "employees", ...(params ? [params] : [])] as const,
    terminatedEmployees: () => [...base, "hr", "terminatedEmployees"] as const,
    employee: (id: string) => [...base, "hr", "employees", id] as const,
    attendanceStatus: () => [...base, "hr", "attendanceStatus"] as const,
    attendanceLogs: (params?: Record<string, unknown>) => [...base, "hr", "attendanceLogs", ...(params ? [params] : [])] as const,
    leaves: (params?: Record<string, unknown>) => [...base, "hr", "leaves", ...(params ? [params] : [])] as const,
    leaveBalance: (userId?: string) => [...base, "hr", "leaveBalance", userId] as const,
    payrolls: (params?: Record<string, unknown>) => [...base, "hr", "payrolls", ...(params ? [params] : [])] as const,
    salaryStructures: (userId?: string) => [...base, "hr", "salaryStructures", userId] as const,
    expenses: (params?: Record<string, unknown>) => [...base, "hr", "expenses", ...(params ? [params] : [])] as const,
    assets: (params?: Record<string, unknown>) => [...base, "hr", "assets", ...(params ? [params] : [])] as const,
    myAssignedAssets: () => [...base, "hr", "myAssignedAssets"] as const,
    documents: (params?: Record<string, unknown>) => [...base, "hr", "documents", ...(params ? [params] : [])] as const,
    performanceReviews: (userId?: string) => [...base, "hr", "performanceReviews", userId] as const,
    goals: (userId?: string) => [...base, "hr", "goals", userId] as const,
    workLogs: (params?: Record<string, unknown>) => [...base, "hr", "workLogs", ...(params ? [params] : [])] as const,
    incentives: (params?: Record<string, unknown>) => [...base, "hr", "incentives", ...(params ? [params] : [])] as const,
    incentiveStats: () => [...base, "hr", "incentiveStats"] as const,
    incentiveConfigs: () => [...base, "hr", "incentiveConfigs"] as const,
    incentiveConfigHistory: (params?: Record<string, unknown>) => [...base, "hr", "incentiveConfigHistory", ...(params ? [params] : [])] as const,
    orgChart: () => [...base, "hr", "orgChart"] as const,
    helpdeskTickets: (params?: Record<string, unknown>) => [...base, "hr", "helpdeskTickets", ...(params ? [params] : [])] as const,
    wfhRequests: () => [...base, "hr", "wfhRequests"] as const,
    pendingWfhRequests: () => [...base, "hr", "pendingWfhRequests"] as const,
    holidaysYear: (year: number) => [...base, "hr", "holidaysYear", year] as const,
    holidaysCalendar: (params: { year: number; month: number }) => [...base, "hr", "holidaysCalendar", params] as const,
    // Prefixes so a holiday mutation can invalidate every year/month it may
    // have changed without invalidating the whole HR cache (A43, A44).
    holidaysYearAll: () => [...base, "hr", "holidaysYear"] as const,
    holidaysCalendarAll: () => [...base, "hr", "holidaysCalendar"] as const,
    monthlyAttendance: (params: { userId: string; year: number; month: number }) => [...base, "hr", "monthlyAttendance", params] as const,
    attendanceSummary: (params: {
      userId: string;
      period: string;
      year: number;
      month?: number;
      quarter?: number;
    }) => [...base, "hr", "attendanceSummary", params] as const,
    attendanceHeatmap: (params: { userId: string; year: number }) => [...base, "hr", "attendanceHeatmap", params] as const,
    attendanceMonitor: (date?: string) => [...base, "hr", "attendanceMonitor", date] as const,
    employeeStats: (userId: string) => [...base, "hr", "employeeStats", userId] as const,
    employeePayslips: (userId?: string) => [...base, "hr", "employeePayslips", userId] as const,
    myBonuses: () => [...base, "hr", "myBonuses"] as const,

    reviewCycles: () => [...base, "hr", "reviewCycles"] as const,
    reviewCycle: (id: number) => [...base, "hr", "reviewCycle", id] as const,
    appraisals: (params?: Record<string, unknown>) => [...base, "hr", "appraisals", ...(params ? [params] : [])] as const,
    appraisal: (id: number) => [...base, "hr", "appraisal", id] as const,
    appraisalCategories: () => [...base, "hr", "appraisalCategories"] as const,
    oneOnOnes: (params?: Record<string, unknown>) => [...base, "hr", "oneOnOnes", ...(params ? [params] : [])] as const,
    // Prefix of every termination query (list/detail/letter in hooks/hr/termination).
    // It said "terminations" while the hooks used "termination", so the final
    // resignation sign-off never refreshed /hr/termination (R3-ADM-04).
    terminations: () => [...base, "hr", "termination"] as const,
    termination: (id: number) => [...base, "hr", "termination", id] as const,
    documentTemplates: (params?: Record<string, unknown>) => [...base, "hr", "documentTemplates", ...(params ? [params] : [])] as const,
    documentTemplate: (id: number) => [...base, "hr", "documentTemplate", id] as const,
    documentFolders: () => [...base, "hr", "documentFolders"] as const,
    orgDocumentVariables: () => [...base, "hr", "orgDocumentVariables"] as const,
    salaryRevisionHistory: (userId: string) => [...base, "hr", "salaryRevisionHistory", userId] as const,
    holidayWorkRequests: (params?: Record<string, unknown>) => [...base, "hr", "holidayWorkRequests", ...(params ? [params] : [])] as const,
    compOffGrants: (userId?: string) => [...base, "hr", "compOffGrants", userId] as const,
    lateArrivalWarnings: (userId?: string) => [...base, "hr", "lateArrivalWarnings", userId] as const,
    overtimePreview: (params: { userId: string; month: string }) => [...base, "hr", "overtimePreview", params] as const,
    payrollPreview: (params: Record<string, unknown>) => [...base, "hr", "payrollPreview", params] as const,
  },

  leads: {
    all: [...base, "leads"] as const,
    list: (params?: Record<string, unknown>) => [...base, "leads", "list", ...(params ? [params] : [])] as const,
    board: () => [...base, "leads", "board"] as const,
    detail: (id: number) => [...base, "leads", "detail", id] as const,
    stats: (params?: Record<string, unknown>) => [...base, "leads", "stats", ...(params ? [params] : [])] as const,
    activities: (leadId: number) => [...base, "leads", "activities", leadId] as const,
    timeline: (leadId: number) => [...base, "leads", "timeline", leadId] as const,
    slaAlerts: () => [...base, "leads", "slaAlerts"] as const,
    analyticsSummary: (params?: Record<string, unknown>) => [...base, "leads", "analyticsSummary", ...(params ? [params] : [])] as const,
    dashboardMetrics: () => [...base, "leads", "dashboardMetrics"] as const,
    unverified: () => [...base, "leads", "unverified"] as const,
    duplicates: () => [...base, "leads", "duplicates"] as const,
  },

  deals: {
    all: [...base, "deals"] as const,
    list: (params?: Record<string, unknown>) => [...base, "deals", "list", ...(params ? [params] : [])] as const,
    detail: (id: number) => [...base, "deals", "detail", id] as const,
    forecast: () => [...base, "deals", "forecast"] as const,
  },

  contacts: {
    all: [...base, "contacts"] as const,
    list: (params?: Record<string, unknown>) => [...base, "contacts", "list", ...(params ? [params] : [])] as const,
    detail: (id: number) => [...base, "contacts", "detail", id] as const,
  },

  clients: {
    all: [...base, "clients"] as const,
    list: (params?: Record<string, unknown>) => [...base, "clients", "list", ...(params ? [params] : [])] as const,
    detail: (id: number) => [...base, "clients", "detail", id] as const,
    activities: (id: number) => [...base, "clients", "activities", id] as const,
    crmStats: () => [...base, "clients", "crmStats"] as const,
  },

  targets: {
    all: [...base, "targets"] as const,
    list: (params?: Record<string, unknown>) => [...base, "targets", "list", ...(params ? [params] : [])] as const,
    myTargets: () => [...base, "targets", "myTargets"] as const,
    leaderboard: (metricType?: string) => [...base, "targets", "leaderboard", metricType] as const,
    history: (targetId: number) => [...base, "targets", "history", targetId] as const,
  },

  projects: {
    all: [...base, "projects"] as const,
    list: (params?: Record<string, unknown>) => [...base, "projects", "list", ...(params ? [params] : [])] as const,
    activity: (projectId: number) => [...base, "projects", "activity", projectId] as const,
    ticketActivity: (ticketId: number) => [...base, "projects", "ticketActivity", ticketId] as const,
    columnCounts: (projectId: number) => [...base, "projects", "columnCounts", projectId] as const,
    detail: (id: number) => [...base, "projects", "detail", id] as const,
    sprints: (projectId?: number) => [...base, "projects", "sprints", projectId] as const,
    sprint: (id: number) => [...base, "projects", "sprints", "detail", id] as const,
    tickets: (params?: Record<string, unknown>) => [...base, "projects", "tickets", ...(params ? [params] : [])] as const,
    ticket: (id: number) => [...base, "projects", "tickets", "detail", id] as const,
    members: (projectId?: number) => [...base, "projects", "members", projectId] as const,
    labels: (projectId?: number) => [...base, "projects", "labels", projectId] as const,
    timeEntries: (params?: Record<string, unknown>) => [...base, "projects", "timeEntries", ...(params ? [params] : [])] as const,
    burndown: (sprintId: number) => [...base, "projects", "burndown", sprintId] as const,
    epics: (projectId: number) => [...base, "projects", "epics", projectId] as const,
    cycles: (projectId: number) => [...base, "projects", "cycles", projectId] as const,
    modules: (projectId: number) => [...base, "projects", "modules", projectId] as const,
    pages: (projectId: number) => [...base, "projects", "pages", projectId] as const,
    views: (projectId: number) => [...base, "projects", "views", projectId] as const,
    intake: (projectId: number) => [...base, "projects", "intake", projectId] as const,
    analytics: (projectId: number) => [...base, "projects", "analytics", projectId] as const,
    watchers: (ticketId: number) => [...base, "projects", "watchers", ticketId] as const,
  },

  dashboard: {
    all: [...base, "dashboard"] as const,
    stats: () => [...base, "dashboard", "stats"] as const,
    recentProjects: () => [...base, "dashboard", "recentProjects"] as const,
    teamAvailability: () => [...base, "dashboard", "teamAvailability"] as const,
    myIssues: (userId: string) => [...base, "dashboard", "myIssues", userId] as const,
    activeSprintSummary: () => [...base, "dashboard", "activeSprintSummary"] as const,
    recentActivity: () => [...base, "dashboard", "recentActivity"] as const,
    announcements: () => [...base, "dashboard", "announcements"] as const,
    personal: () => [...base, "dashboard", "personal"] as const,
    executive: () => [...base, "dashboard", "executive"] as const,
    manager: () => [...base, "dashboard", "manager"] as const,
  },

  reports: {
    all: [...base, "reports"] as const,
    attendance: (params?: Record<string, unknown>) => [...base, "reports", "attendance", ...(params ? [params] : [])] as const,
    payroll: (params?: Record<string, unknown>) => [...base, "reports", "payroll", ...(params ? [params] : [])] as const,
    project: (params?: Record<string, unknown>) => [...base, "reports", "project", ...(params ? [params] : [])] as const,
    teamPerformance: (params?: Record<string, unknown>) => [...base, "reports", "teamPerformance", ...(params ? [params] : [])] as const,
    dashboardStats: () => [...base, "reports", "dashboardStats"] as const,
  },

  notifications: {
    all: [...base, "notifications"] as const,
    list: (unreadOnly?: boolean) => [...base, "notifications", "list", unreadOnly] as const,
    unreadCount: () => [...base, "notifications", "unreadCount"] as const,
  },

  invoice: {
    all: [...base, "invoice"] as const,
    list: (params?: Record<string, unknown>) => [...base, "invoice", "list", ...(params ? [params] : [])] as const,
    detail: (id: number) => [...base, "invoice", "detail", id] as const,
    stats: () => [...base, "invoice", "stats"] as const,
  },

  support: {
    all: [...base, "support"] as const,
    list: (params?: Record<string, unknown>) => [...base, "support", "list", ...(params ? [params] : [])] as const,
    detail: (id: number) => [...base, "support", "detail", id] as const,
  },

  organization: {
    all: [...base, "organization"] as const,
    members: () => [...base, "organization", "members"] as const,
    invitations: () => [...base, "organization", "invitations"] as const,
    settings: () => [...base, "organization", "settings"] as const,
  },

  rbac: {
    all: [...base, "rbac"] as const,
    userPermissions: () => [...base, "rbac", "userPermissions"] as const,
    allPermissions: () => [...base, "rbac", "allPermissions"] as const,
    rolePermissions: (role: string) => [...base, "rbac", "rolePermissions", role] as const,
  },

  roles: {
    all: [...base, "roles"] as const,
    list: () => [...base, "roles", "list"] as const,
    detail: (id: number) => [...base, "roles", "detail", id] as const,
  },

  branches: {
    all: [...base, "branches"] as const,
    list: () => [...base, "branches", "list"] as const,
    detail: (id: number) => [...base, "branches", "detail", id] as const,
  },

  crm: {
    all: [...base, "crm"] as const,
    salesDashboard: () => [...base, "crm", "salesDashboard"] as const,
    salesKpis: (params: Record<string, unknown>) => [...base, "crm", "salesKpis", params] as const,
    salesFunnel: (params: Record<string, unknown>) => [...base, "crm", "salesFunnel", params] as const,
    salesLeaderboard: (params: Record<string, unknown>) => [...base, "crm", "salesLeaderboard", params] as const,
    revenueVsGoal: (year: number) => [...base, "crm", "revenueVsGoal", year] as const,
    marketingDashboard: () => [...base, "crm", "marketingDashboard"] as const,
    supportDashboard: () => [...base, "crm", "supportDashboard"] as const,
    customerExecutiveDashboard: () => [...base, "crm", "customerExecutiveDashboard"] as const,
    person: (slug: string) => [...base, "crm", "person", slug] as const,
    peopleSlugs: () => [...base, "crm", "peopleSlugs"] as const,
  },

  crmSettings: {
    all: [...base, "crmSettings"] as const,
    assignmentRules: () => [...base, "crmSettings", "assignmentRules"] as const,
    emailTemplates: (params?: Record<string, unknown>) => [...base, "crmSettings", "emailTemplates", ...(params ? [params] : [])] as const,
    scoringRules: () => [...base, "crmSettings", "scoringRules"] as const,
    slaPolicies: () => [...base, "crmSettings", "slaPolicies"] as const,
    slaReport: () => [...base, "crmSettings", "slaReport"] as const,
    slaBreachedLeads: (params?: Record<string, unknown>) => [...base, "crmSettings", "slaBreachedLeads", ...(params ? [params] : [])] as const,
  },

  crmOrganizations: {
    all: [...base, "crmOrganizations"] as const,
    list: (params?: Record<string, unknown>) => [...base, "crmOrganizations", "list", ...(params ? [params] : [])] as const,
    detail: (id: number) => [...base, "crmOrganizations", "detail", id] as const,
    hierarchy: (id: number) => [...base, "crmOrganizations", "hierarchy", id] as const,
    rollup: (id: number) => [...base, "crmOrganizations", "rollup", id] as const,
    timeline: (id: number) => [...base, "crmOrganizations", "timeline", id] as const,
    relatedLeads: (id: number) => [...base, "crmOrganizations", "relatedLeads", id] as const,
  },

  clientStats: {
    all: [...base, "clientStats"] as const,
    stats: () => [...base, "clientStats", "stats"] as const,
  },

  dealActivities: {
    all: [...base, "dealActivities"] as const,
    list: (dealId: number, params?: Record<string, unknown>) => [...base, "dealActivities", "list", dealId, params] as const,
  },

  salesTeamCapacity: {
    all: [...base, "salesTeamCapacity"] as const,
    list: () => [...base, "salesTeamCapacity", "list"] as const,
  },

  salesQuotas: {
    all: [...base, "salesQuotas"] as const,
    list: (params?: Record<string, unknown>) => [...base, "salesQuotas", "list", ...(params ? [params] : [])] as const,
  },

  salesLeaderboard: {
    all: [...base, "salesLeaderboard"] as const,
    list: () => [...base, "salesLeaderboard", "list"] as const,
  },

  marketingCampaigns: {
    all: [...base, "marketingCampaigns"] as const,
    list: (params?: Record<string, unknown>) => [...base, "marketingCampaigns", "list", ...(params ? [params] : [])] as const,
    detail: (id: number) => [...base, "marketingCampaigns", "detail", id] as const,
  },

  abTests: {
    all: [...base, "abTests"] as const,
    list: () => [...base, "abTests", "list"] as const,
    detail: (id: number) => [...base, "abTests", "detail", id] as const,
  },

  dmLeads: {
    all: [...base, "dmLeads"] as const,
    list: (params?: Record<string, unknown>) => [...base, "dmLeads", "list", ...(params ? [params] : [])] as const,
    detail: (id: number) => [...base, "dmLeads", "detail", id] as const,
  },

  dmCampaigns: {
    all: [...base, "dmCampaigns"] as const,
    list: (params?: Record<string, unknown>) => [...base, "dmCampaigns", "list", ...(params ? [params] : [])] as const,
    detail: (id: number) => [...base, "dmCampaigns", "detail", id] as const,
  },

  socialMedia: {
    all: [...base, "socialMedia"] as const,
    latest: () => [...base, "socialMedia", "latest"] as const,
  },

  socialMetrics: {
    all: [...base, "socialMetrics"] as const,
    list: (params?: Record<string, unknown>) => [...base, "socialMetrics", "list", ...(params ? [params] : [])] as const,
  },

  auditLog: {
    all: [...base, "auditLog"] as const,
    list: (params?: Record<string, unknown>) => [...base, "auditLog", "list", ...(params ? [params] : [])] as const,
    actions: () => [...base, "auditLog", "actions"] as const,
    targetTypes: () => [...base, "auditLog", "targetTypes"] as const,
  },

  sessions: {
    all: [...base, "sessions"] as const,
    list: () => [...base, "sessions", "list"] as const,
  },

  globalSearch: {
    all: [...base, "globalSearch"] as const,
    results: (query: string) => [...base, "globalSearch", query] as const,
  },

  landingPages: {
    all: [...base, "landingPages"] as const,
    list: () => [...base, "landingPages", "list"] as const,
    detail: (id: number) => [...base, "landingPages", "detail", id] as const,
  },

  crmPages: {
    all: [...base, "crmPages"] as const,
    list: () => [...base, "crmPages", "list"] as const,
    detail: (id: number) => [...base, "crmPages", "detail", id] as const,
    analytics: (id: number, days?: number) => [...base, "crmPages", "analytics", id, days] as const,
  },

  webLeadForms: {
    all: [...base, "webLeadForms"] as const,
    list: () => [...base, "webLeadForms", "list"] as const,
    detail: (id: number) => [...base, "webLeadForms", "detail", id] as const,
  },

  contentCalendar: {
    all: [...base, "contentCalendar"] as const,
    list: (month?: string) => [...base, "contentCalendar", "list", month] as const,
  },

  quotes: {
    all: [...base, "quotes"] as const,
    list: (params?: Record<string, unknown>) => [...base, "quotes", "list", ...(params ? [params] : [])] as const,
    detail: (id: number) => [...base, "quotes", "detail", id] as const,
  },

  // KB-0066: the Knowledge Base. Every key hangs off "knowledge", so one
  // invalidate clears the module; list keys carry their params so a filter
  // change is a different cache entry rather than a refetch of the same one.
  knowledge: {
    all: [...base, "knowledge"] as const,
    capabilities: () => [...base, "knowledge", "capabilities"] as const,
    settings: () => [...base, "knowledge", "settings"] as const,
    pages: (params?: Record<string, unknown>) => [...base, "knowledge", "pages", ...(params ? [params] : [])] as const,
    pagesAll: () => [...base, "knowledge", "pages"] as const,
    page: (id: number) => [...base, "knowledge", "page", id] as const,
    pageTree: (params?: Record<string, unknown>) => [...base, "knowledge", "pageTree", ...(params ? [params] : [])] as const,
    pageTreeAll: () => [...base, "knowledge", "pageTree"] as const,
    recentPages: () => [...base, "knowledge", "recentPages"] as const,
    favoritePages: () => [...base, "knowledge", "favoritePages"] as const,
    pageOwners: () => [...base, "knowledge", "pageOwners"] as const,
    pageVersions: (pageId: number) => [...base, "knowledge", "pageVersions", pageId] as const,
    pageVersion: (pageId: number, versionNumber: number) =>
      [...base, "knowledge", "pageVersion", pageId, versionNumber] as const,
    pageBacklinks: (pageId: number) => [...base, "knowledge", "pageBacklinks", pageId] as const,
    pageComments: (pageId: number) => [...base, "knowledge", "pageComments", pageId] as const,
    pageGrants: (pageId: number) => [...base, "knowledge", "pageGrants", pageId] as const,
    grantCandidates: (pageId: number, q?: string) =>
      [...base, "knowledge", "grantCandidates", pageId, q] as const,
    pageAttachments: (pageId: number) => [...base, "knowledge", "pageAttachments", pageId] as const,
    pageRecordLinks: (pageId: number) => [...base, "knowledge", "pageRecordLinks", pageId] as const,
    recordPages: (params: { targetType: string; targetId: string }) =>
      [...base, "knowledge", "recordPages", params] as const,
    pageTags: (pageId: number) => [...base, "knowledge", "pageTags", pageId] as const,
    pageTranslations: (pageId: number) => [...base, "knowledge", "pageTranslations", pageId] as const,
    tags: () => [...base, "knowledge", "tags"] as const,
    spaces: (params?: Record<string, unknown>) => [...base, "knowledge", "spaces", ...(params ? [params] : [])] as const,
    spacesAll: () => [...base, "knowledge", "spaces"] as const,
    space: (id: number) => [...base, "knowledge", "space", id] as const,
    spaceMembers: (spaceId: number) => [...base, "knowledge", "spaceMembers", spaceId] as const,
    spaceArchiveImpact: (spaceId: number) =>
      [...base, "knowledge", "spaceArchiveImpact", spaceId] as const,
    templates: () => [...base, "knowledge", "templates"] as const,
    template: (id: number) => [...base, "knowledge", "template", id] as const,
    reviews: (params?: Record<string, unknown>) => [...base, "knowledge", "reviews", ...(params ? [params] : [])] as const,
    reviewsAll: () => [...base, "knowledge", "reviews"] as const,
    reviewsDue: () => [...base, "knowledge", "reviewsDue"] as const,
    pageReviews: (pageId: number) => [...base, "knowledge", "pageReviews", pageId] as const,
    trash: (params?: Record<string, unknown>) => [...base, "knowledge", "trash", ...(params ? [params] : [])] as const,
    trashAll: () => [...base, "knowledge", "trash"] as const,
    trashDeleters: () => [...base, "knowledge", "trashDeleters"] as const,
    search: (params?: Record<string, unknown>) => [...base, "knowledge", "search", ...(params ? [params] : [])] as const,
    importJobs: () => [...base, "knowledge", "importJobs"] as const,
    importJob: (id: number) => [...base, "knowledge", "importJob", id] as const,
    exportJobs: () => [...base, "knowledge", "exportJobs"] as const,
  },

  tasks: {
    all: [...base, "tasks"] as const,
    list: (params?: Record<string, unknown>) => [...base, "tasks", "list", ...(params ? [params] : [])] as const,
    detail: (id: number) => [...base, "tasks", "detail", id] as const,
    myQueue: () => [...base, "tasks", "myQueue"] as const,
    overdue: () => [...base, "tasks", "overdue"] as const,
    overdueCount: () => [...base, "tasks", "overdueCount"] as const,
    sequences: () => [...base, "tasks", "sequences"] as const,
  },

} as const;
