<div align="center">

# VibeOS

### The Open-Source Business Platform for the AI Era

*Describe what you want. Get a working app. Instantly.*

[![Next.js](https://img.shields.io/badge/Next.js-15-black?logo=next.js)](https://nextjs.org)
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
         │ Vibe-JSON
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
         │ Runtime Module
         ▼
┌─────────────────┐
│  SDUI Renderer  │  ← Server-Driven UI Engine
│ (Component Factory)│
└────────┬────────┘
         │ React Server Components
         ▼
    Rendered App
```

---

## Tech Stack

- **Framework:** Next.js 15 (App Router, Server Components)
- **Language:** TypeScript (strict mode, no `any`)
- **Database:** PostgreSQL with JSONB for dynamic entities
- **ORM:** Drizzle ORM
- **AI:** Vercel AI SDK with OpenAI GPT-4o
- **Validation:** Zod
- **UI:** Shadcn/UI + Tailwind CSS
- **Design:** Dark-mode first, Linear.app aesthetic

---

## Project Structure

```
vibeoss/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── api/vibe/           # Intent-based API endpoint
│   │   ├── layout.tsx          # Root layout
│   │   └── page.tsx            # Landing page
│   ├── components/
│   │   └── vibe-ui/            # Server-Driven UI
│   │       ├── renderer.tsx    # Component selection engine
│   │       └── factory/        # Dynamic component wrappers
│   │           ├── vibe-table.tsx
│   │           ├── vibe-form.tsx
│   │           ├── vibe-detail.tsx
│   │           └── vibe-card.tsx
│   └── lib/
│       ├── kernel/             # The "Brain"
│       │   ├── types.ts        # Vibe-JSON type definitions
│       │   ├── validator.ts    # Zod-based schema validation
│       │   ├── vibe-parser.ts  # Schema → Runtime compiler
│       │   └── schema-generator.ts  # NL → JSON via AI
│       ├── database/           # Hybrid persistence
│       │   ├── db.ts           # Drizzle config
│       │   ├── schema.ts       # Core + dynamic tables
│       │   └── migrations/     # SQL migrations
│       └── utils.ts            # Shared utilities
├── tfg/                        # Academic thesis
│   ├── manuscript.md           # Main document
│   ├── references.bib          # Harvard citations
│   ├── ai-disclosure.md        # AI usage log
│   └── prompts/                # Prompt engineering archive
├── docs/
│   └── architecture/
│       ├── metadata-spec.yaml  # Vibe-JSON specification
│       └── system-flow.mermaid # System architecture diagram
└── README.md
```

---

## Quick Start

```bash
# Clone the repository
git clone https://github.com/vibeoss/vibeoss.git
cd vibeoss

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your DATABASE_URL and OPENAI_API_KEY

# Run database migrations
npm run db:migrate

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see VibeOS.

---

## The Vibe-JSON Standard

Every application in VibeOS is defined by a single JSON document:

```json
{
  "version": "1.0.0",
  "module": "simple-crm",
  "description": "A simple CRM with contacts and deals",
  "entities": [
    {
      "name": "contact",
      "label": "Contact",
      "pluralLabel": "Contacts",
      "description": "People and organizations",
      "fields": [
        { "name": "full_name", "label": "Full Name", "type": "text", "required": true },
        { "name": "email", "label": "Email", "type": "email", "required": true, "unique": true },
        { "name": "company", "label": "Company", "type": "text", "required": false },
        { "name": "status", "label": "Status", "type": "select", "required": true,
          "options": ["Lead", "Active", "Inactive"] }
      ],
      "timestamps": true,
      "softDelete": true
    }
  ],
  "views": [
    {
      "name": "contacts-table",
      "label": "All Contacts",
      "entity": "contact",
      "layout": { "type": "table", "columns": ["full_name", "email", "company", "status"] }
    }
  ]
}
```

This single document generates: a database table, CRUD API, table view, form, and detail page.

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
