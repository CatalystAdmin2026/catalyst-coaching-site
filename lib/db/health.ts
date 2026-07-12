// ─────────────────────────────────────────────────────────────
// Catalyst OS — Database Health Check
//
// SERVER-ONLY — never import this file from a client component.
// Provides a lightweight connectivity check without exposing
// connection details or schema structure.
// ─────────────────────────────────────────────────────────────

import { sql } from "drizzle-orm";
import { getDb } from "./client";

export interface DbHealthResult {
  connected: boolean;
  latencyMs: number | null;
  error: string | null;
  checkedAt: string;
}

export async function checkDatabaseConnection(): Promise<DbHealthResult> {
  const start = Date.now();

  try {
    await getDb().execute(sql`SELECT 1`);
    return {
      connected: true,
      latencyMs: Date.now() - start,
      error: null,
      checkedAt: new Date().toISOString(),
    };
  } catch (err) {
    return {
      connected: false,
      latencyMs: null,
      error: err instanceof Error ? err.message : "Unknown error",
      checkedAt: new Date().toISOString(),
    };
  }
}
