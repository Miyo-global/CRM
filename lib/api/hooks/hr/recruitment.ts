"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import type {
  JobPosting,
  Candidate,
  CandidateApplication,
  CandidateStatus,
  AtsPipelineResponse,
  Interview,
  RecruitmentStats,
  CreateJobPostingInput,
  UpdateJobPostingInput,
  CreateCandidateInput,
  UpdateCandidateInput,
  CreateInterviewInput,
  UpdateInterviewInput,
} from "@/types/hr";
import type { JobOpeningInput } from "@/lib/validations/job-opening";

export function useRecruitmentStats() {
  return useQuery({
    queryKey: queryKeys.hr.recruitmentStats(),
    queryFn: () => apiClient.get<RecruitmentStats>("/hr/recruitment/stats"),
  });
}

export function useJobPostings(params?: { status?: string }) {
  return useQuery({
    queryKey: queryKeys.hr.jobPostings(params as Record<string, unknown> | undefined),
    queryFn: () =>
      apiClient.get<JobPosting[]>("/hr/recruitment/jobs", params as Record<string, unknown> | undefined),
  });
}

export function useJobPosting(id: number) {
  return useQuery({
    queryKey: queryKeys.hr.jobPosting(id),
    queryFn: () => apiClient.get<JobPosting>(`/hr/recruitment/jobs/${id}`),
    enabled: !!id,
  });
}

export function useCreateJobPosting() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateJobPostingInput) =>
      apiClient.post<JobPosting>("/hr/recruitment/jobs", data),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: queryKeys.hr.jobPostings() }),
  });
}

export function useUpdateJobOpening() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: import("@/lib/validations/job-opening").JobOpeningUpdateInput & { id: number }) =>
      apiClient.patch<JobPosting>(`/hr/recruitment/jobs/${id}`, data),
    onSuccess: (_data, { id }) => {
      qc.invalidateQueries({ queryKey: queryKeys.hr.jobPostings() });
      qc.invalidateQueries({ queryKey: queryKeys.hr.jobPosting(id) });
      qc.invalidateQueries({ queryKey: queryKeys.hr.recruitmentStats() });
    },
  });
}

export function useCreateJobOpening() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: JobOpeningInput) =>
      apiClient.post<JobPosting>("/hr/recruitment/jobs", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.hr.jobPostings() }),
  });
}

export function useUpdateJobPosting() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: UpdateJobPostingInput & { id: number }) =>
      apiClient.patch<{ success: boolean }>(`/hr/recruitment/jobs/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.hr.jobPostings() });
      qc.invalidateQueries({ queryKey: queryKeys.hr.recruitmentStats() });
    },
  });
}

export function useDeleteJobPosting() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      apiClient.delete<{ success: boolean }>(`/hr/recruitment/jobs/${id}`),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: queryKeys.hr.jobPostings() }),
  });
}

export function useCandidates(
  params?: { status?: string; jobId?: number; source?: string },
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: queryKeys.hr.candidates(params as Record<string, unknown> | undefined),
    queryFn: () =>
      apiClient.get<import("@/types/hr").CandidateListItem[]>(
        "/hr/recruitment/candidates",
        params as Record<string, unknown> | undefined,
      ),
    enabled: options?.enabled !== false,
  });
}

export interface AiScoreBreakdown {
  technicalSkills: number;
  experience: number;
  communication: number;
  cultureFit: number;
  leadership: number;
}

export interface AiScoreResult {
  overall: number;
  breakdown: AiScoreBreakdown;
  summary: string;
}

export function useCandidate(id: number) {
  return useQuery({
    queryKey: queryKeys.hr.candidate(id),
    queryFn: () =>
      apiClient.get<
        Candidate & {
          applications?: CandidateApplication[];
          interviews?: Interview[];
          slaTracking?: CandidateSlaRecord[];
        }
      >(`/hr/recruitment/candidates/${id}`),
    enabled: !!id,
  });
}

export function useGenerateCandidateAiScore() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (candidateId: number) =>
      apiClient.post<AiScoreResult>(
        `/hr/recruitment/candidates/${candidateId}/ai-score`,
        {}
      ),
    onSuccess: (_data, candidateId) => {
      qc.invalidateQueries({ queryKey: queryKeys.hr.candidate(candidateId) });
      qc.invalidateQueries({ queryKey: queryKeys.hr.candidates() });
    },
  });
}

export function useCreateCandidate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateCandidateInput) =>
      apiClient.post<Candidate>("/hr/recruitment/candidates", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [...queryKeys.hr.all, "candidates"] });
      qc.invalidateQueries({ queryKey: queryKeys.hr.recruitmentStats() });
      qc.invalidateQueries({ queryKey: ATS_KANBAN_KEY });
    },
  });
}

export function useUpdateCandidate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: UpdateCandidateInput & { id: number }) =>
      apiClient.patch<{ success: boolean }>(`/hr/recruitment/candidates/${id}`, data),
    onSuccess: (_data, { id }) => {
      qc.invalidateQueries({ queryKey: [...queryKeys.hr.all, "candidates"] });
      qc.invalidateQueries({ queryKey: queryKeys.hr.candidate(id) });
      qc.invalidateQueries({ queryKey: queryKeys.hr.recruitmentPipeline() });
      qc.invalidateQueries({ queryKey: ATS_KANBAN_KEY });
    },
  });
}

export function useDeleteCandidate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      apiClient.delete<{ success: boolean }>(`/hr/recruitment/candidates/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [...queryKeys.hr.all, "candidates"] });
      qc.invalidateQueries({ queryKey: queryKeys.hr.recruitmentStats() });
      qc.invalidateQueries({ queryKey: queryKeys.hr.recruitmentPipeline() });
      qc.invalidateQueries({ queryKey: ATS_KANBAN_KEY });
    },
  });
}

