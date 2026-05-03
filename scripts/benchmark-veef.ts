/**
 * VEEF — VibeOS Enterprise Evaluation Framework (client harness)
 *
 * Runs N×5 POST /api/vibe (intent: generate) against a local server and
 * reports mean (μ) and sample standard deviation (σ) of end-to-end latency.
 *
 * Prerequisite: `npm run dev:server` (and valid OPENAI_API_KEY in .env.local).
 */

const BASE_URL = process.env.VEEF_BASE_URL ?? "http://localhost:3001";
const N_REPS = 10;
/** Per-request ceiling (generate can be slow); fail fast if API is down */
const REQUEST_TIMEOUT_MS = Number(process.env.VEEF_REQUEST_TIMEOUT_MS ?? 180_000);

const PROMPTS: { id: string; prompt: string }[] = [
  {
    id: "T1",
    prompt:
      "Enterprise CRM: create a SolarLead entity with fields full_name (text), email (email), phone (phone), lead_source (select: web, referral, event), and status (select: new, qualified, lost). Include table and form views.",
  },
  {
    id: "T2",
    prompt:
      "B2B pipeline: entity opportunity with amount (currency), stage (select: discovery, proposal, negotiation, closed_won, closed_lost), owner_email (email), and linked account_name (text). Table + form + one automation on_create notify in_app.",
  },
  {
    id: "T3",
    prompt:
      "Customer support: Ticket entity with subject (text), priority (select: low, medium, high, urgent), category (select: billing, technical, product), and sla_due (datetime). Table and form views.",
  },
  {
    id: "T4",
    prompt:
      "Field service: WorkOrder entity with service_address (text), scheduled_at (datetime), technician_name (text), completion_notes (rich-text). Include kanban view grouped by status field.",
  },
  {
    id: "T5",
    prompt:
      "Partner portal: Company entity with legal_name (text), tax_id (text), tier (select: bronze, silver, gold), contract_start (date). Contacts as separate entity with email and relation to company. Table views for both.",
  },
];

function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

/** Sample standard deviation (Bessel correction), σ for n ≥ 2 */
function stdDevSample(values: number[]): number {
  const n = values.length;
  if (n < 2) return 0;
  const μ = mean(values);
  const ss = values.reduce((acc, x) => acc + (x - μ) ** 2, 0);
  return Math.sqrt(ss / (n - 1));
}

async function oneRequest(prompt: string): Promise<{ ms: number; ok: boolean; status: number }> {
  const t0 = performance.now();
  try {
    const res = await fetch(`${BASE_URL}/api/vibe`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ intent: "generate", payload: { prompt } }),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    await res.json().catch(() => null);
    const ms = performance.now() - t0;
    return { ms, ok: res.ok, status: res.status };
  } catch {
    const ms = performance.now() - t0;
    return { ms, ok: false, status: 0 };
  }
}

async function main(): Promise<void> {
  const latencies: number[] = [];
  const failures: { id: string; rep: number; status: number }[] = [];
  const total = N_REPS * PROMPTS.length;
  let done = 0;

  for (let rep = 0; rep < N_REPS; rep++) {
    for (const { id, prompt } of PROMPTS) {
      const { ms, ok, status } = await oneRequest(prompt);
      done += 1;
      latencies.push(ms);
      if (!ok) failures.push({ id, rep, status });
      const tag = ok ? "OK " : "FAIL";
      console.log(
        `[VEEF] ${done}/${total}  ${id}  rep=${rep}  ${tag}  ${ms.toFixed(0)} ms  http=${status}`
      );
    }
  }

  const μ = mean(latencies);
  const σ = stdDevSample(latencies);
  const min = latencies.length ? Math.min(...latencies) : 0;
  const max = latencies.length ? Math.max(...latencies) : 0;
  const n = latencies.length;
  const dvr = n > 0 ? ((n - failures.length) / n) * 100 : 0;

  const table = [
    "## VEEF benchmark — total HTTP cycle time (I2IL) and validity (DVR)",
    "",
    "| Metric | Value |",
    "|--------|-------|",
    `| Base URL | \`${BASE_URL}\` |`,
    `| Tasks (prompts) | ${PROMPTS.length} |`,
    `| Repetitions per task | ${N_REPS} |`,
    `| Total requests (N) | ${latencies.length} |`,
    `| DVR (HTTP 2xx rate, %) | ${dvr.toFixed(1)} |`,
    `| Failures | ${failures.length} |`,
    `| Mean latency μ (ms) | ${μ.toFixed(2)} |`,
    `| Std dev σ sample (ms) | ${σ.toFixed(2)} |`,
    `| Min (ms) | ${min.toFixed(2)} |`,
    `| Max (ms) | ${max.toFixed(2)} |`,
    "",
  ];

  if (failures.length > 0) {
    table.push("### Non-success responses (sample)", "");
    table.push("| Task | Rep # | HTTP status |");
    table.push("|------|-------|---------------|");
    for (const f of failures.slice(0, 15)) {
      const st = f.status === 0 ? "0 (network / timeout / refused)" : String(f.status);
      table.push(`| ${f.id} | ${f.rep} | ${st} |`);
    }
    if (failures.length > 15) table.push(`| … | … | (${failures.length - 15} more) |`);
    table.push("");
  }

  const md = table.join("\n");
  console.log(md);
}

const totalReqs = N_REPS * PROMPTS.length;
console.log(
  `[VEEF] Starting ${totalReqs} sequential requests → ${BASE_URL}/api/vibe (timeout ${REQUEST_TIMEOUT_MS} ms each).`
);
console.log(
  `[VEEF] Each "generate" waits on OpenAI (often ~3–30 s). You will see one progress line per request; total wall time is commonly ${Math.ceil((totalReqs * 5) / 60)}–${Math.ceil((totalReqs * 25) / 60)} min. Do not interrupt.`
);

try {
  await main();
} catch (err) {
  console.error("[VEEF] Fatal:", err);
  process.exit(1);
}
