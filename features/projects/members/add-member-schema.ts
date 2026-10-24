import { z } from "zod";
import { EMAIL_ADDRESS_SCHEMA } from "@/lib/utils/email-validation";

export const addMemberSchema = z.object({
  person: EMAIL_ADDRESS_SCHEMA,
  role: z.enum(["OWNER", "MANAGER", "CONTRIBUTOR", "VIEWER"]),
});

export type AddMemberValues = z.infer<typeof addMemberSchema>;
