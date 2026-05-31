/**
 * VibeOS Engine — Automation Engine
 *
 * Evaluates automation rules when entity events occur (create, update, delete).
 * For each matching automation: checks the trigger, evaluates the condition,
 * and delegates to the Action Executor.
 *
 * Flow: Event → Find matching automations → Evaluate conditions → Execute actions
 */

import type { VibeAutomationSchema } from "@shared/types";
import type { RuntimeModule } from "../kernel/vibe-parser";
import { getAutomationsForTrigger } from "../kernel/vibe-parser";
import { executeActions, type ActionContext, type ActionExecutionResult } from "./action-executor";

/** The event that triggered the automation check */
export interface AutomationEvent {
  type: "create" | "update" | "delete";
  entityName: string;
  record: Record<string, unknown>;
  /** For update events: the record before the change */
  previousRecord?: Record<string, unknown>;
  /** For field_change: which fields changed */
  changedFields?: string[];
}

/** Result of processing all automations for an event */
export interface AutomationRunResult {
  event: string;
  entity: string;
  automationsEvaluated: number;
  automationsFired: number;
  results: Array<{
    automation: string;
    fired: boolean;
    reason?: string;
    actionResults?: ActionExecutionResult[];
  }>;
}

/**
 * Map event type to automation triggers that should be checked.
 */
function getTriggerTypes(eventType: AutomationEvent["type"]): string[] {
  switch (eventType) {
    case "create":
      return ["on_create"];
    case "update":
      return ["on_update", "on_field_change"];
    case "delete":
      return ["on_delete"];
  }
}

/**
 * Evaluate whether an automation's condition matches the current record.
 */
function evaluateCondition(
  automation: VibeAutomationSchema,
  record: Record<string, unknown>
): boolean {
  if (!automation.condition) return true;

  const { field, operator, value } = automation.condition;
  const fieldValue = record[field];

  switch (operator) {
    case "eq":
      return fieldValue === value;
    case "neq":
      return fieldValue !== value;
    case "gt":
      return typeof fieldValue === "number" && typeof value === "number" && fieldValue > value;
    case "lt":
      return typeof fieldValue === "number" && typeof value === "number" && fieldValue < value;
    case "gte":
      return typeof fieldValue === "number" && typeof value === "number" && fieldValue >= value;
    case "lte":
      return typeof fieldValue === "number" && typeof value === "number" && fieldValue <= value;
    case "contains":
      return typeof fieldValue === "string" && typeof value === "string" && fieldValue.includes(value);
    case "in":
      return Array.isArray(value) && value.includes(fieldValue);
    default:
      return false;
  }
}

/**
 * Check if a field-change automation should fire based on changed fields.
 */
function shouldFireFieldChange(
  automation: VibeAutomationSchema,
  event: AutomationEvent
): boolean {
  if (automation.trigger !== "on_field_change") return true;
  if (!automation.watchField) return true;
  if (!event.changedFields) return false;

  return event.changedFields.includes(automation.watchField);
}

/**
 * Process an entity event through all matching automations in a runtime module.
 */
export async function processAutomations(
  runtime: RuntimeModule,
  event: AutomationEvent
): Promise<AutomationRunResult> {
  const triggerTypes = getTriggerTypes(event.type);
  const allAutomations: VibeAutomationSchema[] = [];

  for (const trigger of triggerTypes) {
    allAutomations.push(...getAutomationsForTrigger(runtime, event.entityName, trigger));
  }

  const result: AutomationRunResult = {
    event: event.type,
    entity: event.entityName,
    automationsEvaluated: allAutomations.length,
    automationsFired: 0,
    results: [],
  };

  for (const automation of allAutomations) {
    if (!shouldFireFieldChange(automation, event)) {
      result.results.push({
        automation: automation.name,
        fired: false,
        reason: `watchField "${automation.watchField}" not in changed fields`,
      });
      continue;
    }

    if (!evaluateCondition(automation, event.record)) {
      result.results.push({
        automation: automation.name,
        fired: false,
        reason: "Condition not met",
      });
      continue;
    }

    const ctx: ActionContext = {
      record: event.record,
      entityName: event.entityName,
    };

    const actionResults = await executeActions(automation.actions, ctx);

    result.automationsFired++;
    result.results.push({
      automation: automation.name,
      fired: true,
      actionResults,
    });
  }

  return result;
}