export function useCreateApplication() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ candidateId, ...data }: { candidateId: number; jobPostingId: number; coverLetter?: string }) =>
      apiClient.post<CandidateApplication>(
        `/hr/recruitment/candidates/${candidateId}/applications`,
        data
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [...queryKeys.hr.all, "candidates"] });
      qc.invalidateQueries({ queryKey: queryKeys.hr.jobPostings() });
    },
  });
}

export function useInterviews(params?: { candidateId?: number; upcoming?: boolean }) {
  return useQuery({
    queryKey: queryKeys.hr.interviews(params as Record<string, unknown> | undefined),
    queryFn: () =>
      apiClient.get<Interview[]>("/hr/recruitment/interviews", params as Record<string, unknown> | undefined),
  });
}

export function useCreateInterview() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateInterviewInput) =>
      apiClient.post<Interview>("/hr/recruitment/interviews", {
        ...data,
        scheduledAt: new Date(data.scheduledAt).toISOString(),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.hr.interviews() });
      qc.invalidateQueries({ queryKey: queryKeys.hr.recruitmentStats() });
    },
  });
}

export function useUpdateInterview() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: UpdateInterviewInput & { id: number }) =>
      apiClient.patch<{ success: boolean }>(`/hr/recruitment/interviews/${id}`, data),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: queryKeys.hr.interviews() }),
  });
}

export function useDeleteInterview() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      apiClient.delete<{ success: boolean }>(`/hr/recruitment/interviews/${id}`),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: queryKeys.hr.interviews() }),
  });
}

export function useRecruitmentPipeline() {
  return useQuery({
    queryKey: queryKeys.hr.recruitmentPipeline(),
    queryFn: () =>
      apiClient.get<Record<string, Candidate[]>>("/hr/recruitment/pipeline"),
  });
}

const ATS_KANBAN_KEY = ["miyoglobal", "hr", "atsKanban"] as const;


export function useAtsKanban() {
  return useQuery({
    queryKey: ATS_KANBAN_KEY,
    queryFn: () => apiClient.get<AtsPipelineResponse>("/hr/recruitment/pipeline"),
  });
}


export function useUpdateCandidateStage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      candidateId,
      stage,
      sendEmail,
    }: {
      candidateId: number;
      stage: CandidateStatus;
      sendEmail?: boolean;
    }) =>
      apiClient.patch<{ id: number; stage: CandidateStatus; changed: boolean }>(
        `/hr/recruitment/candidates/${candidateId}/stage`,
        { stage, sendEmail: sendEmail ?? false },
      ),
    onMutate: async ({ candidateId, stage }) => {
      await qc.cancelQueries({ queryKey: ATS_KANBAN_KEY });
      await qc.cancelQueries({ queryKey: [...queryKeys.hr.all, "candidates"] });
      await qc.cancelQueries({ queryKey: queryKeys.hr.candidate(candidateId) });

      const previous = qc.getQueryData<AtsPipelineResponse>(ATS_KANBAN_KEY);
      const previousCandidatesLists = qc.getQueriesData<Candidate[]>({
        queryKey: [...queryKeys.hr.all, "candidates"],
      });
      const previousCandidate = qc.getQueryData<
        Candidate & {
          applications?: CandidateApplication[];
          interviews?: Interview[];
          slaTracking?: CandidateSlaRecord[];
        }
      >(queryKeys.hr.candidate(candidateId));

      if (previous) {
        const next: AtsPipelineResponse = {
          stages: previous.stages.map((s) => {
            const withoutCandidate = s.candidates.filter((c) => c.id !== candidateId);
            if (s.stage !== stage) return { ...s, candidates: withoutCandidate };
            const moved = previous.stages
              .flatMap((st) => st.candidates)
              .find((c) => c.id === candidateId);
            return moved
              ? { ...s, candidates: [moved, ...withoutCandidate] }
              : { ...s, candidates: withoutCandidate };
          }),
        };
        qc.setQueryData<AtsPipelineResponse>(ATS_KANBAN_KEY, next);
      }

      qc.setQueriesData<Candidate[]>(
        { queryKey: [...queryKeys.hr.all, "candidates"] },
        (old) => old?.map((c) => (c.id === candidateId ? { ...c, status: stage } : c)),
      );

      if (previousCandidate) {
        qc.setQueryData(queryKeys.hr.candidate(candidateId), {
          ...previousCandidate,
          status: stage,
        });
      }

      return { previous, previousCandidatesLists, previousCandidate };
    },
    onError: (_err, { candidateId }, context) => {
      if (context?.previous) {
        qc.setQueryData(ATS_KANBAN_KEY, context.previous);
      }
      if (context?.previousCandidatesLists) {
        for (const [queryKey, data] of context.previousCandidatesLists) {
          qc.setQueryData(queryKey, data);
        }
      }
      if (context?.previousCandidate) {
        qc.setQueryData(queryKeys.hr.candidate(candidateId), context.previousCandidate);
      }
    },
    onSettled: (_data, _err, { candidateId }) => {
      void qc.invalidateQueries({ queryKey: ATS_KANBAN_KEY });
      void qc.invalidateQueries({ queryKey: queryKeys.hr.recruitmentPipeline() });
      void qc.invalidateQueries({ queryKey: queryKeys.hr.recruitmentStats() });
      void qc.invalidateQueries({ queryKey: [...queryKeys.hr.all, "candidates"] });
      void qc.invalidateQueries({ queryKey: queryKeys.hr.candidate(candidateId) });
    },
  });
}



