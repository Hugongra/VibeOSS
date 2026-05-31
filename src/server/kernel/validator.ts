/**
 * Kernel validation entry — re-exports the shared Deterministic Compiler Shell.
 * @deprecated Prefer importing from `@shared/schemas` in new code.
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
  validateVibeSchema,
  validateVibeSchemaFromString,
} from "@shared/schemas";
