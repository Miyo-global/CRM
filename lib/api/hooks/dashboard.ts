"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { UseQueryOptions } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import type {
  DashboardStats,
  RecentProject,
  TeamMember,
  SprintSummary,
  RecentActivity,
  MyIssue,
} from "@/types/dashboard";

export const useHrDashboardStats = (
  options?: Omit<UseQueryOptions<DashboardStats, Error>, "queryKey" | "queryFn">
) => {
  return useQuery<DashboardStats, Error>({
    queryKey: queryKeys.dashboard.stats(),
    queryFn: () => apiClient.get<DashboardStats>("/dashboard/stats"),
    staleTime: 5 * 60 * 1000,
    ...options,
  });
};

export const useDashboardStats = (
  options?: Omit<UseQueryOptions<DashboardStats, Error>, "queryKey" | "queryFn">
) => {
  return useQuery<DashboardStats, Error>({
    queryKey: queryKeys.dashboard.stats(),
    queryFn: () => apiClient.get<DashboardStats>("/dashboard/stats"),
    staleTime: 5 * 60 * 1000,
    ...options,
  });
};

export const useMyIssues = (
  userId: string,
  options?: Omit<UseQueryOptions<MyIssue[], Error>, "queryKey" | "queryFn" | "enabled">
) => {
  return useQuery<MyIssue[], Error>({
    queryKey: queryKeys.dashboard.myIssues(userId),
    queryFn: () =>
      apiClient.get<MyIssue[]>("/dashboard/my-issues", { userId, limit: "20" }),
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
    ...options,
  });
};

export const useRoleStats = (
  options?: Omit<UseQueryOptions<Record<string, number>, Error>, "queryKey" | "queryFn">
) => {
  return useQuery<Record<string, number>, Error>({
    queryKey: [...queryKeys.dashboard.all, "roleStats"] as const,
    queryFn: () => apiClient.get<Record<string, number>>("/dashboard/role-stats"),
    staleTime: 5 * 60 * 1000,
    ...options,
  });
};

interface ScheduledActivity {
  type: string;
  subject: string | null;
}

export const useTodayActivities = (
  options?: Omit<UseQueryOptions<ScheduledActivity[], Error>, "queryKey" | "queryFn">
) => {
  return useQuery<ScheduledActivity[], Error>({
    queryKey: [...queryKeys.dashboard.all, "todayActivities"] as const,
    queryFn: () => apiClient.get<ScheduledActivity[]>("/dashboard/today-activities"),
    staleTime: 5 * 60 * 1000,
    ...options,
  });
};

export const useRecentProjects = (
  options?: Omit<
    UseQueryOptions<RecentProject[], Error>,
    "queryKey" | "queryFn"
  >
) => {
  return useQuery<RecentProject[], Error>({
    queryKey: queryKeys.dashboard.recentProjects(),
    queryFn: () => apiClient.get<RecentProject[]>("/dashboard/recent-projects"),
    staleTime: 5 * 60 * 1000,
    ...options,
  });
};

export const useTeamAvailability = (
  options?: Omit<UseQueryOptions<TeamMember[], Error>, "queryKey" | "queryFn">
) => {
  return useQuery<TeamMember[], Error>({
    queryKey: queryKeys.dashboard.teamAvailability(),
    queryFn: () => apiClient.get<TeamMember[]>("/dashboard/team-availability"),
    refetchInterval: 30_000,
    staleTime: 15_000,
    ...options,
  });
};

export const useActiveSprintSummary = (
  options?: Omit<
    UseQueryOptions<SprintSummary | null, Error>,
    "queryKey" | "queryFn"
  >
) => {
  return useQuery<SprintSummary | null, Error>({
    queryKey: queryKeys.dashboard.activeSprintSummary(),
    queryFn: () =>
      apiClient.get<SprintSummary | null>("/dashboard/active-sprint"),
    staleTime: 5 * 60 * 1000,
    ...options,
  });
};

export const useRecentActivity = (
  options?: Omit<
    UseQueryOptions<RecentActivity[], Error>,
    "queryKey" | "queryFn"
  >
) => {
  return useQuery<RecentActivity[], Error>({
    queryKey: queryKeys.dashboard.recentActivity(),
    queryFn: () =>
      apiClient.get<RecentActivity[]>("/dashboard/recent-activity"),
    staleTime: 5 * 60 * 1000,
    ...options,
  });
};