export interface VaultDocument {
  id: number;
  candidateId: number;
  orgId: string;
  filename: string;
  s3Key: string;
  fileUrl: string;
  fileType: string;
  fileSize: number;
  documentType: string | null;
  avResult: "PENDING" | "CLEAN" | "INFECTED" | null;
  expiresAt: string | null;
  uploadedBy: string;
  createdAt: string | null;
}

export type BgvStatus = "NOT_INITIATED" | "INITIATED" | "PENDING" | "CLEARED" | "FAILED";

export interface ScheduleInterviewInput {
  candidateId: number;
  jobPostingId?: number;
  scheduledAt: string;
  durationMinutes?: number;
  format?: "VIDEO" | "PHONE" | "IN_PERSON";
  meetingLink?: string;
  location?: string;
  interviewers: string[];
  notes?: string;
  createMeet?: boolean;
  notifyChannels?: { email: boolean; whatsapp: boolean };
}

export function useScheduleInterview() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: ScheduleInterviewInput) =>
      apiClient.post<Interview>("/hr/recruitment/interviews/schedule", {
        ...data,
        scheduledAt: new Date(data.scheduledAt).toISOString(),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.hr.interviews() });
      qc.invalidateQueries({ queryKey: queryKeys.hr.recruitmentStats() });
    },
  });
}


export interface InterviewSla {
  id: number;
  orgId: string;
  stage: string;
  maxHours: number;
  warningHours: number;
  createdAt: string | null;
}

const INTERVIEW_SLAS_KEY = ["miyoglobal", "hr", "interviewSlas"] as const;

export function useInterviewSlas() {
  return useQuery({
    queryKey: INTERVIEW_SLAS_KEY,
    queryFn: () => apiClient.get<InterviewSla[]>("/hr/recruitment/interviews/slas"),
  });
}

export function useUpsertInterviewSla() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { stage: string; maxHours: number; warningHours: number }) =>
      apiClient.put<InterviewSla>("/hr/recruitment/interviews/slas", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: INTERVIEW_SLAS_KEY }),
  });
}


export interface CandidateSlaRecord {
  id: number;
  orgId: string;
  candidateId: number;
  stage: string;
  enteredAt: string;
  breachedAt: string | null;
  status: "ON_TRACK" | "AT_RISK" | "BREACHED";
  updatedAt: string | null;
}

export function useCandidateSla(candidateId: number) {
  return useQuery({
    queryKey: ["miyoglobal", "hr", "candidateSla", candidateId],
    queryFn: () =>
      apiClient.get<CandidateSlaRecord[]>(`/hr/recruitment/candidates/${candidateId}/sla`),
    enabled: !!candidateId,
  });
}

export function useResetCandidateSla() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ candidateId, stage }: { candidateId: number; stage: string }) =>
      apiClient.patch<CandidateSlaRecord>(
        `/hr/recruitment/candidates/${candidateId}/sla`,
        { stage }
      ),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["miyoglobal", "hr", "candidateSla", vars.candidateId] });
      qc.invalidateQueries({ queryKey: ["miyoglobal", "hr", "atsKanban"] });
    },
  });
}


export function useCandidateVault(candidateId: number) {
  return useQuery({
    queryKey: queryKeys.hr.candidateVault(candidateId),
    queryFn: () =>
      apiClient.get<VaultDocument[]>(`/hr/recruitment/candidates/${candidateId}/vault`),
    enabled: !!candidateId,
  });
}

export type VaultDocumentType = "AADHAR" | "PAN" | "PASSPORT" | "CERTIFICATE" | "OFFER_LETTER" | "OTHER";

export function useAddVaultDocument(candidateId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      filename: string;
      s3Key: string;
      fileUrl: string;
      fileType: string;
      fileSize: number;
      documentType?: VaultDocumentType;
    }) =>
      apiClient.post<VaultDocument>(`/hr/recruitment/candidates/${candidateId}/vault`, data),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: queryKeys.hr.candidateVault(candidateId) }),
  });
}

export function useDeleteVaultDocument(candidateId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (documentId: number) =>
      apiClient.delete<{ success: boolean }>(
        `/hr/recruitment/candidates/${candidateId}/vault/${documentId}`
      ),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: queryKeys.hr.candidateVault(candidateId) }),
  });
}


export interface RolloutDocumentRecord {
  id: number;
  templateId: number | null;
  templateTitle: string | null;
  title: string;
  status: string;
  sentAt: string | null;
  viewedAt: string | null;
  signedAt: string | null;
  declinedAt: string | null;
  createdAt: string | null;
  createdBy: string;
}

export interface RolloutDocumentsInput {
  templateIds: number[];
  variables: Record<string, string>;
  sendEmail: boolean;
}

export interface RolloutDocumentsResult {
  documents: RolloutDocumentRecord[];
  count: number;
}

export function useRolloutDocuments(candidateId: number) {
  return useQuery({
    queryKey: queryKeys.hr.rolloutDocuments(candidateId),
    queryFn: () =>
      apiClient.get<RolloutDocumentRecord[]>(
        `/hr/recruitment/candidates/${candidateId}/rollout-documents`
      ),
    enabled: !!candidateId,
  });
}

export function useGenerateAndRollout(candidateId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: RolloutDocumentsInput) =>
      apiClient.post<RolloutDocumentsResult>(
        `/hr/recruitment/candidates/${candidateId}/rollout-documents`,
        data
      ),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.hr.rolloutDocuments(candidateId) });
      void qc.invalidateQueries({ queryKey: queryKeys.hr.candidateDocuments(candidateId) });
    },
  });
}


