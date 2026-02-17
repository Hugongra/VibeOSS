/**
 * VibeOS Kernel — Schema Validator
 *
 * Zod-based validation to ensure AI-generated metadata conforms to the
 * Vibe-JSON specification. This is the safety net between AI output and
 * the runtime system — nothing enters the platform without passing validation.
 */

import { z } from "zod";
import type { VibeModuleSchema, VibeParseResult } from "./types";

/* ------------------------------------------------------------------ */
/*  Zod Schemas                                                       */
/* ------------------------------------------------------------------ */

const vibeFieldTypeSchema = z.enum([
  "text",
  "number",
  "boolean",
  "date",
  "datetime",
  "email",
  "url",
  "phone",
  "currency",
  "percentage",
  "select",
  "multi-select",
  "relation",
  "file",
  "rich-text",
  "json",
]);

const vibeFieldValidationSchema = z.object({
  min: z.number().optional(),
  max: z.number().optional(),
  pattern: z.string().optional(),
  message: z.string().optional(),
});

const vibeRelationSchema = z.object({
  entity: z.string().min(1),
  field: z.string().min(1),
  type: z.enum(["one-to-one", "one-to-many", "many-to-many"]),
});

const vibeFieldDefinitionSchema = z.object({
  name: z
    .string()
    .min(1)
    .regex(/^[a-z][a-z0-9_]*$/, "Field name must be snake_case"),
  label: z.string().min(1),
  type: vibeFieldTypeSchema,
  required: z.boolean(),
  unique: z.boolean().optional(),
  defaultValue: z.unknown().optional(),
  description: z.string().optional(),
  options: z.array(z.string()).optional(),
  relation: vibeRelationSchema.optional(),
  validation: vibeFieldValidationSchema.optional(),
});

const vibeEntitySchema = z.object({
  name: z
    .string()
    .min(1)
    .regex(/^[a-z][a-z0-9_]*$/, "Entity name must be snake_case"),
  label: z.string().min(1),
  pluralLabel: z.string().min(1),
  description: z.string(),
  icon: z.string().optional(),
  fields: z.array(vibeFieldDefinitionSchema).min(1),
  timestamps: z.boolean(),
  softDelete: z.boolean(),
});

const vibeFilterSchema = z.object({
  field: z.string().min(1),
  operator: z.enum(["eq", "neq", "gt", "lt", "gte", "lte", "contains", "in"]),
  value: z.unknown().optional(),
});

const vibeSortingSchema = z.object({
  field: z.string().min(1),
  direction: z.enum(["asc", "desc"]),
});

const vibeViewLayoutSchema = z.object({
  type: z.enum([
    "table",
    "form",
    "detail",
    "card",
    "list",
    "kanban",
    "chart",
    "stat",
    "custom",
  ]),
  columns: z.array(z.string()).optional(),
  filters: z.array(vibeFilterSchema).optional(),
  sorting: z.array(vibeSortingSchema).optional(),
  groupBy: z.string().optional(),
  pageSize: z.number().int().positive().optional(),
});

const vibeActionSchema = z.object({
  name: z.string().min(1),
  label: z.string().min(1),
  type: z.enum(["create", "update", "delete", "navigate", "webhook", "custom"]),
  icon: z.string().optional(),
  confirmation: z.string().optional(),
  targetEntity: z.string().optional(),
  targetUrl: z.string().optional(),
});

const vibeViewSchema = z.object({
  name: z.string().min(1),
  label: z.string().min(1),
  entity: z.string().min(1),
  layout: vibeViewLayoutSchema,
  actions: z.array(vibeActionSchema).optional(),
});

const vibeNavigationSchema = z.object({
  label: z.string().min(1),
  icon: z.string().optional(),
  view: z.string().min(1),
});

export const vibeModuleSchema = z.object({
  version: z.string().regex(/^\d+\.\d+\.\d+$/, "Version must be semver"),
  module: z
    .string()
    .min(1)
    .regex(/^[a-z][a-z0-9_-]*$/, "Module name must be kebab-case"),
  description: z.string().min(1),
  entities: z.array(vibeEntitySchema).min(1),
  views: z.array(vibeViewSchema).min(1),
  navigation: z.array(vibeNavigationSchema).optional(),
});

/* ------------------------------------------------------------------ */
/*  Validation Functions                                              */
/* ------------------------------------------------------------------ */

/**
 * Validate a raw JSON object against the Vibe-JSON specification.
 * Returns a typed result with either the validated schema or structured errors.
 */
export function validateVibeSchema(input: unknown): VibeParseResult {
  const result = vibeModuleSchema.safeParse(input);

  if (result.success) {
    return {
      success: true,
      schema: result.data as VibeModuleSchema,
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
