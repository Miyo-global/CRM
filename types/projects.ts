

export type ProjectStatusValue = "ACTIVE" | "COMPLETED" | "ARCHIVED";

export type TicketStatus = "TODO" | "IN_PROGRESS" | "IN_REVIEW" | "DONE";

export type TicketPriority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";

export type TicketType = "TASK" | "BUG" | "STORY" | "EPIC" | "SUBTASK";

export type SprintStatus = "PLANNED" | "ACTIVE" | "COMPLETED";

export type CycleStatus = "draft" | "active" | "completed";

export type ModuleStatus =
  | "backlog"
  | "planned"
  | "in-progress"
  | "completed"
  | "paused"
  | "cancelled";

export type StateGroup =
  | "backlog"
  | "unstarted"
  | "started"
  | "completed"
  | "cancelled";

export type IntakeStatus = "pending" | "accepted" | "declined" | "duplicate";

export type IntakeSource = "manual" | "web_form" | "email";

export type ViewLayoutType = "board" | "list" | "table" | "calendar" | "gantt";

export type WorkItemRelationType =
  | "blocks"
  | "blocked_by"
  | "duplicate_of"
  | "relates_to";

export type TimesheetStatus = "PENDING" | "APPROVED" | "REJECTED";

export interface ProjectSettings {
  modules: {
    sprints: boolean;
    epics: boolean;
    timeTracking: boolean;
    wiki: boolean;
  };
}

export interface Project {
  id: number;
  orgId: string;
  name: string;
  description: string | null;
  key: string;
  clientId: string | null;
  managerId: string | null;
  startDate: string | Date | null;
  endDate: string | Date | null;
  status: ProjectStatusValue | null;
  settings: ProjectSettings | null;
}

export interface ProjectStatusRecord {
  id: number;
  orgId: string;
  projectId: number;
  name: string;
  order: number;
  color: string | null;
  createdAt: string | Date | null;
  updatedAt: string | Date | null;
}

export interface ProjectMember {
  id: number;
  projectId: number;
  userId: string;
  role: string | null;
  joinedAt: string | Date | null;
  user?: {
    id: string;
    name: string | null;
    firstName: string | null;
    lastName: string | null;
    email: string | null;
    image: string | null;
  };
}

export interface ProjectWithDetails extends Project {
  statuses?: ProjectStatusRecord[];
  members?: ProjectMember[];
  tickets?: Ticket[];
}

export interface ProjectListItem {
  id: number;
  name: string;
  description: string | null;
  key: string;
  status: ProjectStatusValue | null;
  startDate: string | Date | null;
  endDate: string | Date | null;
  manager: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    image: string | null;
  } | null;
  progress: { total: number; done: number; percentage: number };
  members: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    image: string | null;
  }[];
}

export interface Sprint {
  id: number;
  orgId: string;
  projectId: number | null;
  name: string;
  startDate: string | Date;
  endDate: string | Date;
  goal: string | null;
  status: string | null;
  tickets?: Ticket[];
}

export interface SprintBurndownPoint {
  date: Date | string;
  points: number;
}

export interface SprintBurndown {
  sprint: Sprint;
  totalPoints: number;
  idealBurndown: SprintBurndownPoint[];
  actualBurndown: SprintBurndownPoint[];
}

export interface TicketUser {
  id: string;
  name: string | null;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  image: string | null;
}

export interface CommentImage {
  url: string;
  key: string;
  fileName: string;
  mimeType?: string;
}

export interface TicketComment {
  id: number;
  orgId: string;
  ticketId: number;
  userId: string;
  content: string;
  parentCommentId: number | null;
  images?: CommentImage[] | null;
  createdAt: string | Date | null;
  updatedAt: string | Date | null;
  user?: TicketUser;
}

export interface TicketAttachment {
  id: number;
  orgId: string;
  ticketId: number;
  fileUrl: string;
  fileName: string;
  fileSize: number | null;
  mimeType: string | null;
  uploadedBy: string | null;
  createdAt: string | Date | null;
  uploader?: TicketUser;
}

export interface TicketLabel {
  id: number;
  orgId: string;
  name: string;
  color: string | null;
  createdAt: string | Date | null;
}

export interface TicketLabelMapping {
  id: number;
  ticketId: number;
  labelId: number;
  createdAt: string | Date | null;
  label?: TicketLabel;
}

export interface TicketAssignee {
  id: number;
  ticketId: number;
  userId: string;
  assignedAt: string | Date | null;
  assignedBy: string | null;
  user?: TicketUser;
}

export interface TicketWatcher {
  id: number;
  ticketId: number;
  userId: string;
  createdAt: string | Date | null;
  user?: TicketUser;
}