export interface SlaReportStage {
  stage: string;
  total: number;
  breached: number;
  breachPct: number;
}

export interface SlaReportMonth {
  month: string;
  label: string;
  stages: SlaReportStage[];
  overall: { total: number; breached: number; breachPct: number };
}

export interface SlaReportStageSummary {
  stage: string;
  avgBreachPct: number;
  totalBreached: number;
  totalAll: number;
}

export interface HrSlaReport {
  report: SlaReportMonth[];
  stages: string[];
  stageSummary: SlaReportStageSummary[];
}

const SLA_REPORT_KEY = ["miyoglobal", "hr", "slaReport"] as const;

export function useHrSlaReport() {
  return useQuery({
    queryKey: SLA_REPORT_KEY,
    queryFn: () => apiClient.get<HrSlaReport>("/hr/recruitment/interviews/sla-report"),
  });
}


export function useBulkRescheduleInterviews() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ ids, scheduledAt }: { ids: number[]; scheduledAt: string }) => {
      await Promise.all(
        ids.map((id) =>
          apiClient.patch<{ success: boolean }>(`/hr/recruitment/interviews/${id}`, { scheduledAt })
        )
      );
      return { rescheduled: ids.length };
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.hr.interviews() }),
  });
}


export type JobBoardPlatform = "LINKEDIN" | "NAUKRI" | "INDEED";

export interface SyncResult {
  platform: string;
  status: "SYNC_INITIATED" | string;
  lastSyncedAt: string;
  message: string;
}

export function useTriggerPortalSync() {
  return useMutation({
    mutationFn: (platform: JobBoardPlatform) =>
      apiClient.post<SyncResult>(`/hr/recruitment/portals/${platform}/sync`, {}),
  });
}

export interface PublishResult {
  platform: string;
  status: "PUBLISHED" | "NO_INTEGRATION" | "INACTIVE" | "NO_TOKEN";
}

export interface PublishJobResult {
  results: PublishResult[];
  publishedCount: number;
  externalIds: Record<string, string>;
}

export function usePublishJobToBoards() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ jobId, platforms }: { jobId: number; platforms: JobBoardPlatform[] }) =>
      apiClient.post<PublishJobResult>(`/hr/recruitment/jobs/${jobId}/publish`, { platforms }),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.hr.jobPostings() }),
  });
}


export interface BulkRejectInput {
  candidateIds: number[];
  sendRejectionEmail?: boolean;
}

export interface BulkRejectResult {
  rejected: number;
  alreadyRejected: number;
  emailsSent: number;
}

export function useBulkRejectCandidates() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: BulkRejectInput) =>
      apiClient.post<BulkRejectResult>(
        "/hr/recruitment/candidates/bulk-reject",
        data
      ),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.hr.candidates() });
      void qc.invalidateQueries({ queryKey: ATS_KANBAN_KEY });
    },
  });
}


export interface SourcePortal {
  id: number;
  platform: string;
  isActive: boolean;
  lastSyncedAt: string | null;
  lastSyncCount: number | null;
  createdAt: string | null;
}

export interface UpsertPortalInput {
  platform: "LINKEDIN" | "NAUKRI" | "INDEED" | "ORGANIC";
  isActive?: boolean;
  oauthToken?: string;
  meta?: Record<string, unknown>;
}

export function useSourcePortals() {
  return useQuery({
    queryKey: [...queryKeys.hr.all, "sourcePortals"] as const,
    queryFn: () => apiClient.get<SourcePortal[]>("/hr/recruitment/portals"),
  });
}

export function useUpsertSourcePortal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: UpsertPortalInput) =>
      apiClient.post<SourcePortal>("/hr/recruitment/portals", data),
    onSuccess: () =>
      void qc.invalidateQueries({ queryKey: [...queryKeys.hr.all, "sourcePortals"] as const }),
  });
}


export interface SourceEffectivenessRow {
  source: string;
  total: number;
  hired: number;
  rejected: number;
  hireRate: number;
}

export function useSourceEffectiveness() {
  return useQuery({
    queryKey: [...queryKeys.hr.all, "sourceEffectiveness"] as const,
    queryFn: () => apiClient.get<SourceEffectivenessRow[]>("/reports/source-effectiveness"),
  });
}


export interface UpdateBgvInput {
  bgvStatus: BgvStatus;
  bgvAgency?: string;
  bgvNotes?: string;
}

export function useUpdateCandidateBgv(candidateId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: UpdateBgvInput) =>
      apiClient.patch<{ id: number; bgvStatus: BgvStatus }>(`/hr/recruitment/candidates/${candidateId}/bgv-status`, data),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: queryKeys.hr.candidate(candidateId) }),
  });
}


