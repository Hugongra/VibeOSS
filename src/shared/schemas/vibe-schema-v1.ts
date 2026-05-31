/**
 * Vibe-JSON v1.0 — Deterministic Compiler Shell (Zod)
 *
 * Validates LLM-generated metadata before it reaches persistence or the runtime.
 * Four required blocks: entities, views, actions, automations.
 */

import { z } from "zod";

/* ------------------------------------------------------------------ */
/*  Primitives                                                        */
/* ------------------------------------------------------------------ */

const snakeCaseRegex = /^[a-z][a-z0-9_]*$/;
const kebabCaseRegex = /^[a-z][a-z0-9_-]*$/;
const semverRegex = /^\d+\.\d+\.\d+$/;

const CRUD_ACTION_TYPES = ["create", "update", "delete"] as const;

/* ------------------------------------------------------------------ */
/*  Fields — types, constraints, relations                            */
/* ------------------------------------------------------------------ */

/** Canonical field types (maps thesis labels String→text, Enum→select, etc.) */
export const vibeFieldTypeSchema = z.enum([
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
]);

export const vibeFieldValidationSchema = z.object({
  min: z.number().optional(),
  max: z.number().optional(),
  min_length: z.number().int().nonnegative().optional(),
  max_length: z.number().int().positive().optional(),
  pattern: z.string().optional(),
  message: z.string().optional(),
});

export const vibeRelationSchema = z.object({
  entity: z.string().min(1),
  field: z.string().min(1),
  type: z.enum(["one-to-one", "one-to-many", "many-to-many"]),
});

export const vibeFieldDefinitionSchema = z
  .object({
    name: z.string().min(1).regex(snakeCaseRegex, "Field name must be snake_case"),
    label: z.string().min(1),
    type: vibeFieldTypeSchema,
    required: z.boolean(),
    unique: z.boolean().optional(),
    defaultValue: z.unknown().optional(),
    description: z.string().optional(),
    options: z.array(z.string()).optional(),
    relation: vibeRelationSchema.optional(),
    validation: vibeFieldValidationSchema.optional(),
  })
  .superRefine((field, ctx) => {
    if (field.type === "select" || field.type === "multi-select") {
      if (!field.options || field.options.length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["options"],
          message: `${field.type} fields must include a non-empty options array`,
        });
      }
    }
    if (field.type === "relation" && !field.relation) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["relation"],
        message: "relation fields must include relation metadata (entity, field, type)",
      });
    }
  });

/* ------------------------------------------------------------------ */
/*  Entities                                                          */
/* ------------------------------------------------------------------ */

export const vibeEntitySchema = z.object({
  name: z.string().min(1).regex(snakeCaseRegex, "Entity name must be snake_case"),
  label: z.string().min(1),
  pluralLabel: z.string().min(1),
  description: z.string(),
  icon: z.string().optional(),
  fields: z.array(vibeFieldDefinitionSchema).min(1),
  timestamps: z.boolean(),
  softDelete: z.boolean(),
});

/* ------------------------------------------------------------------ */
/*  Views — layout types (table, form, detail, …)                     */
/* ------------------------------------------------------------------ */

export const vibeFilterSchema = z.object({
  field: z.string().min(1),
  operator: z.enum(["eq", "neq", "gt", "lt", "gte", "lte", "contains", "in"]),
  value: z.unknown().optional(),
});

export const vibeSortingSchema = z.object({
  field: z.string().min(1),
  direction: z.enum(["asc", "desc"]),
});

export const vibeViewLayoutSchema = z.object({
  type: z.enum([
    "table",
    "form",
    "detail",
    "card",
    "list",
    "kanban",
    "chart",
    "stat",
    "custom",
  ]),
  columns: z.array(z.string()).optional(),
  filters: z.array(vibeFilterSchema).optional(),
  sorting: z.array(vibeSortingSchema).optional(),
  groupBy: z.string().optional(),
  pageSize: z.number().int().positive().optional(),
});

/* ------------------------------------------------------------------ */
/*  Actions — CRUD and workflow operations                            */
/* ------------------------------------------------------------------ */

export const vibeActionTypeSchema = z.enum([
  "create",
  "update",
  "delete",
  "navigate",
  "webhook",
  "notify",
  "approve",
  "reject",
  "export",
  "import",
  "transition",
  "custom",
]);

export const vibeNotificationSchema = z.object({
  channel: z.enum(["email", "slack", "teams", "in_app"]),
  template: z.string().optional(),
  recipients: z.string().optional(),
});

export const vibeTransitionSchema = z.object({
  field: z.string().min(1),
  to: z.string().min(1),
});

