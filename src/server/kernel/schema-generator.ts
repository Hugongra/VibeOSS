/**
 * VibeOS Kernel — Schema Generator (vibe_schema_v1)
 *
 * Transforms natural language intent into Vibe-JSON schemas using the
 * Vercel AI SDK + OpenRouter or Anthropic Claude. Uses JSON text generation (not
 * generateObject) because the full Zod schema is too large for reliable
 * provider-native structured output; validation runs in the Deterministic
 * Compiler Shell after parse.
 */

import { generateText } from "ai";
import type { z, ZodError } from "zod";
import { vibeModuleSchema } from "@shared/schemas";
import type { VibeIntentRequest, VibeGenerationResult, VibeSchemaV1 } from "@shared/types";
import {
  loadSystemPrompt,
  SCHEMA_GENERATOR_TEMPERATURE,
  getSchemaGeneratorMaxRetries,
} from "./load-system-prompt";
import { getSchemaGeneratorModel } from "./llm-provider";

export type VibeModuleObject = z.infer<typeof vibeModuleSchema>;

const RETRY_DELAY_MS = 1500;
const GENERATION_MAX_TOKENS = 16384;
const MAX_PREVIOUS_JSON_CHARS = 12_000;

const VALID_FIELD_TYPES = [
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
] as const;

export interface SchemaGenerationRetryResult {
  success: boolean;
  schema?: VibeModuleObject;
  attemptsUsed: number;
  selfCorrected: boolean;
  attemptTimingsMs: number[];
  tokensUsed?: number;
  lastAttempt?: unknown;
  validationErrors?: string[];
  semanticErrors?: string[];
}

/** Injectable LLM caller for unit tests (see self-correction.test.ts). */
export type LlmGenerateFn = (args: {
  system: string;
  prompt: string;
}) => Promise<{
  text: string;
  usage?: { totalTokens?: number };
  finishReason?: string;
}>;

let llmGenerateOverride: LlmGenerateFn | null = null;

/** @internal Test hook — replace the Vercel AI SDK call. */
export function setLlmGenerateOverride(fn: LlmGenerateFn | null): void {
  llmGenerateOverride = fn;
}

async function callLlm(system: string, prompt: string) {
  if (llmGenerateOverride) {
    return llmGenerateOverride({ system, prompt });
  }
  return generateText({
    model: getSchemaGeneratorModel(),
    system,
    prompt,
    temperature: SCHEMA_GENERATOR_TEMPERATURE,
    maxTokens: GENERATION_MAX_TOKENS,
  });
}

const FIELD_TYPE_ALIASES: Record<string, string> = {
  string: "text",
  str: "text",
  String: "text",
  enum: "select",
  Enum: "select",
  int: "number",
  integer: "number",
  float: "number",
  bool: "boolean",
  money: "currency",
  Currency: "currency",
};

/** Coerce LLM select option (string | number | { value, label, ... }) to string. */
function normalizeSelectOption(option: unknown): string | null {
  if (typeof option === "string" && option.length > 0) return option;
  if (typeof option === "number" && !Number.isNaN(option)) return String(option);
  if (option && typeof option === "object") {
    const o = option as Record<string, unknown>;
    for (const key of ["value", "label", "name", "id"] as const) {
      const v = o[key];
      if (typeof v === "string" && v.length > 0) return v;
      if (typeof v === "number" && !Number.isNaN(v)) return String(v);
    }
  }
  return null;
}

/** Convert a plain object whose values are records into an array of those records.
 *  e.g. { lead: { name: "lead", ... }, deal: { name: "deal", ... } } → [{ name: "lead", ...}, ...]
 *  When a key is missing inside the child object it is injected from the key itself.
 */
function objectMapToArray(
  obj: Record<string, unknown>,
  nameKey: string
): unknown[] {
  return Object.entries(obj).map(([key, val]) => {
    if (val && typeof val === "object" && !Array.isArray(val)) {
      const item = val as Record<string, unknown>;
      if (!item[nameKey]) item[nameKey] = key;
      return item;
    }
    return val;
  });
}

