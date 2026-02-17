/**
 * VibeOS Kernel — Schema Generator
 *
 * Transforms natural language intent into Vibe-JSON schemas using the
 * Vercel AI SDK. This is the "magic" layer — the user describes what they
 * want in plain English, and the generator produces a fully validated schema.
 *
 * Pipeline:  Natural Language → LLM → Raw JSON → Validation → VibeModuleSchema
 */

import { generateObject } from "ai";
import { openai } from "@ai-sdk/openai";
import { vibeModuleSchema } from "./validator";
import type { VibeIntentRequest, VibeGenerationResult, VibeModuleSchema } from "./types";
import { validateVibeSchema } from "./validator";

/* ------------------------------------------------------------------ */
/*  System Prompt                                                     */
/* ------------------------------------------------------------------ */

const SYSTEM_PROMPT = `You are VibeOS Schema Architect — an expert system that converts natural language descriptions into structured Vibe-JSON metadata schemas.

RULES:
1. Every entity name and field name MUST be snake_case.
2. Every entity MUST have at least one field.
3. Always include sensible default fields (e.g., name, email for contacts).
4. Relations between entities must reference existing entity names.
5. Always create at least one "table" view for each entity.
6. Version must be semver (e.g., "1.0.0").
7. Module name must be kebab-case.
8. Be opinionated — make smart choices for field types, validation, and UI layout.
9. Include navigation entries for each major view.
10. Set timestamps: true and softDelete: true for all entities by default.

OUTPUT: Return ONLY a valid Vibe-JSON object matching the specification.`;

/* ------------------------------------------------------------------ */
/*  Generator                                                         */
/* ------------------------------------------------------------------ */

/**
 * Generate a Vibe-JSON schema from a natural language prompt.
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

    // Double-validate with our own validator for safety
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
      schema: validation.schema as VibeModuleSchema,
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
