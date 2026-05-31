/**
 * VibeOS Database — Core Schema Definitions
 *
 * These are the "fixed" relational tables that every VibeOS instance needs.
 * Dynamic entities created by Vibe-JSON schemas are stored in the
 * `vibe_records` table using JSONB for maximum flexibility.
 */

import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  boolean,
  jsonb,
  index,
} from "drizzle-orm/pg-core";

/* ------------------------------------------------------------------ */
/*  Core: Organizations                                               */
/* ------------------------------------------------------------------ */

export const organizations = pgTable("organizations", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 255 }).notNull().unique(),
  settings: jsonb("settings").default({}),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

/* ------------------------------------------------------------------ */
/*  Core: Users                                                       */
/* ------------------------------------------------------------------ */

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  orgId: uuid("org_id")
    .references(() => organizations.id)
    .notNull(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  name: varchar("name", { length: 255 }).notNull(),
  role: varchar("role", { length: 50 }).notNull().default("member"),
  avatarUrl: text("avatar_url"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

/* ------------------------------------------------------------------ */
/*  Dynamic: Vibe Modules (stores deployed Vibe-JSON schemas)         */
/* ------------------------------------------------------------------ */

export const vibeModules = pgTable("vibe_modules", {
  id: uuid("id").defaultRandom().primaryKey(),
  orgId: uuid("org_id")
    .references(() => organizations.id)
    .notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  version: varchar("version", { length: 20 }).notNull(),
  schema: jsonb("schema").notNull(), // The full Vibe-JSON schema
  isActive: boolean("is_active").notNull().default(true),
  createdBy: uuid("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

/* ------------------------------------------------------------------ */
/*  Builder: Chat Sessions (conversation history + linked module)     */
/* ------------------------------------------------------------------ */

export const vibeChats = pgTable(
  "vibe_chats",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orgId: uuid("org_id")
      .references(() => organizations.id)
      .notNull(),
    moduleId: uuid("module_id").references(() => vibeModules.id),
    title: varchar("title", { length: 500 }).notNull(),
    messages: jsonb("messages").notNull().default([]),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [index("idx_vibe_chats_org").on(table.orgId)]
);

/* ------------------------------------------------------------------ */
/*  Dynamic: Vibe Records (JSONB-powered dynamic entity storage)      */
/* ------------------------------------------------------------------ */

export const vibeRecords = pgTable(
  "vibe_records",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orgId: uuid("org_id")
      .references(() => organizations.id)
      .notNull(),
    moduleId: uuid("module_id")
      .references(() => vibeModules.id)
      .notNull(),
    entityName: varchar("entity_name", { length: 255 }).notNull(),
    data: jsonb("data").notNull(), // The actual record data
    isDeleted: boolean("is_deleted").notNull().default(false),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("idx_vibe_records_org").on(table.orgId),
    index("idx_vibe_records_module").on(table.moduleId),
    index("idx_vibe_records_entity").on(table.entityName),
    index("idx_vibe_records_org_entity").on(table.orgId, table.entityName),
  ]
);
