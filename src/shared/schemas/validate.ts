import type { VibeParseResult, VibeSchemaV1 } from "@shared/types";
import { vibeModuleSchema } from "./vibe-schema-v1";

/**
 * Validate a raw JSON object against the vibe_schema_v1 specification.
 */
export function validateVibeSchema(input: unknown): VibeParseResult {
  const result = vibeModuleSchema.safeParse(input);

  if (result.success) {
    return {
      success: true,
      schema: result.data as VibeSchemaV1,
    };
  }

  return {
    success: false,
    errors: result.error.issues.map((issue) => ({
      path: issue.path.join("."),
      message: issue.message,
    })),
  };
}

/**
 * Validate a JSON string — parses it first, then validates the structure.
 */
export function validateVibeSchemaFromString(jsonString: string): VibeParseResult {
  try {
    const parsed: unknown = JSON.parse(jsonString);
    return validateVibeSchema(parsed);
  } catch {
    return {
      success: false,
      errors: [
        {
          path: "root",
          message: "Invalid JSON: failed to parse input string",
        },
      ],
    };
  }
}
