import type { RuntimeModule } from "./vibe-parser";

/** Drizzle-oriented storage layout for dynamic Vibe entities (JSONB in `vibe_records`) */
export interface DrizzleEntityStorageBlueprint {
  recordTable: "vibe_records";
  entityName: string;
  dataColumn: "data";
  dataColumnSqlType: "jsonb";
  fieldBindings: Array<{
    fieldName: string;
    vibeFieldType: string;
    storedIn: "data";
    jsonbPath: string;
  }>;
}

export interface DrizzleModuleStorageBlueprint {
  moduleTable: "vibe_modules";
  schemaColumn: "schema";
  schemaColumnSqlType: "jsonb";
  recordTable: "vibe_records";
  entities: DrizzleEntityStorageBlueprint[];
}

/**
 * Compile a validated runtime module into a Drizzle-compatible storage blueprint
 * (no DB connection — describes how metadata maps to PostgreSQL JSONB columns).
 */
export function buildDrizzleStorageBlueprint(
  runtime: RuntimeModule
): DrizzleModuleStorageBlueprint {
  const entities: DrizzleEntityStorageBlueprint[] = [];

  for (const [entityName, runtimeEntity] of runtime.entities) {
    entities.push({
      recordTable: "vibe_records",
      entityName,
      dataColumn: "data",
      dataColumnSqlType: "jsonb",
      fieldBindings: runtimeEntity.schema.fields.map((field) => ({
        fieldName: field.name,
        vibeFieldType: field.type,
        storedIn: "data",
        jsonbPath: `$.${field.name}`,
      })),
    });
  }

  return {
    moduleTable: "vibe_modules",
    schemaColumn: "schema",
    schemaColumnSqlType: "jsonb",
    recordTable: "vibe_records",
    entities,
  };
}
