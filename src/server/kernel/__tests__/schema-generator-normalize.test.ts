import { describe, expect, it } from "vitest";
import { validateVibeSchema } from "@shared/schemas";
import { normalizeLlmModule } from "../schema-generator";

describe("normalizeLlmModule — object-map shapes", () => {
  it("converts entities and views from objects to arrays", () => {
    const raw = {
      version: "1.0.0",
      module: "crm",
      description: "CRM",
      entities: {
        contact: {
          label: "Contact",
          pluralLabel: "Contacts",
          description: "",
          timestamps: true,
          softDelete: true,
          fields: [{ name: "full_name", label: "Full Name", type: "text", required: true }],
        },
      },
      views: {
        contacts_table: {
          label: "Contacts",
          entity: "contact",
          layout: { type: "table", columns: ["full_name"] },
        },
      },
      actions: [],
      automations: [],
    };

    const normalized = normalizeLlmModule(raw);
    const result = validateVibeSchema(normalized);
    expect(result.success).toBe(true);
    if (result.success && result.schema) {
      expect(Array.isArray(result.schema.entities)).toBe(true);
      expect(result.schema.entities[0].name).toBe("contact");
      expect(Array.isArray(result.schema.views)).toBe(true);
      expect(result.schema.views[0].name).toBe("contacts_table");
    }
  });

  it("fills missing transition.to from action label", () => {
    const raw = {
      version: "1.0.0",
      module: "crm",
      description: "CRM",
      entities: [
        {
          name: "deal",
          label: "Deal",
          pluralLabel: "Deals",
          description: "",
          timestamps: true,
          softDelete: true,
          fields: [
            { name: "title", label: "Title", type: "text", required: true },
            { name: "status", label: "Status", type: "select", required: true, options: ["Open", "Won", "Lost"] },
          ],
        },
      ],
      views: [
        { name: "deals_table", label: "Deals", entity: "deal", layout: { type: "table" } },
      ],
      actions: [
        { name: "move_to_won", label: "Move to Won", type: "transition", targetEntity: "deal", transition: { field: "status" } },
        { name: "move_to_lost", label: "Move to Lost", type: "transition", targetEntity: "deal", transition: { field: "status" } },
      ],
      automations: [],
    };

    const normalized = normalizeLlmModule(raw);
    const result = validateVibeSchema(normalized);
    expect(result.success).toBe(true);
    if (result.success && result.schema) {
      expect(result.schema.actions[0].transition?.to).toBe("Won");
      expect(result.schema.actions[1].transition?.to).toBe("Lost");
    }
  });

  it("demotes transition action to update when transition object is missing entirely", () => {
    const raw = {
      version: "1.0.0",
      module: "crm",
      description: "CRM",
      entities: [
        {
          name: "deal",
          label: "Deal",
          pluralLabel: "Deals",
          description: "",
          timestamps: true,
          softDelete: true,
          fields: [{ name: "title", label: "Title", type: "text", required: true }],
        },
      ],
      views: [
        { name: "deals_table", label: "Deals", entity: "deal", layout: { type: "table" } },
      ],
      actions: [{ name: "close_deal", label: "Close Deal", type: "transition", targetEntity: "deal" }],
      automations: [],
    };

    const normalized = normalizeLlmModule(raw);
    const result = validateVibeSchema(normalized);
    expect(result.success).toBe(true);
    if (result.success && result.schema) {
      expect(result.schema.actions[0].type).toBe("update");
      expect(result.schema.actions[0].transition).toBeUndefined();
    }
  });

  it("converts view layout array + root type into layout object and injects version", () => {
    const raw = {
      module: "solar-leads",
      description: "Solar energy lead management",
      entities: [
        {
          name: "solar_lead",
          label: "Solar Lead",
          pluralLabel: "Solar Leads",
          description: "Track solar prospects",
          fields: [
            { name: "name", label: "Name", type: "text", required: true },
            { name: "email", label: "Email", type: "email", required: true },
            {
              name: "status",
              label: "Status",
              type: "select",
              required: true,
              options: ["New", "Lost"],
            },
          ],
          timestamps: true,
          softDelete: true,
        },
      ],
      views: [
        {
          name: "solar_leads_table",
          label: "Solar Leads",
          entity: "solar_lead",
          type: "table",
          layout: ["name", "email", "status"],
        },
        {
          name: "solar_lead_form",
          label: "Solar Lead Form",
          entity: "solar_lead",
          type: "form",
          layout: ["name", "email", "status"],
        },
      ],
      actions: [],
      automations: [],
    };

    const normalized = normalizeLlmModule(raw) as Record<string, unknown>;
    expect(normalized.version).toBe("1.0.0");

    const result = validateVibeSchema(normalized);
    expect(result.success).toBe(true);
    if (result.success && result.schema) {
      expect(result.schema.views[0].layout).toEqual({
        type: "table",
        columns: ["name", "email", "status"],
      });
      expect(result.schema.views[1].layout).toEqual({
        type: "form",
        columns: ["name", "email", "status"],
      });
      expect((normalized.views as Record<string, unknown>[])[0].type).toBeUndefined();
    }
  });

  it("injects name/label into actions that only have type", () => {
    const raw = {
      version: "1.0.0",
      module: "crm",
      description: "CRM",
      entities: [
        {
          name: "contact",
          label: "Contact",
          pluralLabel: "Contacts",
          description: "",
          timestamps: true,
          softDelete: true,
          fields: [{ name: "full_name", label: "Full Name", type: "text", required: true }],
        },
      ],
      views: [
        {
          name: "contacts_table",
          label: "Contacts",
          entity: "contact",
          layout: { type: "table" },
        },
      ],
      actions: [{ type: "create", targetEntity: "contact" }, { type: "delete", targetEntity: "contact" }],
      automations: [],
    };

    const normalized = normalizeLlmModule(raw);
    const result = validateVibeSchema(normalized);
    expect(result.success).toBe(true);
    if (result.success && result.schema) {
      expect(result.schema.actions[0].name).toBe("create");
      expect(result.schema.actions[1].name).toBe("delete");
    }
  });
});