export interface InterviewQuestion {
  id: number;
  orgId: string;
  question: string;
  category: string;
  role: string | null;
  difficulty: string;
  tags: string[];
  sampleAnswer: string | null;
  keywords: string[];
  isActive: boolean;
  createdBy: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface CreateQuestionInput {
  question: string;
  category?: string;
  role?: string;
  difficulty?: "EASY" | "MEDIUM" | "HARD";
  tags?: string[];
  sampleAnswer?: string | null;
  keywords?: string[];
}

export interface UpdateQuestionInput {
  question?: string;
  category?: string;
  role?: string | null;
  difficulty?: "EASY" | "MEDIUM" | "HARD";
  tags?: string[];
  sampleAnswer?: string | null;
  keywords?: string[];
  isActive?: boolean;
}

export function useInterviewQuestions(filters?: {
  category?: string;
  role?: string;
  difficulty?: string;
  q?: string;
}) {
  const { data: session, status: sessionStatus } = useSession();
  const params = new URLSearchParams();
  if (filters?.category) params.set("category", filters.category);
  if (filters?.role) params.set("role", filters.role);
  if (filters?.difficulty) params.set("difficulty", filters.difficulty);
  if (filters?.q) params.set("q", filters.q);
  const qs = params.toString();

  return useQuery({
    queryKey: [
      ...queryKeys.hr.all,
      "interviewQuestions",
      filters,
      session?.user?.id,
    ] as const,
    queryFn: () =>
      apiClient.get<InterviewQuestion[]>(`/hr/interview-questions${qs ? `?${qs}` : ""}`),
    staleTime: 5 * 60 * 1000,
    enabled: sessionStatus === "authenticated",
  });
}

export function useCreateInterviewQuestion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateQuestionInput) =>
      apiClient.post<InterviewQuestion>("/hr/interview-questions", data),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: [...queryKeys.hr.all, "interviewQuestions"] }),
  });
}

export function useUpdateInterviewQuestion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: UpdateQuestionInput & { id: number }) =>
      apiClient.patch<InterviewQuestion>(`/hr/interview-questions/${id}`, data),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: [...queryKeys.hr.all, "interviewQuestions"] }),
  });
}

export function useDeleteInterviewQuestion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (questionId: number) =>
      apiClient.delete<void>(`/hr/interview-questions/${questionId}`),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: [...queryKeys.hr.all, "interviewQuestions"] }),
  });
}

export function useBulkDeleteInterviewQuestions() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (ids: number[]) =>
      apiClient.delete<void>("/hr/interview-questions", { data: { ids } }),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: [...queryKeys.hr.all, "interviewQuestions"] }),
  });
}


export interface ReferenceCheck {
  id: number;
  candidateId: number;
  orgId: string;
  referenceName: string;
  referenceDesignation: string | null;
  referenceCompany: string | null;
  referenceEmail: string | null;
  referencePhone: string | null;
  relationship: string | null;
  status: string;
  outcome: string | null;
  notes: string | null;
  contactedAt: string | null;
  createdBy: string | null;
  createdAt: string | null;
}

export interface CreateReferenceCheckInput {
  referenceName: string;
  referenceDesignation?: string;
  referenceCompany?: string;
  referenceEmail?: string;
  referencePhone?: string;
  relationship?: string;
  notes?: string;
}

export function useReferenceChecks(candidateId: number) {
  return useQuery({
    queryKey: [...queryKeys.hr.all, "referenceChecks", candidateId] as const,
    queryFn: () =>
      apiClient.get<ReferenceCheck[]>(`/hr/recruitment/candidates/${candidateId}/reference-checks`),
    enabled: candidateId > 0,
  });
}

export function useCreateReferenceCheck(candidateId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateReferenceCheckInput) =>
      apiClient.post<ReferenceCheck>(
        `/hr/recruitment/candidates/${candidateId}/reference-checks`,
        data
      ),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: [...queryKeys.hr.all, "referenceChecks", candidateId] }),
  });
}

export function useUpdateReferenceCheck(candidateId: number, checkId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      status?: "PENDING" | "IN_PROGRESS" | "COMPLETED" | "DECLINED";
      outcome?: string | null;
      notes?: string | null;
      contactedAt?: string;
    }) =>
      apiClient.patch<{ success: boolean }>(
        `/hr/recruitment/candidates/${candidateId}/reference-checks/${checkId}`,
        data
      ),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: [...queryKeys.hr.all, "referenceChecks", candidateId] }),
  });
}

export function useDeleteReferenceCheck(candidateId: number, checkId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () =>
      apiClient.delete<{ success: boolean }>(
        `/hr/recruitment/candidates/${candidateId}/reference-checks/${checkId}`
      ),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: [...queryKeys.hr.all, "referenceChecks", candidateId] }),
  });
}


export interface RecruitmentFunnelStage {
  stage: string;
  count: number;
  avgDaysInStage: number | null;
}

export interface RecruitmentAnalytics {
  funnel: RecruitmentFunnelStage[];
  hireRate: number;
  totalCandidates: number;
  totalHired: number;
}

export function useRecruitmentAnalytics() {
  return useQuery({
    queryKey: [...queryKeys.hr.all, "recruitmentAnalytics"] as const,
    queryFn: () => apiClient.get<RecruitmentAnalytics>("/hr/recruitment/analytics"),
  });
}


export interface VaultAccessLog {
  id: number;
  action: string;
  accessedAt: string | null;
  fileName: string;
  documentType: string | null;
  accessorDisplayName: string;
}

export function useVaultAccessLogs(candidateId: number) {
  return useQuery({
    queryKey: [...queryKeys.hr.all, "vaultAccessLogs", candidateId] as const,
    queryFn: () =>
      apiClient.get<VaultAccessLog[]>(
        `/hr/recruitment/candidates/${candidateId}/vault/access-logs`
      ),
    enabled: candidateId > 0,
  });
}


export interface JobShareLinks {
  jobId: number;
  title: string;
  directLink: string;
  shareLinks: Array<{
    platform: string;
    name: string;
    url: string;
    utmUrl: string;
  }>;
}

export function useJobShareLinks(jobId: number) {
  return useQuery({
    queryKey: [...queryKeys.hr.all, "jobShare", jobId] as const,
    queryFn: () =>
      apiClient.get<JobShareLinks>(`/hr/recruitment/jobs/${jobId}/share`),
    enabled: jobId > 0,
  });
}


