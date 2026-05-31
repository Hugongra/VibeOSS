/** Client-side helpers for POST /api/vibe intents. */

import type { VibeChatMessage, VibeChatSummary, VibeSchemaV1 } from "@shared/types";

async function vibeRequest(body: unknown) {
  const res = await fetch("/api/vibe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const text = await res.text();
  let json: Record<string, unknown> = {};
  if (text.trim()) {
    try {
      json = JSON.parse(text) as Record<string, unknown>;
    } catch {
      json = { error: "Invalid JSON response from API" };
    }
  }
  return { ok: res.ok, status: res.status, json };
}

export async function listChats() {
  const result = await vibeRequest({ intent: "list", payload: {} });
  if (!result.ok) {
    return {
      ok: false as const,
      chats: [] as VibeChatSummary[],
      error: String(result.json.error ?? "Failed to load chats"),
    };
  }

  const chats = Array.isArray(result.json.chats)
    ? (result.json.chats as VibeChatSummary[])
    : [];

  return { ok: true as const, chats };
}

export async function getChat(chatId: string) {
  const result = await vibeRequest({ intent: "getChat", payload: { chatId } });
  if (!result.ok) {
    return {
      ok: false as const,
      error: String(result.json.error ?? "Failed to load chat"),
    };
  }

  return {
    ok: true as const,
    chatId: String(result.json.chatId ?? chatId),
    title: String(result.json.title ?? ""),
    moduleId: (result.json.moduleId as string | null) ?? null,
    messages: Array.isArray(result.json.messages)
      ? (result.json.messages as VibeChatMessage[])
      : [],
    schema: (result.json.schema as VibeSchemaV1 | null) ?? null,
  };
}

export async function generateSchema(args: {
  prompt: string;
  chatId?: string | null;
  moduleId?: string | null;
  existingSchema?: VibeSchemaV1 | null;
}) {
  const payload: Record<string, unknown> = { prompt: args.prompt };
  if (args.chatId) payload.chatId = args.chatId;
  if (args.moduleId) payload.moduleId = args.moduleId;
  if (args.existingSchema) payload.existingSchema = args.existingSchema;

  return vibeRequest({ intent: "generate", payload });
}

export async function queryRecords(args: {
  moduleId: string;
  entity: string;
  filter?: Record<string, unknown>;
  limit?: number;
  offset?: number;
}) {
  return vibeRequest({
    intent: "query",
    payload: args,
  });
}

export async function mutateRecord(args: {
  moduleId: string;
  entity: string;
  operation: "create" | "update" | "delete";
  data?: Record<string, unknown>;
  recordId?: string;
}) {
  return vibeRequest({
    intent: "mutate",
    payload: args,
  });
}

export function apiRecordToRow(record: {
  id: string;
  data: Record<string, unknown>;
}): Record<string, unknown> {
  return { _id: record.id, ...record.data };
}
