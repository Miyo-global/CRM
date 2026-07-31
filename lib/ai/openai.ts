import "server-only";

import { ChatOpenAI } from "@langchain/openai";
import { google } from "@ai-sdk/google";
import { generateText, generateObject } from "ai";
import type { z } from "zod";
import { logger } from "@/lib/logger";

let _fastModel: ChatOpenAI | null = null;
let _standardModel: ChatOpenAI | null = null;
const _tempModels = new Map<string, ChatOpenAI>();

export function isOpenAIConfigured(): boolean {
  return !!process.env.OPENAI_API_KEY;
}

export function isAIConfigured(): boolean {
  return !!process.env.OPENAI_API_KEY || !!process.env.GOOGLE_GENERATIVE_AI_API_KEY;
}

function isGoogleOnlyConfigured(): boolean {
  return !process.env.OPENAI_API_KEY && !!process.env.GOOGLE_GENERATIVE_AI_API_KEY;
}

function getGoogleModel(tier?: ModelTier) {
  return google(tier === "standard" ? "gemini-1.5-pro-latest" : "gemini-1.5-flash-latest");
}

function getFastModel(): ChatOpenAI {
  if (_fastModel) return _fastModel;
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is not set");
  }
  _fastModel = new ChatOpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    model: "gpt-4o-mini",
    temperature: 0.3,
    timeout: 30000,
    maxRetries: 2,
  });
  return _fastModel;
}

function getStandardModel(): ChatOpenAI {
  if (_standardModel) return _standardModel;
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is not set");
  }
  _standardModel = new ChatOpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    model: "gpt-4o",
    temperature: 0.3,
    timeout: 60000,
    maxRetries: 2,
  });
  return _standardModel;
}

function getTempModel(tier: ModelTier | undefined, temperature: number): ChatOpenAI {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is not set");
  }
  const modelId = tier === "standard" ? "gpt-4o" : "gpt-4o-mini";
  const key = `${modelId}:${temperature}`;
  const cached = _tempModels.get(key);
  if (cached) return cached;
  const created = new ChatOpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    model: modelId,
    temperature,
    timeout: 30000,
    maxRetries: 2,
  });
  _tempModels.set(key, created);
  return created;
}

export type ModelTier = "fast" | "standard";

export interface AiTrackingContext {
  feature?: string;
  orgId?: string;
  userId?: string;
}

function modelName(tier?: ModelTier): string {
  return tier === "standard" ? "gpt-4o" : "gpt-4o-mini";
}

async function safeTrack(
  ctx: AiTrackingContext | undefined,
  tier: ModelTier | undefined,
  result: { usage_metadata?: { input_tokens?: number; output_tokens?: number }; response_metadata?: { tokenUsage?: { promptTokens?: number; completionTokens?: number } } }
): Promise<void> {
  if (!ctx?.feature || !ctx?.orgId) return;
  const usage = result?.usage_metadata;
  const fallback = result?.response_metadata?.tokenUsage;
  const inputTokens = usage?.input_tokens ?? fallback?.promptTokens ?? 0;
  const outputTokens = usage?.output_tokens ?? fallback?.completionTokens ?? 0;
  if (!inputTokens && !outputTokens) return;
  try {
    const { trackAiUsage } = await import("./usage-tracker");
    await trackAiUsage({
      orgId: ctx.orgId,
      userId: ctx.userId ?? null,
      feature: ctx.feature,
      model: modelName(tier),
      promptTokens: inputTokens,
      completionTokens: outputTokens,
    });
  } catch (error) {
    logger.error("Failed to track AI usage", { feature: ctx.feature, error });
  }
}

export async function aiInvoke<T extends z.ZodTypeAny>(opts: {
  model?: ModelTier;
  schema: T;
  schemaName: string;
  system: string;
  user: string;
  tracking?: AiTrackingContext;
}): Promise<z.infer<T>> {
  if (isGoogleOnlyConfigured()) {
    const { object } = await generateObject({
      model: getGoogleModel(opts.model),
      schema: opts.schema,
      system: opts.system,
      prompt: opts.user,
    });
    return object as z.infer<T>;
  }

  const model = opts.model === "standard" ? getStandardModel() : getFastModel();

  const structured = model.withStructuredOutput(opts.schema, {
    name: opts.schemaName,
    method: "jsonSchema",
    strict: true,
  });

  const result = await structured.invoke([
    { role: "system", content: opts.system },
    { role: "user", content: opts.user },
  ]);

  return result as z.infer<T>;
}

export async function aiText(opts: {
  model?: ModelTier;
  system: string;
  user: string;
  temperature?: number;
  tracking?: AiTrackingContext;
}): Promise<string> {
  if (isGoogleOnlyConfigured()) {
    const { text } = await generateText({
      model: getGoogleModel(opts.model),
      system: opts.system,
      prompt: opts.user,
      temperature: opts.temperature,
    });
    return text;
  }

  const baseModel = opts.model === "standard" ? getStandardModel() : getFastModel();

  const model = opts.temperature !== undefined
    ? getTempModel(opts.model, opts.temperature)
    : baseModel;

  const result = await model.invoke([
    { role: "system", content: opts.system },
    { role: "user", content: opts.user },
  ]);

  void safeTrack(opts.tracking, opts.model, result as unknown as Parameters<typeof safeTrack>[2]);
  return typeof result.content === "string" ? result.content : JSON.stringify(result.content);
}