export interface CandidateOffer {
  id: number;
  orgId: string;
  candidateId: number;
  jobPostingId: number | null;
  offeredBy: string | null;
  offerStatus:
    | "DRAFT"
    | "PENDING_CEO"
    | "CEO_APPROVED"
    | "CEO_REJECTED"
    | "SENT"
    | "VIEWED"
    | "ACCEPTED"
    | "DECLINED"
    | "COUNTERED"
    | "EXPIRED";
  offeredSalary: string | null;
  offeredDesignation: string | null;
  joiningDate: string | null;
  offerLetterUrl: string | null;
  validUntil: string | null;
  notes: string | null;
  sentAt: string | null;
  viewedAt: string | null;
  respondedAt: string | null;
  submittedForCeoAt: string | null;
  ceoReviewedBy: string | null;
  ceoReviewedAt: string | null;
  ceoRemarks: string | null;
  createdAt: string;
  updatedAt: string;
}

export function useCandidateOffers(candidateId: number) {
  return useQuery({
    queryKey: [...queryKeys.hr.all, "candidateOffers", candidateId] as const,
    queryFn: () =>
      apiClient.get<CandidateOffer[]>(`/hr/recruitment/candidates/${candidateId}/offers`),
    enabled: candidateId > 0,
  });
}

export function useCreateCandidateOffer(candidateId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      jobPostingId?: number;
      offeredSalary?: number;
      offeredDesignation?: string;
      joiningDate?: string;
      offerLetterUrl?: string;
      validUntil?: string;
      notes?: string;
    }) => apiClient.post<CandidateOffer>(`/hr/recruitment/candidates/${candidateId}/offers`, data),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: [...queryKeys.hr.all, "candidateOffers", candidateId] }),
  });
}

export function useUpdateCandidateOffer(candidateId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ offerId, ...data }: { offerId: number; offerStatus?: CandidateOffer["offerStatus"]; notes?: string; joiningDate?: string; validUntil?: string; offeredSalary?: number; offeredDesignation?: string }) =>
      apiClient.patch<CandidateOffer>(`/hr/recruitment/candidates/${candidateId}/offers/${offerId}`, data),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: [...queryKeys.hr.all, "candidateOffers", candidateId] }),
  });
}

export function useDeleteCandidateOffer(candidateId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (offerId: number) =>
      apiClient.delete<{ success: boolean }>(`/hr/recruitment/candidates/${candidateId}/offers/${offerId}`),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: [...queryKeys.hr.all, "candidateOffers", candidateId] }),
  });
}

export function useSubmitOfferForCeoApproval(candidateId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (offerId: number) =>
      apiClient.patch<{ success: boolean }>(
        `/hr/recruitment/candidates/${candidateId}/offers/${offerId}/submit`,
      ),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: [...queryKeys.hr.all, "candidateOffers", candidateId] }),
  });
}

export function useCeoReviewOffer(candidateId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      offerId,
      decision,
      remarks,
    }: {
      offerId: number;
      decision: "approve" | "reject";
      remarks?: string;
    }) =>
      apiClient.patch<{ success: boolean }>(
        `/hr/recruitment/candidates/${candidateId}/offers/${offerId}/ceo-review`,
        { decision, remarks },
      ),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: [...queryKeys.hr.all, "candidateOffers", candidateId] }),
  });
}

export interface BgvComplianceRow {
  jobPostingId: number;
  jobTitle: string;
  total: number;
  cleared: number;
  failed: number;
  pending: number;
  initiated: number;
  notInitiated: number;
  clearedPct: number;
}

export function useBgvComplianceDashboard() {
  return useQuery({
    queryKey: [...queryKeys.hr.all, "bgv-compliance"],
    queryFn: () => apiClient.get<BgvComplianceRow[]>("/hr/recruitment/bgv-compliance"),
  });
}


export interface InterviewerPerformanceStat {
  interviewerId: string;
  interviewerName: string | null;
  interviewerEmail: string | null;
  totalAssigned: number;
  submitted: number;
  pending: number;
  avgHoursToSubmit: number | null;
  recommendations: Record<string, number>;
}

export interface InterviewerPerformanceResponse {
  stats: InterviewerPerformanceStat[];
  period: { days: number; since: string };
}

export function useInterviewerPerformance(days = 90) {
  return useQuery<InterviewerPerformanceResponse>({
    queryKey: queryKeys.hr.interviewerPerformance(days),
    queryFn: () =>
      apiClient.get<InterviewerPerformanceResponse>(
        `/hr/recruitment/interviewer-performance?days=${days}`
      ),
    staleTime: 5 * 60 * 1000,
  });
}


export interface BusyBlock {
  start: string;
  end: string;
  title: string;
}

export interface InterviewerAvailability {
  interviewerId: string;
  busyBlocks: BusyBlock[];
}

export interface InterviewerAvailabilityResponse {
  date: string;
  availability: InterviewerAvailability[];
}


export interface CandidateReferral {
  id: number;
  orgId: string;
  candidateId: number;
  referredBy: string;
  relationship: string | null;
  notes: string | null;
  bonusEligible: boolean;
  bonusAmount: string | null;
  bonusPaidAt: string | null;
  createdAt: string;
}

export function useCandidateReferrals(candidateId: number) {
  return useQuery<CandidateReferral[]>({
    queryKey: [...queryKeys.hr.candidate(candidateId), "referrals"],
    queryFn: () =>
      apiClient.get<CandidateReferral[]>(`/hr/recruitment/candidates/${candidateId}/referral`),
    enabled: candidateId > 0,
  });
}

