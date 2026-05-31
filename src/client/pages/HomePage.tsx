import type { ComponentType } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  BookOpen,
  Lightbulb,
  MessageSquare,
  Sparkles,
  TrendingUp,
  Workflow,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

export function HomePage() {
  return (
    <div className="vibe-page-gradient">
      {/* Hero */}
      <section className="mx-auto max-w-6xl px-6 py-24 sm:py-32">
        <Badge variant="secondary" className="mb-6">
          <Sparkles className="mr-1 size-3" />
          Open-source · metadata-driven
        </Badge>
        <h1 className="max-w-3xl text-4xl font-semibold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
          Compile intent into{" "}
          <span className="text-primary">applications</span>.
        </h1>
        <p className="mt-6 max-w-xl text-base leading-relaxed text-muted-foreground">
          Describe what you need in plain language. VibeOS generates the schema,
          database, API, and UI — then lets you refine everything through chat.
        </p>
        <div className="mt-10 flex flex-wrap items-center gap-3">
          <Button size="lg" render={<Link to="/login" />}>
            Get started
            <ArrowRight className="size-4" />
          </Button>
          <Button
            size="lg"
            variant="outline"
            render={<Link to="/docs" />}
          >
            <BookOpen className="size-4" />
            Documentation
          </Button>
        </div>
      </section>

      <Separator className="opacity-60" />

      {/* How it works */}
      <section className="mx-auto max-w-6xl px-6 py-20">
        <p className="mb-10 text-xs font-medium uppercase tracking-widest text-muted-foreground">
          How it works
        </p>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          <StepCard
            icon={MessageSquare}
            step="01"
            title="Describe"
            text="Write what you need — a CRM, inventory tracker, or lead pipeline — in natural language."
          />
          <StepCard
            icon={Workflow}
            step="02"
            title="Compile"
            text="The kernel generates vibe_schema_v1: entities, views, actions, and automations."
          />
          <StepCard
            icon={Sparkles}
            step="03"
            title="Render & iterate"
            text="Preview your app instantly. Keep chatting to add fields, change layouts, or extend logic."
          />
        </div>
      </section>

      <Separator className="opacity-60" />

      {/* VEEF v2.0 results */}
      <VeefResultsSection />

      <Separator className="opacity-60" />

      {/* Architecture preview */}
      <section className="mx-auto max-w-6xl px-6 py-20">
        <div className="mb-10 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="mb-2 text-xs font-medium uppercase tracking-widest text-muted-foreground">
              Platform
            </p>
            <h2 className="text-2xl font-semibold tracking-tight text-foreground">
              One schema, full stack
            </h2>
          </div>
          <Button variant="ghost" render={<Link to="/docs#architecture" />}>
            Read architecture
            <ArrowRight className="size-4" />
          </Button>
        </div>
        <div className="grid grid-cols-1 gap-px overflow-hidden rounded-xl border border-border bg-border sm:grid-cols-2">
          <ArchBlock
            title="Kernel"
            text="LLM compiler with recursive self-correction and Zod validation."
          />
          <ArchBlock
            title="Engine"
            text="Runtime actions and event-driven automations."
          />
          <ArchBlock
            title="Renderer"
            text="Server-driven UI — tables, forms, and detail views from metadata."
          />
          <ArchBlock
            title="Storage"
            text="PostgreSQL JSONB for modules, records, and chat history."
          />
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-6xl px-6 pb-24">
        <Card className="overflow-hidden border-primary/20 bg-gradient-to-br from-primary/5 via-card to-card">
          <CardContent className="flex flex-col items-start gap-6 p-8 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-lg font-semibold text-foreground">
                Ready to build?
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Open the Builder or read the docs to learn the API and schema format.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button render={<Link to="/builder" />}>Open Builder</Button>
              <Button variant="outline" render={<Link to="/docs" />}>
                View docs
              </Button>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

function StepCard({
  icon: Icon,
  step,
  title,
  text,
}: {
  icon: ComponentType<{ className?: string }>;
  step: string;
  title: string;
  text: string;
}) {
  return (
    <Card className="border-border/80 bg-card/80 shadow-sm transition-shadow hover:shadow-md">
      <CardContent className="pt-6">
        <div className="mb-4 flex items-center justify-between">
          <Icon className="size-5 text-primary" />
          <span className="font-mono text-xs text-muted-foreground">{step}</span>
        </div>
        <h3 className="mb-2 text-sm font-medium text-foreground">{title}</h3>
        <p className="text-sm leading-relaxed text-muted-foreground">{text}</p>
      </CardContent>
    </Card>
  );
}

function ArchBlock({ title, text }: { title: string; text: string }) {
  return (
    <div className="bg-card p-6">
      <h3 className="mb-2 text-sm font-medium text-foreground">{title}</h3>
      <p className="text-sm leading-relaxed text-muted-foreground">{text}</p>
    </div>
  );
}

const PROGRESSION_ROWS = [
  {
    condition: "Raw (no pipeline)",
    l1: "0.0%",
    l2: "0.0%",
    l3: "0.0%",
    total: "0.0%",
    totalFrac: "0/115",
    latency: "—",
    muted: true,
  },
  {
    condition: "Raw + Few-Shot",
    l1: "100.0%",
    l2: "37.5%",
    l3: "0.0%",
    total: "56.5%",
    totalFrac: "65/115",
    latency: "~2.9 s",
  },
  {
    condition: "Raw + Normalize",
    l1: "20.0%",
    l2: "37.5%",
    l3: "0.0%",
    total: "21.7%",
    totalFrac: "25/115",
    latency: "~4.8 s",
  },
  {
    condition: "VibeOS Complete",
    l1: "92.0%",
    l2: "62.5%",
    l3: "60.0%",
    total: "74.8%",
    totalFrac: "86/115",
    latency: "~9.2 s",
    highlight: true,
  },
] as const;

const ABLATION_FINDINGS = [
  {
    n: 1,
    title: "Few-shot prompting unlocks L1",
    body: "Adding two valid Vibe-JSON examples to the system prompt raises L1 DVR from 0% to 100% without any code-level intervention. L1 failures stem from format unfamiliarity — the LLM understands intent but not the target schema structure.",
  },
  {
    n: 2,
    title: "Normalize and few-shot address different failure modes",
    body: "Few-shot achieves 56.5% by teaching structure upfront; normalize achieves 21.7% by fixing errors after generation. These are independent ablations — normalize corrects format deviations but cannot compensate for fundamentally misstructured outputs that few-shot prevents.",
  },
  {
    n: 3,
    title: "ReAct is the only L3 enabler",
    body: "Neither few-shot (L3: 0%) nor normalize (L3: 0%) alone produces valid end-to-end modules. Only VibeOS Complete reaches L3: 60%. The +53.1 pp delta over normalize is almost entirely attributable to the ReAct self-correction loop.",
  },
] as const;

const DELTA_ROWS = [
  {
    comparison: "Few-Shot vs Raw",
    delta: "+56.5 pp",
    interpretation: "Value of format examples in the prompt",
  },
  {
    comparison: "VibeOS vs Raw + Normalize",
    delta: "+53.1 pp",
    interpretation: "Value of ReAct self-correction loop",
    highlight: true,
  },
  {
    comparison: "VibeOS vs Few-Shot",
    delta: "+18.3 pp",
    interpretation: "Value of full pipeline over best single technique",
  },
  {
    comparison: "VibeOS L3 vs all others L3",
    delta: "+60.0 pp",
    interpretation: "ReAct is the ONLY enabler of end-to-end generation",
    highlight: true,
  },
] as const;

function VeefResultsSection() {
  return (
    <section className="mx-auto max-w-6xl px-6 py-20">
      <div className="mb-8 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-2xl">
          <Badge variant="secondary" className="mb-3">
            <TrendingUp className="mr-1 size-3" />
            VEEF v2.0 · Ablation study
          </Badge>
          <h2 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            Pipeline configuration, not model capability
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            The 74.8 pp gap between raw LLM output and VibeOS Complete is attributable
            to the pipeline configuration rather than model capability. Each component
            — few-shot examples, deterministic normalization, and ReAct self-correction —
            contributes measurably and addresses distinct failure modes.
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-3">
          <StatPill label="VibeOS DVR" value="74.8%" highlight />
          <StatPill label="ReAct Δ" value="+53.1 pp" />
          <StatPill label="Raw baseline" value="0.0%" muted />
        </div>
      </div>

      {/* Table 10 */}
      <div className="veef-table-shell overflow-hidden rounded-2xl border border-border/80 bg-card shadow-lg shadow-primary/5">
        <div className="border-b border-border/60 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent px-6 py-4">
          <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
            Table 10
          </p>
          <p className="mt-0.5 text-sm font-semibold text-foreground">
            Ablation Study — Pipeline Component Contributions
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="veef-results-table w-full min-w-[800px] text-sm">
            <thead>
              <tr>
                <th>Condition</th>
                <th className="text-center">L1 DVR</th>
                <th className="text-center">L2 DVR</th>
                <th className="text-center">L3 DVR</th>
                <th className="veef-col-highlight text-center">Total DVR</th>
                <th className="text-right">Mean Latency</th>
              </tr>
            </thead>
            <tbody>
              {PROGRESSION_ROWS.map((row) => (
                <tr
                  key={row.condition}
                  className={row.highlight ? "veef-total-row" : undefined}
                >
                  <td>
                    <span
                      className={`text-sm ${
                        row.highlight
                          ? "font-semibold text-primary"
                          : row.muted
                            ? "text-muted-foreground"
                            : "font-medium text-foreground"
                      }`}
                    >
                      {row.condition}
                    </span>
                  </td>
                  <td className="text-center font-mono tabular-nums text-muted-foreground">
                    {row.l1}
                  </td>
                  <td className="text-center font-mono tabular-nums text-muted-foreground">
                    {row.l2}
                  </td>
                  <td className="text-center font-mono tabular-nums text-muted-foreground">
                    {row.l3}
                  </td>
                  <td className="veef-col-highlight text-center">
                    <DvrCell
                      pct={row.total}
                      frac={row.totalFrac}
                      strong={row.highlight}
                      muted={row.muted}
                    />
                  </td>
                  <td className="text-right font-mono text-xs text-muted-foreground">
                    {row.latency}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Findings */}
      <div className="mt-10">
        <p className="mb-4 text-xs font-medium uppercase tracking-widest text-muted-foreground">
          Key findings — not visible from binary comparison alone
        </p>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {ABLATION_FINDINGS.map((f) => (
            <Card key={f.n} className="border-border/80 bg-card/80">
              <CardContent className="pt-6">
                <div className="mb-3 flex items-center gap-2">
                  <Lightbulb className="size-4 text-primary" />
                  <span className="font-mono text-xs text-muted-foreground">
                    Finding {f.n}
                  </span>
                </div>
                <h3 className="mb-2 text-sm font-medium text-foreground">
                  {f.title}
                </h3>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {f.body}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Table 11 */}
      <div className="veef-table-shell mt-10 overflow-hidden rounded-2xl border border-border/80 bg-card shadow-lg shadow-primary/5">
        <div className="border-b border-border/60 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent px-6 py-4">
          <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
            Table 11
          </p>
          <p className="mt-0.5 text-sm font-semibold text-foreground">
            Incremental Delta Analysis
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="veef-results-table w-full min-w-[640px] text-sm">
            <thead>
              <tr>
                <th>Comparison</th>
                <th className="text-center">Δ Total DVR</th>
                <th>Interpretation</th>
              </tr>
            </thead>
            <tbody>
              {DELTA_ROWS.map((row) => (
                <tr key={row.comparison}>
                  <td>
                    <span
                      className={`text-sm ${
                        row.highlight
                          ? "font-medium text-primary"
                          : "text-foreground"
                      }`}
                    >
                      {row.comparison}
                    </span>
                  </td>
                  <td className="text-center">
                    <span
                      className={`veef-delta-badge ${
                        row.highlight ? "veef-delta-badge-lg" : ""
                      }`}
                    >
                      {row.delta}
                    </span>
                  </td>
                  <td className="text-muted-foreground">{row.interpretation}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="border-t border-border/60 bg-muted/20 px-6 py-3">
          <p className="text-xs text-muted-foreground">
            23 tasks × 5 repetitions · Claude Haiku 4.5 · DVR = Zod validation pass rate ·{" "}
            <Link to="/docs#veef" className="font-medium text-primary hover:underline">
              VEEF framework
            </Link>
          </p>
        </div>
      </div>
    </section>
  );
}

function StatPill({
  label,
  value,
  highlight,
  muted,
}: {
  label: string;
  value: string;
  highlight?: boolean;
  muted?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border px-4 py-3 ${
        highlight
          ? "border-primary/30 bg-primary/10"
          : muted
            ? "border-border/60 bg-muted/30"
            : "border-border bg-card"
      }`}
    >
      <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p
        className={`mt-0.5 text-lg font-semibold tabular-nums ${
          highlight ? "text-primary" : muted ? "text-muted-foreground" : "text-foreground"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function DvrCell({
  pct,
  frac,
  muted,
  strong,
}: {
  pct: string;
  frac: string;
  muted?: boolean;
  strong?: boolean;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <span
        className={`font-mono tabular-nums ${
          strong
            ? "text-base font-semibold text-primary"
            : muted
              ? "text-muted-foreground"
              : "font-medium text-foreground"
        }`}
      >
        {pct}
      </span>
      <span className="text-[10px] text-muted-foreground">({frac})</span>
    </div>
  );
}
