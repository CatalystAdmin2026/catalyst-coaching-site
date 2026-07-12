// ─────────────────────────────────────────────────────────────
// Catalyst OS — Database Client
//
// SERVER-ONLY — never import this file from a client component.
// Provides a lazily-initialized Drizzle singleton.
//
// Uses postgres.js (PgBouncer compatible) as the driver.
// prepare: false is required for serverless environments where
// named prepared statements are not supported across connections.
//
// DATABASE_URL must be a Supabase Session Mode pooler URL for
// runtime queries. Use the direct connection URL for migrations.
//
// Lazy initialization: the connection is created on the first
// call to getDb(), not at module evaluation time. This prevents
// Next.js build-time failures when DATABASE_URL is not set in
// the build environment.
// ─────────────────────────────────────────────────────────────

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

type DbInstance = ReturnType<typeof drizzle<typeof schema>>;

let _db: DbInstance | undefined;

export function getDb(): DbInstance {
  if (_db) return _db;

  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "DATABASE_URL environment variable is not set. " +
        "Add it to .env.local (development) or your Vercel project settings (production). " +
        "See .env.local.example for setup instructions.",
    );
  }

  _db = drizzle(postgres(url, { prepare: false }), { schema });
  return _db;
}

export type Database = DbInstance;
