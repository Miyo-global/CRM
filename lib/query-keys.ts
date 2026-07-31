

const base = ["miyoglobal"] as const;

export const queryKeys = {

  hr: {
    all: [...base, "hr"] as const,
    departments: () => [...base, "hr", "departments"] as const,
    employees: (params?: Record<string, unknown>) => [...base, "hr", "employees", params] as const,
    terminatedEmployees: () => [...base, "hr", "terminatedEmployees"] as const,
    employee: (id: string) => [...base, "hr", "employees", id] as const,
    attendanceStatus: () => [...base, "hr", "attendanceStatus"] as const,
    attendanceLogs: (params?: Record<string, unknown>) => [...base, "hr", "attendanceLogs", params] as const,
    leaves: (params?: Record<string, unknown>) => [...base, "hr", "leaves", params] as const,
    leaveBalance: (userId?: string) => [...base, "hr", "leaveBalance", userId] as const,
    payrolls: (params?: Record<string, unknown>) => [...base, "hr", "payrolls", params] as const,
    salaryStructures: (userId?: string) => [...base, "hr", "salaryStructures", userId] as const,
    expenses: (params?: Record<string, unknown>) => [...base, "hr", "expenses", params] as const,
    assets: (params?: Record<string, unknown>) => [...base, "hr", "assets", params] as const,
    myAssignedAssets: () => [...base, "hr", "myAssignedAssets"] as const,
    documents: (params?: Record<string, unknown>) => [...base, "hr", "documents", params] as const,
    performanceReviews: (userId?: string) => [...base, "hr", "performanceReviews", userId] as const,
    goals: (userId?: string) => [...base, "hr", "goals", userId] as const,
    workLogs: (params?: Record<string, unknown>) => [...base, "hr", "workLogs", params] as const,
    incentives: (params?: Record<string, unknown>) => [...base, "hr", "incentives", params] as const,
    incentiveStats: () => [...base, "hr", "incentiveStats"] as const,
    incentiveConfigs: () => [...base, "hr", "incentiveConfigs"] as const,
    incentiveConfigHistory: (params?: Record<string, unknown>) => [...base, "hr", "incentiveConfigHistory", params] as const,
    orgChart: () => [...base, "hr", "orgChart"] as const,
    helpdeskTickets: (params?: Record<string, unknown>) => [...base, "hr", "helpdeskTickets", params] as const,
    wfhRequests: () => [...base, "hr", "wfhRequests"] as const,
    pendingWfhRequests: () => [...base, "hr", "pendingWfhRequests"] as const,
    holidaysYear: (year: number) => [...base, "hr", "holidaysYear", year] as const,
    holidaysCalendar: (params: { year: number; month: number }) => [...base, "hr", "holidaysCalendar", params] as const,
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

    recruitmentStats: () => [...base, "hr", "recruitmentStats"] as const,
    jobPostings: (params?: Record<string, unknown>) => [...base, "hr", "jobPostings", params] as const,
    jobPosting: (id: number) => [...base, "hr", "jobPosting", id] as const,
    candidates: (params?: Record<string, unknown>) => [...base, "hr", "candidates", params] as const,
    candidate: (id: number) => [...base, "hr", "candidate", id] as const,
    interviews: (params?: Record<string, unknown>) => [...base, "hr", "interviews", params] as const,
    recruitmentPipeline: () => [...base, "hr", "recruitmentPipeline"] as const,
    jobPipeline: (jobId: number) => [...base, "hr", "jobPipeline", jobId] as const,
    hiringFlows: () => [...base, "hr", "hiringFlows"] as const,
    hiringFlow: (id: number) => [...base, "hr", "hiringFlow", id] as const,
    scorecardTemplates: () => [...base, "hr", "scorecardTemplates"] as const,
    interviewScorecard: (interviewId: number) => [...base, "hr", "interviewScorecard", interviewId] as const,
    interviewerPerformance: (days: number) => [...base, "hr", "interviewerPerformance", days] as const,
    interviewScorecardSummary: (interviewId: number) => [...base, "hr", "interviewScorecardSummary", interviewId] as const,
    candidateVault: (candidateId: number) => [...base, "hr", "candidateVault", candidateId] as const,
    reviewCycles: () => [...base, "hr", "reviewCycles"] as const,
    reviewCycle: (id: number) => [...base, "hr", "reviewCycle", id] as const,
    appraisals: (params?: Record<string, unknown>) => [...base, "hr", "appraisals", params] as const,
    appraisal: (id: number) => [...base, "hr", "appraisal", id] as const,
    appraisalCategories: () => [...base, "hr", "appraisalCategories"] as const,
    oneOnOnes: (params?: Record<string, unknown>) => [...base, "hr", "oneOnOnes", params] as const,
    terminations: () => [...base, "hr", "terminations"] as const,
    termination: (id: number) => [...base, "hr", "termination", id] as const,
    documentTemplates: (params?: Record<string, unknown>) => [...base, "hr", "documentTemplates", params] as const,
    documentTemplate: (id: number) => [...base, "hr", "documentTemplate", id] as const,
    documentFolders: () => [...base, "hr", "documentFolders"] as const,
    orgDocumentVariables: () => [...base, "hr", "orgDocumentVariables"] as const,
    candidateDocuments: (candidateId: number) => [...base, "hr", "candidateDocuments", candidateId] as const,
    rolloutDocuments: (candidateId: number) => [...base, "hr", "rolloutDocuments", candidateId] as const,
    salaryRevisionHistory: (userId: string) => [...base, "hr", "salaryRevisionHistory", userId] as const,
    holidayWorkRequests: (params?: Record<string, unknown>) => [...base, "hr", "holidayWorkRequests", params] as const,
    compOffGrants: (userId?: string) => [...base, "hr", "compOffGrants", userId] as const,
    lateArrivalWarnings: (userId?: string) => [...base, "hr", "lateArrivalWarnings", userId] as const,
    overtimePreview: (params: { userId: string; month: string }) => [...base, "hr", "overtimePreview", params] as const,
  },

  leads: {
    all: [...base, "leads"] as const,
    list: (params?: Record<string, unknown>) => [...base, "leads", "list", params] as const,
    board: () => [...base, "leads", "board"] as const,
    detail: (id: number) => [...base, "leads", "detail", id] as const,
    stats: (params?: Record<string, unknown>) => [...base, "leads", "stats", params] as const,
    activities: (leadId: number) => [...base, "leads", "activities", leadId] as const,
    timeline: (leadId: number) => [...base, "leads", "timeline", leadId] as const,
    slaAlerts: () => [...base, "leads", "slaAlerts"] as const,
    analyticsSummary: (params?: Record<string, unknown>) => [...base, "leads", "analyticsSummary", params] as const,
    dashboardMetrics: () => [...base, "leads", "dashboardMetrics"] as const,
    unverified: () => [...base, "leads", "unverified"] as const,
    duplicates: () => [...base, "leads", "duplicates"] as const,
  },

  deals: {
    all: [...base, "deals"] as const,
    list: (params?: Record<string, unknown>) => [...base, "deals", "list", params] as const,
    detail: (id: number) => [...base, "deals", "detail", id] as const,
    forecast: () => [...base, "deals", "forecast"] as const,
  },

  contacts: {
    all: [...base, "contacts"] as const,
    list: (params?: Record<string, unknown>) => [...base, "contacts", "list", params] as const,
    detail: (id: number) => [...base, "contacts", "detail", id] as const,
  },

  clients: {
    all: [...base, "clients"] as const,
    list: (params?: Record<string, unknown>) => [...base, "clients", "list", params] as const,
    detail: (id: number) => [...base, "clients", "detail", id] as const,
    activities: (id: number) => [...base, "clients", "activities", id] as const,
    crmStats: () => [...base, "clients", "crmStats"] as const,
  },

  targets: {
    all: [...base, "targets"] as const,
    list: (params?: Record<string, unknown>) => [...base, "targets", "list", params] as const,
    myTargets: () => [...base, "targets", "myTargets"] as const,
    leaderboard: (metricType?: string) => [...base, "targets", "leaderboard", metricType] as const,
    history: (targetId: number) => [...base, "targets", "history", targetId] as const,
  },

  projects: {
    all: [...base, "projects"] as const,
    list: () => [...base, "projects", "list"] as const,
    detail: (id: number) => [...base, "projects", "detail", id] as const,
    sprints: (projectId?: number) => [...base, "projects", "sprints", projectId] as const,
    sprint: (id: number) => [...base, "projects", "sprints", "detail", id] as const,
    tickets: (params?: Record<string, unknown>) => [...base, "projects", "tickets", params] as const,
    ticket: (id: number) => [...base, "projects", "tickets", "detail", id] as const,
    members: (projectId?: number) => [...base, "projects", "members", projectId] as const,
    labels: (projectId?: number) => [...base, "projects", "labels", projectId] as const,
    timeEntries: (params?: Record<string, unknown>) => [...base, "projects", "timeEntries", params] as const,
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

  chat: {
    all: [...base, "chat"] as const,
    myChannels: () => [...base, "chat", "myChannels"] as const,
    channel: (id: number) => [...base, "chat", "channel", id] as const,
    messages: (channelId: number, cursor?: number) => [...base, "chat", "messages", channelId, cursor] as const,
    poll: (channelId: number, since: string) => [...base, "chat", "poll", channelId, since] as const,
    unreadTotal: () => [...base, "chat", "unreadTotal"] as const,
    onlineUsers: () => [...base, "chat", "onlineUsers"] as const,
    orgUsers: () => [...base, "chat", "orgUsers"] as const,
    search: (query: string) => [...base, "chat", "search", query] as const,
    typing: (channelId: number) => [...base, "chat", "typing", channelId] as const,
    messageReaders: (channelId: number, messageId: number) =>
      [...base, "chat", "messageReaders", channelId, messageId] as const,
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
    attendance: (params?: Record<string, unknown>) => [...base, "reports", "attendance", params] as const,
    payroll: (params?: Record<string, unknown>) => [...base, "reports", "payroll", params] as const,
    project: (params?: Record<string, unknown>) => [...base, "reports", "project", params] as const,
    teamPerformance: (params?: Record<string, unknown>) => [...base, "reports", "teamPerformance", params] as const,
    dashboardStats: () => [...base, "reports", "dashboardStats"] as const,
  },

  notifications: {
    all: [...base, "notifications"] as const,
    list: (unreadOnly?: boolean) => [...base, "notifications", "list", unreadOnly] as const,
    unreadCount: () => [...base, "notifications", "unreadCount"] as const,
  },

  invoice: {
    all: [...base, "invoice"] as const,
    list: (params?: Record<string, unknown>) => [...base, "invoice", "list", params] as const,
    detail: (id: number) => [...base, "invoice", "detail", id] as const,
    stats: () => [...base, "invoice", "stats"] as const,
  },

  support: {
    all: [...base, "support"] as const,
    list: (params?: Record<string, unknown>) => [...base, "support", "list", params] as const,
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
    emailTemplates: (params?: Record<string, unknown>) => [...base, "crmSettings", "emailTemplates", params] as const,
    scoringRules: () => [...base, "crmSettings", "scoringRules"] as const,
    slaPolicies: () => [...base, "crmSettings", "slaPolicies"] as const,
    slaReport: () => [...base, "crmSettings", "slaReport"] as const,
    slaBreachedLeads: (params?: Record<string, unknown>) => [...base, "crmSettings", "slaBreachedLeads", params] as const,
  },

  crmOrganizations: {
    all: [...base, "crmOrganizations"] as const,
    list: (params?: Record<string, unknown>) => [...base, "crmOrganizations", "list", params] as const,
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
    list: (params?: Record<string, unknown>) => [...base, "salesQuotas", "list", params] as const,
  },

  salesLeaderboard: {
    all: [...base, "salesLeaderboard"] as const,
    list: () => [...base, "salesLeaderboard", "list"] as const,
  },

  marketingCampaigns: {
    all: [...base, "marketingCampaigns"] as const,
    list: (params?: Record<string, unknown>) => [...base, "marketingCampaigns", "list", params] as const,
    detail: (id: number) => [...base, "marketingCampaigns", "detail", id] as const,
  },

  abTests: {
    all: [...base, "abTests"] as const,
    list: () => [...base, "abTests", "list"] as const,
    detail: (id: number) => [...base, "abTests", "detail", id] as const,
  },

  dmLeads: {
    all: [...base, "dmLeads"] as const,
    list: (params?: Record<string, unknown>) => [...base, "dmLeads", "list", params] as const,
    detail: (id: number) => [...base, "dmLeads", "detail", id] as const,
  },

  dmCampaigns: {
    all: [...base, "dmCampaigns"] as const,
    list: (params?: Record<string, unknown>) => [...base, "dmCampaigns", "list", params] as const,
    detail: (id: number) => [...base, "dmCampaigns", "detail", id] as const,
  },

  socialMedia: {
    all: [...base, "socialMedia"] as const,
    latest: () => [...base, "socialMedia", "latest"] as const,
  },

  socialMetrics: {
    all: [...base, "socialMetrics"] as const,
    list: (params?: Record<string, unknown>) => [...base, "socialMetrics", "list", params] as const,
  },

  auditLog: {
    all: [...base, "auditLog"] as const,
    list: (params?: Record<string, unknown>) => [...base, "auditLog", "list", params] as const,
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
    list: (params?: Record<string, unknown>) => [...base, "quotes", "list", params] as const,
    detail: (id: number) => [...base, "quotes", "detail", id] as const,
  },

  tasks: {
    all: [...base, "tasks"] as const,
    list: (params?: Record<string, unknown>) => [...base, "tasks", "list", params] as const,
    detail: (id: number) => [...base, "tasks", "detail", id] as const,
    myQueue: () => [...base, "tasks", "myQueue"] as const,
    overdue: () => [...base, "tasks", "overdue"] as const,
    overdueCount: () => [...base, "tasks", "overdueCount"] as const,
    sequences: () => [...base, "tasks", "sequences"] as const,
  },

} as const;
