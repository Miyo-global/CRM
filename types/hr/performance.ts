import { ReviewStatus } from "./common";

export interface RatingEntry {
  category: string;
  score: number;
  comment?: string;
}

export interface GoalEntry {
  goal: string;
  achieved: boolean;
}

export type ReviewCycleStatus = "DRAFT" | "ACTIVE" | "COMPLETED" | "CANCELLED";
export type MeetingStatus = "SCHEDULED" | "COMPLETED" | "CANCELLED" | "NO_SHOW";

export interface ReviewCycle {
  id: number;
  orgId: string;
  name: string;
  type: string | null;
  periodStart: string;
  periodEnd: string;
  deadline: string | null;
  status: ReviewCycleStatus | null;
  description: string | null;
  createdBy: string | null;
  createdAt: Date | string | null;
  updatedAt: Date | string | null;
  _count?: { reviews?: number };
}

export interface PerformanceReview {
  id: number;
  orgId: string;
  userId: string;
  reviewerId: string | null;
  cycleId: number | null;
  periodStart: string;
  periodEnd: string;
  status: ReviewStatus | null;
  ratings: RatingEntry[] | null;
  strengths: string | null;
  improvements: string | null;
  goals: GoalEntry[] | null;
  overallRating: string | null;
  comments: string | null;
  createdAt: Date | string | null;
  updatedAt: Date | string | null;
  user?: { id: string; name: string | null; image: string | null } | null;
  reviewer?: { id: string; name: string | null } | null;
  cycle?: ReviewCycle | null;
}

export interface OneOnOneMeeting {
  id: number;
  orgId: string;
  managerId: string;
  employeeId: string;
  scheduledAt: Date | string;
  duration: number | null;
  status: MeetingStatus | null;
  notes: string | null;
  actionItems: { text: string; done: boolean }[] | null;
  agenda: string | null;
  meetingLink: string | null;
  createdAt: Date | string | null;
  updatedAt: Date | string | null;
  manager?: { id: string; name: string | null; image: string | null } | null;
  employee?: { id: string; name: string | null; image: string | null } | null;
}

export interface Goal {
  id: number;
  orgId: string;
  userId: string;
  title: string;
  description: string | null;
  type: string | null;
  targetValue: string | null;
  currentValue: string | null;
  unit: string | null;
  startDate: string;
  endDate: string;
  status: string | null;
  progress: number | null;
  parentGoalId: number | null;
  createdAt: Date | string | null;
  updatedAt: Date | string | null;
}

export interface CreateReviewCycleInput {
  name: string;
  type?: string;
  periodStart: string;
  periodEnd: string;
  deadline?: string;
  description?: string;
}

export interface UpdateReviewCycleInput {
  name?: string;
  type?: string;
  periodStart?: string;
  periodEnd?: string;
  deadline?: string;
  status?: ReviewCycleStatus;
  description?: string;
}

export interface CreatePerformanceReviewInput {
  userId: string;
  reviewerId?: string;
  cycleId?: number;
  periodStart: Date | string;
  periodEnd: Date | string;
  ratings?: RatingEntry[];
  strengths?: string;
  improvements?: string;
  goals?: GoalEntry[];
  overallRating?: number;
  comments?: string;
}

export interface UpdatePerformanceReviewInput {
  ratings?: RatingEntry[];
  strengths?: string;
  improvements?: string;
  goals?: GoalEntry[];
  overallRating?: number;
  comments?: string;
  status?: ReviewStatus;
}

export interface CreateOneOnOneInput {
  employeeId: string;
  scheduledAt: string;
  duration?: number;
  agenda?: string;
  meetingLink?: string;
  additionalParticipantIds?: string[];
}

export interface UpdateOneOnOneInput {
  scheduledAt?: string;
  duration?: number;
  status?: MeetingStatus;
  notes?: string;
  actionItems?: { text: string; done: boolean }[];
  agenda?: string;
  meetingLink?: string;
}

export interface CreateGoalInput {
  userId: string;
  title: string;
  description?: string;
  type?: string;
  targetValue?: number;
  currentValue: number;
  unit?: string;
  startDate: Date | string;
  endDate: Date | string;
  parentGoalId?: number;
}

export interface UpdateGoalInput {
  goalId: number;
  title?: string;
  description?: string;
  targetValue?: number;
  currentValue?: number;
  status?: string;
  progress?: number;
}
