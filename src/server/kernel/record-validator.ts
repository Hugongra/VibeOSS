/**
 * Validates dynamic record payloads against entity field metadata from vibe_schema_v1.
 */

import { z } from "zod";
import type { VibeEntitySchema, VibeFieldDefinition } from "@shared/types";

function fieldToZod(field: VibeFieldDefinition): z.ZodTypeAny {
  let schema: z.ZodTypeAny;

  switch (field.type) {
    case "text":
    case "email":
    case "url":
    case "phone":
    case "rich-text":
      schema = z.string();
      break;
    case "number":
    case "currency":
    case "percentage":
      schema = z.coerce.number();
      break;
    case "boolean":
      schema = z.boolean();
      break;
    case "date":
    case "datetime":
      schema = z.string();
      break;
    case "select":
      schema = field.options?.length
        ? z.enum(field.options as [string, ...string[]])
        : z.string();
      break;
    case "multi-select":
      schema = z.array(z.string());
      break;
    case "relation":
    case "file":
    case "json":
      schema = z.unknown();
      break;
    default:
      schema = z.unknown();
  }

  if (field.validation?.min_length !== undefined) {
    schema = (schema as z.ZodString).min(field.validation.min_length);
  }
  if (field.validation?.max_length !== undefined) {
    schema = (schema as z.ZodString).max(field.validation.max_length);
  }
  if (field.validation?.min !== undefined && field.type !== "text") {
    schema = (schema as z.ZodNumber).min(field.validation.min);
  }
  if (field.validation?.max !== undefined && field.type !== "text") {
    schema = (schema as z.ZodNumber).max(field.validation.max);
  }

  if (!field.required) {
    schema = schema.optional();
  }

  return schema;
}

/** Build a Zod object schema for a full entity record (create). */
export function buildEntityRecordSchema(entity: VibeEntitySchema): z.ZodObject<z.ZodRawShape> {
  const shape: Record<string, z.ZodTypeAny> = {};
  for (const field of entity.fields) {
    shape[field.name] = fieldToZod(field);
  }
  return z.object(shape);
}

/** Build a partial schema for updates (all fields optional). */
export function buildEntityPatchSchema(entity: VibeEntitySchema): z.ZodObject<z.ZodRawShape> {
  const shape: Record<string, z.ZodTypeAny> = {};
  for (const field of entity.fields) {
    shape[field.name] = fieldToZod({ ...field, required: false });
  }
  return z.object(shape).strict();
}

export function validateEntityRecord(
  entity: VibeEntitySchema,
  data: unknown,
  mode: "create" | "update"
): { success: true; data: Record<string, unknown> } | { success: false; errors: string[] } {
  const schema = mode === "create" ? buildEntityRecordSchema(entity) : buildEntityPatchSchema(entity);
  const result = schema.safeParse(data);

  if (result.success) {
    return { success: true, data: result.data as Record<string, unknown> };
  }

  return {
    success: false,
    errors: result.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`),
  };
}

/** Reject unknown field keys not defined in the entity schema. */
export function rejectUnknownFields(
  entity: VibeEntitySchema,
  data: Record<string, unknown>
): string[] {
  const allowed = new Set(entity.fields.map((f) => f.name));
  return Object.keys(data).filter((k) => !allowed.has(k));
}