/** Normalize an array of action objects in-place. */
function normalizeActionArray(actions: unknown[]): void {
  for (const action of actions) {
    if (!action || typeof action !== "object") continue;
    const a = action as Record<string, unknown>;

    if (!a.name && typeof a.type === "string") a.name = a.type;
    if (!a.label && typeof a.name === "string") {
      a.label = a.name.charAt(0).toUpperCase() + a.name.slice(1).replace(/_/g, " ");
    }
    if (!a.type) a.type = "custom";

    // transition actions: ensure { field, to } are present
    if (a.type === "transition") {
      if (!a.transition || typeof a.transition !== "object") {
        // No transition metadata at all — demote to "update" to avoid validation failure
        a.type = "update";
        delete a.transition;
      } else {
        const t = a.transition as Record<string, unknown>;
        if (typeof t.field !== "string" || t.field.length === 0) {
          t.field = "status";
        }
        if (typeof t.to !== "string" || t.to.length === 0) {
          // Try to infer "to" from the action name/label (e.g. "Move to Won" → "Won")
          const label = typeof a.label === "string" ? a.label : "";
          const match = label.match(/(?:to|→)\s+(.+)/i);
          t.to = match ? match[1].trim() : (typeof a.name === "string" ? a.name : "next");
        }
      }
    }

    // notify actions: ensure notification metadata exists
    if (a.type === "notify" && (!a.notification || typeof a.notification !== "object")) {
      a.notification = { channel: "in_app" };
    }
  }
}

const VIEW_LAYOUT_TYPES = [
  "table",
  "form",
  "detail",
  "card",
  "list",
  "kanban",
  "chart",
  "stat",
  "custom",
] as const;

function inferLayoutTypeFromViewName(name: unknown): (typeof VIEW_LAYOUT_TYPES)[number] | undefined {
  if (typeof name !== "string") return undefined;
  const n = name.toLowerCase();
  if (n.includes("kanban")) return "kanban";
  if (n.includes("table") || n.endsWith("_list") || n.includes("_table")) return "table";
  if (n.includes("form")) return "form";
  if (n.includes("detail")) return "detail";
  if (n.includes("card")) return "card";
  if (n.includes("chart")) return "chart";
  return undefined;
}

/** Coerce view.type + layout[] into layout { type, columns? } and strip stray view.type. */
function normalizeViewLayout(v: Record<string, unknown>): void {
  const viewType =
    typeof v.type === "string" &&
    (VIEW_LAYOUT_TYPES as readonly string[]).includes(v.type)
      ? v.type
      : undefined;

  if (Array.isArray(v.layout)) {
    const columns = v.layout.filter((col): col is string => typeof col === "string");
    const layoutType = viewType ?? inferLayoutTypeFromViewName(v.name) ?? "table";
    v.layout = columns.length > 0 ? { type: layoutType, columns } : { type: layoutType };
    if (viewType) delete v.type;
    return;
  }

  if (v.layout && typeof v.layout === "object" && !Array.isArray(v.layout)) {
    const layout = v.layout as Record<string, unknown>;
    if (viewType && typeof layout.type !== "string") {
      layout.type = viewType;
    }
    if (viewType) delete v.type;
    return;
  }

  if (!v.layout) {
    const layoutType = viewType ?? inferLayoutTypeFromViewName(v.name) ?? "form";
    v.layout = { type: layoutType };
    if (viewType) delete v.type;
  }
}

