/**
 * VibeOS — Backend Server
 *
 * Lightweight HTTP server powered by Hono that exposes the VibeOS API.
 * Runs on Node.js via @hono/node-server. In production, can deploy to
 * Vercel, Cloudflare Workers, Bun, or Deno with zero code changes.
 *
 * Endpoints:
 *   GET  /api/vibe         → Health check / API info
 *   POST /api/vibe         → Intent-based handler (generate, query, mutate, validate)
 *   POST /api/vibe/execute → Execute an action on a record
 *   POST /api/vibe/automate → Process automation event
 */

import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { serve } from "@hono/node-server";

import { handleVibeRequest, getVibeInfo } from "./api/vibe";
import { executeAction, type ActionContext } from "@/lib/engine/action-executor";
import { processAutomations, type AutomationEvent } from "@/lib/engine/automation-engine";
import { parseVibeSchema } from "@/lib/kernel/vibe-parser";
import { providerRegistry } from "@/lib/providers/registry";

const app = new Hono();

/* ------------------------------------------------------------------ */
/*  Middleware                                                         */
/* ------------------------------------------------------------------ */

app.use("*", logger());
app.use(
  "/api/*",
  cors({
    origin: [
      "http://127.0.0.1:5173",
      "http://localhost:5173",
      "http://127.0.0.1:5174",
      "http://localhost:5174",
    ],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
  })
);

/* ------------------------------------------------------------------ */
/*  Core Intent API                                                    */
/* ------------------------------------------------------------------ */

app.get("/api/vibe", (c) => {
  const info = getVibeInfo();
  return c.json(info.body, info.status as 200);
});

app.post("/api/vibe", async (c) => {
  const body = await c.req.json();
  const result = await handleVibeRequest(body);
  return c.json(result.body, result.status as 200);
});

/* ------------------------------------------------------------------ */
/*  Action Execution API                                               */
/* ------------------------------------------------------------------ */

app.post("/api/vibe/execute", async (c) => {
  try {
    const { action, context } = await c.req.json<{
      action: unknown;
      context?: ActionContext;
    }>();

    if (!action || typeof action !== "object") {
      return c.json({ error: "action object is required" }, 400);
    }

    const result = await executeAction(
      action as Parameters<typeof executeAction>[0],
      context ?? {}
    );

    return c.json(result, result.success ? 200 : 422);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return c.json({ error: message }, 500);
  }
});

/* ------------------------------------------------------------------ */
/*  Automation API                                                     */
/* ------------------------------------------------------------------ */

app.post("/api/vibe/automate", async (c) => {
  try {
    const { schema, event } = await c.req.json<{
      schema: unknown;
      event: AutomationEvent;
    }>();

    if (!schema || !event) {
      return c.json({ error: "'schema' and 'event' are required" }, 400);
    }

    const parsed = parseVibeSchema(schema);
    if (!parsed.success || !parsed.runtime) {
      return c.json({ error: "Invalid schema", details: parsed.errors }, 422);
    }

    const result = await processAutomations(parsed.runtime, event);
    return c.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return c.json({ error: message }, 500);
  }
});

/* ------------------------------------------------------------------ */
/*  Provider info                                                      */
/* ------------------------------------------------------------------ */

app.get("/api/vibe/providers", (c) => {
  const providers = providerRegistry.list().map((p) => ({
    name: p.name,
    label: p.label,
    configured: p.isConfigured(),
  }));
  return c.json({ providers });
});

/* ------------------------------------------------------------------ */
/*  Root                                                               */
/* ------------------------------------------------------------------ */

app.get("/", (c) => {
  return c.json({
    name: "VibeOS API Server",
    version: "0.1.0",
    docs: "/api/vibe",
  });
});

/* ------------------------------------------------------------------ */
/*  Start server                                                       */
/* ------------------------------------------------------------------ */

const port = Number(process.env.PORT ?? 3001);

serve({ fetch: app.fetch, port }, (info) => {
  console.log(`\n  VibeOS API Server running on http://localhost:${info.port}`);
  console.log(`  Intent API:      POST http://localhost:${info.port}/api/vibe`);
  console.log(`  Action Executor: POST http://localhost:${info.port}/api/vibe/execute`);
  console.log(`  Automations:     POST http://localhost:${info.port}/api/vibe/automate`);
  console.log(`  Providers:       GET  http://localhost:${info.port}/api/vibe/providers\n`);
});

export default app;
