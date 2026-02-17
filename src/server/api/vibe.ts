/**
 * VibeOS — Dynamic API Handler
 *
 * A single entry point that handles intent-based requests.
 * Instead of dozens of REST endpoints, VibeOS uses one intelligent handler
 * that interprets the caller's intent and dispatches to the correct logic.
 *
 * This module is framework-agnostic — it processes a plain request object
 * and returns a plain response object. Integrate with Express, Fastify,
 * or any Node.js HTTP server.
 *
 * POST /api/vibe
 *
 * Request body:
 * {
 *   "intent": "generate" | "query" | "mutate" | "validate",
 *   "payload": { ... }
 * }
 */

import { z } from "zod";
import { generateSchemaFromIntent } from "@/lib/kernel/schema-generator";
import { validateVibeSchema } from "@/lib/kernel/validator";

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

interface ApiResponse {
  status: number;
  body: Record<string, unknown>;
}

/* ------------------------------------------------------------------ */
/*  Request Validation                                                */
/* ------------------------------------------------------------------ */

const intentRequestSchema = z.object({
  intent: z.enum(["generate", "query", "mutate", "validate"]),
  payload: z.record(z.unknown()),
});

type IntentType = z.infer<typeof intentRequestSchema>["intent"];

/* ------------------------------------------------------------------ */
/*  Intent Handlers                                                   */
/* ------------------------------------------------------------------ */

type IntentHandler = (payload: Record<string, unknown>) => Promise<ApiResponse>;

const handlers: Record<IntentType, IntentHandler> = {
  async generate(payload) {
    const prompt = payload.prompt;
    if (typeof prompt !== "string" || prompt.trim().length === 0) {
      return {
        status: 400,
        body: { error: "A non-empty 'prompt' string is required for generation." },
      };
    }

    const existingEntities = Array.isArray(payload.existingEntities)
      ? (payload.existingEntities as string[])
      : undefined;

    const result = await generateSchemaFromIntent({
      prompt,
      context: existingEntities ? { existingEntities } : undefined,
    });

    if (!result.success) {
      return {
        status: 422,
        body: { error: "Schema generation failed", details: result.errors },
      };
    }

    return {
      status: 200,
      body: { success: true, schema: result.schema, tokensUsed: result.tokensUsed },
    };
  },

  async validate(payload) {
    const schema = payload.schema;
    if (!schema || typeof schema !== "object") {
      return {
        status: 400,
        body: { error: "A 'schema' object is required for validation." },
      };
    }

    const result = validateVibeSchema(schema);
    return { status: 200, body: result as unknown as Record<string, unknown> };
  },

  async query(_payload) {
    return {
      status: 501,
      body: {
        error: "Query intent is not yet implemented.",
        hint: "This will connect to the JSONB storage layer.",
      },
    };
  },

  async mutate(_payload) {
    return {
      status: 501,
      body: {
        error: "Mutate intent is not yet implemented.",
        hint: "This will connect to the JSONB storage layer.",
      },
    };
  },
};

/* ------------------------------------------------------------------ */
/*  Public API                                                        */
/* ------------------------------------------------------------------ */

/** Handle an intent-based POST request */
export async function handleVibeRequest(body: unknown): Promise<ApiResponse> {
  try {
    const parsed = intentRequestSchema.safeParse(body);

    if (!parsed.success) {
      return {
        status: 400,
        body: {
          error: "Invalid request format",
          details: parsed.error.issues.map((i) => ({
            path: i.path.join("."),
            message: i.message,
          })),
        },
      };
    }

    const { intent, payload } = parsed.data;
    return await handlers[intent](payload);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Internal server error";
    return { status: 500, body: { error: message } };
  }
}

/** Health check / API docs */
export function getVibeInfo(): ApiResponse {
  return {
    status: 200,
    body: {
      name: "VibeOS API",
      version: "0.1.0",
      status: "operational",
      intents: ["generate", "query", "mutate", "validate"],
      docs: "POST a JSON body with { intent, payload } to interact with VibeOS.",
    },
  };
}
