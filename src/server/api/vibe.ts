/**
 * VibeOS — Dynamic API Handler
 *
 * POST /api/vibe — intent-based entry point for generate, query, mutate, validate.
 *
 * Example flow (curl):
 *
 * 1) Generate + persist schema (returns moduleId):
 *    curl -X POST http://localhost:3001/api/vibe \
 *      -H "Content-Type: application/json" \
 *      -d '{"intent":"generate","payload":{"prompt":"build a simple CRM with contacts"}}'
 *
 * 2) Create a record:
 *    curl -X POST http://localhost:3001/api/vibe \
 *      -H "Content-Type: application/json" \
 *      -d '{"intent":"mutate","payload":{"moduleId":"<uuid>","entity":"contact","operation":"create","data":{"name":"Alice","email":"alice@example.com"}}}'
 *
 * 3) Query records:
 *    curl -X POST http://localhost:3001/api/vibe \
 *      -H "Content-Type: application/json" \
 *      -d '{"intent":"query","payload":{"moduleId":"<uuid>","entity":"contact","filter":{"name":"Alice"},"limit":50}}'
 */

import { z } from "zod";
import { generateSchemaFromIntent } from "../kernel/schema-generator";
import { validateVibeSchema, vibeModuleSchema } from "@shared/schemas";
import type { VibeChatMessage, VibeSchemaV1 } from "@shared/types";
import {
  appendVibeChatMessages,
  createVibeChat,
  createVibeRecord,
  deleteVibeRecord,
  getVibeChat,
  listVibeChats,
  loadVibeModule,
  persistVibeModule,
  queryVibeRecords,
  sanitizeDbError,
  updateVibeModule,
  updateVibeRecord,
} from "../database/vibe-storage";
import {
  rejectUnknownFields,
  validateEntityRecord,
} from "../kernel/record-validator";

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

interface ApiResponse {
  status: number;
  body: Record<string, unknown>;
}

/* ------------------------------------------------------------------ */
/*  Request Validation                                                */
/* ------------------------------------------------------------------ */

const intentRequestSchema = z.object({
  intent: z.enum(["generate", "query", "mutate", "validate", "list", "getChat"]),
  payload: z.record(z.unknown()),
});

const mutatePayloadSchema = z.object({
  moduleId: z.string().uuid(),
  entity: z.string().min(1),
  operation: z.enum(["create", "update", "delete"]),
  data: z.record(z.unknown()).optional(),
  recordId: z.string().uuid().optional(),
});

const queryPayloadSchema = z.object({
  moduleId: z.string().uuid(),
  entity: z.string().min(1),
  filter: z.record(z.unknown()).optional(),
  limit: z.number().int().positive().max(200).optional(),
  offset: z.number().int().nonnegative().optional(),
});

type IntentType = z.infer<typeof intentRequestSchema>["intent"];

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

type IntentHandler = (payload: Record<string, unknown>) => Promise<ApiResponse>;

function logVeefTelemetry(args: {
  intent: string;
  tGenMs: number;
  tValMs: number;
  tDepMs: number | null;
  ok: boolean;
  tokensUsed?: number;
  attemptsUsed?: number;
  selfCorrected?: boolean;
}) {
  const dep =
    args.tDepMs === null ? "skipped (validation failed)" : `${args.tDepMs.toFixed(2)} ms`;
  const tok = args.tokensUsed !== undefined ? String(args.tokensUsed) : "n/a";
  const attempts =
    args.attemptsUsed !== undefined
      ? `${args.attemptsUsed}${args.selfCorrected ? " (self-corrected)" : ""}`
      : "n/a";
  console.log(
    [
      "[VEEF Telemetry]",
      `intent=${args.intent}`,
      `ok=${args.ok}`,
      "",
      `  t_gen (Vercel AI SDK):     ${args.tGenMs.toFixed(2)} ms`,
      `  t_val (Zod safeParse):     ${args.tValMs.toFixed(2)} ms`,
      `  t_dep (DB persist):        ${dep}`,
      `  tokens_used:                 ${tok}`,
      `  self_correction_attempts:    ${attempts}`,
    ].join("\n")
  );
}

