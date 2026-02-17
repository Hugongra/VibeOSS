# Prompt 001 — Project Initialization

**Date:** 2026-02-17  
**Tool:** Cursor AI (Claude)  
**Category:** Scaffolding  

## Prompt

```
CURSOR PROMPT: VibeOS Initialization
Role: Senior Full-Stack Engineer and Software Architect.
Building VibeOS, an open-source "Salesforce Killer" based on the Vibe Coding paradigm.

Core Concept: A metadata-driven platform where natural language intent is compiled into
JSON/YAML schemas. These schemas dynamically generate the Database (PostgreSQL JSONB),
the API, and the UI (Server-Driven UI).

Tech Stack: Next.js 15 (App Router), TypeScript, PostgreSQL (JSONB), Vercel AI SDK,
Shadcn/UI, Tailwind CSS, and Zod for schema validation.

Objective: Initialize the project structure focusing on a "Modular Monolith" architecture.
```

## Result

- Complete project structure with all folders and file stubs
- TypeScript type definitions for the Vibe-JSON specification
- Zod validation schemas
- Drizzle ORM database configuration with JSONB tables
- Server-Driven UI renderer with component factory
- Intent-based API route
- Academic documentation skeleton

## Notes

This was the foundational prompt that established the entire project architecture.
All generated code was reviewed and modified as needed.
