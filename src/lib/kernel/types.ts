/**
 * VibeOS Kernel — Core Type Definitions
 *
 * These types define the "Vibe-JSON" standard that powers the entire platform.
 * Every entity, field, view, and action in the system is described by metadata
 * conforming to these interfaces.
 */

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

/** Definition of a single field in an entity */
export interface VibeFieldDefinition {
  name: string;
  label: string;
  type: VibeFieldType;
  required: boolean;
  unique?: boolean;
  defaultValue?: unknown;
  description?: string;
  options?: string[]; // For select / multi-select
  relation?: {
    entity: string;
    field: string;
    type: "one-to-one" | "one-to-many" | "many-to-many";
  };
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
    message?: string;
  };
}

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

/** An action that can be triggered from the UI */
export interface VibeActionSchema {
  name: string;
  label: string;
  type: "create" | "update" | "delete" | "navigate" | "webhook" | "custom";
  icon?: string;
  confirmation?: string;
  targetEntity?: string;
  targetUrl?: string;
}

/** The top-level Vibe-JSON schema that defines an entire module */
export interface VibeModuleSchema {
  version: string;
  module: string;
  description: string;
  entities: VibeEntitySchema[];
  views: VibeViewSchema[];
  navigation?: Array<{
    label: string;
    icon?: string;
    view: string;
  }>;
}

/** Result of parsing / validating a Vibe schema */
export interface VibeParseResult {
  success: boolean;
  schema?: VibeModuleSchema;
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
  };
}

/** Response from the schema generator */
export interface VibeGenerationResult {
  success: boolean;
  schema?: VibeModuleSchema;
  rawJson?: string;
  tokensUsed?: number;
  errors?: string[];
}
