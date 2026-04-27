/**
 * @vibeoss/core — Public SDK Barrel Export
 *
 * Everything external consumers and internal modules need,
 * exposed from a single import path.
 *
 * Usage:
 *   import { parseVibeSchema, executeAction, providerRegistry } from "@/lib";
 */

/* Kernel ----------------------------------------------------------- */
export type {
  VibeFieldType,
  VibeFieldValidation,
  VibeFieldDefinition,
  VibeEntitySchema,
  VibeUIComponentType,
  VibeViewLayout,
  VibeViewSchema,
  VibeActionType,
  VibeActionSchema,
  VibeAutomationTrigger,
  VibeAutomationSchema,
  VibeNavigationItem,
  VibeSchemaV1,
  VibeModuleSchema,
  VibeParseResult,
  VibeIntentRequest,
  VibeGenerationResult,
} from "./kernel/types";

export {
  parseVibeSchema,
  parseVibeSchemaFromString,
  extractEntityNames,
  resolveRelations,
  getAutomationsForTrigger,
  type RuntimeEntity,
  type RuntimeModule,
} from "./kernel/vibe-parser";

export {
  validateVibeSchema,
  validateVibeSchemaFromString,
} from "./kernel/validator";

export { generateSchemaFromIntent } from "./kernel/schema-generator";

/* Engine ----------------------------------------------------------- */
export {
  executeAction,
  executeActions,
  type ActionContext,
  type ActionExecutionResult,
} from "./engine/action-executor";

export {
  processAutomations,
  type AutomationEvent,
  type AutomationRunResult,
} from "./engine/automation-engine";

/* Providers -------------------------------------------------------- */
export type {
  VibeProvider,
  ProviderPayload,
  ProviderResult,
} from "./providers/types";

export { providerRegistry } from "./providers/registry";
export { EmailProvider } from "./providers/email";
export { WebhookProvider } from "./providers/webhook";
export { SlackProvider } from "./providers/slack";