/** Fix common LLM mistakes before Zod validation. */
export function normalizeLlmModule(raw: unknown): unknown {
  if (!raw || typeof raw !== "object") return raw;
  const module = raw as Record<string, unknown>;

  // Fix 1: flatten nested module object
  // LLM sometimes writes { module: { name: "slug", version: "1.0.0" } }
  // instead of module: "slug" at the top level.
  // This runs BEFORE Zod so we fix it here in the parent caller.
  // (module here is the full schema object, not the module field)
  if (
    module.module &&
    typeof module.module === "object" &&
    !Array.isArray(module.module)
  ) {
    const nested = module.module as Record<string, unknown>;
    if (typeof nested.name === "string") {
      // hoist version and description if not already set
      if (!module.version && nested.version) module.version = nested.version;
      if (!module.description && nested.description) {
        module.description = nested.description;
      }
      // flatten: replace the object with just the kebab-case slug
      module.module = nested.name
        .toLowerCase()
        .replace(/\s+/g, "-")
        .replace(/[^a-z0-9-]/g, "");
    }
  }

  // Fix 2: if description is empty string, generate one from module name
  if (
    typeof module.description !== "string" ||
    module.description.trim().length === 0
  ) {
    const slug =
      typeof module.module === "string" ? module.module : "enterprise-module";
    module.description = `${slug.replace(/-/g, " ")} module`;
  }

  // Fix 3: strip navigation entries that reference non-existent views
  if (Array.isArray(module.navigation) && Array.isArray(module.views)) {
    const validViewNames = new Set(
      (module.views as Record<string, unknown>[])
        .map((v) => v.name)
        .filter((n) => typeof n === "string")
    );
    module.navigation = (module.navigation as Record<string, unknown>[]).filter(
      (nav) =>
        typeof nav.view === "string" && validViewNames.has(nav.view)
    );
  }

  if (typeof module.version !== "string" || module.version.trim().length === 0) {
    module.version = "1.0.0";
  }
  if (typeof module.description !== "string") {
    module.description = "";
  }

  // entities / views may come as objects keyed by name instead of arrays
  for (const key of ["entities", "views"] as const) {
    if (module[key] && !Array.isArray(module[key]) && typeof module[key] === "object") {
      module[key] = objectMapToArray(module[key] as Record<string, unknown>, "name");
    }
  }

  // actions / automations: ensure array and fix each item
  if (!Array.isArray(module.actions)) {
    module.actions = module.actions && !Array.isArray(module.actions) && typeof module.actions === "object"
      ? objectMapToArray(module.actions as Record<string, unknown>, "name")
      : [];
  }
  if (!Array.isArray(module.automations)) module.automations = [];

  // Fix action items: inject name/label, fix transitions & notifications
  normalizeActionArray(module.actions as unknown[]);

  // Also fix actions embedded inside automations
  if (Array.isArray(module.automations)) {
    for (const auto of module.automations) {
      if (!auto || typeof auto !== "object") continue;
      const a = auto as Record<string, unknown>;
      if (Array.isArray(a.actions)) normalizeActionArray(a.actions);
    }
  }

  if (!Array.isArray(module.entities)) return module;

  for (const entity of module.entities) {
    if (!entity || typeof entity !== "object") continue;
    const ent = entity as Record<string, unknown>;

    if (typeof ent.pluralLabel !== "string" && typeof ent.label === "string") {
      ent.pluralLabel = ent.label.endsWith("s") ? ent.label : `${ent.label}s`;
    }
    if (typeof ent.description !== "string") ent.description = "";
    if (ent.timestamps === undefined) ent.timestamps = true;
    if (ent.softDelete === undefined) ent.softDelete = true;

    if (!Array.isArray(ent.fields)) continue;

    for (const field of ent.fields) {
      if (!field || typeof field !== "object") continue;
      const f = field as Record<string, unknown>;

      if (typeof f.type === "string" && FIELD_TYPE_ALIASES[f.type]) {
        f.type = FIELD_TYPE_ALIASES[f.type];
      }
      if (f.required === undefined) f.required = false;

      if (
        (f.type === "select" || f.type === "multi-select") &&
        Array.isArray(f.options)
      ) {
        f.options = f.options
          .map(normalizeSelectOption)
          .filter((o): o is string => o !== null);
      }

      if (f.type === "relation") {
        const inferredEntity =
          typeof f.name === "string"
            ? f.name.replace(/_id$/, "").replace(/_ref$/, "")
            : "related";

        if (!f.relation || typeof f.relation !== "object") {
          f.relation = { entity: inferredEntity, field: "id", type: "one-to-many" };
        } else {
          const rel = f.relation as Record<string, unknown>;
          if (rel.type === "many-to-one") rel.type = "one-to-many";
          if (typeof rel.type !== "string" || rel.type.length === 0) {
            rel.type = "one-to-many";
          }
          if (typeof rel.field !== "string" || rel.field.length === 0) {
            rel.field = "id";
          }
          if (typeof rel.entity !== "string" || rel.entity.length === 0) {
            rel.entity = inferredEntity;
          }
        }
      }
    }
  }

  // Ensure view columns only reference existing field names
  if (Array.isArray(module.views)) {
    const entityFieldMap = new Map<string, Set<string>>();
    for (const ent of module.entities as Record<string, unknown>[]) {
      if (typeof ent.name === "string" && Array.isArray(ent.fields)) {
        entityFieldMap.set(
          ent.name,
          new Set((ent.fields as Record<string, unknown>[]).map((f) => f.name as string))
        );
      }
    }

    for (const view of module.views) {
      if (!view || typeof view !== "object") continue;
      const v = view as Record<string, unknown>;
      normalizeViewLayout(v);
      if (v.layout && typeof v.layout === "object" && !Array.isArray(v.layout)) {
        const layout = v.layout as Record<string, unknown>;
        const entityName = typeof v.entity === "string" ? v.entity : "";
        const entityFields = entityFieldMap.get(entityName);

        // strip unknown column references
        if (entityFields && Array.isArray(layout.columns)) {
          layout.columns = (layout.columns as unknown[]).filter(
            (col) => typeof col === "string" && entityFields.has(col)
          );
          if ((layout.columns as unknown[]).length === 0) delete layout.columns;
        }

        // auto-fill kanban groupBy from first select field
        if (layout.type === "kanban" && typeof layout.groupBy !== "string") {
          const entity = (module.entities as unknown[]).find(
            (e) =>
              e &&
              typeof e === "object" &&
              (e as Record<string, unknown>).name === entityName
          ) as Record<string, unknown> | undefined;
          const statusField = Array.isArray(entity?.fields)
            ? (entity.fields as Record<string, unknown>[]).find(
                (fld) => fld.type === "select" && Array.isArray(fld.options)
              )
            : undefined;
          if (statusField && typeof statusField.name === "string") {
            layout.groupBy = statusField.name;
          }
        }
      }
    }
  }

  return module;
}