export const vibeActionSchema = z
  .object({
    name: z.string().min(1),
    label: z.string().min(1),
    type: vibeActionTypeSchema,
    icon: z.string().optional(),
    confirmation: z.string().optional(),
    targetEntity: z.string().optional(),
    targetUrl: z.string().optional(),
    transition: vibeTransitionSchema.optional(),
    notification: vibeNotificationSchema.optional(),
  })
  .superRefine((action, ctx) => {
    if (action.type === "transition" && !action.transition) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["transition"],
        message: "transition actions require transition metadata",
      });
    }
    if (action.type === "notify" && !action.notification) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["notification"],
        message: "notify actions require notification metadata",
      });
    }
  });

export const vibeViewSchema = z.object({
  name: z.string().min(1),
  label: z.string().min(1),
  entity: z.string().min(1),
  layout: vibeViewLayoutSchema,
  actions: z.array(vibeActionSchema).optional(),
});

/* ------------------------------------------------------------------ */
/*  Automations — trigger, condition, actions                         */
/* ------------------------------------------------------------------ */

export const vibeAutomationTriggerSchema = z.enum([
  "on_create",
  "on_update",
  "on_delete",
  "on_field_change",
  "on_schedule",
  "manual",
]);

export const vibeAutomationConditionSchema = z.object({
  field: z.string().min(1),
  operator: z.enum(["eq", "neq", "gt", "lt", "gte", "lte", "contains", "in"]),
  value: z.unknown(),
});

export const vibeAutomationSchema = z
  .object({
    name: z.string().min(1),
    label: z.string().min(1),
    entity: z.string().min(1),
    trigger: vibeAutomationTriggerSchema,
    watchField: z.string().optional(),
    condition: vibeAutomationConditionSchema.optional(),
    actions: z.array(vibeActionSchema).min(1),
  })
  .superRefine((automation, ctx) => {
    if (automation.trigger === "on_field_change" && !automation.watchField) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["watchField"],
        message: "on_field_change automations require watchField",
      });
    }
  });

/* ------------------------------------------------------------------ */
/*  Navigation (optional)                                               */
/* ------------------------------------------------------------------ */

export const vibeNavigationSchema = z.object({
  label: z.string().min(1),
  icon: z.string().optional(),
  view: z.string().min(1),
});

/* ------------------------------------------------------------------ */
/*  Root: vibe_schema_v1                                              */
/* ------------------------------------------------------------------ */

export const vibeModuleSchema = z
  .object({
    version: z.string().regex(semverRegex, "Version must be semver"),
    module: z.string().min(1).regex(kebabCaseRegex, "Module name must be kebab-case"),
    description: z.string().min(1),
    entities: z.array(vibeEntitySchema).min(1),
    views: z.array(vibeViewSchema).min(1),
    actions: z.array(vibeActionSchema),
    automations: z.array(vibeAutomationSchema),
    navigation: z.array(vibeNavigationSchema).optional(),
  })
  .superRefine((module, ctx) => {
    const entityNames = new Set(module.entities.map((e) => e.name));
    const viewNames = new Set(module.views.map((v) => v.name));
    const fieldNamesByEntity = new Map(
      module.entities.map((e) => [e.name, new Set(e.fields.map((f) => f.name))])
    );

    for (const [i, view] of module.views.entries()) {
      if (!entityNames.has(view.entity)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["views", i, "entity"],
          message: `View references unknown entity "${view.entity}"`,
        });
      }
      if (view.layout.type === "kanban" && !view.layout.groupBy) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["views", i, "layout", "groupBy"],
          message: "kanban views require layout.groupBy",
        });
      }
      const fields = fieldNamesByEntity.get(view.entity);
      if (fields && view.layout.columns) {
        for (const col of view.layout.columns) {
          if (!fields.has(col)) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              path: ["views", i, "layout", "columns"],
              message: `Column "${col}" is not a field on entity "${view.entity}"`,
            });
          }
        }
      }
    }

    for (const [i, action] of module.actions.entries()) {
      if (
        (CRUD_ACTION_TYPES as readonly string[]).includes(action.type) &&
        !action.targetEntity
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["actions", i, "targetEntity"],
          message: `Module-level ${action.type} actions require targetEntity`,
        });
      }
      if (action.targetEntity && !entityNames.has(action.targetEntity)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["actions", i, "targetEntity"],
          message: `Action references unknown entity "${action.targetEntity}"`,
        });
      }
    }

    for (const [i, automation] of module.automations.entries()) {
      if (!entityNames.has(automation.entity)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["automations", i, "entity"],
          message: `Automation references unknown entity "${automation.entity}"`,
        });
      }
    }

    if (module.navigation) {
      for (const [i, nav] of module.navigation.entries()) {
        if (!viewNames.has(nav.view)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["navigation", i, "view"],
            message: `Navigation references unknown view "${nav.view}"`,
          });
        }
      }
    }
  });

export type VibeModuleZod = z.infer<typeof vibeModuleSchema>;
