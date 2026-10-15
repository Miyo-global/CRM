import { z } from "zod";

export const acceptSchema = z.object({
  ticketStatus: z.string().min(1, "Choose a column"),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]),
  assigneeId: z.string(),
});
export type AcceptValues = z.infer<typeof acceptSchema>;

export const declineSchema = z.object({
  reason: z.string().trim().min(3, "Tell the requester why, in a few words").max(2000),
});
export type DeclineValues = z.infer<typeof declineSchema>;

export const duplicateSchema = z.object({
  ticketId: z.string().min(1, "Choose the ticket this repeats"),
});
export type DuplicateValues = z.infer<typeof duplicateSchema>;