export interface LeaveToday {
  id: number;
  startDate: string;
  endDate: string;
  leaveTypeId: number | null;
  employeeName: string | null;
  employeeDesignation: string | null;
  employeeImage: string | null;
}

export interface UpcomingLeave {
  id: number;
  userId: string;
  startDate: string;
  endDate: string;
  leaveType: string | null;
  userName: string | null;
  userImage: string | null;
  userDesignation: string | null;
  reason?: string | null;
  isHalfDay?: boolean | null;
  halfDayPeriod?: string | null;
}

export interface UpcomingHoliday {
  id: number;
  name: string;
  date: string;
  message: string | null;
}

export interface LeaveBalance {
  id: number;
  balance: string;
  year: number;
  leaveTypeName: string | null;
  daysPerYear: number | null;
}

export interface BirthdayEntry {
  id: string;
  name: string | null;
  designation: string | null;
  image: string | null;
  type: "birthday" | "anniversary";
  date: string;
  yearsCompleted?: number;
}

export interface PendingApprovalsCount {
  pendingLeaves: number;
  pendingResignations: number;
  total: number;
}

export interface PendingRequest {
  id: number;
  startDate: string;
  endDate: string;
  status: string;
  reason: string | null;
  createdAt: string | null;
  leaveTypeName: string;
}

export interface TeamAttendance {
  total: number;
  present: number;
  clockedIn: number;
  absent: number;
  records: {
    userId: string;
    userName: string | null;
    userImage: string | null;
    userDesignation: string | null;
    checkIn: string | null;
    checkOut: string | null;
    status: string | null;
  }[];
}

const hrWidgetKeys = {
  leavesToday: [...queryKeys.dashboard.all, "leavesToday"] as const,
  upcomingLeaves: [...queryKeys.dashboard.all, "upcomingLeaves"] as const,
  upcomingHolidays: [...queryKeys.dashboard.all, "upcomingHolidays"] as const,
  myLeaveBalance: [...queryKeys.dashboard.all, "myLeaveBalance"] as const,
  pendingRequests: [...queryKeys.dashboard.all, "pendingRequests"] as const,
  birthdays: [...queryKeys.dashboard.all, "birthdays"] as const,
  pendingApprovals: [...queryKeys.dashboard.all, "pendingApprovals"] as const,
  teamAttendance: [...queryKeys.dashboard.all, "teamAttendance"] as const,
};

export const useLeavesToday = (
  options?: Omit<UseQueryOptions<LeaveToday[], Error>, "queryKey" | "queryFn">
) =>
  useQuery<LeaveToday[], Error>({
    queryKey: hrWidgetKeys.leavesToday,
    queryFn: () => apiClient.get<LeaveToday[]>("/dashboard/leaves-today"),
    staleTime: 60_000,
    refetchInterval: 60_000,
    ...options,
  });

export const useUpcomingLeaves = (
  options?: Omit<UseQueryOptions<UpcomingLeave[], Error>, "queryKey" | "queryFn">
) =>
  useQuery<UpcomingLeave[], Error>({
    queryKey: hrWidgetKeys.upcomingLeaves,
    queryFn: () => apiClient.get<UpcomingLeave[]>("/dashboard/upcoming-leaves"),
    staleTime: 60_000,
    refetchInterval: 60_000,
    ...options,
  });

export const useUpcomingHolidays = () =>
  useQuery<UpcomingHoliday[]>({
    queryKey: hrWidgetKeys.upcomingHolidays,
    queryFn: () => apiClient.get<UpcomingHoliday[]>("/dashboard/upcoming-holidays"),
    staleTime: 5 * 60_000,
  });

export const useMyLeaveBalance = () =>
  useQuery<LeaveBalance[]>({
    queryKey: hrWidgetKeys.myLeaveBalance,
    queryFn: () => apiClient.get<LeaveBalance[]>("/dashboard/my-leave-balance"),
    staleTime: 5 * 60_000,
  });

export const useBirthdays = (
  options?: Omit<UseQueryOptions<BirthdayEntry[], Error>, "queryKey" | "queryFn">
) =>
  useQuery<BirthdayEntry[], Error>({
    queryKey: hrWidgetKeys.birthdays,
    queryFn: () => apiClient.get<BirthdayEntry[]>("/dashboard/birthdays"),
    staleTime: 5 * 60_000,
    refetchInterval: 60_000,
    ...options,
  });

