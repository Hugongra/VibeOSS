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
├── vite.config.ts              # Vite + React + Tailwind config
├── src/
│   ├── main.tsx                # React bootstrap
│   ├── App.tsx                 # Root component + React Router
│   ├── index.css               # Global styles (dark-first design system)
│   ├── pages/
│   │   └── HomePage.tsx        # Landing page
│   ├── components/
│   │   └── vibe-ui/            # Server-Driven UI
│   │       ├── renderer.tsx    # Component selection engine
│   │       └── factory/        # Dynamic component wrappers
│   ├── server/
│   │   ├── index.ts            # Hono HTTP server (API gateway)
│   │   └── api/
│   │       └── vibe.ts         # Intent-based API handler
│   └── lib/
│       ├── index.ts            # @vibeoss/core barrel export
│       ├── kernel/             # The "Brain"
│       │   ├── types.ts        # vibe_schema_v1 type definitions
│       │   ├── validator.ts    # Zod-based schema validation
│       │   ├── vibe-parser.ts  # Schema → Runtime compiler
│       │   └── schema-generator.ts  # NL → JSON via AI
│       ├── engine/             # Runtime engines
│       │   ├── action-executor.ts  # Execute actions via providers
│       │   └── automation-engine.ts # Event → Condition → Action
│       ├── providers/          # Integration providers
│       │   ├── types.ts        # VibeProvider interface
│       │   ├── registry.ts     # Provider registry (singleton)
│       │   ├── email.ts        # Email via Resend
│       │   ├── webhook.ts      # HTTP webhook calls
│       │   └── slack.ts        # Slack incoming webhook
│       ├── database/           # Hybrid persistence
│       │   ├── db.ts           # Drizzle config
│       │   ├── schema.ts       # Core + dynamic tables
│       │   └── migrations/     # SQL migrations
│       └── utils.ts            # Shared utilities
├── docs/
│   ├── architecture/
│   │   ├── metadata-spec.yaml  # Vibe-JSON specification
│   │   └── system-flow.mermaid # System architecture diagram
│   └── examples/
│       └── crm-vibe-schema-v1.json  # Example CRM module
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
# Edit .env.local with your DATABASE_URL and OPENAI_API_KEY

# Run database migrations
npm run db:migrate

# Start everything (frontend + API server)
npm run dev:all
```

| Service | URL |
|---|---|
| Frontend (Vite) | [http://127.0.0.1:5173](http://127.0.0.1:5173) |
| API Server (Hono) | [http://localhost:3001/api/vibe](http://localhost:3001/api/vibe) |

Or start them separately: `npm run dev` (frontend) and `npm run dev:server` (API).

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
