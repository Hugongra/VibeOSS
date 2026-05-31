/**
 * VEEF — VibeOS Enterprise Evaluation Framework
 * Four verification layers: SV, DBI, URC, CE
 */

import { describe, expect, it } from "vitest";
import { validateVibeSchema } from "@shared/schemas";
import { mapVibeFieldTypeToSduiComponent } from "@shared/sdui/field-component-map";
import { parseVibeSchema } from "../vibe-parser";
import { buildDrizzleStorageBlueprint } from "../storage-blueprint";
import {
  validateRecordMutation,
  type FieldConstraintRule,
} from "../constraint-enforcement";

const SOLAR_LEAD_SCHEMA = {
  version: "1.0.0",
  module: "solar-crm",
  description: "Solar lead module for VEEF schema validity tests",
  entities: [
    {
      name: "solar_lead",
      label: "Solar Lead",
      pluralLabel: "Solar Leads",
      description: "Prospective solar customer",
      timestamps: true,
      softDelete: true,
      fields: [
        { name: "name", label: "Name", type: "text", required: true },
        { name: "email", label: "Email", type: "email", required: true },
        { name: "created_date", label: "Created Date", type: "date", required: true },
        {
          name: "status",
          label: "Status",
          type: "select",
          required: true,
          options: ["New", "Contacted", "Qualified", "Lost"],
        },
        {
          name: "revenue",
          label: "Revenue",
          type: "currency",
          required: false,
          validation: { min: 0 },
        },
      ],
    },
  ],
  views: [
    {
      name: "solar_leads_table",
      label: "Solar Leads",
      entity: "solar_lead",
      layout: {
        type: "table",
        columns: ["name", "email", "status", "revenue", "created_date"],
      },
    },
    {
      name: "solar_lead_form",
      label: "New Solar Lead",
      entity: "solar_lead",
      layout: { type: "form" },
    },
  ],
  actions: [],
  automations: [],
} as const;

const CLOSED_WON_RULES: FieldConstraintRule[] = [
  {
    id: "status-closed-won-requires-revenue",
    entity: "lead",
    whenField: "status",
    whenValue: "Closed-Won",
    requireField: "revenue",
    requirePositiveNumber: true,
  },
];

describe("VEEF Layer 1 — Schema Validity (SV)", () => {
  it("accepts a valid SolarLead Vibe-JSON with five fields", () => {
    const result = validateVibeSchema(SOLAR_LEAD_SCHEMA);
    expect(result.success).toBe(true);
    expect(result.schema?.entities[0].fields).toHaveLength(5);
  });

  it('rejects invalid field type "CurrencyString"', () => {
    const invalid = {
      ...SOLAR_LEAD_SCHEMA,
      entities: [
        {
          ...SOLAR_LEAD_SCHEMA.entities[0],
          fields: [
            ...SOLAR_LEAD_SCHEMA.entities[0].fields.slice(0, 4),
            {
              name: "revenue",
              label: "Revenue",
              type: "CurrencyString",
              required: false,
            },
          ],
        },
      ],
    };

    const result = validateVibeSchema(invalid);
    expect(result.success).toBe(false);
    expect(result.errors?.length).toBeGreaterThan(0);
    expect(
      result.errors?.some(
        (e) =>
          e.path.includes("type") ||
          e.message.toLowerCase().includes("invalid enum")
      )
    ).toBe(true);
  });
});

describe("VEEF Layer 2 — Database Integrity (DBI)", () => {
  it("compiles a Drizzle-compatible JSONB storage blueprint from the parser", () => {
    const parsed = parseVibeSchema(SOLAR_LEAD_SCHEMA);
    expect(parsed.success).toBe(true);
    expect(parsed.runtime).toBeDefined();

    const blueprint = buildDrizzleStorageBlueprint(parsed.runtime!);

    expect(blueprint.moduleTable).toBe("vibe_modules");
    expect(blueprint.schemaColumn).toBe("schema");
    expect(blueprint.schemaColumnSqlType).toBe("jsonb");
    expect(blueprint.recordTable).toBe("vibe_records");

    const solar = blueprint.entities.find((e) => e.entityName === "solar_lead");
    expect(solar).toBeDefined();
    expect(solar!.dataColumn).toBe("data");
    expect(solar!.dataColumnSqlType).toBe("jsonb");
    expect(solar!.fieldBindings).toHaveLength(5);
    expect(solar!.fieldBindings.every((b) => b.storedIn === "data")).toBe(true);
    expect(solar!.fieldBindings.find((b) => b.fieldName === "revenue")?.jsonbPath).toBe(
      "$.revenue"
    );
  });
});

describe("VEEF Layer 3 — UI Render Completeness (URC)", () => {
  it("maps thesis field types to the correct SDUI components", () => {
    expect(mapVibeFieldTypeToSduiComponent("text")).toBe("text-input");
    expect(mapVibeFieldTypeToSduiComponent("select")).toBe("select");
    expect(mapVibeFieldTypeToSduiComponent("currency")).toBe("number-input");
    expect(mapVibeFieldTypeToSduiComponent("date")).toBe("date-picker");
  });

  it("maps all SolarLead field types from the validated schema", () => {
    const parsed = validateVibeSchema(SOLAR_LEAD_SCHEMA);
    const fields = parsed.schema!.entities[0].fields;

    expect(mapVibeFieldTypeToSduiComponent(fields[0].type)).toBe("text-input");
    expect(mapVibeFieldTypeToSduiComponent(fields[1].type)).toBe("email-input");
    expect(mapVibeFieldTypeToSduiComponent(fields[2].type)).toBe("date-picker");
    expect(mapVibeFieldTypeToSduiComponent(fields[3].type)).toBe("select");
    expect(mapVibeFieldTypeToSduiComponent(fields[4].type)).toBe("number-input");
  });
});

describe("VEEF Layer 4 — Constraint Enforcement (CE)", () => {
  const baseRecord = {
    status: "New",
    revenue: 1000,
  };

  it("allows Closed-Won when revenue is positive", () => {
    const result = validateRecordMutation(
      "lead",
      baseRecord,
      { status: "Closed-Won", revenue: 5000 },
      CLOSED_WON_RULES
    );
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('rejects Closed-Won when revenue is null or zero', () => {
    const nullRevenue = validateRecordMutation(
      "lead",
      baseRecord,
      { status: "Closed-Won", revenue: null },
      CLOSED_WON_RULES
    );
    expect(nullRevenue.valid).toBe(false);

    const zeroRevenue = validateRecordMutation(
      "lead",
      { ...baseRecord, revenue: 0 },
      { status: "Closed-Won" },
      CLOSED_WON_RULES
    );
    expect(zeroRevenue.valid).toBe(false);
    expect(
      zeroRevenue.errors.some((e) => e.includes("revenue") && e.includes("> 0"))
    ).toBe(true);
  });
});
