<div align="center">

# VibeOS

### The Open-Source Business Platform for the AI Era

*Describe what you want. Get a working app. Instantly.*

[![React](https://img.shields.io/badge/React-19-61dafb?logo=react)](https://react.dev)
[![Vite](https://img.shields.io/badge/Vite-6-646cff?logo=vite)](https://vite.dev)
[![Hono](https://img.shields.io/badge/Hono-4-E36002?logo=hono)](https://hono.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue?logo=typescript)](https://typescriptlang.org)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-JSONB-336791?logo=postgresql)](https://postgresql.org)
[![License](https://img.shields.io/badge/License-MIT-green)](LICENSE)

</div>

---

## Why VibeOS is 10x Faster Than Salesforce

| | **Salesforce** | **VibeOS** |
|---|---|---|
| **Define a data model** | Click through Setup → Object Manager → Create fields one by one | *"Create a CRM with contacts, deals, and pipelines"* → Done |
| **Build a UI** | Lightning App Builder, drag-and-drop, page layouts, record types | Schema defines the UI — Server-Driven rendering handles it |
| **Create an API** | Apex classes, triggers, REST endpoints, SOQL queries | One intent-based endpoint that understands what you need |
| **Add a feature** | Weeks of admin + developer work, sandbox testing, deployment | Describe the feature → AI generates the schema → Live in seconds |
| **Time to first app** | Days to weeks | **Minutes** |
| **Vendor lock-in** | Complete (Salesforce ecosystem) | **Zero** (open-source, self-hosted) |
| **Cost** | $25-300/user/month | **Free forever** |

### The Core Insight

Traditional platforms make you describe your business logic in *their language* — clicks, configurations, proprietary code. VibeOS flips this: **you describe what you want in your language**, and the platform compiles your intent into a running application.

This is the **Vibe Coding** paradigm: metadata as the universal interface between human intent and software.

---

## Architecture

```
Intent (Natural Language)
        │
        ▼
┌─────────────────┐
│  Schema Generator │  ← Vercel AI SDK + GPT-4o
│  (LLM Compiler)  │
└────────┬────────┘
         │ vibe_schema_v1
         ▼
┌─────────────────┐
│    Validator     │  ← Zod Schema Validation
│  (Safety Net)    │
└────────┬────────┘
         │ Validated Schema
         ▼
┌─────────────────┐     ┌──────────────┐
│   Vibe Parser   │────▶│  PostgreSQL   │
│ (Runtime Compiler)│    │  JSONB Store  │
└────────┬────────┘     └──────────────┘
         │ RuntimeModule
         ▼
┌─────────────────┐     ┌──────────────────┐
│ Action Executor │────▶│  Provider System  │
│ (Engine)        │     │  Email · Webhook  │
└────────┬────────┘     │  Slack · Custom   │
         │              └──────────────────┘
         ▼
┌─────────────────┐
│  Automation     │  ← Event-driven rules
│  Engine         │    trigger → condition → action
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  SDUI Renderer  │  ← Server-Driven UI Engine
│ (Component Factory)│
└────────┬────────┘
         │ React Components
         ▼
    Rendered App
```

---

## Tech Stack

- **Frontend:** React 19 + Vite 6 + React Router
- **Backend:** Hono (runs on Node.js, Bun, Cloudflare Workers, Vercel)
- **Language:** TypeScript (strict mode, no `any`)
- **Database:** PostgreSQL with JSONB for dynamic entities (works with **Supabase**)
- **ORM:** Drizzle ORM
- **AI:** Vercel AI SDK with OpenAI GPT-4o
- **Validation:** Zod
- **Providers:** Email (Resend), Webhook (HTTP), Slack
- **UI:** Shadcn/UI + Tailwind CSS v4
- **Design:** Dark-mode first, Linear.app aesthetic

---

## Project Structure

```
vibeoss/
├── index.html                  # Vite entry (`/src/client/main.tsx`)
├── vite.config.ts              # Vite + React + Tailwind (aliases: @ → client, @shared; `/api` → proxy :3001)
├── drizzle.config.ts           # Drizzle Kit (loads `.env.local`; schema under `src/server/database/`)
├── src/
│   ├── client/                 # React SPA (Vite)
│   │   ├── main.tsx            # Bootstrap
│   │   ├── App.tsx             # Router + layout
│   │   ├── index.css           # Global styles
│   │   ├── pages/              # Home, Builder, auth…
│   │   ├── components/         # UI + vibe-ui (SDUI)
│   │   └── lib/                # Client helpers (e.g. auth context)
│   ├── server/                 # Hono API + kernel + engine (Node)
│   │   ├── index.ts            # HTTP server + CORS + routes
│   │   ├── lib.ts              # Barrel re-exports for consumers
│   │   ├── api/vibe.ts         # Intent handler (generate, validate, …)
│   │   ├── kernel/             # Parser, validator, schema generator (OpenAI)
│   │   ├── engine/             # Actions + automations
│   │   ├── providers/          # Email, Slack, webhook…
│   │   └── database/           # Drizzle + migrations (Postgres / Supabase)
│   └── shared/                 # Types shared by client and server
├── docs/
│   ├── architecture/
│   │   ├── metadata-spec.yaml
│   │   └── system-flow.mermaid
│   └── examples/
│       └── crm-vibe-schema-v1.json
├── tfg/                        # Academic thesis
└── README.md
```

---

## Quick Start

```bash
# Clone the repository
git clone https://github.com/Hugongra/VibeOSS.git
cd VibeOSS

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local — at minimum for local dev:
#   OPENAI_API_KEY   → required for POST /api/vibe intent "generate"
#   DATABASE_URL     → Postgres connection string (Supabase: Project Settings → Database → URI)

# Run database migrations
npm run db:migrate

# Start everything (frontend + API server)
npm run dev:all
```

### Environment notes

- **`.env.local`:** copy from `.env.example` before running `npm run dev:server` or `npm run dev:all`. The `dev:server` script uses Node’s **`--env-file=.env.local`** (Node **20.6+**) so `OPENAI_API_KEY`, `DATABASE_URL`, and `PORT` are available to the API process. **`npm run db:migrate`** loads the same file via `drizzle.config.ts` (`dotenv`).
- **OpenAI:** `intent: "generate"` uses the Vercel AI SDK with `gpt-4o` (`src/server/kernel/schema-generator.ts`). Vite only injects variables prefixed with `VITE_` into the browser bundle.
- **Supabase:** use **`DATABASE_URL`** (Postgres URI from Supabase → Project Settings → Database). Optional `SUPABASE_URL` / keys in `.env.example` are for future or client-side `@supabase/supabase-js`; they are not used by the current Drizzle-only server path.
- **Node:** if `npm install` warns about `EBADENGINE`, upgrade Node (for example **22.13+** or current LTS) so dependencies and `--env-file` behave as expected.

### API intents (`POST /api/vibe`)

| Intent | Status |
|--------|--------|
| `generate` | Implemented — NL → `vibe_schema_v1` (requires `OPENAI_API_KEY`) |
| `validate` | Implemented — Zod validation of a schema object |
| `query` | **501** — not wired to the JSONB store yet |
| `mutate` | **501** — not wired to the JSONB store yet |

Other routes: `POST /api/vibe/execute`, `POST /api/vibe/automate`, `GET /api/vibe/providers` (see `src/server/index.ts`).

### Ports and duplicate processes

- **API** listens on **`PORT`** (default **3001**). A second `npm run dev:server` fails with `EADDRINUSE` until you stop the first server.
- **Vite** defaults to **5173**. If that port is busy, Vite picks the next free port (for example **5174**) and prints the URL in the terminal.
- **CORS** for the API allows `http://127.0.0.1:5173` and `5174` (see `src/server/index.ts`). If Vite uses another port, add it there or use the default ports by stopping duplicate `npm run dev` processes.

| Service | URL |
|---|---|
| Frontend (Vite) | [http://127.0.0.1:5173](http://127.0.0.1:5173) (or the URL Vite prints if 5173 is in use) |
| API Server (Hono) | [http://localhost:3001/api/vibe](http://localhost:3001/api/vibe) |

Or start them separately: `npm run dev` (frontend) and `npm run dev:server` (API).

### Smoke test: AI schema generation

With the API running and `OPENAI_API_KEY` set for the Node process:

```bash
curl -s -X POST http://localhost:3001/api/vibe \
  -H "Content-Type: application/json" \
  -d '{"intent":"generate","payload":{"prompt":"A tiny CRM with contacts and deals"}}'
```

You should get `success: true` and a `schema` object, or a `422` with validation `details` if the model output needs adjustment.

### VEEF — telemetry and benchmark (I2IL / DVR harness)

For each successful `intent: "generate"` request, the API logs **`[VEEF Telemetry]`** to the server console with:

- **`t_gen`**: Vercel AI SDK `generateObject` duration (model uses **`temperature: 0`** for maximum determinism).
- **`t_val`**: `vibeModuleSchema.safeParse(...)` duration on the AI output.
- **`t_dep`**: placeholder “DB deploy” delay (**40 ms** `setTimeout`) after validation succeeds.

Automated latency sweep (50 HTTP round-trips: 5 enterprise-style prompts × 10 repetitions). With **`npm run dev:server`** already running:

```bash
npm run benchmark:veef
```

Optional: `VEEF_BASE_URL=http://127.0.0.1:3001 npm run benchmark:veef` if your API listens elsewhere. The script prints a **Markdown table** (mean μ and sample standard deviation σ of total client-measured latency) suitable for pasting into a thesis appendix.

---

## The Vibe-JSON Standard

Every application in VibeOS is defined by a single `vibe_schema_v1` document — entities, views, actions, and automations all in one:

```json
{
  "version": "1.0.0",
  "module": "simple-crm",
  "description": "CRM with contacts and automated welcome emails",
  "entities": [{ "name": "contact", "label": "Contact", "..." : "..." }],
  "views": [
    { "name": "contacts-table", "entity": "contact",
      "layout": { "type": "table", "columns": ["full_name", "email", "status"] } }
  ],
  "actions": [
    { "name": "create-contact", "type": "create", "label": "New Contact", "targetEntity": "contact" },
    { "name": "export-contacts", "type": "export", "label": "Export CSV", "targetEntity": "contact" }
  ],
  "automations": [
    {
      "name": "welcome-email", "entity": "contact", "trigger": "on_create",
      "actions": [{
        "name": "send-welcome", "type": "notify", "label": "Send Welcome",
        "notification": { "channel": "email", "template": "Welcome {{full_name}}!" }
      }]
    }
  ]
}
```

This document describes entities, views, actions, and automations that drive the SDUI renderer and engines; **persisted CRUD** via the `query` / `mutate` API intents is not wired yet. See [`docs/examples/crm-vibe-schema-v1.json`](docs/examples/crm-vibe-schema-v1.json) for a full example.

---

## 🧪 VibeOS Enterprise Evaluation Framework (VEEF)

VibeOS isn't just an application; it's a measurable architectural shift. To prove the $O(\log N)$ scalability and track the Intent-to-Infrastructure Latency (I2IL), this repository includes the **VEEF Benchmarking Suite**.

This suite executes the 5 benchmark tasks (T1-T5) 10 times ($N=10$) with `temperature: 0.0` to measure system determinism, logging the exact latency of the LLM generation, Zod validation, and Postgres deployment.

### Run the Benchmark

To execute the automated evaluation loop:
```bash
# Ensure your database is running and .env.local is loaded
npm run benchmark:veef

## Star History

[![Star History Chart](https://api.star-history.com/svg?repos=Hugongra/VibeOSS&type=date&legend=top-left)](https://www.star-history.com/#Hugongra/VibeOSS&type=date&legend=top-left)

---

## Contributing

VibeOS is open source and welcomes contributions. See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

---

## License

MIT — Build whatever you want.

---

<div align="center">

**VibeOS** — *Because the best code is the code you never have to write.*

Bachelor Thesis · La Salle-URL · 2025-2026

</div>
