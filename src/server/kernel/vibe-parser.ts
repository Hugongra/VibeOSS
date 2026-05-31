/**
 * VibeOS Kernel — Vibe Parser (vibe_schema_v1)
 *
 * The parser interprets vibe_schema_v1 documents and compiles them into
 * runtime-usable structures with pre-computed lookup maps for entities,
 * views, actions, and automations.
 *
 * Pipeline:  Raw JSON → Validation → Normalization → RuntimeModule
 */

import type {
  VibeSchemaV1,
  VibeEntitySchema,
  VibeViewSchema,
  VibeFieldDefinition,
  VibeActionSchema,
  VibeAutomationSchema,
  VibeParseResult,
} from "@shared/types";
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

/** A runtime-ready module with indexed entities, views, actions, automations */
export interface RuntimeModule {
  raw: VibeSchemaV1;
  entities: Map<string, RuntimeEntity>;
  views: Map<string, VibeViewSchema>;
  actions: Map<string, VibeActionSchema>;
  automations: Map<string, VibeAutomationSchema>;
  /** Automations indexed by entity name for fast lookup */
  automationsByEntity: Map<string, VibeAutomationSchema[]>;
}

/* ------------------------------------------------------------------ */
/*  Parser — public API                                               */
/* ------------------------------------------------------------------ */

/**
 * Parse and compile a vibe_schema_v1 into a RuntimeModule.
 * Primary entry point for the kernel.
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
 * Parse a vibe_schema_v1 from a raw JSON string.
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
function compileModule(schema: VibeSchemaV1): RuntimeModule {
  const entities = new Map<string, RuntimeEntity>();
  const views = new Map<string, VibeViewSchema>();
  const actions = new Map<string, VibeActionSchema>();
  const automations = new Map<string, VibeAutomationSchema>();
  const automationsByEntity = new Map<string, VibeAutomationSchema[]>();

  for (const entity of schema.entities) {
    entities.set(entity.name, compileEntity(entity));
  }

  for (const view of schema.views) {
    views.set(view.name, view);
  }

  for (const action of schema.actions) {
    actions.set(action.name, action);
  }

  for (const automation of schema.automations) {
      automations.set(automation.name, automation);

      const existing = automationsByEntity.get(automation.entity) ?? [];
      existing.push(automation);
      automationsByEntity.set(automation.entity, existing);
  }

  return { raw: schema, entities, views, actions, automations, automationsByEntity };
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

  return { schema: entity, fieldMap, requiredFields, relationFields };
}

/* ------------------------------------------------------------------ */
/*  Utility helpers                                                   */
/* ------------------------------------------------------------------ */

/**
 * Extract a flat list of all entity names from a schema.
 */
export function extractEntityNames(schema: VibeSchemaV1): string[] {
  return schema.entities.map((e) => e.name);
}

/**
 * Resolve cross-entity relations — returns a dependency graph
 * as an adjacency list.
 */
export function resolveRelations(schema: VibeSchemaV1): Map<string, string[]> {
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

/**
 * Get all automations that should fire for a given entity + trigger combination.
 */
export function getAutomationsForTrigger(
  runtime: RuntimeModule,
  entityName: string,
  trigger: string
): VibeAutomationSchema[] {
  const entityAutomations = runtime.automationsByEntity.get(entityName) ?? [];
  return entityAutomations.filter((a) => a.trigger === trigger);
}