const JSON_OUTPUT_RULES = `
CRITICAL OUTPUT CONSTRAINTS:
- First character of your response MUST be {. Last must be }. No other text.
- Keep output COMPACT: max 3-4 entities, 5-8 fields each, short descriptions.
- "entities", "views", "actions", "automations" are ALL JSON arrays [...], never objects {}.
- select options: flat string array ["A","B"]. Never [{value,label}].
- relation fields: include "relation": {"entity":"x","field":"id","type":"one-to-many"}.
- action objects need "name", "label", "type". transition actions need "transition": {"field":"f","to":"v"}.
`.trim();

/**
 * Attempt to repair truncated JSON by closing open brackets/braces.
 * Strips any trailing partial string/key, then appends the missing closers.
 */
function repairTruncatedJson(text: string): string {
  // Strip trailing partial value (incomplete string, number, or key)
  let s = text.replace(/,\s*"[^"]*$/, "").replace(/,\s*$/, "");

  const stack: string[] = [];
  let inString = false;
  let escape = false;

  for (const ch of s) {
    if (escape) {
      escape = false;
      continue;
    }
    if (ch === "\\") {
      escape = true;
      continue;
    }
    if (ch === '"') {
      inString = !inString;
      continue;
    }
    if (inString) continue;

    if (ch === "{" || ch === "[") stack.push(ch);
    else if (ch === "}") {
      if (stack.length > 0 && stack[stack.length - 1] === "{") stack.pop();
    } else if (ch === "]") {
      if (stack.length > 0 && stack[stack.length - 1] === "[") stack.pop();
    }
  }

  // If we're inside an unclosed string, close it
  if (inString) s += '"';

  // Close remaining open brackets/braces
  while (stack.length > 0) {
    const opener = stack.pop();
    s += opener === "{" ? "}" : "]";
  }

  return s;
}

/** Extract JSON from model text (raw object or ```json fence).
 *  If direct parse fails, tries to repair truncated output. */
export function parseJsonFromModelText(text: string): unknown | null {
  const trimmed = text.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = (fenced ? fenced[1] : trimmed).trim();

  // Try direct parse
  try {
    return JSON.parse(candidate) as unknown;
  } catch {
    // noop
  }

  // Try extracting from first { to last }
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start >= 0 && end > start) {
    try {
      return JSON.parse(candidate.slice(start, end + 1)) as unknown;
    } catch {
      // noop
    }
  }

  // Try repairing truncated JSON (output cut off at maxTokens)
  if (start >= 0) {
    const fragment = candidate.slice(start);
    const repaired = repairTruncatedJson(fragment);
    try {
      return JSON.parse(repaired) as unknown;
    } catch {
      // noop
    }
  }

  return null;
}

