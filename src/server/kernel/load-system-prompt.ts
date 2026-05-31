import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const PROMPT_HEADER = "## Prompt";

/** Default OpenRouter model when SCHEMA_GENERATOR_MODEL is unset. */
export const OPENROUTER_DEFAULT_MODEL = "anthropic/claude-3.5-haiku";

/** Model id (OpenRouter slug or Anthropic id). See resolveSchemaGeneratorModel(). */
export const SCHEMA_GENERATOR_MODEL =
  process.env.SCHEMA_GENERATOR_MODEL?.trim() ??
  (process.env.OPENROUTER_API_KEY?.trim()
    ? OPENROUTER_DEFAULT_MODEL
    : "claude-haiku-4-5-20251001");

/** `temperature` for schema generation (must match **Temperature** in `system-prompt.md`). */
export const SCHEMA_GENERATOR_TEMPERATURE = 0;

/** Max self-correction attempts (override via SCHEMA_GENERATOR_MAX_RETRIES in .env). */
export function getSchemaGeneratorMaxRetries(): number {
  const raw = process.env.SCHEMA_GENERATOR_MAX_RETRIES;
  if (raw === undefined || raw === "") return 3;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n >= 1 && n <= 10 ? n : 3;
}

let cachedPrompt: string | undefined;

/**
 * Load the LLM system prompt from `system-prompt.md` (content under `## Prompt`).
 * Cached after first read for the lifetime of the process.
 */
export function loadSystemPrompt(): string {
  if (cachedPrompt !== undefined) return cachedPrompt;

  const path = join(dirname(fileURLToPath(import.meta.url)), "system-prompt.md");
  const raw = readFileSync(path, "utf-8");
  const start = raw.indexOf(PROMPT_HEADER);
  if (start < 0) {
    throw new Error(`system-prompt.md: missing "${PROMPT_HEADER}" section`);
  }

  cachedPrompt = raw
    .slice(start + PROMPT_HEADER.length)
    .replace(/^\r?\n+/, "")
    .trimEnd();
  return cachedPrompt;
}