export function useCreateReferral(candidateId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      referredBy: string;
      relationship?: string;
      notes?: string;
      bonusEligible?: boolean;
      bonusAmount?: number;
    }) => apiClient.post<CandidateReferral>(`/hr/recruitment/candidates/${candidateId}/referral`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [...queryKeys.hr.candidate(candidateId), "referrals"] });
    },
  });
}

export function useUpdateReferral(candidateId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      id: number;
      bonusEligible?: boolean;
      bonusAmount?: number | null;
      bonusPaidAt?: string | null;
      notes?: string | null;
    }) => apiClient.patch<CandidateReferral>(`/hr/recruitment/candidates/${candidateId}/referral`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [...queryKeys.hr.candidate(candidateId), "referrals"] });
    },
  });
}


export interface CalibrationSession {
  id: number;
  orgId: string;
  candidateId: number;
  jobPostingId: number | null;
  scheduledAt: string | null;
  status: "pending" | "scheduled" | "completed" | "cancelled";
  notes: string | null;
  decision: "STRONG_HIRE" | "HIRE" | "NO_HIRE" | "HOLD" | null;
  participantIds: string[];
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export function useCalibrationSessions(candidateId: number) {
  return useQuery<CalibrationSession[]>({
    queryKey: [...queryKeys.hr.candidate(candidateId), "calibration"],
    queryFn: () =>
      apiClient.get<CalibrationSession[]>(`/hr/recruitment/candidates/${candidateId}/calibration`),
    enabled: candidateId > 0,
  });
}

export function useCreateCalibration(candidateId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      jobPostingId?: number;
      scheduledAt?: string;
      participantIds?: string[];
      notes?: string;
    }) => apiClient.post<CalibrationSession>(`/hr/recruitment/candidates/${candidateId}/calibration`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [...queryKeys.hr.candidate(candidateId), "calibration"] });
    },
  });
}

export function useUpdateCalibration(candidateId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      id: number;
      scheduledAt?: string | null;
      status?: "pending" | "scheduled" | "completed" | "cancelled";
      notes?: string | null;
      decision?: "STRONG_HIRE" | "HIRE" | "NO_HIRE" | "HOLD" | null;
      participantIds?: string[];
    }) => apiClient.patch<CalibrationSession>(`/hr/recruitment/candidates/${candidateId}/calibration`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [...queryKeys.hr.candidate(candidateId), "calibration"] });
    },
  });
}


export interface CreateBookingLinkInput {
  candidateId: number;
  jobPostingId?: number;
  interviewerIds: string[];
  durationMinutes?: number;
  interviewType?: "VIDEO" | "PHONE" | "IN_PERSON";
  availableSlots: { start: string; end: string }[];
  expiresInDays?: number;
  notes?: string;
}

export interface BookingLinkResponse {
  id: number;
  token: string;
  bookingUrl: string;
  expiresAt: string;
}

export function useCreateBookingLink() {
  const qc = useQueryClient();
  return useMutation<BookingLinkResponse, Error, CreateBookingLinkInput>({
    mutationFn: (data) =>
      apiClient.post<BookingLinkResponse>("/hr/recruitment/interviews/self-schedule", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.hr.interviews() });
    },
  });
}

export function useInterviewerAvailability(
  interviewerIds: string[],
  date: string | null
) {
  const enabled = interviewerIds.length > 0 && !!date;
  return useQuery<InterviewerAvailabilityResponse>({
    queryKey: [...queryKeys.hr.all, "interviewerAvailability", date, interviewerIds],
    queryFn: () =>
      apiClient.get<InterviewerAvailabilityResponse>(
        `/hr/recruitment/interviewers/availability?interviewerIds=${interviewerIds.join(",")}&date=${date}`
      ),
    enabled,
    staleTime: 60 * 1000,
  });
}

export interface OfferLetterTemplate {
  id: number;
  orgId: string;
  name: string;
  body: string;
  description: string | null;
  isDefault: boolean;
  variables: string[] | null;
  documentType: string;
  showSignatureBlock: boolean;
  createdBy: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

export function useOfferLetterTemplates() {
  return useQuery({
    queryKey: [...queryKeys.hr.all, "offer-letter-templates"] as const,
    queryFn: () => apiClient.get<OfferLetterTemplate[]>("/hr/offer-letter-templates"),
  });
}

export function useCreateOfferLetterTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      name: string;
      body: string;
      description?: string;
      isDefault?: boolean;
      variables?: string[];
      documentType?: string;
      showSignatureBlock?: boolean;
    }) => apiClient.post<OfferLetterTemplate>("/hr/offer-letter-templates", data),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: [...queryKeys.hr.all, "offer-letter-templates"] }),
  });
}

export function useUpdateOfferLetterTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      ...data
    }: {
      id: number;
      name?: string;
      body?: string;
      description?: string;
      isDefault?: boolean;
      variables?: string[];
      documentType?: string;
      showSignatureBlock?: boolean;
    }) => apiClient.patch<OfferLetterTemplate>(`/hr/offer-letter-templates/${id}`, data),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: [...queryKeys.hr.all, "offer-letter-templates"] }),
  });
}

export function useDeleteOfferLetterTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      apiClient.delete<{ success: boolean }>(`/hr/offer-letter-templates/${id}`),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: [...queryKeys.hr.all, "offer-letter-templates"] }),
  });
}

export function useGenerateEmployeeLetter(employeeId: string) {
  return useMutation({
    mutationFn: (data: {
      templateId: number;
      extraVars?: Record<string, string>;
      preview?: boolean;
    }) => apiClient.post<{ url: string; key: string }>(`/hr/employees/${employeeId}/letters`, data),
  });
}

