/**
 * Vibe-JSON Zod schemas — Deterministic Compiler Shell
 * @module @shared/schemas
 */

export {
  vibeFieldTypeSchema,
  vibeFieldValidationSchema,
  vibeRelationSchema,
  vibeFieldDefinitionSchema,
  vibeEntitySchema,
  vibeFilterSchema,
  vibeSortingSchema,
  vibeViewLayoutSchema,
  vibeActionTypeSchema,
  vibeNotificationSchema,
  vibeTransitionSchema,
  vibeActionSchema,
  vibeViewSchema,
  vibeAutomationTriggerSchema,
  vibeAutomationConditionSchema,
  vibeAutomationSchema,
  vibeNavigationSchema,
  vibeModuleSchema,
  type VibeModuleZod,
} from "./vibe-schema-v1";

export {
  validateVibeSchema,
  validateVibeSchemaFromString,
} from "./validate";
