/**
 * VEEF baseline — direct LLM API (single shot, no VibeOS server / no retry / no DB).
 *
 * Uses the same task prompts and system prompt as VibeOS attempt 1, but calls
 * OpenRouter directly. Measures JSON parse + Zod validity for comparison.
 *
 * Usage:
 *   node --import tsx --env-file=.env.local scripts/run-benchmark-baseline-api.ts
 *   node --import tsx --env-file=.env.local scripts/run-benchmark-baseline-api.ts --tasks=scripts/veef-v2-tasks.json
 *   node --import tsx --env-file=.env.local scripts/run-benchmark-baseline-api.ts --model=google/gemini-2.5-flash
 */

import { createOpenAI } from "@ai-sdk/openai";
import { generateText } from "ai";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { vibeModuleSchema } from "../src/shared/schemas";
import {
  buildMessages,
  normalizeLlmModule,
  parseJsonFromModelText,
} from "../src/server/kernel/schema-generator";
import { SCHEMA_GENERATOR_TEMPERATURE } from "../src/server/kernel/load-system-prompt";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const DEFAULT_TASKS_PATH = join(__dirname, "veef-v2-tasks.json");
const RESULTS_DIR = join(ROOT, "results");
const DEFAULT_MODEL = "google/gemini-2.5-flash";
const N_REPS = 5;
const DELAY_MS = 2000;
const MAX_TOKENS = 16384;

interface BenchmarkPrompt {
  id: string;
  name: string;
  prompt: string;
  level?: string;
}

interface BaselineRunResult {
  task_id: string;
  repetition_number: number;
  model: string;
  mode: "direct_api_single_shot";
  latency_ms: number;
  tokens_used?: number;
  json_parsed: boolean;
  zod_valid_raw: boolean;
  zod_valid_normalized: boolean;
  validation_errors?: string[];
  finish_reason?: string;
  error?: string;
}

function parseArg(prefix: string, fallback: string): string {
  const arg = process.argv.find((a) => a.startsWith(`${prefix}=`));
  if (!arg) return fallback;
  const value = arg.slice(prefix.length + 1).trim();
  return value || fallback;
}

function normalizePrompt(raw: Record<string, unknown>): BenchmarkPrompt {
  return {
    id: String(raw.id),
    name: String(raw.name ?? raw.title ?? raw.id),
    prompt: String(raw.prompt),
    level: typeof raw.level === "string" ? raw.level : undefined,
  };
}

function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

async function sleep(ms: number): Promise<void> {
  await new Promise<void>((r) => setTimeout(r, ms));
}

function getOpenRouterModel(modelId: string) {
  const apiKey = process.env.OPENROUTER_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("OPENROUTER_API_KEY is required for baseline API benchmark");
  }
  const openrouter = createOpenAI({
    baseURL: "https://openrouter.ai/api/v1",
    apiKey,
    headers: {
      "HTTP-Referer": process.env.OPENROUTER_HTTP_REFERER ?? "http://localhost:3001",
      "X-Title": process.env.OPENROUTER_APP_TITLE ?? "VibeOS Baseline",
    },
  });
  return openrouter(modelId);
}

