import { z } from "zod";

export const projectStatusSchema = z.enum(["ACTIVE", "COMPLETED", "ARCHIVED"]);

export const ticketTypeSchema = z.enum(["EPIC", "STORY", "TASK", "BUG"]);
export const ticketStatusSchema = z.enum(["TODO", "IN_PROGRESS", "IN_REVIEW", "DONE"]);
export const ticketPrioritySchema = z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]);
export const updateProjectSettingsInputSchema = z.object({
  projectId: z.number().int().positive(),
  name: z.string().min(1, "Project name is required").max(200),
  description: z.string().max(2000).optional(),
  status: projectStatusSchema,
  managerId: z.string().optional(),
  clientId: z.string().optional(),
  startDate: z.date().optional(),
  endDate: z.date().optional(),
  memberIds: z.array(z.string()).optional(),
});

export const createProjectInputSchema = z.object({
  key: z.string().min(2).max(10).optional(),
  name: z.string().min(1, "Project name is required").max(200),
  description: z.string().max(2000).optional(),
  managerId: z.string().optional(),
  clientId: z.string().optional(),
  startDate: z.date().optional(),
  endDate: z.date().optional(),
  memberIds: z.array(z.string()).optional(),
  modules: z.object({
      sprints: z.boolean(),
      epics: z.boolean(),
      timeTracking: z.boolean(),
      wiki: z.boolean(),
  }).optional(),
}).refine((data) => !data.startDate || !data.endDate || data.endDate >= data.startDate, {
  message: "End date must be after or equal to start date",
  path: ["endDate"],
});

export const createTicketInputSchema = z.object({
  projectId: z.number().int().positive(),
  title: z.string().min(1, "Title is required").max(500),
  description: z.string().max(5000).optional(),
  type: ticketTypeSchema,
  priority: ticketPrioritySchema.optional(),
  assigneeId: z.string().optional(),
  assigneeIds: z.array(z.string()).optional(),
  reporterId: z.string().optional(),
  sprintId: z.number().int().positive().optional(),
  epicId: z.number().int().positive().optional(),
  points: z.number().int().min(0).max(1000).optional(),
  link: z.string().url("Must be a valid URL").optional().or(z.literal("")),
  originalEstimate: z.number().positive().max(10000).optional(),
  parentTicketId: z.number().int().positive().optional(),
  status: ticketStatusSchema.optional(),
});

export const updateTicketInputSchema = z.object({
  ticketId: z.number().int().positive(),
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  type: ticketTypeSchema.optional(),
  status: ticketStatusSchema.optional(),
  priority: ticketPrioritySchema.optional(),
  assigneeId: z.string().optional(),
  assigneeIds: z.array(z.string()).optional(),
  sprintId: z.number().int().positive().optional(),
  epicId: z.number().int().positive().optional(),
  points: z.number().int().min(0).max(1000).optional(),
  originalEstimate: z.number().positive().max(10000).optional(),
});

export const updateTicketStatusInputSchema = z.object({
  ticketId: z.number().int().positive(),
  status: ticketStatusSchema,
});

export const createSprintInputSchema = z.object({
  projectId: z.number().int().positive(),
  name: z.string().min(1, "Sprint name is required").max(200),
  startDate: z.date(),
  endDate: z.date(),
  goal: z.string().optional(),
}).refine((data) => data.endDate > data.startDate, {
  message: "End date must be after start date",
  path: ["endDate"],
});

export const updateSprintInputSchema = z.object({
  sprintId: z.number().int().positive(),
  name: z.string().min(1).optional(),
  startDate: z.date().optional(),
  endDate: z.date().optional(),
  goal: z.string().optional(),
  status: z.enum(["PLANNED", "ACTIVE", "COMPLETED"]).optional(),
});

export const addCommentInputSchema = z.object({
  ticketId: z.number().int().positive(),
  content: z.string().min(1, "Comment is required").max(5000),
  parentCommentId: z.number().int().positive().optional(),
});

export const addAttachmentInputSchema = z.object({
  ticketId: z.number().int().positive(),
  fileUrl: z.string().min(1),
  fileName: z.string().min(1),
  fileSize: z.number().int().positive().optional(),
  mimeType: z.string().optional(),
});

export const createLabelInputSchema = z.object({
  name: z.string().min(1, "Label name is required"),
  color: z.string().regex(/^#[0-9A-F]{6}$/i).optional(),
});

export const updateTimeEntryInputSchema = z.object({
  entryId: z.number().int().positive(),
  description: z.string().min(1, "Description is required").optional(),
  hours: z.number().min(0).max(24, "Cannot log more than 24 hours per entry").optional(),
});

export const deleteTimeEntryInputSchema = z.object({
  entryId: z.number().int().positive(),
});

export const addTimeEntryInputSchema = z.object({
  ticketId: z.number({ error: "Please select a ticket" }).int().positive("Please select a ticket"),
  date: z.date().refine((d) => d <= new Date(), { message: "Cannot log time for future dates" }),
  hours: z.number().positive().max(24, "Cannot log more than 24 hours per entry"),
  description: z.string().optional(),
  imageUrl: z.string().optional().or(z.literal("")),
  workLink: z.string().optional().or(z.literal("")).refine(
    (val) => !val || val === "" || val.startsWith("http://") || val.startsWith("https://"),
    { message: "Work link must be a valid URL" }
  ),
});
