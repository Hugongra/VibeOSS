/**
 * VibeOS Kernel — Schema Validator (vibe_schema_v1)
 *
 * Zod-based validation to ensure AI-generated metadata conforms to the
 * Vibe-JSON specification. This is the safety net between AI output and
 * the runtime system — nothing enters the platform without passing validation.
 */

import { z } from "zod";
import type { VibeSchemaV1, VibeParseResult } from "./types";

/* ------------------------------------------------------------------ */
/*  Shared primitives                                                 */
/* ------------------------------------------------------------------ */

const snakeCaseRegex = /^[a-z][a-z0-9_]*$/;
const kebabCaseRegex = /^[a-z][a-z0-9_-]*$/;
const semverRegex = /^\d+\.\d+\.\d+$/;

/* ------------------------------------------------------------------ */
/*  Field schemas                                                     */
/* ------------------------------------------------------------------ */

const vibeFieldTypeSchema = z.enum([
  "text", "number", "boolean", "date", "datetime",
  "email", "url", "phone", "currency", "percentage",
  "select", "multi-select", "relation", "file", "rich-text", "json",
]);

const vibeFieldValidationSchema = z.object({
  min: z.number().optional(),
  max: z.number().optional(),
  min_length: z.number().int().nonnegative().optional(),
  max_length: z.number().int().positive().optional(),
  pattern: z.string().optional(),
  message: z.string().optional(),
});

const vibeRelationSchema = z.object({
  entity: z.string().min(1),
  field: z.string().min(1),
  type: z.enum(["one-to-one", "one-to-many", "many-to-many"]),
});

const vibeFieldDefinitionSchema = z.object({
  name: z.string().min(1).regex(snakeCaseRegex, "Field name must be snake_case"),
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

/* ------------------------------------------------------------------ */
/*  Entity schema                                                     */
/* ------------------------------------------------------------------ */

const vibeEntitySchema = z.object({
  name: z.string().min(1).regex(snakeCaseRegex, "Entity name must be snake_case"),
  label: z.string().min(1),
  pluralLabel: z.string().min(1),
  description: z.string(),
  icon: z.string().optional(),
  fields: z.array(vibeFieldDefinitionSchema).min(1),
  timestamps: z.boolean(),
  softDelete: z.boolean(),
});

/* ------------------------------------------------------------------ */
/*  View schemas                                                      */
/* ------------------------------------------------------------------ */

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
    "table", "form", "detail", "card", "list",
    "kanban", "chart", "stat", "custom",
  ]),
  columns: z.array(z.string()).optional(),
  filters: z.array(vibeFilterSchema).optional(),
  sorting: z.array(vibeSortingSchema).optional(),
  groupBy: z.string().optional(),
  pageSize: z.number().int().positive().optional(),
});

/* ------------------------------------------------------------------ */
/*  Action schemas                                                    */
/* ------------------------------------------------------------------ */

const vibeActionTypeSchema = z.enum([
  "create", "update", "delete", "navigate", "webhook",
  "notify", "approve", "reject", "export", "import",
  "transition", "custom",
]);

const vibeNotificationSchema = z.object({
  channel: z.enum(["email", "slack", "teams", "in_app"]),
  template: z.string().optional(),
  recipients: z.string().optional(),
});

const vibeTransitionSchema = z.object({
  field: z.string().min(1),
  to: z.string().min(1),
});

const vibeActionSchema = z.object({
  name: z.string().min(1),
  label: z.string().min(1),
  type: vibeActionTypeSchema,
  icon: z.string().optional(),
  confirmation: z.string().optional(),
  targetEntity: z.string().optional(),
  targetUrl: z.string().optional(),
  transition: vibeTransitionSchema.optional(),
  notification: vibeNotificationSchema.optional(),
});

/* ------------------------------------------------------------------ */
/*  View schema (with inline actions)                                 */
/* ------------------------------------------------------------------ */

const vibeViewSchema = z.object({
  name: z.string().min(1),
  label: z.string().min(1),
  entity: z.string().min(1),
  layout: vibeViewLayoutSchema,
  actions: z.array(vibeActionSchema).optional(),
});

/* ------------------------------------------------------------------ */
/*  Automation schemas                                                */
/* ------------------------------------------------------------------ */

const vibeAutomationTriggerSchema = z.enum([
  "on_create", "on_update", "on_delete", "on_field_change",
  "on_schedule", "manual",
]);

const vibeAutomationConditionSchema = z.object({
  field: z.string().min(1),
  operator: z.enum(["eq", "neq", "gt", "lt", "gte", "lte", "contains", "in"]),
  value: z.unknown(),
});

const vibeAutomationSchema = z.object({
  name: z.string().min(1),
  label: z.string().min(1),
  entity: z.string().min(1),
  trigger: vibeAutomationTriggerSchema,
  watchField: z.string().optional(),
  condition: vibeAutomationConditionSchema.optional(),
  actions: z.array(vibeActionSchema).min(1),
});

/* ------------------------------------------------------------------ */
/*  Navigation                                                        */
/* ------------------------------------------------------------------ */

const vibeNavigationSchema = z.object({
  label: z.string().min(1),
  icon: z.string().optional(),
  view: z.string().min(1),
});

/* ------------------------------------------------------------------ */
/*  Root: vibe_schema_v1                                              */
/* ------------------------------------------------------------------ */

export const vibeModuleSchema = z.object({
  version: z.string().regex(semverRegex, "Version must be semver"),
  module: z.string().min(1).regex(kebabCaseRegex, "Module name must be kebab-case"),
  description: z.string().min(1),
  entities: z.array(vibeEntitySchema).min(1),
  views: z.array(vibeViewSchema).min(1),
  actions: z.array(vibeActionSchema).optional(),
  automations: z.array(vibeAutomationSchema).optional(),
  navigation: z.array(vibeNavigationSchema).optional(),
});

/* ------------------------------------------------------------------ */
/*  Validation Functions                                              */
/* ------------------------------------------------------------------ */

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
