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
├── index.html                  # Vite entry point
├── vite.config.ts              # Vite + React + Tailwind (aliases: @ → client, @shared)
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

- **OpenAI:** `intent: "generate"` uses the Vercel AI SDK with `gpt-4o`. The API key must be available to the **Node** process (`OPENAI_API_KEY`). Vite only injects variables prefixed with `VITE_` into the browser bundle.
- **Supabase:** the app talks to Postgres through **`DATABASE_URL`** (Drizzle). Optional `SUPABASE_URL` / keys in `.env.example` are for future or client-side use with `@supabase/supabase-js`; they are not required for the current server-only DB path.
- **Node:** if `npm install` warns about `EBADENGINE`, upgrade Node to a version that satisfies the dependency range (for example **22.13+** or current LTS), or the toolchain may behave unpredictably.

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

This single document generates: database table, CRUD API, table view, form, detail page, **and** automated workflows. See [`docs/examples/crm-vibe-schema-v1.json`](docs/examples/crm-vibe-schema-v1.json) for a full example.

---

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
