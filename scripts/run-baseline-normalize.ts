/**
 * VEEF baseline + normalize — direct LLM call, then normalizeLlmModule before Zod.
 *
 * Isolates how much value normalize adds vs the ReAct self-correction loop:
 * LLM → parse → normalizeLlmModule → Zod (no retries).
 *
 * Usage:
 *   npm run baseline:normalize
 *   npm run baseline:normalize -- --tasks=scripts/veef-v2-tasks.json
 */

import { generateText } from "ai";
import { config as loadEnv } from "dotenv";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  normalizeLlmModule,
  parseJsonFromModelText,
} from "../src/server/kernel/schema-generator";
import {
  getSchemaGeneratorModel,
  resolveSchemaGeneratorModel,
} from "../src/server/kernel/llm-provider";
import {
  loadSystemPrompt,
  SCHEMA_GENERATOR_TEMPERATURE,
} from "../src/server/kernel/load-system-prompt";
import { vibeModuleSchema } from "../src/shared/schemas/vibe-schema-v1";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
loadEnv({ path: join(ROOT, ".env.local") });
const DEFAULT_TASKS_PATH = join(__dirname, "veef-v2-tasks.json");
const RESULTS_PATH = join(ROOT, "results", "baseline-normalize-results.json");
const N_REPS = 5;
const DELAY_MS = 2000;
const MAX_TOKENS = 16384;

interface BenchmarkTask {
  id: string;
  name: string;
  prompt: string;
  level?: string;
}

