/**
 * PostgreSQL JSONB persistence for vibe_modules and vibe_records.
 */

import { and, count, desc, eq, sql } from "drizzle-orm";
import type { VibeChatMessage, VibeSchemaV1 } from "@shared/types";
import { db } from "./db";
import { organizations, vibeChats, vibeModules, vibeRecords } from "./schema";

const DEFAULT_ORG_SLUG = "default";

/** Resolve org id from env or get/create the default organization. */
export async function resolveDefaultOrgId(): Promise<string> {
  const fromEnv = process.env.VIBEOS_DEFAULT_ORG_ID;
  if (fromEnv) return fromEnv;

  const existing = await db
    .select({ id: organizations.id })
    .from(organizations)
    .where(eq(organizations.slug, DEFAULT_ORG_SLUG))
    .limit(1);

  if (existing[0]) return existing[0].id;

  const inserted = await db
    .insert(organizations)
    .values({
      name: "Default Organization",
      slug: DEFAULT_ORG_SLUG,
    })
    .returning({ id: organizations.id });

  return inserted[0]!.id;
}

export async function persistVibeModule(args: {
  schema: VibeSchemaV1;
  orgId?: string;
}): Promise<{ moduleId: string; orgId: string }> {
  const orgId = args.orgId ?? (await resolveDefaultOrgId());

  const [row] = await db
    .insert(vibeModules)
    .values({
      orgId,
      name: args.schema.module,
      version: args.schema.version,
      schema: args.schema,
      isActive: true,
    })
    .returning({ id: vibeModules.id });

  return { moduleId: row!.id, orgId };
}

export async function loadVibeModule(moduleId: string) {
  const [row] = await db
    .select()
    .from(vibeModules)
    .where(and(eq(vibeModules.id, moduleId), eq(vibeModules.isActive, true)))
    .limit(1);

  return row ?? null;
}

export async function listVibeModules(args?: { orgId?: string; limit?: number }) {
  const orgId = args?.orgId ?? (await resolveDefaultOrgId());
  const limit = args?.limit ?? 100;

  return db
    .select()
    .from(vibeModules)
    .where(and(eq(vibeModules.orgId, orgId), eq(vibeModules.isActive, true)))
    .orderBy(desc(vibeModules.createdAt))
    .limit(limit);
}

export async function updateVibeModule(args: {
  moduleId: string;
  schema: VibeSchemaV1;
}) {
  const [row] = await db
    .update(vibeModules)
    .set({
      name: args.schema.module,
      version: args.schema.version,
      schema: args.schema,
      updatedAt: new Date(),
    })
    .where(and(eq(vibeModules.id, args.moduleId), eq(vibeModules.isActive, true)))
    .returning({ id: vibeModules.id });

  if (!row) {
    throw new Error("Module not found");
  }

  return { moduleId: row.id };
}

function parseChatMessages(raw: unknown): VibeChatMessage[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter(
    (m): m is VibeChatMessage =>
      typeof m === "object" &&
      m !== null &&
      (m as VibeChatMessage).role !== undefined &&
      typeof (m as VibeChatMessage).text === "string"
  );
}

export async function createVibeChat(args: {
  title: string;
  messages?: VibeChatMessage[];
  moduleId?: string | null;
  orgId?: string;
}) {
  const orgId = args.orgId ?? (await resolveDefaultOrgId());

  const [row] = await db
    .insert(vibeChats)
    .values({
      orgId,
      title: args.title.slice(0, 500),
      messages: args.messages ?? [],
      moduleId: args.moduleId ?? null,
    })
    .returning();

  return row!;
}

export async function listVibeChats(args?: { orgId?: string; limit?: number }) {
  const orgId = args?.orgId ?? (await resolveDefaultOrgId());
  const limit = args?.limit ?? 100;

  return db
    .select()
    .from(vibeChats)
    .where(eq(vibeChats.orgId, orgId))
    .orderBy(desc(vibeChats.updatedAt))
    .limit(limit);
}

export async function getVibeChat(chatId: string) {
  const [row] = await db
    .select()
    .from(vibeChats)
    .where(eq(vibeChats.id, chatId))
    .limit(1);

  return row ?? null;
}

