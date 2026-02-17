/**
 * VibeOS — Dynamic API Endpoint
 *
 * A single entry point that handles intent-based requests.
 * Instead of dozens of REST endpoints, VibeOS uses one intelligent route
 * that interprets the caller's intent and dispatches to the correct handler.
 *
 * POST /api/vibe
 *
 * Request body:
 * {
 *   "intent": "generate" | "query" | "mutate" | "validate",
 *   "payload": { ... }
 * }
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { generateSchemaFromIntent } from "@/lib/kernel/schema-generator";
import { validateVibeSchema } from "@/lib/kernel/validator";

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

type IntentHandler = (
  payload: Record<string, unknown>
) => Promise<NextResponse>;

const handlers: Record<IntentType, IntentHandler> = {
  /**
   * Generate a new Vibe-JSON schema from natural language.
   */
  async generate(payload) {
    const prompt = payload.prompt;
    if (typeof prompt !== "string" || prompt.trim().length === 0) {
      return NextResponse.json(
        { error: "A non-empty 'prompt' string is required for generation." },
        { status: 400 }
      );
    }

    const existingEntities = Array.isArray(payload.existingEntities)
      ? (payload.existingEntities as string[])
      : undefined;

    const result = await generateSchemaFromIntent({
      prompt,
      context: existingEntities ? { existingEntities } : undefined,
    });

    if (!result.success) {
      return NextResponse.json(
        { error: "Schema generation failed", details: result.errors },
        { status: 422 }
      );
    }

    return NextResponse.json({
      success: true,
      schema: result.schema,
      tokensUsed: result.tokensUsed,
    });
  },

  /**
   * Validate an existing Vibe-JSON schema.
   */
  async validate(payload) {
    const schema = payload.schema;
    if (!schema || typeof schema !== "object") {
      return NextResponse.json(
        { error: "A 'schema' object is required for validation." },
        { status: 400 }
      );
    }

    const result = validateVibeSchema(schema);
    return NextResponse.json(result);
  },

  /**
   * Query records from a dynamic entity.
   * TODO: Implement after database layer is connected.
   */
  async query(_payload) {
    return NextResponse.json(
      {
        error: "Query intent is not yet implemented.",
        hint: "This will connect to the JSONB storage layer.",
      },
      { status: 501 }
    );
  },

  /**
   * Create, update, or delete records in a dynamic entity.
   * TODO: Implement after database layer is connected.
   */
  async mutate(_payload) {
    return NextResponse.json(
      {
        error: "Mutate intent is not yet implemented.",
        hint: "This will connect to the JSONB storage layer.",
      },
      { status: 501 }
    );
  },
};

/* ------------------------------------------------------------------ */
/*  Route Handler                                                     */
/* ------------------------------------------------------------------ */

export async function POST(request: NextRequest) {
  try {
    const body: unknown = await request.json();
    const parsed = intentRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Invalid request format",
          details: parsed.error.issues.map((i) => ({
            path: i.path.join("."),
            message: i.message,
          })),
        },
        { status: 400 }
      );
    }

    const { intent, payload } = parsed.data;
    return await handlers[intent](payload);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Internal server error";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * GET handler — returns API documentation / health check.
 */
export async function GET() {
  return NextResponse.json({
    name: "VibeOS API",
    version: "0.1.0",
    status: "operational",
    intents: ["generate", "query", "mutate", "validate"],
    docs: "POST a JSON body with { intent, payload } to interact with VibeOS.",
  });
}