export interface OfferLetterCustomVariable {
  id: number;
  orgId: string;
  variableKey: string;
  label: string;
  description: string | null;
  createdById: string | null;
  createdAt: string | null;
}

const offerLetterCustomVariablesKey = [
  ...queryKeys.hr.all,
  "offer-letter-custom-variables",
] as const;

export function useOfferLetterCustomVariables(enabled = true) {
  return useQuery({
    queryKey: offerLetterCustomVariablesKey,
    queryFn: () =>
      apiClient.get<OfferLetterCustomVariable[]>("/hr/offer-letter-custom-variables"),
    enabled,
  });
}

export function useCreateOfferLetterCustomVariable() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { variableKey: string; label: string; description?: string }) =>
      apiClient.post<OfferLetterCustomVariable>("/hr/offer-letter-custom-variables", data),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: offerLetterCustomVariablesKey }),
  });
}

export function useUpdateOfferLetterCustomVariable() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      ...data
    }: {
      id: number;
      variableKey?: string;
      label?: string;
      description?: string | null;
    }) =>
      apiClient.patch<OfferLetterCustomVariable>(
        `/hr/offer-letter-custom-variables/${id}`,
        data
      ),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: offerLetterCustomVariablesKey }),
  });
}

export function useDeleteOfferLetterCustomVariable() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      apiClient.delete<{ success: boolean }>(`/hr/offer-letter-custom-variables/${id}`),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: offerLetterCustomVariablesKey }),
  });
}

export function useGenerateOfferLetter(candidateId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      offerId,
      templateId,
    }: {
      offerId: number;
      templateId: number;
    }) =>
      apiClient.post<{ url: string }>(
        `/hr/recruitment/candidates/${candidateId}/offers/${offerId}/generate-letter`,
        { templateId, preview: false }
      ),
    onSuccess: () =>
      qc.invalidateQueries({
        queryKey: [...queryKeys.hr.all, "candidateOffers", candidateId],
      }),
  });
}

export interface HiringFlowRoundInput {
  roundOrder: number;
  name: string;
  type: string;
  interviewerRole?: string;
  questionBankTag?: string;
  slaDays?: number;
  autoAdvanceThreshold?: number;
  durationMinutes?: number;
  mode?: string;
  notes?: string;
}

export interface CreateHiringFlowInput {
  name: string;
  description?: string;
  isDefault?: boolean;
  rounds: HiringFlowRoundInput[];
}

export interface UpdateHiringFlowInput {
  name?: string;
  description?: string;
  isDefault?: boolean;
  rounds?: HiringFlowRoundInput[];
}

export function useHiringFlows() {
  return useQuery({
    queryKey: queryKeys.hr.hiringFlows(),
    queryFn: () => apiClient.get<import("@/types/hr").HiringFlowTemplate[]>("/hr/recruitment/hiring-flows"),
  });
}

export function useHiringFlow(id: number, enabled = true) {
  return useQuery({
    queryKey: queryKeys.hr.hiringFlow(id),
    queryFn: () => apiClient.get<import("@/types/hr").HiringFlowTemplate>(`/hr/recruitment/hiring-flows/${id}`),
    enabled,
  });
}

export function useCreateHiringFlow() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateHiringFlowInput) =>
      apiClient.post<import("@/types/hr").HiringFlowTemplate>("/hr/recruitment/hiring-flows", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.hr.hiringFlows() }),
  });
}

export function useUpdateHiringFlow(id: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: UpdateHiringFlowInput) =>
      apiClient.patch<import("@/types/hr").HiringFlowTemplate>(`/hr/recruitment/hiring-flows/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.hr.hiringFlows() });
      qc.invalidateQueries({ queryKey: queryKeys.hr.hiringFlow(id) });
    },
  });
}

export function useDeleteHiringFlow() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      apiClient.delete<{ deleted: boolean }>(`/hr/recruitment/hiring-flows/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.hr.hiringFlows() }),
  });
}

export function useJobPipeline(jobId: number | null) {
  return useQuery({
    queryKey: queryKeys.hr.jobPipeline(jobId ?? 0),
    queryFn: () =>
      apiClient.get<import("@/types/hr").JobPipelineResponse>(
        `/hr/recruitment/pipeline/job/${jobId}`,
      ),
    enabled: jobId !== null,
  });
}

export function useUpdateApplicationPipelineStage(jobId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      applicationId,
      stage,
      sendEmail,
    }: {
      applicationId: number;
      stage: string;
      sendEmail?: boolean;
    }) =>
      apiClient.patch<{ applicationId: number; stage: string }>(
        `/hr/recruitment/pipeline/job/${jobId}`,
        { applicationId, stage, sendEmail: sendEmail ?? false },
      ),
    onMutate: async ({ applicationId, stage }) => {
      const key = queryKeys.hr.jobPipeline(jobId);
      await qc.cancelQueries({ queryKey: key });
      const prev = qc.getQueryData<import("@/types/hr").JobPipelineResponse>(key);
      if (prev) {
        const stages = prev.stages.map((s) => ({
          ...s,
          candidates: s.candidates.filter((c) => c.id !== applicationId),
        }));
        const targetIdx = stages.findIndex((s) => s.stage === stage);
        if (targetIdx >= 0) {
          const candidate = prev.stages.flatMap((s) => s.candidates).find((c) => c.id === applicationId);
          if (candidate) stages[targetIdx].candidates = [...stages[targetIdx].candidates, { ...candidate, pipelineStage: stage }];
        }
        qc.setQueryData(key, { ...prev, stages });
      }
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(queryKeys.hr.jobPipeline(jobId), ctx.prev);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: queryKeys.hr.jobPipeline(jobId) }),
  });
}
