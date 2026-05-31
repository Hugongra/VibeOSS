/**
 * VibeOS Kernel — Core Type Definitions (vibe_schema_v1)
 *
 * These types define the "Vibe-JSON" standard that powers the entire platform.
 * Every entity, field, view, action, and automation in the system is described
 * by metadata conforming to these interfaces.
 *
 * The root envelope is `VibeSchemaV1` — the single source of truth that the
 * kernel parses, the AI generates, and the renderer consumes.
 */

/* ------------------------------------------------------------------ */
/*  Field System                                                      */
/* ------------------------------------------------------------------ */

/** Supported field types in the Vibe schema */
export type VibeFieldType =
  | "text"
  | "number"
  | "boolean"
  | "date"
  | "datetime"
  | "email"
  | "url"
  | "phone"
  | "currency"
  | "percentage"
  | "select"
  | "multi-select"
  | "relation"
  | "file"
  | "rich-text"
  | "json";

/**
 * Zod-compatible validation rules embedded in field metadata.
 * The kernel compiles these into runtime Zod schemas for record validation.
 */
export interface VibeFieldValidation {
  min?: number;
  max?: number;
  min_length?: number;
  max_length?: number;
  pattern?: string;
  message?: string;
}

/** Definition of a single field in an entity */
export interface VibeFieldDefinition {
  name: string;
  label: string;
  type: VibeFieldType;
  required: boolean;
  unique?: boolean;
  defaultValue?: unknown;
  description?: string;
  options?: string[];
  relation?: {
    entity: string;
    field: string;
    type: "one-to-one" | "one-to-many" | "many-to-many";
  };
  validation?: VibeFieldValidation;
}

/* ------------------------------------------------------------------ */
/*  Entity System                                                     */
/* ------------------------------------------------------------------ */

/** A complete entity (object) definition */
export interface VibeEntitySchema {
  name: string;
  label: string;
  pluralLabel: string;
  description: string;
  icon?: string;
  fields: VibeFieldDefinition[];
  timestamps: boolean;
  softDelete: boolean;
}

/* ------------------------------------------------------------------ */
/*  View / UI System                                                  */
/* ------------------------------------------------------------------ */

/** UI component types supported by the Server-Driven UI renderer */
export type VibeUIComponentType =
  | "table"
  | "form"
  | "detail"
  | "card"
  | "list"
  | "kanban"
  | "chart"
  | "stat"
  | "custom";

/** Layout definition for a view */
export interface VibeViewLayout {
  type: VibeUIComponentType;
  columns?: string[];
  filters?: Array<{
    field: string;
    operator: "eq" | "neq" | "gt" | "lt" | "gte" | "lte" | "contains" | "in";
    value?: unknown;
  }>;
  sorting?: Array<{
    field: string;
    direction: "asc" | "desc";
  }>;
  groupBy?: string;
  pageSize?: number;
}

/** A view definition for an entity */
export interface VibeViewSchema {
  name: string;
  label: string;
  entity: string;
  layout: VibeViewLayout;
  actions?: VibeActionSchema[];
}

/* ------------------------------------------------------------------ */
/*  Action System                                                     */
/* ------------------------------------------------------------------ */

/** Action types available in the UI and automation layer */
export type VibeActionType =
  | "create"
  | "update"
  | "delete"
  | "navigate"
  | "webhook"
  | "notify"
  | "approve"
  | "reject"
  | "export"
  | "import"
  | "transition"
  | "custom";

/** An action that can be triggered from the UI or by an automation */
export interface VibeActionSchema {
  name: string;
  label: string;
  type: VibeActionType;
  icon?: string;
  confirmation?: string;
  targetEntity?: string;
  targetUrl?: string;
  /** For "transition" actions: the field and target value to set */
  transition?: {
    field: string;
    to: string;
  };
  /** For "notify" actions: channel and template */
  notification?: {
    channel: "email" | "slack" | "teams" | "in_app";
    template?: string;
    recipients?: string;
  };
}

/* ------------------------------------------------------------------ */
/*  Automation System                                                 */
/* ------------------------------------------------------------------ */

/** When an automation fires */
export type VibeAutomationTrigger =
  | "on_create"
  | "on_update"
  | "on_delete"
  | "on_field_change"
  | "on_schedule"
  | "manual";

/** A single automation rule */
export interface VibeAutomationSchema {
  name: string;
  label: string;
  entity: string;
  trigger: VibeAutomationTrigger;
  /** Optional: only fire when this field changes (for on_field_change) */
  watchField?: string;
  /** Condition expressed as a filter — automation runs only if record matches */
  condition?: {
    field: string;
    operator: "eq" | "neq" | "gt" | "lt" | "gte" | "lte" | "contains" | "in";
    value: unknown;
  };
  /** Actions to execute when the automation fires */
  actions: VibeActionSchema[];
}

/* ------------------------------------------------------------------ */
/*  Navigation                                                        */
/* ------------------------------------------------------------------ */

export interface VibeNavigationItem {
  label: string;
  icon?: string;
  view: string;
}

/* ------------------------------------------------------------------ */
/*  Top-level: vibe_schema_v1                                         */
/* ------------------------------------------------------------------ */

/**
 * The root envelope — `vibe_schema_v1`.
 * This is the single document that fully defines a business module:
 * data model, UI, actions, automations, and navigation.
 */
export interface VibeSchemaV1 {
  version: string;
  module: string;
  description: string;
  entities: VibeEntitySchema[];
  views: VibeViewSchema[];
  /** Module-level actions (CRUD, workflow, integrations) */
  actions: VibeActionSchema[];
  /** Event-driven rules: trigger → optional condition → actions */
  automations: VibeAutomationSchema[];
  navigation?: VibeNavigationItem[];
}

/**
 * @deprecated Use `VibeSchemaV1` instead. Kept for backward compatibility.
 */
export type VibeModuleSchema = VibeSchemaV1;

/* ------------------------------------------------------------------ */
/*  Parse / Generation results                                        */
/* ------------------------------------------------------------------ */

/** Result of parsing / validating a Vibe schema */
export interface VibeParseResult {
  success: boolean;
  schema?: VibeSchemaV1;
  errors?: Array<{
    path: string;
    message: string;
  }>;
}

/** Intent request from the user (natural language) */
export interface VibeIntentRequest {
  prompt: string;
  context?: {
    existingEntities?: string[];
    currentModule?: string;
    existingSchema?: VibeSchemaV1;
  };
}

/** A single message in a builder chat session */
export interface VibeChatMessage {
  role: "user" | "assistant";
  text: string;
  createdAt: string;
}

/** Chat session summary for the sidebar */
export interface VibeChatSummary {
  chatId: string;
  title: string;
  moduleId: string | null;
  messageCount: number;
  updatedAt: string;
  createdAt: string;
}

/** Response from the schema generator */
export interface VibeGenerationResult {
  success: boolean;
  schema?: VibeSchemaV1;
  rawJson?: string;
  tokensUsed?: number;
  errors?: string[];
  metadata?: {
    attemptsUsed: number;
    selfCorrected: boolean;
    attemptTimingsMs?: number[];
    validationErrors?: string[];
    lastAttempt?: unknown;
  };
}