/* ------------------------------------------------------------------ */
/*  Recursive Self-Correction (ReAct-style Zod feedback loop)         */
/* ------------------------------------------------------------------ */

function resolveAtPath(root: unknown, path: (string | number)[]): unknown {
  let cur: unknown = root;
  for (const seg of path) {
    if (cur === null || cur === undefined || typeof cur !== "object") return undefined;
    cur = (cur as Record<string, unknown>)[String(seg)];
  }
  return cur;
}

function describeEntityFieldContext(
  attempt: unknown,
  path: (string | number)[]
): { entityLabel?: string; entityName?: string; fieldLabel?: string; fieldName?: string } {
  const ctx: {
    entityLabel?: string;
    entityName?: string;
    fieldLabel?: string;
    fieldName?: string;
  } = {};

  const entitiesIdx = path.findIndex((p) => p === "entities");
  if (entitiesIdx >= 0 && typeof path[entitiesIdx + 1] === "number") {
    const entity = resolveAtPath(attempt, path.slice(0, entitiesIdx + 2));
    if (entity && typeof entity === "object") {
      const e = entity as Record<string, unknown>;
      if (typeof e.name === "string") ctx.entityName = e.name;
      if (typeof e.label === "string") ctx.entityLabel = e.label;
    }
    const fieldsIdx = path.indexOf("fields", entitiesIdx);
    if (fieldsIdx >= 0 && typeof path[fieldsIdx + 1] === "number") {
      const field = resolveAtPath(attempt, path.slice(0, fieldsIdx + 2));
      if (field && typeof field === "object") {
        const f = field as Record<string, unknown>;
        if (typeof f.name === "string") ctx.fieldName = f.name;
        if (typeof f.label === "string") ctx.fieldLabel = f.label;
      }
    }
  }

  return ctx;
}

/**
 * Convert Zod validation issues into semantic hints the LLM can act on.
 */
export function formatZodErrorForLLM(
  zodError: ZodError,
  lastAttempt?: unknown
): string[] {
  return zodError.issues.map((issue) => {
    const pathStr = issue.path.join(".");
    const ctx = lastAttempt ? describeEntityFieldContext(lastAttempt, issue.path) : {};
    const entityRef =
      ctx.entityLabel || ctx.entityName
        ? `entity '${ctx.entityLabel ?? ctx.entityName}'`
        : null;
    const fieldRef =
      ctx.fieldLabel || ctx.fieldName
        ? `field '${ctx.fieldLabel ?? ctx.fieldName}'`
        : null;
    const location =
      entityRef && fieldRef
        ? `In ${entityRef}, ${fieldRef}`
        : entityRef
          ? `In ${entityRef}`
          : fieldRef
            ? `Field ${fieldRef}`
            : `At path '${pathStr}'`;

    const invalidValue = lastAttempt ? resolveAtPath(lastAttempt, issue.path) : undefined;

    if (pathStr.includes(".type") && issue.code === "invalid_enum_value") {
      const badType = invalidValue ?? "unknown";
      return `${location}: type '${String(badType)}' is not valid. Valid field types are: ${VALID_FIELD_TYPES.join(", ")}.`;
    }

    if (issue.message.includes("snake_case")) {
      return `${location}: names must be snake_case (e.g. solar_lead, not SolarLead).`;
    }

    if (pathStr === "module" && issue.code === "invalid_type") {
      return `At path 'module': module must be a flat kebab-case string like "solar-lead-tracker", not an object. If you wrote { "name": "...", "version": "..." }, extract just the name as a kebab-case slug and put it directly as the module value. Move version and description to the top level.`;
    }

    if (
      pathStr === "description" &&
      (issue.code === "too_small" || issue.code === "invalid_type")
    ) {
      return `At path 'description': description is required and must be a non-empty string. Add a one-sentence description of what this module does.`;
    }

    if (pathStr === "views" && issue.code === "invalid_type") {
      return `At path 'views': views block is required. Add at least one view with this structure: { "name": "entity_table", "label": "Entities", "entity": "entity_name", "layout": { "type": "table", "columns": ["field1", "field2"] } }`;
    }

    if (issue.message.includes("kebab-case")) {
      return `${location}: module name must be kebab-case (e.g. task-management).`;
    }

    if (pathStr.includes("options") && issue.message.includes("string")) {
      return `${location}: select options must be a flat string array like ["New","Won"], not objects.`;
    }

    if (pathStr.includes("relation")) {
      return `${location}: relation fields need "relation": { "entity": "target_entity", "field": "id", "type": "one-to-many" }.`;
    }

    if (pathStr.includes("transition")) {
      return `${location}: transition actions need "transition": { "field": "status", "to": "target_value" }.`;
    }

    if (pathStr.endsWith(".layout") || pathStr === "layout") {
      if (issue.message.includes("Expected object") && issue.message.includes("array")) {
        return `${location}: layout must be an object like { "type": "table", "columns": ["field_a"] }, not a flat array of field names. Put "type" inside layout, not on the view root.`;
      }
      if (issue.code === "invalid_type" && issue.message.includes("Required")) {
        return `${location}: each view needs layout: { "type": "table"|"form"|"detail", "columns": [...] optional }.`;
      }
    }

    if (issue.message.includes("Expected array") && issue.message.includes("object")) {
      return `${location}: must be a JSON array [...], not an object {}.`;
    }

    if (issue.message.includes("Expected object") && issue.message.includes("array")) {
      return `${location}: must be a JSON object {}, not an array [...].`;
    }

    return `${location}: ${issue.message}`;
  });
}

