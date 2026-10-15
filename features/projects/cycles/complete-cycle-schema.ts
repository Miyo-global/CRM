import { z } from "zod";

export const completeCycleSchema = z.object({
  target: z.string().min(1, "Choose where unfinished work goes"),
});

export type CompleteCycleValues = z.infer<typeof completeCycleSchema>;
