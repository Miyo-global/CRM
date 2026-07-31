"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";

export interface HrDashboardMetrics {
  totalEmployees: number;
  activeEmployees: number;
  onLeaveToday: number;
  pendingLeaveRequests: number;
  openPositions: number;
  monthlyHires: number;
  upcomingBirthdays: {
    id: string;
    name: string | null;
    firstName: string | null;
    lastName: string | null;
    image: string | null;
    dateOfBirth: string;
    daysUntil: number;
    birthdayMonthDay: string | null;
  }[];
}

export interface HrHeadcountTrends {
  trends: { month: string; count: number }[];
}

export interface HrLeaveCalendarEntry {
  id: number;
  userId: string;
  userName: string;
  userImage: string | null;
  startDate: string;
  endDate: string;
  leaveType: string;
  status: string;
}

export interface HrHeadcountGroup {
  label: string;
  count: number;
}

export function useHrDashboardMetrics() {
  return useQuery({
    queryKey: ["miyoglobal", "hr", "dashboard", "metrics"] as const,
    queryFn: () => apiClient.get<HrDashboardMetrics>("/hr/dashboard/metrics"),
    staleTime: 60_000,
  });
}

export function useHrHeadcountTrends() {
  return useQuery({
    queryKey: ["miyoglobal", "hr", "dashboard", "headcount-trends"] as const,
    queryFn: () => apiClient.get<HrHeadcountTrends>("/hr/dashboard/headcount-trends"),
    staleTime: 120_000,
  });
}

export function useHrLeaveCalendar(month?: number, year?: number) {
  const params = new URLSearchParams();
  if (month !== undefined) params.set("month", String(month));
  if (year !== undefined) params.set("year", String(year));
  const qs = params.toString();

  return useQuery({
    queryKey: ["miyoglobal", "hr", "leave-calendar", month, year] as const,
    queryFn: () =>
      apiClient.get<HrLeaveCalendarEntry[]>(`/hr/leave-calendar${qs ? `?${qs}` : ""}`),
    staleTime: 60_000,
  });
}

export function useHrHeadcount(groupBy: "department" | "role" | "branch" = "department") {
  return useQuery({
    queryKey: ["miyoglobal", "hr", "headcount", groupBy] as const,
    queryFn: () =>
      apiClient.get<HrHeadcountGroup[]>(`/hr/headcount?groupBy=${groupBy}`),
    staleTime: 120_000,
  });
}

export interface HrOnboardingStatus {
  inProgress: number;
  completed: number;
  total: number;
  completionPct: number;
  newHires: {
    userId: string;
    name: string;
    completedTasks: number;
    totalTasks: number;
    pct: number;
  }[];
}

export function useHrOnboardingStatus() {
  return useQuery({
    queryKey: ["miyoglobal", "hr", "dashboard", "onboarding-status"] as const,
    queryFn: () => apiClient.get<HrOnboardingStatus>("/hr/dashboard/onboarding-status"),
    staleTime: 60_000,
  });
}

export interface HrDiversityMetrics {
  genderBreakdown: { gender: string; count: number }[];
  ageDistribution: { range: string; count: number }[];
}

export function useHrDiversityMetrics() {
  return useQuery({
    queryKey: ["miyoglobal", "hr", "dashboard", "diversity"] as const,
    queryFn: () => apiClient.get<HrDiversityMetrics>("/hr/dashboard/diversity"),
    staleTime: 300_000,
  });
}

export interface HrTimeToFill {
  avgDaysOverall: number | null;
  byDepartment: { department: string; avgDays: number; filledCount: number }[];
}

export function useHrTimeToFill() {
  return useQuery({
    queryKey: ["miyoglobal", "hr", "dashboard", "time-to-fill"] as const,
    queryFn: () => apiClient.get<HrTimeToFill>("/hr/dashboard/time-to-fill"),
    staleTime: 300_000,
  });
}

export interface HrPayrollSummary {
  month: string;
  totalGross: number;
  totalNet: number;
  totalDeductions: number;
  employeeCount: number;
  prevMonthNet: number;
  momChangePct: number | null;
}

export function useHrPayrollSummary() {
  return useQuery({
    queryKey: ["miyoglobal", "hr", "dashboard", "payroll-summary"] as const,
    queryFn: () => apiClient.get<HrPayrollSummary>("/hr/dashboard/payroll-summary"),
    staleTime: 120_000,
  });
}

export interface HrSalaryBands {
  byDepartment: {
    department: string;
    avgAnnual: number;
    minAnnual: number;
    maxAnnual: number;
    employeeCount: number;
  }[];
  bandDistribution: { label: string; count: number }[];
}

export function useHrSalaryBands() {
  return useQuery({
    queryKey: ["miyoglobal", "hr", "dashboard", "salary-bands"] as const,
    queryFn: () => apiClient.get<HrSalaryBands>("/hr/dashboard/salary-bands"),
    staleTime: 300_000,
  });
}

export interface HrCompliance {
  total: number;
  overallCompliant: number;
  overallPct: number;
  checks: { label: string; compliant: number; missing: number; pct: number }[];
}

export function useHrCompliance() {
  return useQuery({
    queryKey: ["miyoglobal", "hr", "dashboard", "compliance"] as const,
    queryFn: () => apiClient.get<HrCompliance>("/hr/dashboard/compliance"),
    staleTime: 120_000,
  });
}
