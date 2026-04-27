/**
 * VibeOS Engine — Action Executor
 *
 * The runtime engine that takes a VibeActionSchema and actually executes it.
 * This is the bridge between metadata (what should happen) and reality
 * (making it happen via providers, DB operations, etc.).
 *
 * Supports: CRUD, transitions, notifications, webhooks, approvals, exports.
 */

import type { VibeActionSchema } from "@/lib/kernel/types";
import type { ProviderResult } from "@/lib/providers/types";
import { providerRegistry } from "@/lib/providers/registry";

/** Context passed to the executor — the record being acted upon */
export interface ActionContext {
  record?: Record<string, unknown>;
  userId?: string;
  orgId?: string;
  moduleId?: string;
  entityName?: string;
}

/** Result of executing a single action */
export interface ActionExecutionResult {
  action: string;
  type: string;
  success: boolean;
  message?: string;
  providerResult?: ProviderResult;
  error?: string;
}

/**
 * Interpolate mustache-style templates: "Hello {{full_name}}" → "Hello John"
 */
function interpolate(template: string, data: Record<string, unknown>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => {
    const value = data[key];
    return value !== undefined && value !== null ? String(value) : "";
  });
}

/**
 * Execute a single action in the context of a record.
 */
export async function executeAction(
  action: VibeActionSchema,
  ctx: ActionContext
): Promise<ActionExecutionResult> {
  const record = ctx.record ?? {};

  try {
    switch (action.type) {
      /* -------------------------------------------------------------- */
      /*  Notifications (email, slack, teams, in_app)                   */
      /* -------------------------------------------------------------- */
      case "notify": {
        const channel = action.notification?.channel ?? "email";
        const provider = providerRegistry.resolveForChannel(channel);

        if (!provider) {
          return {
            action: action.name,
            type: action.type,
            success: false,
            error: `No provider registered for channel "${channel}"`,
          };
        }

        if (!provider.isConfigured()) {
          return {
            action: action.name,
            type: action.type,
            success: false,
            error: `Provider "${provider.name}" is not configured. Check env vars.`,
          };
        }

        const template = action.notification?.template ?? action.label;
        const body = interpolate(template, record);
        const to = action.notification?.recipients
          ? interpolate(action.notification.recipients, record)
          : undefined;

        const providerResult = await provider.execute({ body, to, record });

        return {
          action: action.name,
          type: action.type,
          success: providerResult.success,
          message: providerResult.message,
          providerResult,
          error: providerResult.error,
        };
      }

      /* -------------------------------------------------------------- */
      /*  State transitions                                             */
      /* -------------------------------------------------------------- */
      case "transition": {
        if (!action.transition) {
          return {
            action: action.name,
            type: action.type,
            success: false,
            error: "Transition action is missing 'transition' property.",
          };
        }

        const { field, to } = action.transition;
        const previousValue = record[field];
        record[field] = to;

        return {
          action: action.name,
          type: action.type,
          success: true,
          message: `Transitioned ${field}: "${String(previousValue)}" → "${to}"`,
        };
      }

      /* -------------------------------------------------------------- */
      /*  Approvals / Rejections                                        */
      /* -------------------------------------------------------------- */
      case "approve":
      case "reject": {
        const statusField = "status";
        const newStatus = action.type === "approve" ? "approved" : "rejected";
        record[statusField] = newStatus;

        return {
          action: action.name,
          type: action.type,
          success: true,
          message: `Record ${action.type}d — status set to "${newStatus}"`,
        };
      }

      /* -------------------------------------------------------------- */
      /*  Webhooks                                                      */
      /* -------------------------------------------------------------- */
      case "webhook": {
        const provider = providerRegistry.get("webhook");
        if (!provider) {
          return { action: action.name, type: action.type, success: false, error: "Webhook provider not found" };
        }

        const providerResult = await provider.execute({
          url: action.targetUrl,
          data: record,
        });

        return {
          action: action.name,
          type: action.type,
          success: providerResult.success,
          message: providerResult.message,
          providerResult,
          error: providerResult.error,
        };
      }

      /* -------------------------------------------------------------- */
      /*  CRUD / Navigation / Export / Import (stubs)                   */
      /* -------------------------------------------------------------- */
      case "create":
      case "update":
      case "delete":
        return {
          action: action.name,
          type: action.type,
          success: true,
          message: `${action.type} operation queued for entity "${action.targetEntity ?? ctx.entityName ?? "unknown"}"`,
        };

      case "navigate":
        return {
          action: action.name,
          type: action.type,
          success: true,
          message: `Navigate to "${action.targetUrl ?? action.targetEntity ?? "/"}"`,
        };

      case "export":
      case "import":
        return {
          action: action.name,
          type: action.type,
          success: true,
          message: `${action.type} operation initiated`,
        };

      case "custom":
      default:
        return {
          action: action.name,
          type: action.type,
          success: true,
          message: `Custom action "${action.name}" acknowledged`,
        };
    }
  } catch (error) {
    return {
      action: action.name,
      type: action.type,
      success: false,
      error: error instanceof Error ? error.message : "Unknown execution error",
    };
  }
}

/**
 * Execute multiple actions sequentially, collecting all results.
 */
export async function executeActions(
  actions: VibeActionSchema[],
  ctx: ActionContext
): Promise<ActionExecutionResult[]> {
  const results: ActionExecutionResult[] = [];

  for (const action of actions) {
    const result = await executeAction(action, ctx);
    results.push(result);
  }

  return results;
}