async function runOne(
  task: BenchmarkPrompt,
  repetitionNumber: number,
  modelId: string
): Promise<BaselineRunResult> {
  const t0 = performance.now();
  const base: Omit<
    BaselineRunResult,
    "latency_ms" | "json_parsed" | "zod_valid_raw" | "zod_valid_normalized"
  > = {
    task_id: task.id,
    repetition_number: repetitionNumber,
    model: modelId,
    mode: "direct_api_single_shot",
  };

  try {
    const { system, prompt } = buildMessages({
      userPrompt: task.prompt,
      attempt: 1,
    });

    const { text, usage, finishReason } = await generateText({
      model: getOpenRouterModel(modelId),
      system,
      prompt,
      temperature: SCHEMA_GENERATOR_TEMPERATURE,
      maxTokens: MAX_TOKENS,
    });

    const latency_ms = performance.now() - t0;
    const parsed = parseJsonFromModelText(text);

    if (parsed === null) {
      return {
        ...base,
        latency_ms,
        tokens_used: usage?.totalTokens,
        finish_reason: finishReason,
        json_parsed: false,
        zod_valid_raw: false,
        zod_valid_normalized: false,
        validation_errors: ["Response was not valid JSON"],
      };
    }

    const rawZod = vibeModuleSchema.safeParse(parsed);
    const normalizedZod = vibeModuleSchema.safeParse(normalizeLlmModule(parsed));

    const validation_errors = rawZod.success
      ? undefined
      : rawZod.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).slice(0, 8);

    return {
      ...base,
      latency_ms,
      tokens_used: usage?.totalTokens,
      finish_reason: finishReason,
      json_parsed: true,
      zod_valid_raw: rawZod.success,
      zod_valid_normalized: normalizedZod.success,
      validation_errors,
    };
  } catch (error) {
    return {
      ...base,
      latency_ms: performance.now() - t0,
      json_parsed: false,
      zod_valid_raw: false,
      zod_valid_normalized: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

function printSummary(
  results: BaselineRunResult[],
  prompts: BenchmarkPrompt[],
  resultsPath: string,
  modelId: string,
  tasksPath: string
): void {
  const jsonOk = results.filter((r) => r.json_parsed);
  const rawOk = results.filter((r) => r.zod_valid_raw);
  const normOk = results.filter((r) => r.zod_valid_normalized);
  const rate = (n: number) => (results.length ? (n / results.length) * 100 : 0);

  console.log("\n## Baseline API summary (single shot, no VibeOS)\n");
  console.log("| Metric | Value |");
  console.log("|--------|-------|");
  console.log(`| Model | ${modelId} |`);
  console.log(`| Mode | direct OpenRouter API |`);
  console.log(`| Tasks file | ${tasksPath} |`);
  console.log(`| Total runs | ${results.length} |`);
  console.log(`| JSON parsed | ${jsonOk.length} (${rate(jsonOk.length).toFixed(1)}%) |`);
  console.log(`| Zod valid (raw, no normalize) | ${rawOk.length} (${rate(rawOk.length).toFixed(1)}%) |`);
  console.log(`| Zod valid (+ normalize only) | ${normOk.length} (${rate(normOk.length).toFixed(1)}%) |`);
  console.log(`| Mean latency | ${mean(results.map((r) => r.latency_ms)).toFixed(2)} ms |`);
  console.log(`| Results file | ${resultsPath} |`);

  const levels = ["L1", "L2", "L3"];
  if (prompts.some((p) => p.level)) {
    console.log("\n### Per-level (Zod raw)\n");
    console.log("| Level | Runs | JSON OK | Zod raw | Zod + normalize |");
    console.log("|-------|------|---------|---------|-----------------|");
    for (const level of levels) {
      const ids = new Set(prompts.filter((p) => p.level === level).map((p) => p.id));
      const runs = results.filter((r) => ids.has(r.task_id));
      if (runs.length === 0) continue;
      console.log(
        `| ${level} | ${runs.length} | ${rate(runs.filter((r) => r.json_parsed).length).toFixed(1)}% | ${rate(runs.filter((r) => r.zod_valid_raw).length).toFixed(1)}% | ${rate(runs.filter((r) => r.zod_valid_normalized).length).toFixed(1)}% |`
      );
    }
  }

  console.log("\n### Per-task (Zod raw)\n");
  console.log("| Task | Name | Zod raw | Zod + normalize | Mean ms |");
  console.log("|------|------|---------|-----------------|---------|");
  for (const p of prompts) {
    const runs = results.filter((r) => r.task_id === p.id);
    const rawRate = rate(runs.filter((r) => r.zod_valid_raw).length);
    const normRate = rate(runs.filter((r) => r.zod_valid_normalized).length);
    console.log(
      `| ${p.id} | ${p.name} | ${rawRate.toFixed(1)}% | ${normRate.toFixed(1)}% | ${mean(runs.map((r) => r.latency_ms)).toFixed(0)} |`
    );
  }
  console.log("");
}

async function main(): Promise<void> {
  const tasksPath = resolve(ROOT, parseArg("--tasks", "scripts/veef-v2-tasks.json"));
  const modelId = parseArg("--model", process.env.BASELINE_MODEL ?? DEFAULT_MODEL);
  const resultsPath = join(RESULTS_DIR, "benchmark-results-v2-baseline-api.json");

  const raw = await readFile(tasksPath, "utf-8");
  const prompts = (JSON.parse(raw) as Record<string, unknown>[]).map(normalizePrompt);

  await mkdir(RESULTS_DIR, { recursive: true });

  const results: BaselineRunResult[] = [];
  const total = prompts.length * N_REPS;

  console.log(`[baseline-api] Model: ${modelId}`);
  console.log(`[baseline-api] Tasks: ${tasksPath}`);
  console.log(`[baseline-api] Results: ${resultsPath}`);
  console.log(`[baseline-api] ${total} direct API calls (${DELAY_MS} ms between calls)`);

  let done = 0;
  for (const task of prompts) {
    for (let rep = 1; rep <= N_REPS; rep++) {
      const row = await runOne(task, rep, modelId);
      results.push(row);
      done += 1;
      const ok = row.zod_valid_raw ? "OK" : row.json_parsed ? "ZOD_FAIL" : "JSON_FAIL";
      console.log(
        `[baseline-api] ${done}/${total}  ${task.id}  rep=${rep}  ${ok}  ${row.latency_ms.toFixed(0)} ms  tokens=${row.tokens_used ?? "n/a"}`
      );
      if (done < total) await sleep(DELAY_MS);
    }
  }

  await writeFile(resultsPath, JSON.stringify(results, null, 2), "utf-8");
  console.log(`[baseline-api] Wrote ${results.length} rows to ${resultsPath}`);
  printSummary(results, prompts, resultsPath, modelId, tasksPath);
}

try {
  await main();
} catch (err) {
  console.error("[baseline-api] Fatal:", err);
  process.exit(1);
}