describe("normalizeLlmModule", () => {
  it("coerces select options from { value, label } objects to strings", () => {
    const raw = {
      version: "1.0.0",
      module: "test-crm",
      description: "Test",
      entities: [
        {
          name: "lead",
          label: "Lead",
          pluralLabel: "Leads",
          description: "",
          timestamps: true,
          softDelete: true,
          fields: [
            {
              name: "status",
              label: "Status",
              type: "select",
              required: true,
              options: [
                { value: "new", label: "New" },
                { value: "won", label: "Won" },
              ],
            },
          ],
        },
      ],
      views: [
        {
          name: "leads_table",
          label: "Leads",
          entity: "lead",
          layout: { type: "table", columns: ["status"] },
        },
      ],
      actions: [],
      automations: [],
    };

    const normalized = normalizeLlmModule(raw);
    const result = validateVibeSchema(normalized);
    expect(result.success).toBe(true);
    if (result.success && result.schema) {
      const statusField = result.schema.entities[0].fields[0];
      expect(statusField.options).toEqual(["new", "won"]);
    }
  });

  it("fills missing relation.type and defaults field to id", () => {
    const raw = {
      version: "1.0.0",
      module: "test-crm",
      description: "Test",
      entities: [
        {
          name: "deal",
          label: "Deal",
          pluralLabel: "Deals",
          description: "",
          timestamps: true,
          softDelete: true,
          fields: [
            {
              name: "company_id",
              label: "Company",
              type: "relation",
              required: false,
              relation: { entity: "company", field: "id" },
            },
          ],
        },
        {
          name: "company",
          label: "Company",
          pluralLabel: "Companies",
          description: "",
          timestamps: true,
          softDelete: true,
          fields: [
            { name: "name", label: "Name", type: "text", required: true },
          ],
        },
      ],
      views: [
        {
          name: "deals_table",
          label: "Deals",
          entity: "deal",
          layout: { type: "table", columns: ["company_id"] },
        },
      ],
      actions: [],
      automations: [],
    };

    const normalized = normalizeLlmModule(raw);
    const result = validateVibeSchema(normalized);
    expect(result.success).toBe(true);
    if (result.success && result.schema) {
      const rel = result.schema.entities[0].fields[0].relation;
      expect(rel?.type).toBe("one-to-many");
      expect(rel?.field).toBe("id");
    }
  });
});