export async function appendVibeChatMessages(args: {
  chatId: string;
  messages: VibeChatMessage[];
  moduleId?: string | null;
}) {
  const chat = await getVibeChat(args.chatId);
  if (!chat) return null;

  const existing = parseChatMessages(chat.messages);
  const merged = [...existing, ...args.messages];

  const [row] = await db
    .update(vibeChats)
    .set({
      messages: merged,
      moduleId: args.moduleId !== undefined ? args.moduleId : chat.moduleId,
      updatedAt: new Date(),
    })
    .where(eq(vibeChats.id, args.chatId))
    .returning();

  return row ?? null;
}

export async function createVibeRecord(args: {
  orgId: string;
  moduleId: string;
  entityName: string;
  data: Record<string, unknown>;
}) {
  const [row] = await db
    .insert(vibeRecords)
    .values({
      orgId: args.orgId,
      moduleId: args.moduleId,
      entityName: args.entityName,
      data: args.data,
    })
    .returning();

  return row!;
}

export async function updateVibeRecord(args: {
  recordId: string;
  moduleId: string;
  entityName: string;
  data: Record<string, unknown>;
}) {
  const [existing] = await db
    .select()
    .from(vibeRecords)
    .where(
      and(
        eq(vibeRecords.id, args.recordId),
        eq(vibeRecords.moduleId, args.moduleId),
        eq(vibeRecords.entityName, args.entityName),
        eq(vibeRecords.isDeleted, false)
      )
    )
    .limit(1);

  if (!existing) return null;

  const merged = { ...(existing.data as Record<string, unknown>), ...args.data };

  const [row] = await db
    .update(vibeRecords)
    .set({ data: merged, updatedAt: new Date() })
    .where(eq(vibeRecords.id, args.recordId))
    .returning();

  return row ?? null;
}

export async function deleteVibeRecord(args: {
  recordId: string;
  moduleId: string;
  entityName: string;
  hard?: boolean;
}) {
  const conditions = and(
    eq(vibeRecords.id, args.recordId),
    eq(vibeRecords.moduleId, args.moduleId),
    eq(vibeRecords.entityName, args.entityName),
    eq(vibeRecords.isDeleted, false)
  );

  if (args.hard) {
    const [row] = await db.delete(vibeRecords).where(conditions).returning();
    return row ?? null;
  }

  const [row] = await db
    .update(vibeRecords)
    .set({ isDeleted: true, updatedAt: new Date() })
    .where(conditions)
    .returning();

  return row ?? null;
}

export async function queryVibeRecords(args: {
  moduleId: string;
  entityName: string;
  filter?: Record<string, unknown>;
  limit?: number;
  offset?: number;
}) {
  const limit = args.limit ?? 50;
  const offset = args.offset ?? 0;

  const baseConditions = [
    eq(vibeRecords.moduleId, args.moduleId),
    eq(vibeRecords.entityName, args.entityName),
    eq(vibeRecords.isDeleted, false),
  ];

  if (args.filter) {
    for (const [key, value] of Object.entries(args.filter)) {
      if (value === undefined || value === null) continue;
      baseConditions.push(sql`${vibeRecords.data}->>${key} = ${String(value)}`);
    }
  }

  const where = and(...baseConditions);

  const [totalRow] = await db
    .select({ total: count() })
    .from(vibeRecords)
    .where(where);

  const rows = await db
    .select()
    .from(vibeRecords)
    .where(where)
    .limit(limit)
    .offset(offset)
    .orderBy(vibeRecords.createdAt);

  return {
    records: rows.map((r) => ({
      id: r.id,
      entity: r.entityName,
      data: r.data as Record<string, unknown>,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
    })),
    pagination: {
      total: totalRow?.total ?? 0,
      limit,
      offset,
      hasMore: offset + rows.length < (totalRow?.total ?? 0),
    },
  };
}

/** Sanitize database errors for API responses. */
export function sanitizeDbError(error: unknown): string {
  if (error instanceof Error) {
    if (/connect|ECONNREFUSED|timeout/i.test(error.message)) {
      return "Database connection failed. Check DATABASE_URL and that PostgreSQL is running.";
    }
    return "An internal database error occurred.";
  }
  return "An internal database error occurred.";
}
