import { z } from "zod";

export const publicIntakeSchema = z.object({
  title: z.string().trim().min(1, "Give your request a short title").max(200, "Keep the title under 200 characters"),
  description: z.string().max(5000, "Keep the details under 5000 characters").optional(),
  submitterEmail: z.union([z.literal(""), z.string().trim().email("Enter a valid email, or leave it empty")]).optional(),
});

export type PublicIntakeValues = z.infer<typeof publicIntakeSchema>;
