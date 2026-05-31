/**
 * VEEF baseline — direct LLM + few-shot examples in system prompt.
 *
 * Same as run-baseline.ts (single shot, Zod only, no normalize, no retries)
 * except the system prompt includes 2 valid vibe_schema_v1 examples after
 * loadSystemPrompt() text.
 *
 * Usage:
 *   npm run baseline:fewshot
 *   npm run baseline:fewshot -- --tasks=scripts/veef-v2-tasks.json
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
import { loadSystemPrompt, SCHEMA_GENERATOR_TEMPERATURE } from "../src/server/kernel/load-system-prompt";
import { vibeModuleSchema } from "../src/shared/schemas/vibe-schema-v1";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
loadEnv({ path: join(ROOT, ".env.local") });
const DEFAULT_TASKS_PATH = join(__dirname, "veef-v2-tasks.json");
const RESULTS_PATH = join(ROOT, "results", "baseline-fewshot-results.json");
const N_REPS = 5;
const DELAY_MS = 2000;
const MAX_TOKENS = 16384;

const FEW_SHOT_SUFFIX = `
Here are two examples of valid vibe_schema_v1 output:

EXAMPLE 1 (simple entity):
{
  "version": "1.0.0",
  "module": "contact-manager",
  "description": "Simple contact management module",
  "entities": [{
    "name": "contact",
    "label": "Contact",
    "pluralLabel": "Contacts",
    "description": "Contact records",
    "fields": [
      {"name": "full_name", "label": "Full Name", "type": "text", "required": true},
      {"name": "email", "label": "Email", "type": "email", "required": true},
      {"name": "status", "label": "Status", "type": "select", "required": false, "options": ["Active", "Inactive"]}
    ],
    "timestamps": true,
    "softDelete": true
  }],
  "views": [
    {"name": "contact_table", "label": "Contacts", "entity": "contact", "layout": {"type": "table", "columns": ["full_name", "email", "status"]}},
    {"name": "contact_form", "label": "Contact Form", "entity": "contact", "layout": {"type": "form"}}
  ],
  "actions": [],
  "automations": []
}

EXAMPLE 2 (with relationship):
{
  "version": "1.0.0",
  "module": "project-tasks",
  "description": "Project and task tracking",
  "entities": [
    {
      "name": "project",
      "label": "Project",
      "pluralLabel": "Projects",
      "description": "Project records",
      "fields": [
        {"name": "title", "label": "Title", "type": "text", "required": true},
        {"name": "status", "label": "Status", "type": "select", "required": false, "options": ["Active", "Completed"]}
      ],
      "timestamps": true,
      "softDelete": true
    },
    {
      "name": "task",
      "label": "Task",
      "pluralLabel": "Tasks",
      "description": "Task records linked to projects",
      "fields": [
        {"name": "title", "label": "Title", "type": "text", "required": true},
        {"name": "assignee", "label": "Assignee", "type": "text", "required": false},
        {"name": "project_id", "label": "Project", "type": "relation", "required": true, "relation": {"entity": "project", "field": "id", "type": "one-to-many"}}
      ],
      "timestamps": true,
      "softDelete": true
    }
  ],
  "views": [
    {"name": "project_table", "label": "Projects", "entity": "project", "layout": {"type": "table", "columns": ["title", "status"]}},
    {"name": "task_table", "label": "Tasks", "entity": "task", "layout": {"type": "table", "columns": ["title", "assignee"]}}
  ],
  "actions": [],
  "automations": []
}

Follow this exact structure. module must be a flat kebab-case string.
Every entity needs description, pluralLabel, timestamps, softDelete.
Every field needs required (true or false). views must be an array of
objects with layout as an object containing type.
`.trim();

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
  zod_errors?: string[];
  error?: string;
}

function buildFewShotSystem(): string {
  const basePrompt = loadSystemPrompt();
  const { system: baselineSystem } = buildMessages({
    userPrompt: "",
    attempt: 1,
  });
  const suffix = baselineSystem.slice(basePrompt.length).replace(/^\s+/, "");
  return `${basePrompt}\n\n${FEW_SHOT_SUFFIX}\n\n${suffix}`;
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
    return join(ROOT, "results", `baseline-fewshot-results-${level.toLowerCase()}.json`);
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
    const system = buildFewShotSystem();
    const prompt = task.prompt;

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
        zod_errors: ["Response was not valid JSON"],
      };
    }

    const zod = vibeModuleSchema.safeParse(parsed);

    return {
      ...base,
      zod_pass: zod.success,
      latency_ms,
      zod_errors: zod.success ? undefined : formatZodErrors(zod.error),
    };
  } catch (error) {
    return {
      ...base,
      zod_pass: false,
      latency_ms: performance.now() - t0,
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

  console.log("\n## Baseline few-shot summary (direct LLM + examples, Zod only)\n");
  console.log("| Metric | Value |");
  console.log("|--------|-------|");
  console.log(`| Model | ${modelId} |`);
  if (level) console.log(`| Level filter | ${level} |`);
  console.log(`| Tasks file | ${tasksPath} |`);
  console.log(`| Total runs | ${results.length} |`);
  console.log(`| Zod pass rate | ${passRate.toFixed(1)}% (${passes.length}/${results.length}) |`);
  console.log(`| Mean latency | ${mean(results.map((r) => r.latency_ms)).toFixed(2)} ms |`);
  console.log(`| Results file | ${resultsPath} |`);

  console.log("\n### Zod pass rate per level\n");
  console.log("| Level | Zod pass | Mean latency (ms) |");
  console.log("|-------|----------|-------------------|");

  for (const lvl of ["L1", "L2", "L3"] as const) {
    const levelTasks = tasks.filter((t) => t.level === lvl);
    if (levelTasks.length === 0) continue;
    const ids = new Set(levelTasks.map((t) => t.id));
    const levelRuns = results.filter((r) => ids.has(r.task_id));
    const levelPasses = levelRuns.filter((r) => r.zod_pass);
    const levelRate = levelRuns.length ? (levelPasses.length / levelRuns.length) * 100 : 0;
    const levelMean = mean(levelRuns.map((r) => r.latency_ms));
    console.log(
      `| ${lvl} | ${levelRate.toFixed(1)}% (${levelPasses.length}/${levelRuns.length}) | ${levelMean.toFixed(2)} |`
    );
  }

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

  console.log(`[baseline:fewshot] Model: ${modelId}`);
  console.log(
    `[baseline:fewshot] Tasks: ${tasksPath}${levelFilter ? ` (level=${levelFilter}, ${tasks.length} tasks)` : ""}`
  );
  console.log(`[baseline:fewshot] Results: ${resultsPath}`);
  console.log(`[baseline:fewshot] ${total} single-shot LLM calls (${DELAY_MS} ms between calls)`);

  let done = 0;
  for (const task of tasks) {
    for (let rep = 1; rep <= N_REPS; rep++) {
      const row = await runOne(task, rep);
      results.push(row);
      done += 1;
      const status = row.zod_pass ? "PASS" : row.error ? "ERROR" : "ZOD_FAIL";
      console.log(
        `[baseline:fewshot] ${done}/${total}  ${task.id}  rep=${rep}  ${status}  ${row.latency_ms.toFixed(0)} ms`
      );
      if (done < total) await sleep(DELAY_MS);
    }
  }

  await writeFile(resultsPath, JSON.stringify(results, null, 2), "utf-8");
  console.log(`[baseline:fewshot] Wrote ${results.length} rows to ${resultsPath}`);
  printSummary(results, tasks, tasksPath, modelId, resultsPath, levelFilter);
}

try {
  await main();
} catch (err) {
  console.error("[baseline:fewshot] Fatal:", err);
  process.exit(1);
}
