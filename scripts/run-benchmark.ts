/**
 * VEEF thesis benchmark runner — N prompts × 10 repetitions → results/benchmark-results.json
 *
 * Prerequisite: `npm run dev:server` on http://localhost:3001
 * Self-correction retries: SCHEMA_GENERATOR_MAX_RETRIES (default 3) in .env.local
 *
 * Usage:
 *   npm run benchmark
 *   npm run benchmark -- --tasks=scripts/veef-v2-tasks.json
 */

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const DEFAULT_PROMPTS_PATH = join(__dirname, "benchmark-prompts.json");
const RESULTS_DIR = join(ROOT, "results");

const BASE_URL = process.env.BENCHMARK_BASE_URL ?? "http://localhost:3001";
const N_REPS = 5;
const DELAY_MS = 2000;
const REQUEST_TIMEOUT_MS = Number(process.env.BENCHMARK_REQUEST_TIMEOUT_MS ?? 180_000);

interface BenchmarkPrompt {
  id: string;
  name: string;
  intent: string;
  prompt: string;
  level?: string;
}

interface BenchmarkRunResult {
  task_id: string;
  repetition_number: number;
  http_status: number;
  latency_ms: number;
  response_body: unknown;
  attempts_used?: number;
  self_corrected?: boolean;
  attempt_timings_ms?: number[];
}

function parseTasksPathFromArgv(): string {
  const arg = process.argv.find((a) => a.startsWith("--tasks="));
  if (!arg) return DEFAULT_PROMPTS_PATH;

  const raw = arg.slice("--tasks=".length).trim();
  if (!raw) return DEFAULT_PROMPTS_PATH;

  return resolve(ROOT, raw);
}

function resolveResultsPath(tasksPath: string): string {
  const base = tasksPath.includes("veef-v2-tasks.json")
    ? "benchmark-results-v2.json"
    : "benchmark-results.json";
  return join(RESULTS_DIR, base);
}

function normalizePrompt(raw: Record<string, unknown>): BenchmarkPrompt {
  return {
    id: String(raw.id),
    name: String(raw.name ?? raw.title ?? raw.id),
    intent: String(raw.intent ?? "generate"),
    prompt: String(raw.prompt),
    level: typeof raw.level === "string" ? raw.level : undefined,
  };
}

function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function stdDevSample(values: number[]): number {
  const n = values.length;
  if (n < 2) return 0;
  const μ = mean(values);
  const ss = values.reduce((acc, x) => acc + (x - μ) ** 2, 0);
  return Math.sqrt(ss / (n - 1));
}

function is2xx(status: number): boolean {
  return status >= 200 && status < 300;
}

function extractSelfCorrectionMetadata(body: unknown): {
  attempts_used?: number;
  self_corrected?: boolean;
  attempt_timings_ms?: number[];
} {
  if (!body || typeof body !== "object") return {};
  const meta = (body as { metadata?: unknown }).metadata;
  if (!meta || typeof meta !== "object") return {};
  const m = meta as Record<string, unknown>;
  return {
    attempts_used: typeof m.attemptsUsed === "number" ? m.attemptsUsed : undefined,
    self_corrected: typeof m.selfCorrected === "boolean" ? m.selfCorrected : undefined,
    attempt_timings_ms: Array.isArray(m.attemptTimingsMs)
      ? (m.attemptTimingsMs as number[])
      : undefined,
  };
}

async function sleep(ms: number): Promise<void> {
  await new Promise<void>((resolve) => setTimeout(resolve, ms));
}

async function parseResponseBody(res: Response): Promise<unknown> {
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return { _raw: text };
  }
}

async function runOne(
  taskId: string,
  intent: string,
  prompt: string,
  repetitionNumber: number
): Promise<BenchmarkRunResult> {
  const t0 = performance.now();
  try {
    const res = await fetch(`${BASE_URL}/api/vibe`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ intent, payload: { prompt } }),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    const response_body = await parseResponseBody(res);
    const latency_ms = performance.now() - t0;
    const sc = extractSelfCorrectionMetadata(response_body);
    return {
      task_id: taskId,
      repetition_number: repetitionNumber,
      http_status: res.status,
      latency_ms,
      response_body,
      ...sc,
    };
  } catch (error) {
    const latency_ms = performance.now() - t0;
    const message = error instanceof Error ? error.message : String(error);
    return {
      task_id: taskId,
      repetition_number: repetitionNumber,
      http_status: 0,
      latency_ms,
      response_body: { error: message },
    };
  }
}

function printLevelSummary(results: BenchmarkRunResult[], prompts: BenchmarkPrompt[]): void {
  const levels = ["L1", "L2", "L3"];
  const hasLevels = prompts.some((p) => p.level !== undefined);
  if (!hasLevels) return;

  console.log("\n### Per-level breakdown (L1 / L2 / L3)\n");
  console.log("| Level | Tasks | Runs | DVR (2xx) | Self-corrected | Mean latency (ms) |");
  console.log("|-------|-------|------|-----------|----------------|-------------------|");

  for (const level of levels) {
    const levelTasks = prompts.filter((p) => p.level === level);
    if (levelTasks.length === 0) continue;

    const levelIds = new Set(levelTasks.map((t) => t.id));
    const levelRuns = results.filter((r) => levelIds.has(r.task_id));
    const levelOk = levelRuns.filter((r) => is2xx(r.http_status));
    const taskRate = levelRuns.length ? (levelOk.length / levelRuns.length) * 100 : 0;
    const scCount = levelRuns.filter((r) => r.self_corrected).length;
    const levelMean = mean(levelRuns.map((r) => r.latency_ms));

    console.log(
      `| ${level} | ${levelTasks.length} | ${levelRuns.length} | ${taskRate.toFixed(1)}% | ${scCount}/${levelRuns.length} | ${levelMean.toFixed(2)} |`
    );
  }
  console.log("");
}

