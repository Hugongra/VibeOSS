/**
 * VEEF baseline — direct LLM call (single shot, no VibeOS pipeline).
 *
 * Sends each task prompt directly to the schema generator model with the same
 * system prompt as attempt 1. Validates raw output against vibeModuleSchema
 * (Zod only — no normalize layer, no retries).
 *
 * Usage:
 *   npm run baseline
 *   npm run baseline -- --tasks=scripts/veef-v2-tasks.json
 */

import { generateText } from "ai";
import { config as loadEnv } from "dotenv";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  buildMessages,
  parseJsonFromModelText,
} from "../src/server/kernel/schema-generator";
import {
  getSchemaGeneratorModel,
  resolveSchemaGeneratorModel,
} from "../src/server/kernel/llm-provider";
import { SCHEMA_GENERATOR_TEMPERATURE } from "../src/server/kernel/load-system-prompt";
import { vibeModuleSchema } from "../src/shared/schemas/vibe-schema-v1";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
loadEnv({ path: join(ROOT, ".env.local") });
const DEFAULT_TASKS_PATH = join(__dirname, "veef-v2-tasks.json");
const RESULTS_PATH = join(ROOT, "results", "baseline-results.json");
const N_REPS = 5;
const DELAY_MS = 2000;
const MAX_TOKENS = 16384;

interface BenchmarkTask {
  id: string;
  name: string;
  prompt: string;
  level?: string;
}

interface BaselineRunResult {
  task_id: string;
  repetition: number;
  zod_pass: boolean;
  latency_ms: number;
  raw_output: string;
  zod_errors?: string[];
  error?: string;
}

function parseTasksPathFromArgv(): string {
  const arg = process.argv.find((a) => a.startsWith("--tasks="));
  if (!arg) return DEFAULT_TASKS_PATH;

  const raw = arg.slice("--tasks=".length).trim();
  return raw ? resolve(ROOT, raw) : DEFAULT_TASKS_PATH;
}

function parseLevelFilterFromArgv(): string | undefined {
  const arg = process.argv.find((a) => a.startsWith("--level="));
  if (!arg) return undefined;
  const level = arg.slice("--level=".length).trim();
  return level || undefined;
}

function resolveResultsPath(level?: string): string {
  if (level) {
    return join(ROOT, "results", `baseline-results-${level.toLowerCase()}.json`);
  }
  return RESULTS_PATH;
}

function normalizeTask(raw: Record<string, unknown>): BenchmarkTask {
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

function formatZodErrors(error: { issues: { path: (string | number)[]; message: string }[] }): string[] {
  return error.issues.map((i) => {
    const path = i.path.length ? i.path.join(".") : "(root)";
    return `${path}: ${i.message}`;
  });
}

async function sleep(ms: number): Promise<void> {
  await new Promise<void>((r) => setTimeout(r, ms));
}

async function runOne(task: BenchmarkTask, repetition: number): Promise<BaselineRunResult> {
  const t0 = performance.now();
  const base = { task_id: task.id, repetition };

  try {
    const { system, prompt } = buildMessages({
      userPrompt: task.prompt,
      attempt: 1,
    });

    const { text } = await generateText({
      model: getSchemaGeneratorModel(),
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
        zod_pass: false,
        latency_ms,
        raw_output: text,
        zod_errors: ["Response was not valid JSON"],
      };
    }

    const zod = vibeModuleSchema.safeParse(parsed);

    return {
      ...base,
      zod_pass: zod.success,
      latency_ms,
      raw_output: text,
      zod_errors: zod.success ? undefined : formatZodErrors(zod.error),
    };
  } catch (error) {
    return {
      ...base,
      zod_pass: false,
      latency_ms: performance.now() - t0,
      raw_output: "",
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

function printSummary(
  results: BaselineRunResult[],
  tasks: BenchmarkTask[],
  tasksPath: string,
  modelId: string,
  resultsPath: string,
  level?: string
): void {
  const passes = results.filter((r) => r.zod_pass);
  const passRate = results.length ? (passes.length / results.length) * 100 : 0;

  console.log("\n## Baseline summary (direct LLM, Zod only)\n");
  console.log("| Metric | Value |");
  console.log("|--------|-------|");
  console.log(`| Model | ${modelId} |`);
  if (level) console.log(`| Level filter | ${level} |`);
  console.log(`| Tasks file | ${tasksPath} |`);
  console.log(`| Total runs | ${results.length} |`);
  console.log(`| Zod pass rate | ${passRate.toFixed(1)}% (${passes.length}/${results.length}) |`);
  console.log(`| Mean latency | ${mean(results.map((r) => r.latency_ms)).toFixed(2)} ms |`);
  console.log(`| Results file | ${resultsPath} |`);

  console.log("\n### Per-task pass rate\n");
  console.log("| Task | Name | Zod pass | Mean latency (ms) |");
  console.log("|------|------|----------|-------------------|");

  for (const task of tasks) {
    const taskRuns = results.filter((r) => r.task_id === task.id);
    const taskPasses = taskRuns.filter((r) => r.zod_pass);
    const taskRate = taskRuns.length ? (taskPasses.length / taskRuns.length) * 100 : 0;
    const taskMean = mean(taskRuns.map((r) => r.latency_ms));
    console.log(
      `| ${task.id} | ${task.name} | ${taskRate.toFixed(1)}% (${taskPasses.length}/${taskRuns.length}) | ${taskMean.toFixed(2)} |`
    );
  }
  console.log("");
}

async function main(): Promise<void> {
  const tasksPath = parseTasksPathFromArgv();
  const levelFilter = parseLevelFilterFromArgv();
  const resultsPath = resolveResultsPath(levelFilter);
  const modelId = resolveSchemaGeneratorModel();

  const raw = await readFile(tasksPath, "utf-8");
  let tasks = (JSON.parse(raw) as Record<string, unknown>[]).map(normalizeTask);
  if (levelFilter) {
    tasks = tasks.filter((t) => t.level === levelFilter);
    if (tasks.length === 0) {
      throw new Error(`No tasks with level="${levelFilter}" in ${tasksPath}`);
    }
  }

  await mkdir(join(ROOT, "results"), { recursive: true });

  const results: BaselineRunResult[] = [];
  const total = tasks.length * N_REPS;

  console.log(`[baseline] Model: ${modelId}`);
  console.log(`[baseline] Tasks: ${tasksPath}${levelFilter ? ` (level=${levelFilter}, ${tasks.length} tasks)` : ""}`);
  console.log(`[baseline] Results: ${resultsPath}`);
  console.log(`[baseline] ${total} single-shot LLM calls (${DELAY_MS} ms between calls)`);

  let done = 0;
  for (const task of tasks) {
    for (let rep = 1; rep <= N_REPS; rep++) {
      const row = await runOne(task, rep);
      results.push(row);
      done += 1;
      const status = row.zod_pass ? "PASS" : row.error ? "ERROR" : "ZOD_FAIL";
      console.log(
        `[baseline] ${done}/${total}  ${task.id}  rep=${rep}  ${status}  ${row.latency_ms.toFixed(0)} ms`
      );
      if (done < total) await sleep(DELAY_MS);
    }
  }

  await writeFile(resultsPath, JSON.stringify(results, null, 2), "utf-8");
  console.log(`[baseline] Wrote ${results.length} rows to ${resultsPath}`);
  printSummary(results, tasks, tasksPath, modelId, resultsPath, levelFilter);
}

try {
  await main();
} catch (err) {
  console.error("[baseline] Fatal:", err);
  process.exit(1);
}