export interface Ticket {
  id: number;
  orgId: string;
  title: string;
  description: string | null;
  type: string;
  status: string;
  priority: TicketPriority | null;
  projectId: number | null;
  ticketNumber: number;
  sprintId: number | null;
  epicId: number | null;
  assigneeId: string | null;
  reporterId: string | null;
  points: number | null;
  storyPoints: number | null;
  link: string | null;
  order: number | null;
  parentTicketId: number | null;
  originalEstimate: string | null;
  timeSpent: string | null;
  startDate: string | null;
  dueDate: string | null;
  stateId: number | null;
  moduleId: number | null;
  cycleId: number | null;
  sequenceId: string | null;
  estimate: number | null;
  createdAt: string | Date | null;
  updatedAt: string | Date | null;
  assignee?: TicketUser | null;
  reporter?: TicketUser | null;
  assignees?: TicketAssignee[];
  comments?: TicketComment[];
  attachments?: TicketAttachment[];
  labels?: TicketLabelMapping[];
  watchers?: TicketWatcher[];
  project?: { id: number; name: string; key: string } | null;
  sprint?: { id: number; name: string } | null;
}

export interface TimeEntry {
  id: number;
  orgId: string;
  userId: string | null;
  ticketId: number | null;
  date: string;
  hours: string | null;
  description: string | null;
  imageUrl: string | null;
  workLink: string | null;
  status: string | null;
  approvedBy: string | null;
  approvedAt: string | Date | null;
  rejectionReason: string | null;
  isBillable: boolean | null;
  createdAt: string | Date | null;
  updatedAt: string | Date | null;
}

export interface TimeEntryWithUser extends TimeEntry {
  user?: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    email: string | null;
    image: string | null;
  } | null;
  ticket?: {
    id: number;
    title: string;
    ticketNumber: number;
    projectId: number | null;
    project?: { id: number; name: string; key: string } | null;
  } | null;
}

export interface Cycle {
  id: number;
  projectId: number;
  orgId: string;
  name: string;
  description: string | null;
  status: CycleStatus;
  startDate: string;
  endDate: string;
  createdBy: string;
  createdAt: string | Date | null;
  updatedAt: string | Date | null;
  totalItems?: number;
  completedItems?: number;
  progress?: number;
}

export interface CycleWithStats extends Cycle {
  stats?: {
    total: number;
    completed: number;
    inProgress: number;
    pending: number;
    progress: number;
  };
  workItems?: Ticket[];
}

export interface Module {
  id: number;
  projectId: number;
  orgId: string;
  name: string;
  description: string | null;
  status: ModuleStatus;
  leadId: string | null;
  startDate: string | null;
  endDate: string | null;
  createdBy: string;
  createdAt: string | Date | null;
  updatedAt: string | Date | null;
  totalItems?: number;
  completedItems?: number;
  activeTicketCount?: number;
  progress?: number;
}

export type Epic = Ticket;

export interface ProjectPage {
  id: number;
  projectId: number;
  orgId: string;
  title: string;
  content: unknown | null;
  icon: string | null;
  coverImage: string | null;
  isPublic: boolean;
  isPinned: boolean;
  parentPageId: number | null;
  createdBy: string;
  updatedAt: string | Date | null;
  createdAt: string | Date | null;
  children?: ProjectPage[];
}

export interface ProjectView {
  id: number;
  projectId: number;
  orgId: string;
  createdBy: string;
  name: string;
  filters: Record<string, unknown>;
  groupBy: string | null;
  orderBy: string | null;
  layoutType: ViewLayoutType;
  isPinned: boolean;
  createdAt: string | Date | null;
  updatedAt: string | Date | null;
}

export interface IntakeRequest {
  id: number;
  projectId: number;
  orgId: string;
  title: string;
  description: unknown | null;
  source: IntakeSource;
  status: IntakeStatus;
  submitterEmail: string | null;
  linkedWorkItemId: number | null;
  declineReason: string | null;
  createdAt: string | Date | null;
  updatedAt: string | Date | null;
}

export interface CustomState {
  id: number;
  projectId: number;
  orgId: string;
  name: string;
  color: string;
  group: StateGroup;
  sequence: number;
  isDefault: boolean;
  createdAt: string | Date | null;
}

export interface ProjectAnalytics {
  stateDistribution: { status: string; count: number }[];
  priorityBreakdown: { priority: string | null; count: number }[];
  assigneeCompletion: {
    assigneeId: string | null;
    total: number;
    completed: number;
  }[];
  volumeOverTime: { week: string; count: number }[];
  cycleVelocity: {
    cycleId: number;
    cycleName: string;
    completedPoints: number;
  }[];
  estimateVsActual: {
    ticketId: number;
    title: string;
    estimated: string | null;
    actual: number;
  }[];
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface CreateProjectInput {
  name: string;
  description?: string;
  key?: string;
  managerId?: string;
  clientId?: string;
  startDate?: Date | string;
  endDate?: Date | string;
  memberIds?: string[];
  modules?: {
    sprints: boolean;
    epics: boolean;
    timeTracking: boolean;
    wiki: boolean;
  };
}

export interface UpdateProjectInput {
  projectId: number;
  name?: string;
  description?: string;
  status?: ProjectStatusValue;
  managerId?: string;
  clientId?: string;
  startDate?: Date | string | null;
  endDate?: Date | string | null;
  memberIds?: string[];
  