function printSummary(
  results: BenchmarkRunResult[],
  prompts: BenchmarkPrompt[],
  resultsPath: string,
  tasksPath: string
): void {
  const latencies = results.map((r) => r.latency_ms);
  const successes = results.filter((r) => is2xx(r.http_status));
  const failures = results.length - successes.length;
  const μ = mean(latencies);
  const σ = stdDevSample(latencies);
  const min = latencies.length ? Math.min(...latencies) : 0;
  const max = latencies.length ? Math.max(...latencies) : 0;
  const successRate = results.length ? (successes.length / results.length) * 100 : 0;

  const selfCorrectedRuns = results.filter((r) => r.self_corrected === true);
  const selfCorrectedRate = results.length
    ? (selfCorrectedRuns.length / results.length) * 100
    : 0;

  console.log("\n## Benchmark summary\n");
  console.log("| Metric | Value |");
  console.log("|--------|-------|");
  console.log(`| Tasks file | ${tasksPath} |`);
  console.log(`| Total requests | ${results.length} |`);
  console.log(`| Success rate (2xx) | ${successRate.toFixed(1)}% |`);
  console.log(`| Self-corrected runs | ${selfCorrectedRuns.length} (${selfCorrectedRate.toFixed(1)}%) |`);
  console.log(`| Failures | ${failures} |`);
  console.log(`| Mean latency | ${μ.toFixed(2)} ms |`);
  console.log(`| Std deviation | ${σ.toFixed(2)} ms |`);
  console.log(`| Min latency | ${min.toFixed(2)} ms |`);
  console.log(`| Max latency | ${max.toFixed(2)} ms |`);
  console.log(`| Results file | ${resultsPath} |`);

  printLevelSummary(results, prompts);

  console.log("\n### Per-task breakdown\n");
  console.log("| Task | Name | DVR (2xx) | Self-corrected | Mean attempts | Mean latency (ms) |");
  console.log("|------|------|-----------|----------------|---------------|-------------------|");

  for (const p of prompts) {
    const taskRuns = results.filter((r) => r.task_id === p.id);
    const taskOk = taskRuns.filter((r) => is2xx(r.http_status));
    const taskRate = taskRuns.length ? (taskOk.length / taskRuns.length) * 100 : 0;
    const taskMean = mean(taskRuns.map((r) => r.latency_ms));
    const scCount = taskRuns.filter((r) => r.self_corrected).length;
    const attempts = taskRuns
      .map((r) => r.attempts_used)
      .filter((n): n is number => typeof n === "number");
    const meanAttempts = attempts.length ? mean(attempts) : 0;
    console.log(
      `| ${p.id} | ${p.name} | ${taskRate.toFixed(1)}% | ${scCount}/${taskRuns.length} | ${meanAttempts.toFixed(2)} | ${taskMean.toFixed(2)} |`
    );
  }
  console.log("");
}

async function main(): Promise<void> {
  const tasksPath = parseTasksPathFromArgv();
  const resultsPath = resolveResultsPath(tasksPath);

  const raw = await readFile(tasksPath, "utf-8");
  const parsed = JSON.parse(raw) as Record<string, unknown>[];
  const prompts = parsed.map(normalizePrompt);

  await mkdir(RESULTS_DIR, { recursive: true });

  const results: BenchmarkRunResult[] = [];
  const total = prompts.length * N_REPS;
  let done = 0;

  console.log(`[benchmark] Tasks: ${tasksPath}`);
  console.log(`[benchmark] Results: ${resultsPath}`);
  console.log(
    `[benchmark] ${total} requests → ${BASE_URL}/api/vibe (${DELAY_MS} ms between requests)`
  );

  for (const task of prompts) {
    for (let rep = 1; rep <= N_REPS; rep++) {
      const row = await runOne(task.id, task.intent, task.prompt, rep);
      results.push(row);
      done += 1;
      const ok = is2xx(row.http_status) ? "OK" : "FAIL";
      const sc = row.self_corrected ? " SC" : "";
      const att = row.attempts_used !== undefined ? ` att=${row.attempts_used}` : "";
      console.log(
        `[benchmark] ${done}/${total}  ${task.id}  rep=${rep}  ${ok}${sc}${att}  ${row.latency_ms.toFixed(0)} ms  http=${row.http_status}`
      );
      if (done < total) {
        await sleep(DELAY_MS);
      }
    }
  }

  await writeFile(resultsPath, JSON.stringify(results, null, 2), "utf-8");
  console.log(`[benchmark] Wrote ${results.length} rows to ${resultsPath}`);
  printSummary(results, prompts, resultsPath, tasksPath);
}

try {
  await main();
} catch (err) {
  console.error("[benchmark] Fatal:", err);
  process.exit(1);
}
