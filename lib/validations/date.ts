import { z } from "zod";

export const dateOnlySchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Expected YYYY-MM-DD");

export const dateOnlyOptionalSchema = dateOnlySchema.optional();

export const dateOnlyNullableSchema = dateOnlySchema.nullable().optional();