export const usePendingRequests = (
  options?: Omit<UseQueryOptions<PendingRequest[], Error>, "queryKey" | "queryFn">
) =>
  useQuery<PendingRequest[], Error>({
    queryKey: hrWidgetKeys.pendingRequests,
    queryFn: () => apiClient.get<PendingRequest[]>("/dashboard/pending-requests"),
    staleTime: 60_000,
    refetchInterval: 60_000,
    ...options,
  });

export const usePendingApprovals = (
  options?: Omit<UseQueryOptions<PendingApprovalsCount, Error>, "queryKey" | "queryFn">
) =>
  useQuery<PendingApprovalsCount, Error>({
    queryKey: hrWidgetKeys.pendingApprovals,
    queryFn: () => apiClient.get<PendingApprovalsCount>("/dashboard/pending-approvals"),
    staleTime: 60_000,
    refetchInterval: 60_000,
    ...options,
  });

export const useTeamAttendance = () =>
  useQuery<TeamAttendance>({
    queryKey: hrWidgetKeys.teamAttendance,
    queryFn: () => apiClient.get<TeamAttendance>("/dashboard/team-attendance"),
    staleTime: 60_000,
    refetchInterval: 60_000,
  });

export interface Announcement {
  id: number;
  content: string;
  isPinned: boolean;
  expiresAt: string | null;
  createdAt: string;
  authorId: string;
  authorName: string | null;
  authorFirstName: string | null;
  authorLastName: string | null;
}

export interface PersonalDashboard {
  myTasks: { id: number; title: string; status: string; priority: string | null; dueDate: string | null; projectName: string | null }[];
  timesheetStatus: { submitted: boolean; weekLabel: string; hoursLogged: number };
  leaveBalance: { type: string; remaining: number; total: number }[];
  upcomingEvents: { id: number; title: string; startTime: Date; endTime: Date; type: string }[];
  unreadNotifications: number;
}

export interface ExecutiveDashboard {
  mrr: number;
  pipelineValue: number;
  headcount: number;
  openRoles: number;
  newLeadsThisWeek: number;
  activeProjects: number;
  conversionRate: number;
}

export interface ManagerDashboard {
  teamAttendanceToday: { userId: string; name: string; status: "present" | "absent" | "leave" }[];
  pendingLeaveApprovals: number;
  pendingExpenseApprovals: number;
  teamOverdueTasks: number;
}

export const useAnnouncements = (
  options?: Omit<UseQueryOptions<Announcement[], Error>, "queryKey" | "queryFn">
) =>
  useQuery<Announcement[], Error>({
    queryKey: queryKeys.dashboard.announcements(),
    queryFn: () => apiClient.get<Announcement[]>("/dashboard/announcements"),
    staleTime: 60_000,
    ...options,
  });

export const useCreateAnnouncement = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { content: string; isPinned?: boolean; expiresAt?: string }) =>
      apiClient.post<Announcement>("/dashboard/announcements", body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.dashboard.announcements() });
    },
  });
};

export const useDeleteAnnouncement = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      apiClient.delete<{ success: boolean }>(`/dashboard/announcements?id=${id}`),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.dashboard.announcements() });
    },
  });
};

export const usePersonalDashboard = (
  options?: Omit<UseQueryOptions<PersonalDashboard, Error>, "queryKey" | "queryFn">
) =>
  useQuery<PersonalDashboard, Error>({
    queryKey: queryKeys.dashboard.personal(),
    queryFn: () => apiClient.get<PersonalDashboard>("/dashboard/personal"),
    staleTime: 2 * 60_000,
    ...options,
  });

export const useExecutiveDashboard = (
  options?: Omit<UseQueryOptions<ExecutiveDashboard, Error>, "queryKey" | "queryFn">
) =>
  useQuery<ExecutiveDashboard, Error>({
    queryKey: queryKeys.dashboard.executive(),
    queryFn: () => apiClient.get<ExecutiveDashboard>("/dashboard/executive"),
    staleTime: 5 * 60_000,
    ...options,
  });

export const useManagerDashboard = (
  options?: Omit<UseQueryOptions<ManagerDashboard, Error>, "queryKey" | "queryFn">
) =>
  useQuery<ManagerDashboard, Error>({
    queryKey: queryKeys.dashboard.manager(),
    queryFn: () => apiClient.get<ManagerDashboard>("/dashboard/manager"),
    staleTime: 60_000,
    refetchInterval: 60_000,
    ...options,
  });
