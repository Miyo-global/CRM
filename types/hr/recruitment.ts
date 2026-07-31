export type JobPostingStatus = "DRAFT" | "OPEN" | "PAUSED" | "CLOSED" | "FILLED";
export type CandidateStatus = "NEW" | "SCREENING" | "INTERVIEW" | "OFFER" | "HIRED" | "REJECTED";
export type InterviewType = "PHONE" | "VIDEO" | "ONSITE" | "TECHNICAL" | "HR" | "FINAL";
export type InterviewResult = "PENDING" | "PASSED" | "FAILED" | "NO_SHOW";
export type ApplicationStatus = "APPLIED" | "SHORTLISTED" | "INTERVIEWING" | "OFFERED" | "ACCEPTED" | "REJECTED" | "WITHDRAWN";
export type BgvStatus = "NOT_INITIATED" | "INITIATED" | "PENDING" | "CLEARED" | "FAILED";
export type SlaCandidateStatus = "ON_TRACK" | "AT_RISK" | "BREACHED";

export interface JobPosting {
  id: number;
  orgId: string;
  title: string;
  departmentId: number | null;
  location: string | null;
  type: string | null;
  experience: string | null;
  salaryMin: string | null;
  salaryMax: string | null;
  description: string | null;
  requirements: string | null;
  benefits: string | null;
  status: JobPostingStatus | null;
  openings: number | null;
  applicationDeadline: string | null;
  closingDate: string | null;
  postedBy: string | null;
  externalPostingIds: Record<string, string> | null;
  createdAt: Date | string | null;
  updatedAt: Date | string | null;
  _count?: { applications?: number };
}

export interface Candidate {
  id: number;
  orgId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  resumeUrl: string | null;
  resumeText: string | null;
  linkedinUrl: string | null;
  portfolioUrl: string | null;
  currentCompany: string | null;
  currentRole: string | null;
  experienceYears: string | null;
  skills: string[] | null;
  source: string | null;
  sourceUrl: string | null;
  status: CandidateStatus | null;
  notes: string | null;
  rating: number | null;
  aiScore: number | null;
  aiScoreBreakdown: Record<string, number> | null;
  aiScoreGeneratedAt: Date | string | null;
  bgvStatus: BgvStatus | null;
  bgvAgency: string | null;
  bgvNotes: string | null;
  bgvInitiatedAt: Date | string | null;
  bgvCompletedAt: Date | string | null;
  externalId: string | null;
  duplicateOfId: number | null;
  createdAt: Date | string | null;
  updatedAt: Date | string | null;
}

export interface CandidateApplication {
  id: number;
  orgId: string;
  candidateId: number;
  jobPostingId: number;
  status: ApplicationStatus | null;
  appliedAt: Date | string | null;
  coverLetter: string | null;
  notes: string | null;
  candidate?: Candidate;
  jobPosting?: JobPosting;
}

export interface AtsPipelineCandidate {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  source: string | null;
  rating: number | null;
  jobTitle: string | null;
  applicationId: number | null;
  appliedAt: Date | string | null;
  slaStatus: SlaCandidateStatus | null;
  resumeUrl: string | null;
  notes: string | null;
}

export interface AtsPipelineStage {
  stage: CandidateStatus;
  candidates: AtsPipelineCandidate[];
}

export interface AtsPipelineResponse {
  stages: AtsPipelineStage[];
}

export interface InterviewRubricEntry {
  category: string;
  score: number;
  maxScore: number;
  comment?: string;
}

export interface Interview {
  id: number;
  orgId: string;
  candidateId: number;
  jobPostingId: number | null;
  interviewerId: string | null;
  type: InterviewType | null;
  scheduledAt: Date | string;
  duration: number | null;
  location: string | null;
  meetingLink: string | null;
  result: InterviewResult | null;
  feedback: string | null;
  rating: number | null;
  rubric: InterviewRubricEntry[] | null;
  notes: string | null;
  recordingUrl?: string | null;
  recordingPlatform?: string | null;
  panelInterviewerIds?: string[] | null;
  createdAt: Date | string | null;
  updatedAt: Date | string | null;
  candidate?: Candidate;
  interviewer?: { id: string; name: string | null; image: string | null };
}

export interface RecruitmentStats {
  totalJobs: number;
  openJobs: number;
  totalCandidates: number;
  newCandidates: number;
  upcomingInterviews: number;
  hiredThisMonth: number;
  funnel: Record<string, number>;
  sources: { source: string; count: number }[];
  avgTimeToHireDays: number;
}

export interface CreateJobPostingInput {
  title: string;
  departmentId?: number;
  location?: string;
  type?: string;
  experience?: string;
  salaryMin?: number;
  salaryMax?: number;
  description?: string;
  requirements?: string;
  benefits?: string;
  openings?: number;
  applicationDeadline?: string;
}

export interface UpdateJobPostingInput {
  title?: string;
  departmentId?: number;
  location?: string;
  type?: string;
  experience?: string;
  salaryMin?: number;
  salaryMax?: number;
  description?: string;
  requirements?: string;
  benefits?: string;
  status?: JobPostingStatus;
  openings?: number;
  applicationDeadline?: string;
}

export interface CreateCandidateInput {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  resumeUrl?: string;
  linkedinUrl?: string;
  portfolioUrl?: string;
  currentCompany?: string;
  currentRole?: string;
  experienceYears?: number;
  skills?: string[];
  source?: string;
  notes?: string;
}

export interface UpdateCandidateInput {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  currentRole?: string;
  currentCompany?: string;
  experienceYears?: number;
  linkedinUrl?: string;
  source?: string;
  skills?: string[];
  status?: CandidateStatus;
  notes?: string;
  rating?: number;
}

export interface CreateInterviewInput {
  candidateId: number;
  jobPostingId?: number;
  interviewerId?: string;
  type?: InterviewType;
  scheduledAt: string;
  duration?: number;
  location?: string;
  meetingLink?: string;
  notes?: string;
}

export interface UpdateInterviewInput {
  type?: InterviewType;
  scheduledAt?: string;
  duration?: number;
  location?: string;
  meetingLink?: string;
  result?: InterviewResult;
  feedback?: string;
  rating?: number;
  rubric?: InterviewRubricEntry[];
  notes?: string;
  recordingUrl?: string | null;
  recordingPlatform?: string | null;
}
