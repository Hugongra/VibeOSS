import { afterEach, describe, expect, it, vi } from "vitest";
import { vibeModuleSchema } from "@shared/schemas";
import {
  buildMessages,
  formatZodErrorForLLM,
  generateSchemaWithRetry,
  setLlmGenerateOverride,
} from "../schema-generator";

const VALID_MINIMAL = {
  version: "1.0.0",
  module: "test-mod",
  description: "Test module",
  entities: [
    {
      name: "lead",
      label: "Lead",
      pluralLabel: "Leads",
      description: "A lead",
      timestamps: true,
      softDelete: true,
      fields: [{ name: "name", label: "Name", type: "text", required: true }],
    },
  ],
  views: [
    {
      name: "leads_table",
      label: "Leads",
      entity: "lead",
      layout: { type: "table", columns: ["name"] },
    },
    {
      name: "lead_form",
      label: "New Lead",
      entity: "lead",
      layout: { type: "form" },
    },
  ],
  actions: [],
  automations: [],
};

const INVALID_BAD_FIELD_TYPE = {
  ...VALID_MINIMAL,
  entities: [
    {
      ...VALID_MINIMAL.entities[0],
      fields: [
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

afterEach(() => {
  setLlmGenerateOverride(null);
  vi.restoreAllMocks();
});

describe("formatZodErrorForLLM", () => {
  it("produces semantic hint for invalid field type", () => {
    const parsed = vibeModuleSchema.safeParse(INVALID_BAD_FIELD_TYPE);
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      const hints = formatZodErrorForLLM(parsed.error, INVALID_BAD_FIELD_TYPE);
      expect(hints.some((h) => h.includes("Revenue"))).toBe(true);
      expect(hints.some((h) => h.includes("CurrencyString"))).toBe(true);
      expect(hints.some((h) => h.includes("Valid field types"))).toBe(true);
    }
  });

  it("describes layout object shape when model used a column array", () => {
    const badLayout = {
      ...VALID_MINIMAL,
      views: [
        {
          name: "leads_table",
          label: "Leads",
          entity: "lead",
          type: "table",
          layout: ["name"],
        },
      ],
    };
    const parsed = vibeModuleSchema.safeParse(badLayout);
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      const hints = formatZodErrorForLLM(parsed.error, badLayout);
      expect(hints.some((h) => h.includes('layout must be an object like { "type"'))).toBe(true);
      expect(hints.some((h) => h.includes("not a flat array"))).toBe(true);
      expect(hints.some((h) => h.includes("not an object {}"))).toBe(false);
    }
  });
});

describe("buildMessages", () => {
  it("includes previous JSON and errors on retry attempts", () => {
    const { prompt } = buildMessages({
      userPrompt: "Build a CRM",
      attempt: 2,
      lastAttempt: INVALID_BAD_FIELD_TYPE,
      semanticErrors: ["Field 'Revenue' has invalid type"],
    });
    expect(prompt).toContain("Build a CRM");
    expect(prompt).toContain("previous attempt failed validation");
    expect(prompt).toContain("CurrencyString");
    expect(prompt).toContain("Field 'Revenue' has invalid type");
  });
});

describe("generateSchemaWithRetry", () => {
  it("self-corrects after invalid schema on first LLM call", async () => {
    let callCount = 0;
    setLlmGenerateOverride(async () => {
      callCount += 1;
      const payload = callCount === 1 ? INVALID_BAD_FIELD_TYPE : VALID_MINIMAL;
      return {
        text: JSON.stringify(payload),
        usage: { totalTokens: 100 },
        finishReason: "stop",
      };
    });

    const result = await generateSchemaWithRetry({ prompt: "Build test module" }, 3);

    expect(result.success).toBe(true);
    expect(result.attemptsUsed).toBe(2);
    expect(result.selfCorrected).toBe(true);
    expect(result.attemptTimingsMs).toHaveLength(2);
    expect(callCount).toBe(2);
  });

  it("returns failure metadata after max retries exhausted", async () => {
    setLlmGenerateOverride(async () => ({
      text: JSON.stringify(INVALID_BAD_FIELD_TYPE),
      usage: { totalTokens: 50 },
      finishReason: "stop",
    }));

    const result = await generateSchemaWithRetry({ prompt: "Build test" }, 2);

    expect(result.success).toBe(false);
    expect(result.attemptsUsed).toBe(2);
    expect(result.selfCorrected).toBe(false);
    expect(result.semanticErrors?.length).toBeGreaterThan(0);
    expect(result.lastAttempt).toBeDefined();
  });
});