/** Build system + user prompt for a generation attempt (single-shot via generateText). */
export function buildMessages(args: {
  userPrompt: string;
  attempt: number;
  lastAttempt?: unknown;
  semanticErrors?: string[];
  existingEntities?: string[];
  existingSchema?: unknown;
}): { system: string; prompt: string } {
  const contextHint = args.existingEntities?.length
    ? `\n\nExisting entities in the system: ${args.existingEntities.join(", ")}`
    : "";

  const modificationHint =
    args.existingSchema && typeof args.existingSchema === "object"
      ? `\n\nYou are MODIFYING an existing application. Current schema:\n${JSON.stringify(args.existingSchema, null, 2)}\n\nApply the user's requested changes and return the FULL updated vibe_schema_v1 JSON. Keep unchanged parts unless the user asks to change them.`
      : "";

  const system = `${loadSystemPrompt()}\n\n${JSON_OUTPUT_RULES}`;

  if (args.attempt === 1 || !args.semanticErrors?.length) {
    return {
      system,
      prompt: `${args.userPrompt}${modificationHint}${contextHint}`,
    };
  }

  const previousJson =
    args.lastAttempt !== undefined
      ? JSON.stringify(args.lastAttempt, null, 2)
      : "(no parseable JSON from previous attempt)";
  const truncated =
    previousJson.length > MAX_PREVIOUS_JSON_CHARS
      ? `${previousJson.slice(0, MAX_PREVIOUS_JSON_CHARS)}\n…(truncated)`
      : previousJson;

  const correctionBlock = `
Your previous attempt failed validation. Return ONE corrected raw JSON object only (no markdown, no prose).

Previous schema (attempt ${args.attempt - 1}):
${truncated}

Validation errors to fix:
${args.semanticErrors.map((e) => `- ${e}`).join("\n")}

Fix every issue above and output valid vibe_schema_v1 JSON.`.trim();

  return {
    system,
    prompt: `${args.userPrompt}${contextHint}\n\n${correctionBlock}`,
  };
}

/**
 * Generate schema with recursive self-correction: feed Zod errors back to the LLM
 * for up to SCHEMA_GENERATOR_MAX_RETRIES attempts (default 3).
 */
