/**
 * VibeOS Kernel — Schema Generator (vibe_schema_v1)
 *
 * Transforms natural language intent into Vibe-JSON schemas using the
 * Vercel AI SDK. This is the "VibeOS Business Architect" — the user
 * describes a business need in plain language, and the generator produces
 * a fully validated vibe_schema_v1 document.
 *
 * Pipeline:
 *   1. Intent Analysis — identify processes, actors, data flows
 *   2. Data Modeling — entities with typed fields and Zod-compatible validation
 *   3. Server-Driven UI — choose optimal components (table, form, card, kanban…)
 *   4. Actions & Automations — state transitions, notifications, integrations
 *
 * Output: a single vibe_schema_v1 object ready for the kernel to render.
 */

import { generateObject } from "ai";
import { openai } from "@ai-sdk/openai";
import { vibeModuleSchema } from "./validator";
import type { VibeIntentRequest, VibeGenerationResult, VibeSchemaV1 } from "./types";
import { validateVibeSchema } from "./validator";

/* ------------------------------------------------------------------ */
/*  System Prompt — "VibeOS Business Architect"                       */
/* ------------------------------------------------------------------ */

const SYSTEM_PROMPT = `You are the VibeOS Business Architect — an expert system that converts natural language business requirements into structured vibe_schema_v1 metadata.

YOUR WORKFLOW (Rebolt-style):
1. INTENT ANALYSIS — Identify the business process, actors, and data flows described by the user.
2. DATA MODELING — Define entities with strong typing (Zod-compatible validation) and JSONB-optimized storage. Every field has: name (snake_case), label, type, required, and validation rules.
3. SERVER-DRIVEN UI DESIGN — Choose the best component per view:
   • "table"  — data listings with sorting, filtering, pagination
   • "form"   — create / edit records
   • "detail" — single-record view
   • "card"   — visual overview grid
   • "kanban" — pipeline / board views (use groupBy on a status field)
   • "chart"  — data visualization
   Follow a Dark-First, minimalist aesthetic (Linear.app style).
4. ACTIONS — Define user-triggered operations. Available types:
   • create, update, delete — standard CRUD
   • navigate — link to another view
   • approve / reject — workflow state changes
   • transition — change a field to a target value (use the "transition" property)
   • notify — send a notification (use the "notification" property with channel: email|slack|teams|in_app)
   • export / import — data I/O
   • webhook — call an external URL
   • custom — anything else
5. AUTOMATIONS — Define event-driven rules:
   • trigger: on_create | on_update | on_delete | on_field_change | on_schedule | manual
   • optional watchField (for on_field_change)
   • optional condition (field + operator + value)
   • one or more actions to execute

STRICT OUTPUT RULES:
- Entity and field names MUST be snake_case.
- Module name MUST be kebab-case.
- Version MUST be semver (e.g. "1.0.0").
- Every entity MUST have at least one field.
- Include sensible defaults (e.g. name, email for contacts; amount, status for deals).
- Every entity MUST have at least one "table" view AND one "form" view.
- Set timestamps: true and softDelete: true for all entities.
- Include navigation entries for major views.
- Include at least one automation when the domain has obvious workflows.
- Field validation MUST use Zod-compatible rules: min, max, min_length, max_length, pattern, message.

TONE: Professional, efficient, results-oriented. Deliver the schema ready to render — no explanations.`;

/* ------------------------------------------------------------------ */
/*  Generator                                                         */
/* ------------------------------------------------------------------ */

/**
 * Generate a vibe_schema_v1 document from a natural language prompt.
 *
 * Uses Vercel AI SDK's `generateObject` for structured output,
 * ensuring the LLM response conforms to the Zod schema.
 */
export async function generateSchemaFromIntent(
  request: VibeIntentRequest
): Promise<VibeGenerationResult> {
  try {
    const contextHint = request.context?.existingEntities?.length
      ? `\n\nExisting entities in the system: ${request.context.existingEntities.join(", ")}`
      : "";

    const { object, usage } = await generateObject({
      model: openai("gpt-4o"),
      schema: vibeModuleSchema,
      system: SYSTEM_PROMPT,
      prompt: `${request.prompt}${contextHint}`,
    });

    const validation = validateVibeSchema(object);

    if (!validation.success) {
      return {
        success: false,
        rawJson: JSON.stringify(object, null, 2),
        errors: validation.errors?.map((e) => `${e.path}: ${e.message}`) ?? [
          "Unknown validation error",
        ],
      };
    }

    return {
      success: true,
      schema: validation.schema as VibeSchemaV1,
      rawJson: JSON.stringify(object, null, 2),
      tokensUsed: usage.totalTokens,
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown error during generation";

    return {
      success: false,
      errors: [message],
    };
  }
}
