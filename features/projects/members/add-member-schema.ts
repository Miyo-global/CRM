import { z } from "zod";

export const addMemberSchema = z.object({
  person: z.string().trim().toLowerCase().email("Enter a work email address"),
  role: z.enum(["OWNER", "MANAGER", "CONTRIBUTOR", "VIEWER"]),
});

export type AddMemberValues = z.infer<typeof addMemberSchema>;
