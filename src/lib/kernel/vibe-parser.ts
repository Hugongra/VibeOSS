/**
 * VibeOS Kernel — Vibe Parser
 *
 * The parser is responsible for interpreting Vibe-JSON schemas and
 * transforming them into runtime-usable structures. It acts as the bridge
 * between the raw metadata definition and the platform's execution layer.
 *
 * Pipeline:  Raw JSON → Validation → Normalization → Runtime Schema
 */

import type {
  VibeModuleSchema,
  VibeEntitySchema,
  VibeViewSchema,
  VibeFieldDefinition,
  VibeParseResult,
} from "./types";
import { validateVibeSchema, validateVibeSchemaFromString } from "./validator";

/* ------------------------------------------------------------------ */
/*  Runtime representations                                           */
/* ------------------------------------------------------------------ */

/** A runtime-ready entity with pre-computed lookup maps */
export interface RuntimeEntity {
  schema: VibeEntitySchema;
  fieldMap: Map<string, VibeFieldDefinition>;
  requiredFields: string[];
  relationFields: string[];
}

/** A runtime-ready module with indexed entities and views */
export interface RuntimeModule {
  raw: VibeModuleSchema;
  entities: Map<string, RuntimeEntity>;
  views: Map<string, VibeViewSchema>;
}

/* ------------------------------------------------------------------ */
/*  Parser Implementation                                             */
/* ------------------------------------------------------------------ */

/**
 * Parse and compile a Vibe-JSON schema into a RuntimeModule.
 * This is the primary entry point for the kernel.
 */
export function parseVibeSchema(input: unknown): VibeParseResult & { runtime?: RuntimeModule } {
  const validation = validateVibeSchema(input);

  if (!validation.success || !validation.schema) {
    return validation;
  }

  const runtime = compileModule(validation.schema);

  return {
    success: true,
    schema: validation.schema,
    runtime,
  };
}

/**
 * Parse a Vibe-JSON schema from a raw JSON string.
 */
export function parseVibeSchemaFromString(
  jsonString: string
): VibeParseResult & { runtime?: RuntimeModule } {
  const validation = validateVibeSchemaFromString(jsonString);

  if (!validation.success || !validation.schema) {
    return validation;
  }

  const runtime = compileModule(validation.schema);

  return {
    success: true,
    schema: validation.schema,
    runtime,
  };
}

/* ------------------------------------------------------------------ */
/*  Internal compilation                                              */
/* ------------------------------------------------------------------ */

/** Compile a validated schema into an optimized runtime module */
function compileModule(schema: VibeModuleSchema): RuntimeModule {
  const entities = new Map<string, RuntimeEntity>();
  const views = new Map<string, VibeViewSchema>();

  for (const entity of schema.entities) {
    entities.set(entity.name, compileEntity(entity));
  }

  for (const view of schema.views) {
    views.set(view.name, view);
  }

  return { raw: schema, entities, views };
}

/** Compile a single entity into a runtime-ready representation */
function compileEntity(entity: VibeEntitySchema): RuntimeEntity {
  const fieldMap = new Map<string, VibeFieldDefinition>();
  const requiredFields: string[] = [];
  const relationFields: string[] = [];

  for (const field of entity.fields) {
    fieldMap.set(field.name, field);

    if (field.required) {
      requiredFields.push(field.name);
    }

    if (field.type === "relation" && field.relation) {
      relationFields.push(field.name);
    }
  }

  return {
    schema: entity,
    fieldMap,
    requiredFields,
    relationFields,
  };
}

/**
 * Extract a flat list of all entity names from a schema.
 * Useful for quick lookups and dependency resolution.
 */
export function extractEntityNames(schema: VibeModuleSchema): string[] {
  return schema.entities.map((e) => e.name);
}

/**
 * Resolve cross-entity relations — returns a dependency graph
 * as an adjacency list.
 */
export function resolveRelations(
  schema: VibeModuleSchema
): Map<string, string[]> {
  const graph = new Map<string, string[]>();

  for (const entity of schema.entities) {
    const deps: string[] = [];
    for (const field of entity.fields) {
      if (field.type === "relation" && field.relation) {
        deps.push(field.relation.entity);
      }
    }
    graph.set(entity.name, deps);
  }

  return graph;
}