interface BaselineNormalizeRunResult {
  task_id: string;
  repetition: number;
  zod_pass: boolean;
  raw_zod_pass: boolean;
  normalize_fixed: boolean;
  latency_ms: number;
  zod_errors?: string[];
  raw_zod_errors?: string[];
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
    return join(
      ROOT,
      "results",
      `baseline-normalize-results-${level.toLowerCase()}.json`
    );
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

function formatZodErrors(error: {
  issues: { path: (string | number)[]; message: string }[];
}): string[] {
  return error.issues.map((i) => {
    const path = i.path.length ? i.path.join(".") : "(root)";
    return `${path}: ${i.message}`;
  });
}

async function sleep(ms: number): Promise<void> {
  await new Promise<void>((r) => setTimeout(r, ms));
}

async function runOne(
  task: BenchmarkTask,
  repetition: number
): Promise<BaselineNormalizeRunResult> {
  const t0 = performance.now();
  const base = { task_id: task.id, repetition };

  try {
    const { text } = await generateText({
      model: getSchemaGeneratorModel(),
      system: loadSystemPrompt(),
      prompt: task.prompt,
      temperature: SCHEMA_GENERATOR_TEMPERATURE,
      maxTokens: MAX_TOKENS,
    });

    const latency_ms = performance.now() - t0;
    const parsed = parseJsonFromModelText(text);

    if (parsed === null) {
      return {
        ...base,
        zod_pass: false,
        raw_zod_pass: false,
        normalize_fixed: false,
        latency_ms,
        zod_errors: ["Response was not valid JSON"],
        raw_zod_errors: ["Response was not valid JSON"],
      };
    }

    const rawZod = vibeModuleSchema.safeParse(parsed);
    const normalized = normalizeLlmModule(parsed);
    const zod = vibeModuleSchema.safeParse(normalized);

    const raw_zod_pass = rawZod.success;
    const zod_pass = zod.success;
    const normalize_fixed = !raw_zod_pass && zod_pass;

    return {
      ...base,
      zod_pass,
      raw_zod_pass,
      normalize_fixed,
      latency_ms,
      zod_errors: zod.success ? undefined : formatZodErrors(zod.error),
      raw_zod_errors: rawZod.success ? undefined : formatZodErrors(rawZod.error),
    };
  } catch (error) {
    return {
      ...base,
      zod_pass: false,
      raw_zod_pass: false,
      normalize_fixed: false,
      latency_ms: performance.now() - t0,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

function printSummary(
  results: BaselineNormalizeRunResult[],
  tasks: BenchmarkTask[],
  tasksPath: string,
  modelId: string,
  resultsPath: string,
  level?: string
): void {
  const passes = results.filter((r) => r.zod_pass);
  const rawPasses = results.filter((r) => r.raw_zod_pass);
  const passRate = results.length ? (passes.length / results.length) * 100 : 0;
  const rawPassRate = results.length
    ? (rawPasses.length / results.length) * 100
    : 0;
  const fixed = results.filter((r) => r.normalize_fixed);
  const rawFails = results.filter((r) => !r.raw_zod_pass);
  const stillFails = rawFails.filter((r) => !r.zod_pass);

  console.log("\n## Baseline + normalize summary (LLM → normalize → Zod)\n");
  console.log("| Metric | Value |");
  console.log("|--------|-------|");
  console.log(`| Model | ${modelId} |`);
  if (level) console.log(`| Level filter | ${level} |`);
  console.log(`| Tasks file | ${tasksPath} |`);
  console.log(`| Total runs | ${results.length} |`);
  console.log(
    `| Raw Zod pass rate (no normalize) | ${rawPassRate.toFixed(1)}% (${rawPasses.length}/${results.length}) |`
  );
  console.log(
    `| Normalized Zod pass rate | ${passRate.toFixed(1)}% (${passes.length}/${results.length}) |`
  );
  console.log(
    `| Normalize fixed (raw fail → pass) | ${fixed.length} runs (+${(passRate - rawPassRate).toFixed(1)} pp) |`
  );
  console.log(
    `| Normalize did not fix (raw fail → still fail) | ${stillFails.length} runs |`
  );
  console.log(`| Mean latency | ${mean(results.map((r) => r.latency_ms)).toFixed(2)} ms |`);
  console.log(`| Results file | ${resultsPath} |`);

  const levels = ["L1", "L2", "L3"] as const;
  const taskLevel = new Map(tasks.map((t) => [t.id, t.level]));

  console.log("\n### Zod pass rate per level (normalized)\n");
  console.log("| Level | Raw pass | Normalized pass | Fixed by normalize |");
  console.log("|-------|----------|-----------------|--------------------|");

  for (const lvl of levels) {
    const levelResults = results.filter((r) => taskLevel.get(r.task_id) === lvl);
    if (levelResults.length === 0) continue;

    const levelRaw = levelResults.filter((r) => r.raw_zod_pass);
    const levelPass = levelResults.filter((r) => r.zod_pass);
    const levelFixed = levelResults.filter((r) => r.normalize_fixed);
    const rawRate = (levelRaw.length / levelResults.length) * 100;
    const normRate = (levelPass.length / levelResults.length) * 100;

    console.log(
      `| ${lvl} | ${rawRate.toFixed(1)}% (${levelRaw.length}/${levelResults.length}) | ${normRate.toFixed(1)}% (${levelPass.length}/${levelResults.length}) | ${levelFixed.length} |`
    );
  }

  console.log("\n### Per-task pass rate (normalized)\n");
  console.log("| Task | Name | Raw pass | Normalized pass | Fixed | Mean latency (ms) |");
  console.log("|------|------|----------|-----------------|-------|-------------------|");

  for (const task of tasks) {
    const taskRuns = results.filter((r) => r.task_id === task.id);
    const rawTaskPasses = taskRuns.filter((r) => r.raw_zod_pass);
    const taskPasses = taskRuns.filter((r) => r.zod_pass);
    const taskFixed = taskRuns.filter((r) => r.normalize_fixed);
    const rawRate = taskRuns.length
      ? (rawTaskPasses.length / taskRuns.length) * 100
      : 0;
    const taskRate = taskRuns.length ? (taskPasses.length / taskRuns.length) * 100 : 0;
    const taskMean = mean(taskRuns.map((r) => r.latency_ms));
    console.log(
      `| ${task.id} | ${task.name} | ${rawRate.toFixed(1)}% | ${taskRate.toFixed(1)}% | ${taskFixed.length}/${taskRuns.length} | ${taskMean.toFixed(2)} |`
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

  const results: BaselineNormalizeRunResult[] = [];
  const total = tasks.length * N_REPS;

  console.log(`[baseline:normalize] Model: ${modelId}`);
  console.log(
    `[baseline:normalize] Tasks: ${tasksPath}${levelFilter ? ` (level=${levelFilter}, ${tasks.length} tasks)` : ""}`
  );
  console.log(`[baseline:normalize] Results: ${resultsPath}`);
  console.log(
    `[baseline:normalize] ${total} single-shot LLM calls (${DELAY_MS} ms between calls)`
  );

  let done = 0;
  for (const task of tasks) {
    for (let rep = 1; rep <= N_REPS; rep++) {
      const row = await runOne(task, rep);
      results.push(row);
      done += 1;
      const status = row.zod_pass
        ? row.normalize_fixed
          ? "PASS (fixed)"
          : "PASS"
        : row.error
          ? "ERROR"
          : "ZOD_FAIL";
      console.log(
        `[baseline:normalize] ${done}/${total}  ${task.id}  rep=${rep}  ${status}  ${row.latency_ms.toFixed(0)} ms`
      );
      if (done < total) await sleep(DELAY_MS);
    }
  }

  await writeFile(resultsPath, JSON.stringify(results, null, 2), "utf-8");
  console.log(`[baseline:normalize] Wrote ${results.length} rows to ${resultsPath}`);
  printSummary(results, tasks, tasksPath, modelId, resultsPath, levelFilter);
}

try {
  await main();
} catch (err) {
  console.error("[baseline:normalize] Fatal:", err);
  process.exit(1);
}