export async function generateSchemaWithRetry(
  request: VibeIntentRequest,
  maxRetries = getSchemaGeneratorMaxRetries()
): Promise<SchemaGenerationRetryResult> {
  const userPrompt = request.prompt;
  const existingEntities = request.context?.existingEntities;
  const existingSchema = request.context?.existingSchema;

  let lastAttempt: unknown;
  let lastSemanticErrors: string[] = [];
  let lastValidationErrors: string[] = [];
  let totalTokens = 0;
  const attemptTimingsMs: number[] = [];

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    if (attempt > 1) {
      const preview = lastSemanticErrors[0] ?? lastValidationErrors[0] ?? "unknown";
      console.log(
        `[Self-correction] Attempt ${attempt}/${maxRetries} — previous error: ${preview}`
      );
      await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
    }

    const { system, prompt } = buildMessages({
      userPrompt,
      attempt,
      lastAttempt,
      semanticErrors: attempt > 1 ? lastSemanticErrors : undefined,
      existingEntities,
      existingSchema,
    });

    const tAttempt = performance.now();
    const { text, usage, finishReason } = await callLlm(system, prompt);
    attemptTimingsMs.push(performance.now() - tAttempt);

    totalTokens += usage?.totalTokens ?? 0;

    if (finishReason === "length") {
      console.warn(
        `[Schema Generator] Attempt ${attempt}: output truncated at ${GENERATION_MAX_TOKENS} tokens (${text.length} chars).`
      );
    }

    const parsed = parseJsonFromModelText(text);
    if (parsed === null) {
      const preview = text.length > 300 ? `${text.slice(0, 300)}…` : text;
      console.error(
        `[Schema Generator] Attempt ${attempt}: response not valid JSON (finishReason=${finishReason}).\nPreview: ${preview}`
      );
      lastAttempt = text;
      lastSemanticErrors = [
        `Response was not valid JSON (${text.length} chars). Output must be a single raw JSON object starting with { and ending with }.`,
      ];
      lastValidationErrors = lastSemanticErrors;
      continue;
    }

    lastAttempt = parsed;
    const normalized = normalizeLlmModule(parsed);
    const zodResult = vibeModuleSchema.safeParse(normalized);

    if (zodResult.success) {
      return {
        success: true,
        schema: zodResult.data,
        attemptsUsed: attempt,
        selfCorrected: attempt > 1,
        attemptTimingsMs,
        tokensUsed: totalTokens,
      };
    }

    lastValidationErrors = zodResult.error.issues.map(
      (i) => `${i.path.join(".")}: ${i.message}`
    );
    lastSemanticErrors = formatZodErrorForLLM(zodResult.error, normalized);
  }

  return {
    success: false,
    attemptsUsed: maxRetries,
    selfCorrected: false,
    attemptTimingsMs,
    tokensUsed: totalTokens,
    lastAttempt,
    validationErrors: lastValidationErrors,
    semanticErrors: lastSemanticErrors,
  };
}

/**
 * LLM step: natural language → parsed JSON object (may still fail Zod).
 * @deprecated Prefer generateSchemaWithRetry for metadata; kept for callers expecting throws.
 */
export async function generateModuleObjectFromIntent(
  request: VibeIntentRequest
): Promise<{ object: VibeModuleObject; usage: { totalTokens?: number } }> {
  const result = await generateSchemaWithRetry(request);

  if (result.success && result.schema) {
    return {
      object: result.schema,
      usage: { totalTokens: result.tokensUsed },
    };
  }

  const detail =
    result.semanticErrors?.slice(0, 5).join("; ") ??
    result.validationErrors?.slice(0, 5).join("; ") ??
    "Unknown validation error";

  throw new Error(
    `Schema validation failed after ${result.attemptsUsed} attempts: ${detail}`
  );
}

/**
 * Generate a vibe_schema_v1 document from a natural language prompt.
 */
export async function generateSchemaFromIntent(
  request: VibeIntentRequest
): Promise<VibeGenerationResult> {
  const result = await generateSchemaWithRetry(request);

  if (result.success && result.schema) {
    return {
      success: true,
      schema: result.schema as VibeSchemaV1,
      rawJson: JSON.stringify(result.schema, null, 2),
      tokensUsed: result.tokensUsed,
      metadata: {
        attemptsUsed: result.attemptsUsed,
        selfCorrected: result.selfCorrected,
        attemptTimingsMs: result.attemptTimingsMs,
      },
    };
  }

  return {
    success: false,
    errors: [
      `Schema validation failed after ${result.attemptsUsed} attempts`,
      ...(result.semanticErrors ?? result.validationErrors ?? []).slice(0, 5),
    ],
    metadata: {
      attemptsUsed: result.attemptsUsed,
      selfCorrected: false,
      attemptTimingsMs: result.attemptTimingsMs,
      validationErrors: result.validationErrors,
      lastAttempt: result.lastAttempt,
    },
  };
}