function findEntityInModule(schema: VibeSchemaV1, entityName: string) {
  return schema.entities.find((e) => e.name === entityName) ?? null;
}

async function loadModuleWithSchema(moduleId: string) {
  const row = await loadVibeModule(moduleId);
  if (!row) return null;

  const parsed = validateVibeSchema(row.schema);
  if (!parsed.success || !parsed.schema) {
    return { row, schema: null, parseErrors: parsed.errors };
  }

  return { row, schema: parsed.schema, parseErrors: null };
}

function parseStoredChatMessages(raw: unknown): VibeChatMessage[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter(
    (m): m is VibeChatMessage =>
      typeof m === "object" &&
      m !== null &&
      (m.role === "user" || m.role === "assistant") &&
      typeof m.text === "string"
  );
}

function buildAssistantMessage(isModification: boolean, moduleName: string): string {
  return isModification
    ? `Updated "${moduleName}" based on your request. Check the preview panel for changes.`
    : `Created "${moduleName}". You can keep chatting to add or change features.`;
}

/* ------------------------------------------------------------------ */
/*  Intent Handlers                                                   */
/* ------------------------------------------------------------------ */

const handlers: Record<IntentType, IntentHandler> = {
  async generate(payload) {
    const prompt = payload.prompt;
    if (typeof prompt !== "string" || prompt.trim().length === 0) {
      return {
        status: 400,
        body: { error: "A non-empty 'prompt' string is required for generation." },
      };
    }

    const chatId = typeof payload.chatId === "string" ? payload.chatId : undefined;
    const existingModuleId =
      typeof payload.moduleId === "string" ? payload.moduleId : undefined;

    let existingSchema: VibeSchemaV1 | undefined;
    if (payload.existingSchema && typeof payload.existingSchema === "object") {
      existingSchema = payload.existingSchema as VibeSchemaV1;
    } else if (existingModuleId) {
      const loaded = await loadModuleWithSchema(existingModuleId);
      existingSchema = loaded?.schema ?? undefined;
    }

    const isModification = Boolean(existingSchema);

    const request = {
      prompt,
      context: existingSchema
        ? {
            existingEntities: existingSchema.entities.map((e) => e.name),
            existingSchema,
            currentModule: existingSchema.module,
          }
        : Array.isArray(payload.existingEntities)
          ? { existingEntities: payload.existingEntities as string[] }
          : undefined,
    };

    let tGenMs = 0;
    let tValMs = 0;
    let tDepMs: number | null = null;
    let tokensUsed: number | undefined;
    const tGenStart = performance.now();

    try {
      const genResult = await generateSchemaFromIntent(request);
      tGenMs = performance.now() - tGenStart;
      tokensUsed = genResult.tokensUsed;

      if (!genResult.success || !genResult.schema) {
        logVeefTelemetry({
          intent: "generate",
          tGenMs,
          tValMs: 0,
          tDepMs: null,
          ok: false,
          tokensUsed,
          attemptsUsed: genResult.metadata?.attemptsUsed,
          selfCorrected: genResult.metadata?.selfCorrected,
        });
        return {
          status: 422,
          body: {
            success: false,
            error: "Schema validation failed after 3 attempts",
            details: genResult.errors ?? ["Unknown error"],
            metadata: {
              attemptsUsed: genResult.metadata?.attemptsUsed ?? 0,
              selfCorrected: genResult.metadata?.selfCorrected ?? false,
              attemptTimingsMs: genResult.metadata?.attemptTimingsMs,
              validationErrors: genResult.metadata?.validationErrors ?? genResult.errors,
              lastAttempt: genResult.metadata?.lastAttempt,
            },
          },
        };
      }

      const tValStart = performance.now();
      const zodResult = vibeModuleSchema.safeParse(genResult.schema);
      tValMs = performance.now() - tValStart;

      if (!zodResult.success) {
        const errors = zodResult.error.issues.map(
          (issue) => `${issue.path.join(".")}: ${issue.message}`
        );
        logVeefTelemetry({
          intent: "generate",
          tGenMs,
          tValMs,
          tDepMs: null,
          ok: false,
          tokensUsed,
          attemptsUsed: genResult.metadata?.attemptsUsed,
        });
        return {
          status: 422,
          body: {
            success: false,
            error: "Schema generation failed",
            details: errors,
            metadata: genResult.metadata,
          },
        };
      }

      const schema = zodResult.data as VibeSchemaV1;
      const tDepStart = performance.now();
      let moduleId: string;
      let orgId: string;

      try {
        if (existingModuleId && isModification) {
          await updateVibeModule({ moduleId: existingModuleId, schema });
          moduleId = existingModuleId;
          const loaded = await loadVibeModule(moduleId);
          orgId = loaded!.orgId;
        } else {
          const persisted = await persistVibeModule({ schema });
          moduleId = persisted.moduleId;
          orgId = persisted.orgId;
        }
      } catch (dbError) {
        tDepMs = performance.now() - tDepStart;
        logVeefTelemetry({
          intent: "generate",
          tGenMs,
          tValMs,
          tDepMs,
          ok: false,
          tokensUsed,
          attemptsUsed: genResult.metadata?.attemptsUsed,
        });
        return {
          status: 500,
          body: { error: sanitizeDbError(dbError) },
        };
      }

      const now = new Date().toISOString();
      const userMessage: VibeChatMessage = {
        role: "user",
        text: prompt.trim(),
        createdAt: now,
      };
      const assistantMessage: VibeChatMessage = {
        role: "assistant",
        text: buildAssistantMessage(isModification, schema.module),
        createdAt: now,
      };

      let finalChatId = chatId;
      try {
        if (chatId) {
          await appendVibeChatMessages({
            chatId,
            messages: [userMessage, assistantMessage],
            moduleId,
          });
        } else {
          const chat = await createVibeChat({
            title: prompt.trim().slice(0, 500),
            messages: [userMessage, assistantMessage],
            moduleId,
          });
          finalChatId = chat.id;
        }
      } catch (dbError) {
        tDepMs = performance.now() - tDepStart;
        return {
          status: 500,
          body: { error: sanitizeDbError(dbError) },
        };
      }

      tDepMs = performance.now() - tDepStart;

      logVeefTelemetry({
        intent: "generate",
        tGenMs,
        tValMs,
        tDepMs,
        ok: true,
        tokensUsed,
        attemptsUsed: genResult.metadata?.attemptsUsed,
        selfCorrected: genResult.metadata?.selfCorrected,
      });

      return {
        status: 200,
        body: {
          success: true,
          schema,
          moduleId,
          orgId,
          chatId: finalChatId,
          modified: isModification,
          tokensUsed,
          metadata: {
            attemptsUsed: genResult.metadata?.attemptsUsed ?? 1,
            selfCorrected: genResult.metadata?.selfCorrected ?? false,
            attemptTimingsMs: genResult.metadata?.attemptTimingsMs,
          },
        },
      };
    } catch (error) {
      tGenMs = performance.now() - tGenStart;
      const message =
        error instanceof Error ? error.message : "Unknown error during generation";
      logVeefTelemetry({
        intent: "generate",
        tGenMs,
        tValMs,
        tDepMs: null,
        ok: false,
        tokensUsed,
      });
      return {
        status: 422,
        body: { error: "Schema generation failed", details: [message] },
      };
    }
  },

  async list() {
    try {
      const rows = await listVibeChats();
      const chats = rows.map((row) => ({
        chatId: row.id,
        title: row.title,
        moduleId: row.moduleId,
        messageCount: parseStoredChatMessages(row.messages).length,
        updatedAt: row.updatedAt.toISOString(),
        createdAt: row.createdAt.toISOString(),
      }));

      return {
        status: 200,
        body: { success: true, chats },
      };
    } catch (error) {
      return { status: 500, body: { error: sanitizeDbError(error) } };
    }
  },

  async getChat(payload) {
    const chatId = payload.chatId;
    if (typeof chatId !== "string") {
      return {
        status: 400,
        body: { error: "A 'chatId' string is required." },
      };
    }

    try {
      const chat = await getVibeChat(chatId);
      if (!chat) {
        return { status: 404, body: { error: "Chat not found", chatId } };
      }

      let schema: VibeSchemaV1 | null = null;
      if (chat.moduleId) {
        const loaded = await loadModuleWithSchema(chat.moduleId);
        schema = loaded?.schema ?? null;
      }

      return {
        status: 200,
        body: {
          success: true,
          chatId: chat.id,
          title: chat.title,
          moduleId: chat.moduleId,
          messages: parseStoredChatMessages(chat.messages),
          schema,
          updatedAt: chat.updatedAt.toISOString(),
          createdAt: chat.createdAt.toISOString(),
        },
      };
    } catch (error) {
      return { status: 500, body: { error: sanitizeDbError(error) } };
    }
  },

  async validate(payload) {
    const schema = payload.schema;
    if (!schema || typeof schema !== "object") {
      return {
        status: 400,
        body: { error: "A 'schema' object is required for validation." },
      };
    }

    const result = validateVibeSchema(schema);
    return { status: 200, body: result as unknown as Record<string, unknown> };
  },

  async query(payload) {
    const parsed = queryPayloadSchema.safeParse(payload);
    if (!parsed.success) {
      return {
        status: 400,
        body: {
          error: "Invalid query payload",
          details: parsed.error.issues.map((i) => ({
            path: i.path.join("."),
            message: i.message,
          })),
        },
      };
    }

    const { moduleId, entity, filter, limit, offset } = parsed.data;

    try {
      const loaded = await loadModuleWithSchema(moduleId);
      if (!loaded) {
        return { status: 404, body: { error: "Module not found", moduleId } };
      }

      if (!loaded.schema) {
        return {
          status: 500,
          body: {
            error: "Stored module schema is invalid",
            details: loaded.parseErrors,
          },
        };
      }

      const entityDef = findEntityInModule(loaded.schema, entity);
      if (!entityDef) {
        return {
          status: 404,
          body: {
            error: "Entity not found in module",
            entity,
            moduleId,
            availableEntities: loaded.schema.entities.map((e) => e.name),
          },
        };
      }

      const result = await queryVibeRecords({
        moduleId,
        entityName: entity,
        filter,
        limit,
        offset,
      });

      return {
        status: 200,
        body: {
          success: true,
          moduleId,
          entity,
          ...result,
        },
      };
    } catch (error) {
      return { status: 500, body: { error: sanitizeDbError(error) } };
    }
  },

  async mutate(payload) {
    const parsed = mutatePayloadSchema.safeParse(payload);
    if (!parsed.success) {
      return {
        status: 400,
        body: {
          error: "Invalid mutate payload",
          details: parsed.error.issues.map((i) => ({
            path: i.path.join("."),
            message: i.message,
          })),
        },
      };
    }

    const { moduleId, entity, operation, data, recordId } = parsed.data;

    if (operation === "create" && (!data || Object.keys(data).length === 0)) {
      return {
        status: 400,
        body: { error: "'data' is required for create operations." },
      };
    }

    if ((operation === "update" || operation === "delete") && !recordId) {
      return {
        status: 400,
        body: { error: `'recordId' is required for ${operation} operations.` },
      };
    }

    if (operation === "update" && (!data || Object.keys(data).length === 0)) {
      return {
        status: 400,
        body: { error: "'data' is required for update operations." },
      };
    }

    try {
      const loaded = await loadModuleWithSchema(moduleId);
      if (!loaded) {
        return { status: 404, body: { error: "Module not found", moduleId } };
      }

      if (!loaded.schema) {
        return {
          status: 500,
          body: {
            error: "Stored module schema is invalid",
            details: loaded.parseErrors,
          },
        };
      }

      const entityDef = findEntityInModule(loaded.schema, entity);
      if (!entityDef) {
        return {
          status: 404,
          body: {
            error: "Entity not found in module",
            entity,
            moduleId,
            availableEntities: loaded.schema.entities.map((e) => e.name),
          },
        };
      }

      if (operation === "create" || operation === "update") {
        const unknown = rejectUnknownFields(entityDef, data!);
        if (unknown.length > 0) {
          return {
            status: 422,
            body: {
              error: "Data validation failed",
              details: unknown.map((f) => `Unknown field: ${f}`),
            },
          };
        }

        const validation = validateEntityRecord(
          entityDef,
          data,
          operation === "create" ? "create" : "update"
        );

        if (!validation.success) {
          return {
            status: 422,
            body: { error: "Data validation failed", details: validation.errors },
          };
        }
      }

      if (operation === "create") {
        const row = await createVibeRecord({
          orgId: loaded.row.orgId,
          moduleId,
          entityName: entity,
          data: (data ?? {}) as Record<string, unknown>,
        });

        return {
          status: 201,
          body: {
            success: true,
            operation: "create",
            record: {
              id: row.id,
              entity: row.entityName,
              data: row.data,
              createdAt: row.createdAt.toISOString(),
              updatedAt: row.updatedAt.toISOString(),
            },
          },
        };
      }

      if (operation === "update") {
        const row = await updateVibeRecord({
          recordId: recordId!,
          moduleId,
          entityName: entity,
          data: data as Record<string, unknown>,
        });

        if (!row) {
          return {
            status: 404,
            body: { error: "Record not found", recordId, entity, moduleId },
          };
        }

        return {
          status: 200,
          body: {
            success: true,
            operation: "update",
            record: {
              id: row.id,
              entity: row.entityName,
              data: row.data,
              createdAt: row.createdAt.toISOString(),
              updatedAt: row.updatedAt.toISOString(),
            },
          },
        };
      }

      if (operation === "delete") {
        const row = await deleteVibeRecord({
          recordId: recordId!,
          moduleId,
          entityName: entity,
          hard: false,
        });

        if (!row) {
          return {
            status: 404,
            body: { error: "Record not found", recordId, entity, moduleId },
          };
        }

        return {
          status: 200,
          body: {
            success: true,
            operation: "delete",
            recordId: row.id,
            softDeleted: true,
          },
        };
      }

      return {
        status: 400,
        body: { error: "Unknown operation", operation },
      };
    } catch (error) {
      return { status: 500, body: { error: sanitizeDbError(error) } };
    }
  },
};

/* ------------------------------------------------------------------ */
/*  Public API                                                        */
/* ------------------------------------------------------------------ */

/** Handle an intent-based POST request */
export async function handleVibeRequest(body: unknown): Promise<ApiResponse> {
  try {
    const parsed = intentRequestSchema.safeParse(body);

    if (!parsed.success) {
      return {
        status: 400,
        body: {
          error: "Invalid request format",
          details: parsed.error.issues.map((i) => ({
            path: i.path.join("."),
            message: i.message,
          })),
        },
      };
    }

    const { intent, payload } = parsed.data;
    return await handlers[intent](payload);
  } catch (error) {
    return { status: 500, body: { error: sanitizeDbError(error) } };
  }
}

/** Health check / API docs */
export function getVibeInfo(): ApiResponse {
  return {
    status: 200,
    body: {
      name: "VibeOS API",
      version: "0.1.0",
      status: "operational",
      intents: ["generate", "query", "mutate", "validate", "list", "getChat"],
      docs: "POST a JSON body with { intent, payload } to interact with VibeOS.",
      persistence: "PostgreSQL JSONB (vibe_modules + vibe_records)",
    },
  };
}
