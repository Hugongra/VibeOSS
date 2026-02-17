/**
 * VibeOS Database — Drizzle ORM Configuration
 *
 * Hybrid persistence layer using PostgreSQL with JSONB fields.
 * Core tables (users, orgs) use traditional relational columns.
 * Dynamic entities (created by Vibe schemas) are stored in JSONB,
 * enabling schema-less flexibility with SQL queryability.
 */

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

/**
 * Connection singleton — reuses the connection across hot reloads in dev.
 * In production, this creates a single pooled connection.
 */
const globalForDb = globalThis as unknown as {
  connection: postgres.Sql | undefined;
};

const connection =
  globalForDb.connection ??
  postgres(process.env.DATABASE_URL!, {
    max: 10,
    idle_timeout: 20,
    connect_timeout: 10,
  });

if (process.env.NODE_ENV !== "production") {
  globalForDb.connection = connection;
}

export const db = drizzle(connection, { schema });