  reassignments?: Record<string, string>;
}

export interface CreateTicketInput {
  projectId: number;
  title: string;
  description?: string;
  type: string;
  priority?: TicketPriority;
  assigneeId?: string;
  assigneeIds?: string[];
  reporterId?: string;
  sprintId?: number;
  epicId?: number;
  points?: number;
  link?: string;
  originalEstimate?: number;
  parentTicketId?: number;
  status?: string;
}

export interface UpdateTicketInput {
  ticketId: number;
  title?: string;
  description?: string;
  type?: string;
  status?: string;
  priority?: TicketPriority;
  assigneeId?: string;
  assigneeIds?: string[];
  sprintId?: number | null;
  epicId?: number | null;
  points?: number | null;
  originalEstimate?: number | null;
}

export interface UpdateTicketStatusInput {
  ticketId: number;
  status: string;
}

export interface MoveTicketInput {
  projectId: number;
  items: { id: number; status: string; order: number }[];
}

export interface CreateSprintInput {
  projectId: number;
  name: string;
  startDate: Date | string;
  endDate: Date | string;
  goal?: string;
}

export interface UpdateSprintInput {
  sprintId: number;
  name?: string;
  startDate?: Date | string;
  endDate?: Date | string;
  goal?: string;
  status?: SprintStatus;
}

export interface LogTimeInput {
  projectId: number;
  ticketId: number;
  date: Date | string;
  hours: number;
  description?: string;
  imageUrl?: string;
  workLink?: string;
}

export interface UpdateTimeEntryInput {
  entryId: number;
  hours?: number;
  description?: string;
}

export interface CreateLabelInput {
  name: string;
  color?: string;
}

export interface AddProjectMemberInput {
  projectId: number;
  userId: string;
  role?: string;
}

export interface CreateCycleInput {
  projectId: number;
  name: string;
  description?: string;
  startDate: string;
  endDate: string;
}

export interface UpdateCycleInput {
  id: number;
  name?: string;
  description?: string;
  status?: CycleStatus;
  startDate?: string;
  endDate?: string;
}

export interface CreateModuleInput {
  projectId: number;
  name: string;
  description?: string;
  status?: ModuleStatus;
  leadId?: string;
  startDate?: string;
  endDate?: string;
}

export interface UpdateModuleInput {
  id: number;
  name?: string;
  description?: string;
  status?: ModuleStatus;
  leadId?: string | null;
  startDate?: string | null;
  endDate?: string | null;
}

export interface CreatePageInput {
  projectId: number;
  title: string;
  content?: unknown;
  icon?: string;
  parentPageId?: number;
}

export interface UpdatePageInput {
  id: number;
  title?: string;
  content?: unknown;
  icon?: string | null;
  coverImage?: string | null;
  isPublic?: boolean;
  isPinned?: boolean;
  parentPageId?: number | null;
}

export interface CreateViewInput {
  projectId: number;
  name: string;
  filters?: Record<string, unknown>;
  groupBy?: string;
  orderBy?: string;
  layoutType?: ViewLayoutType;
  isPinned?: boolean;
}

export interface UpdateViewInput {
  id: number;
  name?: string;
  filters?: Record<string, unknown>;
  groupBy?: string | null;
  orderBy?: string | null;
  layoutType?: ViewLayoutType;
  isPinned?: boolean;
}

export interface CreateIntakeRequestInput {
  projectId: number;
  title: string;
  description?: unknown;
  source?: IntakeSource;
  submitterEmail?: string;
}

export interface UpdateIntakeRequestInput {
  id: number;
  status?: IntakeStatus;
  declineReason?: string;
  linkedWorkItemId?: number;
}

export interface CreateCustomStateInput {
  projectId: number;
  name: string;
  color: string;
  group: StateGroup;
  sequence: number;
  isDefault?: boolean;
}

export interface ProjectFilters {
  page?: number;
  limit?: number;
  search?: string;
  status?: "ALL" | ProjectStatusValue;
}

export interface TicketFilters {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  sprintId?: number;
  assigneeId?: string;
}

export interface TimeEntryFilters {
  ticketId?: number;
  userId?: string;
  projectId?: number;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
  status?: TimesheetStatus;
}
