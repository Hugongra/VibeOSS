/**
 * LLM provider for schema generation.
 * Prefers OpenRouter when OPENROUTER_API_KEY is set; otherwise Anthropic direct.
 */

import { createOpenAI } from "@ai-sdk/openai";
import { anthropic } from "@ai-sdk/anthropic";
import type { LanguageModelV1 } from "@ai-sdk/provider";
import {
  OPENROUTER_DEFAULT_MODEL,
  SCHEMA_GENERATOR_MODEL,
} from "./load-system-prompt";

export type LlmProviderId = "openrouter" | "anthropic";

export function resolveLlmProvider(): LlmProviderId {
  if (process.env.OPENROUTER_API_KEY?.trim()) return "openrouter";
  if (process.env.ANTHROPIC_API_KEY?.trim()) return "anthropic";
  throw new Error(
    "No LLM API key configured. Set OPENROUTER_API_KEY or ANTHROPIC_API_KEY in .env.local"
  );
}

/** Model id in use (OpenRouter slug or Anthropic model id). */
export function resolveSchemaGeneratorModel(): string {
  if (process.env.SCHEMA_GENERATOR_MODEL?.trim()) {
    return process.env.SCHEMA_GENERATOR_MODEL.trim();
  }
  return resolveLlmProvider() === "openrouter"
    ? OPENROUTER_DEFAULT_MODEL
    : "claude-haiku-4-5-20251001";
}

/** Vercel AI SDK model handle for generateText. */
export function getSchemaGeneratorModel(): LanguageModelV1 {
  const modelId = resolveSchemaGeneratorModel();
  const provider = resolveLlmProvider();

  if (provider === "openrouter") {
    const openrouter = createOpenAI({
      baseURL: "https://openrouter.ai/api/v1",
      apiKey: process.env.OPENROUTER_API_KEY!,
      headers: {
        "HTTP-Referer":
          process.env.OPENROUTER_HTTP_REFERER ?? "http://localhost:3001",
        "X-Title": process.env.OPENROUTER_APP_TITLE ?? "VibeOS",
      },
    });
    return openrouter(modelId);
  }

  return anthropic(modelId);
}
